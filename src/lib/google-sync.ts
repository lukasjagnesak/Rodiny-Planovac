import { ZNACKA } from "./brand";
import "server-only";

import { addDays, eachDayOfInterval } from "date-fns";
import { createAdminClient } from "./supabase/admin";
import { smiZapisovatUzivatel } from "./predplatne";
import {
  GoogleEventMissing,
  accessTokenFor,
  deleteEvent,
  insertEvent,
  updateEvent,
  type GoogleEventPayload,
} from "./google";
import { custodyBlocks, resolveCustody } from "./custody";
import { expandActivities } from "./activities";
import { sideLabel, toMemberView } from "./members";
import { toDateKey, formatTime } from "./dates";
import { EVENT_KINDS } from "./constants";
import type {
  Activity,
  ActivityOccurrence,
  Child,
  CustodyOverride,
  CustodyPattern,
  FamilyEvent,
  FamilyMember,
  Profile,
} from "./types";

/** Kolik dní dopředu se do Google kalendáře přenáší. */
const WINDOW_DAYS = 90;

interface DesiredEvent {
  sourceType: "custody" | "activity_occurrence" | "event";
  sourceKey: string;
  familyId: string;
  /** Datum, ke kterému se položka váže — pro úklid mimo okno. */
  day: string;
  payload: GoogleEventPayload;
}

function hashOf(payload: GoogleEventPayload): string {
  return JSON.stringify(payload);
}

export interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
}

/**
 * Přenese kalendář péče, kroužky a události do Google kalendáře
 * jednoho uživatele. Volá se z nastavení i z cronu.
 */
export async function syncUserCalendar(userId: string): Promise<SyncResult> {
  const admin = createAdminClient();

  const { data: account } = await admin
    .from("google_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!account) throw new Error("Uživatel nemá propojený Google kalendář.");

  const accessToken = await accessTokenFor(account.refresh_token);
  const calendarId = account.calendar_id || "primary";

  const { data: memberships } = await admin
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId);

  const familyIds = (memberships ?? []).map((m) => m.family_id);
  if (familyIds.length === 0) return { created: 0, updated: 0, deleted: 0 };

  const today = new Date();
  const windowEnd = addDays(today, WINDOW_DAYS);
  const fromKey = toDateKey(today);
  const toKey = toDateKey(windowEnd);
  const days = eachDayOfInterval({ start: today, end: windowEnd });

  const desired: DesiredEvent[] = [];

  for (const familyId of familyIds) {
    const [family, members, children, patterns, overrides, activities, occurrences, events] =
      await Promise.all([
        admin.from("families").select("*").eq("id", familyId).single(),
        admin.from("family_members").select("*, profile:profiles(*)").eq("family_id", familyId),
        admin.from("children").select("*").eq("family_id", familyId).eq("archived", false),
        admin.from("custody_patterns").select("*").eq("family_id", familyId),
        admin
          .from("custody_overrides")
          .select("*")
          .eq("family_id", familyId)
          .gte("day", fromKey)
          .lte("day", toKey),
        admin.from("activities").select("*").eq("family_id", familyId).eq("active", true),
        admin
          .from("activity_occurrences")
          .select("*")
          .eq("family_id", familyId)
          .gte("day", fromKey)
          .lte("day", toKey),
        admin
          .from("events")
          .select("*")
          .eq("family_id", familyId)
          .gte("starts_at", `${fromKey}T00:00:00Z`)
          .lte("starts_at", `${toKey}T23:59:59Z`),
      ]);

    const timeZone = family.data?.timezone ?? "Europe/Prague";
    const memberViews = ((members.data ?? []) as unknown as (FamilyMember & {
      profile: Profile | null;
    })[]).map(toMemberView);
    const childList = (children.data ?? []) as Child[];

    // ── Střídavá péče jako celodenní bloky ────────────────────────
    if (account.sync_custody) {
      const custody = resolveCustody({
        days,
        patterns: (patterns.data ?? []) as CustodyPattern[],
        overrides: (overrides.data ?? []) as CustodyOverride[],
        childId: null,
      });

      for (const block of custodyBlocks(custody)) {
        desired.push({
          sourceType: "custody",
          sourceKey: `${familyId}:${block.startKey}`,
          familyId,
          day: block.startKey,
          payload: {
            summary: `👨‍👩‍👧 Děti: ${sideLabel(memberViews, block.side)}`,
            description: `${block.nights} ${block.nights === 1 ? "noc" : block.nights < 5 ? "noci" : "nocí"} · ${ZNACKA}`,
            // Google bere `end.date` jako exkluzivní — proto +1 den.
            startDate: block.startKey,
            endDate: toDateKey(addDays(new Date(`${block.endKey}T00:00:00`), 1)),
            timeZone,
            colorId: block.side === "a" ? "9" : "4",
          },
        });
      }
    }

    // ── Kroužky ───────────────────────────────────────────────────
    if (account.sync_activities) {
      const map = expandActivities(
        days,
        (activities.data ?? []) as Activity[],
        (occurrences.data ?? []) as ActivityOccurrence[],
      );

      for (const list of map.values()) {
        for (const instance of list) {
          if (instance.cancelled) continue;

          const child = childList.find((c) => c.id === instance.activity.child_id);
          const driverThere = memberViews.find((m) => m.userId === instance.driverThere);
          const driverBack = memberViews.find((m) => m.userId === instance.driverBack);

          const lines = [
            child ? `Dítě: ${child.name}` : null,
            driverThere ? `Veze tam: ${driverThere.name}` : "Řidič tam nepřiřazen",
            driverBack ? `Veze zpět: ${driverBack.name}` : "Řidič zpět nepřiřazen",
            instance.note,
          ].filter(Boolean);

          desired.push({
            sourceType: "activity_occurrence",
            sourceKey: instance.key,
            familyId,
            day: instance.day,
            payload: {
              summary: `🏃 ${instance.activity.name}${child ? ` — ${child.name}` : ""}`,
              description: lines.join("\n"),
              location: instance.activity.address || instance.activity.location || undefined,
              startDateTime: `${instance.day}T${formatTime(instance.startsAt)}:00`,
              endDateTime: `${instance.day}T${formatTime(instance.endsAt)}:00`,
              timeZone,
              colorId: "7",
            },
          });
        }
      }
    }

    // ── Události ──────────────────────────────────────────────────
    if (account.sync_events) {
      for (const event of (events.data ?? []) as FamilyEvent[]) {
        const meta = EVENT_KINDS[event.kind];
        const child = childList.find((c) => c.id === event.child_id);
        const responsible = memberViews.find((m) => m.userId === event.responsible);

        const start = new Date(event.starts_at);
        const end = event.ends_at ? new Date(event.ends_at) : null;

        desired.push({
          sourceType: "event",
          sourceKey: event.id,
          familyId,
          day: toDateKey(start),
          payload: {
            summary: `${meta.emoji} ${event.title}${child ? ` — ${child.name}` : ""}`,
            description: [
              meta.label,
              responsible ? `Zajišťuje: ${responsible.name}` : null,
              event.notes,
            ]
              .filter(Boolean)
              .join("\n"),
            location: event.location ?? undefined,
            ...(event.all_day
              ? {
                  startDate: toDateKey(start),
                  endDate: toDateKey(addDays(end ?? start, 1)),
                }
              : {
                  startDateTime: start.toISOString(),
                  endDateTime: (end ?? new Date(start.getTime() + 3600_000)).toISOString(),
                }),
            timeZone,
            colorId: "6",
          },
        });
      }
    }
  }

  // ── Porovnání s tím, co už v Googlu je ──────────────────────────
  const { data: existingLinks } = await admin
    .from("google_event_links")
    .select("*")
    .eq("user_id", userId);

  const linkMap = new Map(
    (existingLinks ?? []).map((l) => [`${l.source_type}:${l.source_key}`, l]),
  );

  const result: SyncResult = { created: 0, updated: 0, deleted: 0 };
  const seen = new Set<string>();

  for (const item of desired) {
    const mapKey = `${item.sourceType}:${item.sourceKey}`;
    seen.add(mapKey);

    const hash = hashOf(item.payload);
    const link = linkMap.get(mapKey);

    if (link && link.content_hash === hash) continue;

    if (link) {
      try {
        await updateEvent(accessToken, calendarId, link.google_event_id, item.payload);
        await admin
          .from("google_event_links")
          .update({ content_hash: hash, updated_at: new Date().toISOString() })
          .eq("id", link.id);
        result.updated += 1;
        continue;
      } catch (e) {
        // Událost už v Googlu není — spadneme do větve s vytvořením nové.
        if (!(e instanceof GoogleEventMissing)) throw e;
      }
    }

    const googleEventId = await insertEvent(accessToken, calendarId, item.payload);
    await admin.from("google_event_links").upsert(
      {
        user_id: userId,
        family_id: item.familyId,
        source_type: item.sourceType,
        source_key: item.sourceKey,
        google_event_id: googleEventId,
        content_hash: hash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,source_type,source_key" },
    );
    result.created += 1;
  }

  // ── Úklid: co v plánovači zmizelo, smažeme i v Googlu ───────────
  for (const [mapKey, link] of linkMap) {
    if (seen.has(mapKey)) continue;

    // Mimo synchronizační okno se nic neruší — historii necháváme být.
    const dayInKey = link.source_key.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (dayInKey && (dayInKey < fromKey || dayInKey > toKey)) continue;

    await deleteEvent(accessToken, calendarId, link.google_event_id);
    await admin.from("google_event_links").delete().eq("id", link.id);
    result.deleted += 1;
  }

  await admin
    .from("google_accounts")
    .update({ last_sync_at: new Date().toISOString(), last_sync_error: null })
    .eq("user_id", userId);

  return result;
}

/** Spustí synchronizaci pro všechny propojené uživatele (cron). */
export async function syncAllCalendars(): Promise<{ users: number; errors: string[] }> {
  const admin = createAdminClient();
  const { data: accounts } = await admin.from("google_accounts").select("user_id");

  const errors: string[] = [];
  for (const account of accounts ?? []) {
    // Po vypršení předplatného se do kalendáře nic nepřenáší.
    if (!(await smiZapisovatUzivatel(account.user_id as string))) continue;

    try {
      await syncUserCalendar(account.user_id);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push(`${account.user_id}: ${message}`);
      await admin
        .from("google_accounts")
        .update({ last_sync_error: message.slice(0, 500) })
        .eq("user_id", account.user_id);
    }
  }

  return { users: (accounts ?? []).length, errors };
}

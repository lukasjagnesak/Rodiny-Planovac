import "server-only";

import { addDays, eachDayOfInterval } from "date-fns";
import { createAdminClient } from "./supabase/admin";
import { resolveCustody } from "./custody";
import { expandActivities } from "./activities";
import { toMemberView, sideLabel } from "./members";
import { EVENT_KINDS } from "./constants";
import { formatDayLong, formatTime, toDateKey } from "./dates";
import { posliPush } from "./push";
import { odkazPodleDeduplikace } from "./oznameni-odkaz";
import type {
  Activity,
  ActivityOccurrence,
  Child,
  CustodyOverride,
  CustodyPattern,
  Family,
  FamilyEvent,
  FamilyMember,
  MemberView,
  Profile,
} from "./types";

/** V kolik hodin (místního času) chodí večerní shrnutí na další den. */
const EVENING_HOUR = 18;

interface PlannedNotification {
  familyId: string;
  userId: string;
  title: string;
  body: string;
  sendAt: Date;
  dedupeKey: string;
}

// ── Časová zóna ────────────────────────────────────────────────────

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - instant.getTime();
}

/** Převede „18:00 v Praze dne X“ na skutečný okamžik v UTC. */
export function wallClockToInstant(dayKey: string, hour: number, timeZone: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, hour, 0, 0);
  const firstGuess = new Date(naive - zoneOffsetMs(new Date(naive), timeZone));
  return new Date(naive - zoneOffsetMs(firstGuess, timeZone));
}

// ── Plánování ──────────────────────────────────────────────────────

function editors(members: MemberView[]): MemberView[] {
  return members.filter((m) => m.role !== "viewer");
}

/**
 * Projde všechny rodiny a připraví notifikace, které mají v nejbližších
 * 24 hodinách odejít. Díky `dedupe_key` se stejná zpráva nikdy nepošle dvakrát.
 */
export async function planNotifications(): Promise<number> {
  const admin = createAdminClient();
  const now = new Date();
  const horizon = addDays(now, 1);

  const { data: families } = await admin.from("families").select("*");
  const planned: PlannedNotification[] = [];

  for (const family of (families ?? []) as Family[]) {
    const tz = family.timezone || "Europe/Prague";
    const fromKey = toDateKey(now);
    const toKey = toDateKey(addDays(now, 8));

    const [membersRes, childrenRes, patternsRes, overridesRes, activitiesRes, occRes, eventsRes] =
      await Promise.all([
        admin.from("family_members").select("*, profile:profiles(*)").eq("family_id", family.id),
        admin.from("children").select("*").eq("family_id", family.id).eq("archived", false),
        admin.from("custody_patterns").select("*").eq("family_id", family.id),
        admin
          .from("custody_overrides")
          .select("*")
          .eq("family_id", family.id)
          .gte("day", fromKey)
          .lte("day", toKey),
        admin.from("activities").select("*").eq("family_id", family.id).eq("active", true),
        admin
          .from("activity_occurrences")
          .select("*")
          .eq("family_id", family.id)
          .gte("day", fromKey)
          .lte("day", toKey),
        admin
          .from("events")
          .select("*")
          .eq("family_id", family.id)
          .gte("starts_at", now.toISOString())
          .lte("starts_at", addDays(now, 14).toISOString()),
      ]);

    const members = ((membersRes.data ?? []) as unknown as (FamilyMember & {
      profile: Profile | null;
    })[]).map(toMemberView);
    const children = (childrenRes.data ?? []) as Child[];

    const { data: odbery } = await admin
      .from("push_subscriptions")
      .select("user_id")
      .in(
        "user_id",
        members.map((m) => m.userId),
      );
    const maPush = new Set((odbery ?? []).map((o) => o.user_id as string));
    const sPushem = members.filter((m) => maPush.has(m.userId));

    if (sPushem.length === 0) continue;

    // ── 1) Připomínky událostí ──────────────────────────────────
    for (const event of (eventsRes.data ?? []) as FamilyEvent[]) {
      const start = new Date(event.starts_at);
      const child = children.find((c) => c.id === event.child_id);
      const meta = EVENT_KINDS[event.kind];

      for (const offset of event.reminders ?? []) {
        const sendAt = new Date(start.getTime() - offset * 60_000);
        if (sendAt < now || sendAt > horizon) continue;

        const recipients = event.responsible
          ? sPushem.filter((m) => m.userId === event.responsible)
          : sPushem.filter((m) => editors(members).some((e) => e.userId === m.userId));

        for (const member of recipients) {
          planned.push({
            familyId: family.id,
            userId: member.userId,
            title: `${meta.emoji} ${event.title}`,
            body:
              `${formatDayLong(start)}${event.all_day ? "" : ` v ${formatTime(start)}`}\n` +
              (child ? `Dítě: ${child.name}\n` : "") +
              (event.location ? `📍 ${event.location}\n` : "") +
              (event.notes ? `\n${event.notes}` : ""),
            sendAt,
            dedupeKey: `event:${event.id}:${offset}`,
          });
        }
      }
    }

    // ── 2) Kdo zítra veze na kroužek ────────────────────────────
    const days = eachDayOfInterval({ start: now, end: addDays(now, 8) });
    const activityMap = expandActivities(
      days,
      (activitiesRes.data ?? []) as Activity[],
      (occRes.data ?? []) as ActivityOccurrence[],
    );

    for (const [dayKey, instances] of activityMap) {
      const previousDay = toDateKey(addDays(new Date(`${dayKey}T00:00:00`), -1));
      const sendAt = wallClockToInstant(previousDay, EVENING_HOUR, tz);
      if (sendAt < now || sendAt > horizon) continue;

      for (const instance of instances) {
        if (instance.cancelled) continue;
        const child = children.find((c) => c.id === instance.activity.child_id);
        const place = instance.activity.location ?? instance.activity.address;

        // Řidiči — každému jeho směr.
        for (const [driverId, direction] of [
          [instance.driverThere, "tam"],
          [instance.driverBack, "zpět"],
        ] as const) {
          if (!driverId) continue;
          const driver = sPushem.find((m) => m.userId === driverId);
          if (!driver) continue;

          planned.push({
            familyId: family.id,
            userId: driver.userId,
            title: `🚗 Zítra vezeš ${direction}`,
            body:
              `${instance.activity.name}${child ? ` — ${child.name}` : ""}\n` +
              `⏰ ${formatTime(instance.startsAt)}–${formatTime(instance.endsAt)}\n` +
              (place ? `📍 ${place}` : ""),
            sendAt,
            dedupeKey: `ride:${instance.activity.id}:${dayKey}:${direction}`,
          });
        }

        // Nikdo nepřiřazen — připomeneme všem, kdo mohou upravovat.
        if (!instance.driverThere) {
          for (const member of sPushem.filter((m) => m.role !== "viewer")) {
            planned.push({
              familyId: family.id,
              userId: member.userId,
              title: "❓ Zítra chybí řidič",
              body:
                `${instance.activity.name}${child ? ` — ${child.name}` : ""}\n` +
                `⏰ ${formatTime(instance.startsAt)}\n\n` +
                "Doplň prosím v aplikaci, kdo veze.",
              sendAt,
              dedupeKey: `ride-missing:${instance.activity.id}:${dayKey}`,
            });
          }
        }
      }
    }

    // ── 3) Zítra předání dětí ───────────────────────────────────
    const custody = resolveCustody({
      days,
      patterns: (patternsRes.data ?? []) as CustodyPattern[],
      overrides: (overridesRes.data ?? []) as CustodyOverride[],
      childId: null,
    });

    for (const day of custody) {
      if (!day.isHandover || !day.side) continue;

      const previousDay = toDateKey(addDays(day.date, -1));
      const sendAt = wallClockToInstant(previousDay, EVENING_HOUR, tz);
      if (sendAt < now || sendAt > horizon) continue;

      for (const member of sPushem) {
        planned.push({
          familyId: family.id,
          userId: member.userId,
          title: "🔄 Zítra předání dětí",
          body:
            `${formatDayLong(day.date)}\n` +
            `Děti přecházejí k: ${sideLabel(members, day.side)}`,
          sendAt,
          dedupeKey: `handover:${family.id}:${day.key}`,
        });
      }
    }
  }

  if (planned.length === 0) return 0;

  // Vložení s ignorováním duplicit — unikátní index hlídá (user_id, dedupe_key).
  const { error } = await admin.from("notifications").upsert(
    planned.map((p) => ({
      family_id: p.familyId,
      user_id: p.userId,
      channel: "push",
      title: p.title,
      body: p.body,
      send_at: p.sendAt.toISOString(),
      dedupe_key: p.dedupeKey,
      status: "pending" as const,
    })),
    { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
  );

  if (error) throw error;
  return planned.length;
}

/** Odešle všechny naplánované notifikace, kterým už nastal čas. */
export async function dispatchNotifications(): Promise<{ sent: number; failed: number }> {
  const admin = createAdminClient();

  const { data: due } = await admin
    .from("notifications")
    .select("*")
    .eq("status", "pending")
    .lte("send_at", new Date().toISOString())
    .limit(200);

  let sent = 0;
  let failed = 0;

  for (const notification of due ?? []) {
    const { data: odbery } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", notification.user_id);

    if (!odbery || odbery.length === 0) {
      await admin
        .from("notifications")
        .update({ status: "cancelled", error: "Uživatel nemá zapnuté notifikace." })
        .eq("id", notification.id);
      continue;
    }

    let doruceno = false;
    let posledniChyba: string | undefined;

    for (const odber of odbery) {
      const vysledek = await posliPush(odber, {
        titulek: notification.title,
        telo: notification.body,
        odkaz: odkazPodleDeduplikace(notification.dedupe_key),
        tag: notification.dedupe_key ?? undefined,
      });

      if (vysledek.ok) {
        doruceno = true;
      } else {
        posledniChyba = vysledek.chyba;
        // Prohlížeč odběr sám zahodil (odinstalace appky, vymazaná data) —
        // další pokusy na tenhle endpoint by jen sbíraly stejnou chybu.
        if (vysledek.gone) {
          await admin.from("push_subscriptions").delete().eq("endpoint", odber.endpoint);
        }
      }
    }

    if (doruceno) {
      sent += 1;
      await admin
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
        .eq("id", notification.id);
    } else {
      failed += 1;
      await admin
        .from("notifications")
        .update({ status: "failed", error: posledniChyba?.slice(0, 300) })
        .eq("id", notification.id);
    }
  }

  return { sent, failed };
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarSync,
  CreditCard,
  ChevronRight,
  GraduationCap,
  Bell,
  Repeat,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsForms } from "@/components/settings/settings-forms";
import { nactiPredplatne } from "@/lib/predplatne";
import { NebezpecnaZona } from "@/components/settings/nebezpecna-zona";
import type { GoogleAccount } from "@/lib/types";

export const metadata: Metadata = { title: "Nastavení" };

export default async function SettingsPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [{ data: google }, { data: edupage }, { count: pocetOdberu }, pristup] = await Promise.all([
    supabase.from("google_accounts").select("*").eq("user_id", session.userId).maybeSingle(),
    supabase
      .from("edupage_accounts")
      .select("user_id")
      .eq("user_id", session.userId)
      .maybeSingle(),
    supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId),
    nactiPredplatne(session.family.id),
  ]);

  const stavPredplatneho = !pristup.predplatne
    ? null
    : !pristup.muzeZapisovat
      ? "jen ke čtení"
      : pristup.jeZkusebni
        ? `zkušební · ${pristup.dniDoKonce} dní`
        : pristup.predplatne.stav === "po_splatnosti"
          ? "platba vázne"
          : "aktivní";

  const links = [
    {
      href: "/nastaveni/predplatne",
      title: "Předplatné",
      description: "Tarif, platba a faktury",
      Icon: CreditCard,
      badge: stavPredplatneho,
    },
    {
      href: "/nastaveni/stridani",
      title: "Střídání péče",
      description: "Vzory, výjimky a od kdy platí",
      Icon: Repeat,
      badge: null as string | null,
    },
    {
      href: "/nastaveni/google",
      title: "Google kalendář",
      description: "Přenos událostí do tvého kalendáře",
      Icon: CalendarSync,
      badge: google ? "propojeno" : null,
    },
    {
      href: "/nastaveni/edupage",
      title: "EduPage",
      description: "Úkoly, zprávy, rozvrh a školní akce",
      Icon: GraduationCap,
      badge: edupage ? "propojeno" : null,
    },
    {
      href: "/nastaveni/notifikace",
      title: "Notifikace",
      description: "Připomínky, kdo veze a co se blíží",
      Icon: Bell,
      badge: (pocetOdberu ?? 0) > 0 ? "zapnuto" : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Nastavení</h1>
        <p className="text-sm text-ink-muted">Profil, rodina a propojení</p>
      </div>

      <SettingsForms
        session={session}
        google={(google as GoogleAccount | null) ?? null}
      />

      <Card>
        <CardHeader title="Propojení a pravidla" />
        <ul className="mt-2 divide-y divide-line">
          {links.map(({ href, title, description, Icon, badge }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:px-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{title}</span>
                    {badge ? <Badge color="var(--success)">{badge}</Badge> : null}
                  </span>
                  <span className="block truncate text-sm text-ink-muted">{description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <NebezpecnaZona session={session} />
    </div>
  );
}

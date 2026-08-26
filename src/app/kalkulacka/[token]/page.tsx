import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { SdilenyVysledek } from "@/components/kalkulacka/sdileny-vysledek";
import { ZNACKA } from "@/lib/brand";
import type { PlanVstup } from "@/lib/kalkulacka";
import type { CustodySide, PatternKind } from "@/lib/types";

export const metadata: Metadata = {
  title: "Rozpis střídavé péče",
  description: "Sdílený rozpis, u koho jsou děti který den.",
  // Sdílené rozpisy do vyhledávače nepatří.
  robots: { index: false, follow: false },
};

/** Rozpis se otevírá jedině tokenem z odkazu, proto se čte servisním klíčem. */
export default async function SdilenyPlanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data } = await admin
    .from("kalkulacka_plany")
    .select("kind, anchor_date, anchor_side, weekly_map, pocet_deti, jmeno_a, jmeno_b")
    .eq("token", token)
    .maybeSingle();

  if (!data) notFound();

  const vstup: PlanVstup = {
    kind: data.kind as PatternKind,
    anchorDate: data.anchor_date as string,
    anchorSide: data.anchor_side as CustodySide,
    weeklyMap: (data.weekly_map as string | null) ?? "aabbaab",
    pocetDeti: (data.pocet_deti as number) ?? 1,
    jmenoA: (data.jmeno_a as string | null) ?? "První rodič",
    jmenoB: (data.jmeno_b as string | null) ?? "Druhý rodič",
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Rozpis střídavé péče
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          Tenhle rozpis s tebou někdo sdílel. Ukazuje, u koho jsou děti který den a kolik
          nocí to za rok dělá.
        </p>
      </header>

      <SdilenyVysledek vstup={vstup} />

      <Link
        href="/kalkulacka"
        className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 transition-colors hover:bg-surface-2"
      >
        <span>
          <span className="block font-semibold text-ink">Nesedí to?</span>
          <span className="block text-sm text-ink-muted">
            Uprav si rozpis po svém a pošli ho zpátky — v {ZNACKA} to zabere minutu.
          </span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-brand" />
      </Link>
    </div>
  );
}

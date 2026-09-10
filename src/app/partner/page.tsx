import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/google";
import {
  MINIMALNI_VYPLATA_KC,
  PARTNERSKY_EMAIL,
  PLATNOST_DOPORUCENI_DNI,
  VYPLATA_OBDOBI,
  slozPrehled,
  type StavRodiny,
} from "@/lib/partneri";
import { ZNACKA } from "@/lib/brand";
import { PartnerObsah } from "@/components/partner/obsah";

export const metadata: Metadata = {
  title: "Partnerský přehled",
  robots: { index: false, follow: false },
};

/**
 * Přehled pro mediátory a advokáty.
 *
 * Bydlí mimo `(app)`, protože partner nemusí mít rodinu — a rozvržení
 * aplikace by ho poslalo do průvodce zakládáním. Přihlašuje se stejně
 * jako kdokoli jiný, jen se podle e-mailu pozná, že je partner.
 *
 * Co tu není a nebude: jména rodin, jejich kalendáře a jednotlivé
 * částky. Partner vidí svoje obchodní čísla, ne data rodin. U mediátora
 * to není jen ohled na soukromí, ale podmínka jeho vlastní práce —
 * mlčenlivost je to, na čem mediace stojí.
 */
export default async function PartnerPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = typeof claims?.claims.email === "string" ? claims.claims.email : null;

  if (!email) redirect("/prihlaseni?dal=%2Fpartner");

  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partneri")
    .select("id, kod, jmeno, organizace, provize_procento, aktivni")
    .ilike("email", email)
    .maybeSingle();

  if (!partner) {
    return (
      <Neni email={email} />
    );
  }

  // Uživatele k partnerovi připojíme při první návštěvě. Do té doby se
  // pár může rozejít — partner se může přihlásit z jiného e-mailu, než
  // který nám dal.
  await admin.from("partneri").update({ user_id: claims?.claims.sub }).eq("id", partner.id);

  const { data: doporuceni } = await admin
    .from("doporuceni")
    .select("family_id, vzniklo_at")
    .eq("partner_id", partner.id);

  const rodiny = (doporuceni ?? []).map((d) => String(d.family_id));

  const [{ data: predplatna }, { data: platby }] =
    rodiny.length > 0
      ? await Promise.all([
          admin.from("predplatna").select("family_id, stav").in("family_id", rodiny),
          admin.from("platby").select("family_id, castka, zaplaceno_at").in("family_id", rodiny),
        ])
      : [{ data: [] }, { data: [] }];

  // Počítá se jen to, co rodina zaplatila PO doporučení. Bez toho by si
  // partner připsal i platby rodiny, která u nás byla dávno předtím.
  const vznik = new Map(
    (doporuceni ?? []).map((d) => [String(d.family_id), new Date(String(d.vzniklo_at)).getTime()]),
  );

  const prehled = slozPrehled({
    stavy: (predplatna ?? []).map((p) => String(p.stav) as StavRodiny),
    zaplaceno: (platby ?? [])
      .filter(
        (p) =>
          new Date(String(p.zaplaceno_at)).getTime() >= (vznik.get(String(p.family_id)) ?? 0),
      )
      .map((p) => Number(p.castka)),
    provizeProcento: Number(partner.provize_procento),
  });

  return (
    <PartnerObsah
      jmeno={String(partner.jmeno)}
      organizace={partner.organizace ? String(partner.organizace) : null}
      kod={String(partner.kod)}
      odkaz={`${siteUrl()}/?ref=${encodeURIComponent(String(partner.kod))}`}
      procento={Number(partner.provize_procento)}
      aktivni={Boolean(partner.aktivni)}
      prehled={prehled}
      minimalniVyplata={MINIMALNI_VYPLATA_KC}
      platnostDni={PLATNOST_DOPORUCENI_DNI}
      vyplataObdobi={VYPLATA_OBDOBI}
      kontakt={PARTNERSKY_EMAIL}
    />
  );
}

/** Přihlášený, ale není partner. */
function Neni({ email }: { email: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-16">
      <div className="card p-6 text-center sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-subtle">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-3 font-display text-xl font-semibold text-ink">
          Tenhle účet není partnerský
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Jsi přihlášený jako <strong className="text-ink">{email}</strong>. Partnerský
          přehled se páruje podle e-mailu, který jsi nám dal při přihlášení do programu —
          možná je to jiná adresa.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Napiš na{" "}
          <a
            href={`mailto:${PARTNERSKY_EMAIL}`}
            className="text-brand underline underline-offset-4"
          >
            {PARTNERSKY_EMAIL}
          </a>{" "}
          a srovnáme to.
        </p>
        <Link
          href="/prehled"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-line-strong bg-surface px-5 text-sm font-medium text-ink hover:bg-surface-2"
        >
          Zpět do {ZNACKA}
        </Link>
      </div>
    </main>
  );
}

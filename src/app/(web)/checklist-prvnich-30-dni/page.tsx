import type { Metadata } from "next";
import Link from "next/link";
import { Hero, Poznamka, Sloupec } from "@/components/web/prvky";
import { LeadForm } from "@/components/web/lead-form";
import { NastrojeDokumentu } from "@/components/web/kopirovat";
import {
  CHECKLIST_TITULEK,
  CHECKLIST_UVOD,
  SEKCE,
} from "@/lib/checklist";
import { ZNACKA } from "@/lib/brand";

const POPISEK =
  "Devatenáct věcí, které je potřeba zařídit v prvním měsíci střídavé péče — " +
  "škola, lékař, doklady, peníze, provoz. Ke stažení ve Wordu, zdarma.";

export const metadata: Metadata = {
  title: CHECKLIST_TITULEK,
  description: POPISEK,
  alternates: { canonical: "/checklist-prvnich-30-dni" },
  openGraph: { title: `${CHECKLIST_TITULEK} | ${ZNACKA}`, description: POPISEK, type: "article" },
};

/** Text pro tisk a kopírování — stejný obsah, jaký má soubor ke stažení. */
function textChecklistu(): string {
  const radky = [CHECKLIST_TITULEK, "", CHECKLIST_UVOD, ""];
  for (const sekce of SEKCE) {
    radky.push(sekce.nadpis.toUpperCase(), "");
    for (const bod of sekce.body) radky.push(`[ ] ${bod}`);
    radky.push("");
  }
  return radky.join("\n");
}

export default function Checklist() {
  const celkem = SEKCE.reduce((soucet, sekce) => soucet + sekce.body.length, 0);

  return (
    <>
      <Hero
        nadtitulek={`Checklist · ${celkem} bodů`}
        nadpis="Prvních 30 dní ve střídavé péči"
        perex={CHECKLIST_UVOD}
      >
        <NastrojeDokumentu text={textChecklistu()} />
      </Hero>

      <Sloupec>
        <div className="space-y-8">
          {SEKCE.map(({ nadpis, body }) => (
            <section key={nadpis} className="card p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold text-ink">{nadpis}</h2>
              <ul className="mt-4 space-y-3">
                {body.map((bod) => (
                  <li
                    key={bod}
                    className="flex gap-3 text-[0.95rem] leading-relaxed text-ink-muted"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 h-4 w-4 shrink-0 rounded-[5px] border border-line-strong"
                    />
                    {bod}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <LeadForm
          magnet="checklist-30-dni"
          nadpis="Stáhnout ve Wordu"
          popis="Celý checklist v jednom souboru se zaškrtávacími políčky — k vytištění na lednici nebo k poslání druhému rodiči. Otevře se v Wordu, Pages i Google Dokumentech."
          tlacitko="Chci soubor"
          hotovo="Díky. Soubor se stáhne tlačítkem níž — a dáme vědět, až přibude něco dalšího."
          odkaz={{
            href: "/api/checklist",
            popisek: "Stáhnout checklist (.docx)",
            stahnout: true,
          }}
        />

        <Poznamka>
          Checklist je provozní pomůcka, ne právní rada. Body, které se týkají trvalého
          bydliště, výživného a daňového zvýhodnění, patří do{" "}
          <Link href="/vzor-dohody-o-stridave-peci">dohody rodičů</Link> — ať je to napsané,
          dokud se ještě domluvíte.
        </Poznamka>

        <div className="my-12 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-xl font-semibold text-ink">
            Poslední bod, který checklist nevyřeší
          </h2>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted">
            Tenhle seznam odškrtáte jednou. Pak začne provoz, který se opakuje každý týden —
            kdo veze na kroužek, kdo zaplatil lyžák, kdy je předávka. {ZNACKA} je na tohle:
            jeden rozvrh, do kterého vidí oba rodiče.
          </p>
          <Link
            href="/registrace"
            className="mt-5 inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
          >
            Vyzkoušet zdarma
          </Link>
        </div>
      </Sloupec>
    </>
  );
}

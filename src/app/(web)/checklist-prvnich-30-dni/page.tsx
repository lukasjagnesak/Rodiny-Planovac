import type { Metadata } from "next";
import Link from "next/link";
import { FotoPas, Hero, Poznamka, Sloupec } from "@/components/web/prvky";
import { LeadForm } from "@/components/web/lead-form";
import { NastrojeDokumentu } from "@/components/web/kopirovat";
import {
  ChecklistInteraktivni,
  StahnoutChecklist,
} from "@/components/web/checklist-interaktivni";
import { MARKETING_SOUHLAS } from "@/lib/marketing-souhlas";
import {
  CHECKLIST_TITULEK,
  CHECKLIST_UVOD,
  SEKCE,
} from "@/lib/checklist";
import { ZNACKA } from "@/lib/brand";

const POPISEK =
  "Devatenáct věcí, které je potřeba zařídit v prvním měsíci střídavé péče — " +
  "škola, lékař, doklady, peníze, provoz. Odškrtávejte online nebo si stáhněte PDF, zdarma.";

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
        <div className="flex flex-wrap items-center gap-3">
          <StahnoutChecklist misto="hero" />
          <NastrojeDokumentu text={textChecklistu()} />
        </div>
        <p className="mt-3 text-sm text-ink-muted">PDF k vytištění. Bez e-mailu a bez registrace.</p>
      </Hero>

      <FotoPas
        src="/foto/prvni-tydny.jpg"
        alt="Otec si ráno u kuchyňského stolu píše seznam do sešitu."
        prioritni
      />

      <Sloupec>
        <ChecklistInteraktivni sekce={SEKCE} />

        <div className="no-print my-10 flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-xl font-semibold text-ink">Na lednici nebo pro druhého rodiče</h2>
          <p className="text-[0.95rem] leading-relaxed text-ink-muted">
            Stejný seznam v PDF se zaškrtávacími políčky, dvě strany A4. Otevře se v každém
            telefonu i počítači.
          </p>
          <StahnoutChecklist misto="pod-seznamem" />
        </div>

        <LeadForm
          magnet="checklist-30-dni"
          nadpis="Chcete vědět, až přibude další návod?"
          popis="Občas pošleme nový checklist, vzor nebo článek pro rodiny ve dvou domácnostech. Žádné denní zprávy."
          tlacitko="Odebírat"
          hotovo="Díky, ozveme se, až bude co poslat."
          souhlasOdeslanim={MARKETING_SOUHLAS}
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

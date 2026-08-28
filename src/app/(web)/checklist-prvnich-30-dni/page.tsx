import type { Metadata } from "next";
import Link from "next/link";
import { Hero, Poznamka, Sloupec } from "@/components/web/prvky";
import { ZNACKA } from "@/lib/brand";

const TITULEK = "Checklist prvních 30 dní ve střídavé péči";
const POPISEK =
  "Devatenáct věcí, které je potřeba zařídit v prvním měsíci střídavé péče — " +
  "škola, lékař, doklady, peníze, provoz. K vytištění, zdarma.";

export const metadata: Metadata = {
  title: TITULEK,
  description: POPISEK,
  alternates: { canonical: "/checklist-prvnich-30-dni" },
  openGraph: { title: `${TITULEK} | ${ZNACKA}`, description: POPISEK, type: "article" },
};

/**
 * Materiál, který si člověk vyzvedne výměnou za e-mail.
 *
 * Je to obyčejná stránka, ne PDF v příloze: otevře se hned, funguje na
 * mobilu i v tiskárně a nedá se ztratit v hromadné poště.
 */
const SEKCE: { nadpis: string; body: string[] }[] = [
  {
    nadpis: "Škola a školka",
    body: [
      "Nahlásit oba rodiče jako kontaktní osoby — telefon i e-mail, oběma.",
      "Zařídit, aby zprávy z EduPage nebo Bakalářů chodily oběma rodičům.",
      "Domluvit se školou, kdo smí dítě vyzvednout a kdo omlouvá absenci.",
      "Předat rozpis střídání třídnímu učiteli, ať ví, komu psát který týden.",
      "Projít kroužky: kdo vozí, kdo vyzvedává, kdo platí pololetí.",
    ],
  },
  {
    nadpis: "Zdraví",
    body: [
      "Kartička pojištěnce: rozhodnout, jestli putuje s dítětem, nebo bude kopie v obou domácnostech.",
      "Nahlásit u pediatra oba rodiče a jejich telefony.",
      "Sepsat léky, alergie a dávkování — a mít to dostupné z obou domovů.",
      "Domluvit, kdo objednává k lékaři a jak se to druhý rodič dozví.",
    ],
  },
  {
    nadpis: "Doklady a úřady",
    body: [
      "Dohodnout trvalé bydliště dítěte a písemně to potvrdit.",
      "Rozhodnout, kdo drží pas a průkaz, a jak se předává před cestou.",
      "Nahlásit změnu adresy tam, kde je potřeba (pojišťovna, škola, lékař).",
    ],
  },
  {
    nadpis: "Peníze",
    body: [
      "Domluvit, kdo pobírá přídavek na dítě.",
      "Domluvit, kdo uplatňuje daňové zvýhodnění — a v kterých měsících.",
      "Dohodnout klíč na mimořádné výdaje: lyžák, tábor, rovnátka, kroužky.",
      "Založit jedno místo, kam se zapisují společné výdaje. Cokoli, jen ať je jedno.",
    ],
  },
  {
    nadpis: "Provoz",
    body: [
      "Sepsat, co se zdvojí (pyžamo, kartáček, nabíječka) a co putuje s dítětem.",
      "Určit místo a čas předávky a napsat to tak, aby to bylo jednoznačné.",
      "Dohodnout, do kdy se žádá o výměnu termínu a co znamená mlčení druhého rodiče.",
    ],
  },
];

export default function Checklist() {
  const celkem = SEKCE.reduce((soucet, sekce) => soucet + sekce.body.length, 0);

  return (
    <>
      <Hero
        nadtitulek={`Checklist · ${celkem} bodů`}
        nadpis="Prvních 30 dní ve střídavé péči"
        perex="Věci, které je potřeba zařídit hned na začátku. Ne proto, že hoří, ale proto, že se na ně zapomene a za půl roku z nich je spor."
      />

      <Sloupec>
        <div className="space-y-8">
          {SEKCE.map(({ nadpis, body }) => (
            <section key={nadpis} className="card p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold text-ink">{nadpis}</h2>
              <ul className="mt-4 space-y-3">
                {body.map((bod) => (
                  <li key={bod} className="flex gap-3 text-[0.95rem] leading-relaxed text-ink-muted">
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

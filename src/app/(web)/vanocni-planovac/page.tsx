import type { Metadata } from "next";
import Image from "next/image";
import { Hero, Poznamka, Sloupec } from "@/components/web/prvky";
import { LeadForm } from "@/components/web/lead-form";
import { Ikona } from "@/components/ui/ikona";
import type { NazevIkony } from "@/lib/ikony";
import { VANOCNI_TIPY_SOUHLAS } from "@/lib/marketing-souhlas";
import { ZNACKA } from "@/lib/brand";

/**
 * Vánoční plánovač — vstupní stránka ze slova VÁNOCE pod reelsem
 * a z reklam. Za e-mail se rovnou stahuje PDF (/stahnout/…), nic se
 * neposílá poštou. Souhlas s novinkami je zvlášť a nepovinný.
 */
const POPIS =
  "Tři způsoby, jak rozdělit Vánoce mezi dva domovy, plán na celé prázdniny a čtyři hotové zprávy pro druhého rodiče. PDF zdarma.";

export const metadata: Metadata = {
  title: { absolute: `Vánoční plánovač pro střídavou péči zdarma · ${ZNACKA}` },
  description: POPIS,
  alternates: { canonical: "/vanocni-planovac" },
  openGraph: {
    title: "Vánoční plánovač pro střídavou péči",
    description: POPIS,
    type: "website",
    images: [{ url: "/ukazky/vanocni-planovac-1.webp", width: 760, height: 1076 }],
  },
};

const CO_V_NEM_JE: { ikona: NazevIkony; nadpis: string; text: string }[] = [
  {
    ikona: "kalendar",
    nadpis: "Tři způsoby, jak rozdělit svátky",
    text: "Střídat po letech, půlit Štědrý den, nebo Štědrý den proti svátkům. Rozepsané po hodinách, s tím, co pro a co na ně myslet.",
  },
  {
    ikona: "predani",
    nadpis: "Plán na celé prázdniny",
    text: "Od 23. 12. do 3. 1. po dnech: kde děti spí, kdy a kde je předávka, kdo veze a co s sebou.",
  },
  {
    ikona: "darek",
    nadpis: "Dárky, ať nejsou dvakrát",
    text: "Kdo co kupuje a jak se dělí společný dárek. A seznam věcí, na které se před předávkou zapomíná.",
  },
  {
    ikona: "zprava",
    nadpis: "Čtyři zprávy pro druhého rodiče",
    text: "Návrh, protinávrh, domluva dárků a potvrzení. Krátké, věcné a bez výčitek, stačí doplnit.",
  },
];

export default function VanocniPlanovac() {
  return (
    <>
      <Hero
        nadtitulek="Vánoce 2026 · zdarma"
        nadpis="Vánoce ve dvou domovech, domluvené včas"
        perex="Plánovač, se kterým se s druhým rodičem domluvíte na svátcích do 5. prosince, ne 23. Tři modely rozdělení, plán na celé prázdniny a hotové zprávy, které nikoho nenaštvou."
      />

      <Sloupec>
        <LeadForm
          id="stahnout"
          varianta="svetly"
          magnet="vanocni-planovac"
          nadpis="Stáhnout vánoční plánovač"
          popis="Napište e-mail a plánovač (PDF, 3 strany) si hned stáhnete. Na tisk i do telefonu."
          tlacitko="Chci plánovač"
          hotovo="Plánovač je připravený."
          souhlas={VANOCNI_TIPY_SOUHLAS}
          jmeno
          dekovaciStranka="/vanocni-planovac/dekujeme"
        />

        <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight text-ink">
          Co v něm je
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {CO_V_NEM_JE.map(({ ikona, nadpis, text }) => (
            <li key={nadpis} className="card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Ikona nazev={ikona} size={22} />
              </span>
              <h3 className="mt-3 font-semibold text-ink">{nadpis}</h3>
              <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-muted">{text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5">
          {[1, 2].map((strana) => (
            <Image
              key={strana}
              src={`/ukazky/vanocni-planovac-${strana}.webp`}
              alt={
                strana === 1
                  ? "Ukázka první strany plánovače: tři způsoby, jak rozdělit Vánoce."
                  : "Ukázka druhé strany plánovače: tabulka prázdnin po dnech."
              }
              width={760}
              height={1076}
              className="h-auto w-full rounded-xl border border-line shadow-sm"
              sizes="(min-width: 640px) 320px, 45vw"
            />
          ))}
        </div>

        <Poznamka>
          Plánovač je orientační pomůcka, ne právní rada. Pokud máte svátky upravené rozsudkem
          nebo dohodou schválenou soudem, platí ta. Termíny prázdnin podle MŠMT pro školní rok
          2026/2027.
        </Poznamka>
      </Sloupec>
    </>
  );
}

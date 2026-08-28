import type { Metadata } from "next";
import Link from "next/link";
import {
  DalsiCteni,
  Hero,
  Pitch,
  Poznamka,
  Sloupec,
} from "@/components/web/prvky";
import { KalkulackaVyzivneho } from "@/components/web/kalkulacka-vyzivneho";
import { LeadForm } from "@/components/web/lead-form";
import { ZNACKA } from "@/lib/brand";

const TITULEK = "Kalkulačka výživného 2026 — i pro střídavou péči";
const POPISEK =
  "Spočítejte orientační výši výživného podle doporučující tabulky Ministerstva " +
  "spravedlnosti. Zohledňuje příjmy obou rodičů i rozsah střídavé péče.";

export const metadata: Metadata = {
  title: TITULEK,
  description: POPISEK,
  alternates: { canonical: "/kalkulacka-vyzivneho" },
  openGraph: { title: `${TITULEK} | ${ZNACKA}`, description: POPISEK, type: "website" },
};

const OTAZKY = [
  {
    otazka: "Platí se výživné i při střídavé péči?",
    odpoved:
      "Ano, pokud mají rodiče výrazně odlišné příjmy. Dítě má právo na srovnatelnou životní " +
      "úroveň v obou domácnostech, takže rodič s vyšším příjmem obvykle přispívá i tehdy, " +
      "když se rodiče střídají po týdnu. Při podobných příjmech a rovnoměrném střídání se " +
      "výživné často nestanoví vůbec.",
  },
  {
    otazka: "Podle čeho kalkulačka počítá?",
    odpoved:
      "Podle doporučující tabulky Ministerstva spravedlnosti, která udává rozpětí procent " +
      "z čistého příjmu podle životní etapy dítěte. Od povinnosti každého rodiče se odečte " +
      "to, co už pokrývá tím, že má dítě fyzicky u sebe. Výživné je rozdíl mezi rodiči.",
  },
  {
    otazka: "Je výsledek závazný?",
    odpoved:
      "Ne. Tabulka je pomůcka, kterou soudy používají jen podpůrně — konkrétní částku určuje " +
      "soud podle odůvodněných potřeb dítěte a možností obou rodičů. Kalkulačka navíc " +
      "nepočítá kontrolní částku, tedy minimum, které musí platícímu rodiči zůstat.",
  },
  {
    otazka: "Co když má rodič víc dětí?",
    odpoved:
      "Vyberte počet vyživovacích povinností včetně tohoto dítěte. Podíl na každé jednotlivé " +
      "dítě se sníží, celkové zatížení rodiče ale roste. Používáme koeficient, ne samostatnou " +
      "řadu z tabulky — je to zjednodušení.",
  },
];

export default function KalkulackaVyzivnehoStranka() {
  return (
    <>
      <Hero
        nadtitulek="Kalkulačka · doporučující tabulka MSp"
        nadpis="Kolik vyjde výživné"
        perex="Většina kalkulaček počítá jen s příjmem jednoho rodiče. Tahle zohledňuje oba a k tomu rozsah péče — takže funguje i pro střídavku, kde je výsledek často nula."
      />

      <Sloupec>
        <KalkulackaVyzivneho />

        <Poznamka druh="pozor">
          <strong className="text-ink">Výsledek je orientační, ne právně závazný.</strong>{" "}
          Doporučující tabulka Ministerstva spravedlnosti je pomůcka, kterou soudy používají
          jen podpůrně — konkrétní částku vždy určuje soud podle odůvodněných potřeb dítěte
          a možností obou rodičů. Tabulka navíc pracuje s takzvanou kontrolní částkou, tedy
          minimem, které musí platícímu rodiči zůstat, a tu tato kalkulačka nepočítá.
          Oficiální kalkulačku ministerstva najdete na{" "}
          <a
            href="https://vyzivne.justice.cz/kalkulacka-vyzivneho/"
            className="underline"
            rel="noopener"
          >
            vyzivne.justice.cz
          </a>
          .
        </Poznamka>

        <article className="proza">
          <h2>Jak kalkulačka počítá</h2>
          <p>
            Vezme procento z tabulky podle etapy dítěte a spočítá, kolik by na dítě měl
            přispívat každý rodič ze svého příjmu. Od toho odečte to, co už rodič pokrývá tím,
            že má dítě fyzicky u sebe. Rozdíl mezi oběma rodiči je výživné a platí ho ten,
            komu vyjde víc.
          </p>
          <p>
            Proto při rovnoměrné střídavé péči a podobných příjmech vyjde nula — oba přispívají
            stejně. Jakmile se příjmy rozejdou, výživné se objeví, i když se rodiče střídají po
            týdnu. Dítě má právo na srovnatelnou životní úroveň v obou domácnostech.
          </p>
          <p>
            Zjednodušení, o kterých byste měli vědět: u více vyživovacích povinností používáme
            koeficient místo samostatné řady z tabulky, nepočítáme kontrolní částku a
            nepracujeme s majetkem ani s potenciálním příjmem. U nadstandardních příjmů tabulka
            spolehlivě nefunguje vůbec.
          </p>
          <p>
            Údaje o příjmech nikam neodesíláme — výpočet probíhá u vás v prohlížeči.
          </p>

          <h2>Co s tím dál</h2>
          <p>
            Výsledek je začátek jednání, ne jeho konec. Nejlevnější a nejrychlejší cesta je{" "}
            <Link href="/vzor-dohody-o-stridave-peci">
              dohoda rodičů, kterou soud schválí
            </Link>{" "}
            — soudní spor o výživné stojí měsíce a peníze na obou stranách.
          </p>
          <p>
            A pak přijde ta část, na kterou kalkulačka neodpoví: výživné je jen jedna položka.
            Lyžák, brusle, tábor, rovnátka a školní výlety se platí navíc a právě u nich vzniká
            většina pozdějších sporů — protože si za rok nikdo nepamatuje, kdo co zaplatil.
          </p>
        </article>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Časté otázky
          </h2>
          <div className="mt-5 space-y-3">
            {OTAZKY.map(({ otazka, odpoved }) => (
              <details
                key={otazka}
                className="rounded-2xl border border-line bg-surface px-4 py-3.5"
              >
                <summary className="cursor-pointer font-medium text-ink">{otazka}</summary>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted">{odpoved}</p>
              </details>
            ))}
          </div>
        </section>

        <LeadForm
          magnet="vyzivne"
          nadpis="Ať vám neuteče, co se změní"
          popis="Tabulka ministerstva se čas od času mění a soudní praxe s ní. Dáme vědět, když se změní něco, co ovlivní váš výpočet."
          tlacitko="Dát vědět"
          hotovo="Díky. Ozveme se, až se tabulka nebo praxe změní."
        />

        <DalsiCteni
          odkazy={[
            {
              href: "/kalkulacka",
              nazev: "Kalkulačka střídavé péče",
              popis: "Kolik nocí stráví děti u každého rodiče — podle vašeho rytmu střídání.",
            },
            {
              href: "/jak-funguje-stridava-pece",
              nazev: "Jak funguje střídavá péče",
              popis: "Podmínky, rytmy, trvalé bydliště a dávky. Bez právničiny.",
            },
          ]}
        />
      </Sloupec>

      <Pitch
        nadpis="Výživné je jedna položka. Zbytek si pamatuje Klidoo."
        perex="Zapíšete výdaj, vyfotíte účtenku a Klidoo dopočítá, kdo komu kolik dluží. Bez tabulek v Excelu a bez dohadování po roce."
        polozky={[
          {
            nazev: "Sdílené výdaje",
            popis: "Škola, lékař, kroužky. Rozdělení podle vašeho klíče, ne po paměti.",
          },
          {
            nazev: "Doklady u výdaje",
            popis: "Účtenka nebo faktura rovnou u položky. Dohledatelné kdykoli.",
          },
          {
            nazev: "Rozvrh na dvě domácnosti",
            popis: "Kdo má dítě, kdo veze na kroužek, kdy je předávka.",
          },
          {
            nazev: "Druhý rodič zdarma",
            popis: "Platí jedna domácnost, přístup mají obě.",
          },
        ]}
      >
        <Link
          href="/registrace"
          className="inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
        >
          Vyzkoušet zdarma
        </Link>
      </Pitch>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: OTAZKY.map(({ otazka, odpoved }) => ({
              "@type": "Question",
              name: otazka,
              acceptedAnswer: { "@type": "Answer", text: odpoved },
            })),
          }),
        }}
      />
    </>
  );
}

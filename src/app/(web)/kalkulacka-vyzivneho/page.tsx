import type { Metadata } from "next";
import Link from "next/link";
import { DalsiCteni, Hero, Sloupec } from "@/components/web/prvky";
import { PruhKlidoo } from "@/components/web/pruh-klidoo";
import { KalkulackaVyzivneho } from "@/components/web/kalkulacka-vyzivneho";
import { ZNACKA } from "@/lib/brand";
import { CENIK, ZKUSEBNI_SLIB, korun } from "@/lib/tarify";

const TITULEK = "Kalkulačka výživného 2026 — i pro střídavou péči";
const POPISEK =
  "Spočítejte orientační výši výživného podle doporučující tabulky Ministerstva " +
  "spravedlnosti. Zohledňuje příjmy obou rodičů i rozsah střídavé péče.";

export const metadata: Metadata = {
  title: TITULEK,
  description: POPISEK,
  alternates: { canonical: "/kalkulacka-vyzivneho" },
  openGraph: { title: `${TITULEK} | ${ZNACKA}`, description: POPISEK, type: "website" },
};

/**
 * Otázky pod kalkulačkou.
 *
 * Sem se přestěhoval i výklad, který dřív ležel rozepsaný mezi kalkulačkou
 * a nabídkou — na telefonu to byly čtyři obrazovky textu, přes které se
 * člověk musel prorolovat k dalšímu kroku. Sbalený zůstává ve stránce,
 * takže ho vyhledávač čte dál, jen už nikomu nestojí v cestě.
 */
const OTAZKY: { otazka: string; odpoved: string; odkaz?: { href: string; text: string } }[] = [
  {
    otazka: "Platí se výživné i při střídavé péči?",
    odpoved:
      "Ano, pokud mají rodiče výrazně odlišné příjmy. Dítě má právo na srovnatelnou životní " +
      "úroveň v obou domácnostech, takže rodič s vyšším příjmem obvykle přispívá i tehdy, " +
      "když se rodiče střídají po týdnu. Při podobných příjmech a rovnoměrném střídání se " +
      "výživné často nestanoví vůbec.",
  },
  {
    otazka: "Podle čeho kalkulačka počítá?",
    odpoved:
      "Podle doporučující tabulky Ministerstva spravedlnosti, která udává rozpětí procent " +
      "z čistého příjmu podle životní etapy dítěte. Od povinnosti každého rodiče se odečte " +
      "to, co už pokrývá tím, že má dítě fyzicky u sebe. Výživné je rozdíl mezi rodiči.",
  },
  {
    otazka: "Je výsledek závazný?",
    odpoved:
      "Ne. Tabulka je pomůcka, kterou soudy používají jen podpůrně — konkrétní částku určuje " +
      "soud podle odůvodněných potřeb dítěte a možností obou rodičů. Kalkulačka navíc " +
      "nepočítá kontrolní částku, tedy minimum, které musí platícímu rodiči zůstat.",
  },
  {
    otazka: "Co když máme víc společných dětí?",
    odpoved:
      "Přidejte je tlačítkem a u každého vyberte etapu — procenta z tabulky se s věkem liší, " +
      "takže starší sourozenec vyjde dráž. Výsledek uvidíte celkem i rozepsaný po dětech; " +
      "soud stanovuje výživné na každé dítě zvlášť.",
  },
  {
    otazka: "A když má jeden z rodičů dítě z jiného vztahu?",
    odpoved:
      "Vyplňte to u něj do „dalších dětí“. Koeficient se řídí celkovým počtem vyživovacích " +
      "povinností, a ten může být u každého rodiče jiný — další dítě platícího rodiče výživné " +
      "sníží, další dítě toho přijímajícího ho naopak zvýší. Používáme koeficient, ne " +
      "samostatnou řadu z tabulky; je to zjednodušení.",
  },
  {
    otazka: "Co kalkulačka nepočítá?",
    odpoved:
      "Kontrolní částku, tedy minimum, které musí platícímu rodiči zůstat. Dál majetek " +
      "a potenciální příjem — soud může počítat s tím, kolik by rodič vydělávat mohl, ne jen " +
      "s tím, kolik vydělává. U víc vyživovacích povinností používáme koeficient místo " +
      "samostatné řady z tabulky. A u nadstandardních příjmů tabulka spolehlivě nefunguje vůbec.",
  },
  {
    otazka: "Ukládají se někam moje příjmy?",
    odpoved:
      "Ne. Výpočet běží přímo ve vašem prohlížeči. Když si necháte poslat PDF nebo výpočet " +
      "přenesete do aplikace, příjmy se použijí jen k výpočtu a do žádné databáze se " +
      "neukládají. V PDF jsou proto, aby bylo vidět, z čeho číslo vyšlo.",
  },
  {
    otazka: "Co s výsledkem dál?",
    odpoved:
      "Výsledek je začátek jednání, ne jeho konec. Nejlevnější a nejrychlejší cesta je " +
      "dohoda rodičů, kterou soud schválí — spor o výživné stojí měsíce a peníze na obou " +
      "stranách. A pak přijde to, na co kalkulačka neodpoví: lyžák, tábor, rovnátka a školní " +
      "výlety se platí navíc a právě u nich vzniká většina pozdějších sporů.",
    odkaz: { href: "/vzor-dohody-o-stridave-peci", text: "Vzor dohody rodičů" },
  },

];

export default function KalkulackaVyzivnehoStranka() {
  return (
    <>
      <Hero
        kompaktni
        nadtitulek="Podle tabulky ministerstva"
        nadpis="Kalkulačka výživného 2026"
        perex="Oba příjmy, všechny děti i střídavá péče. Výsledek hned, bez registrace."
      >
        <PruhKlidoo co="Kalkulačka níže je" />
      </Hero>

      <Sloupec>
        <KalkulackaVyzivneho />

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Časté otázky
          </h2>
          <div className="mt-4 space-y-2">
            {OTAZKY.map(({ otazka, odpoved, odkaz }) => (
              <details
                key={otazka}
                className="group rounded-2xl border border-line bg-surface px-4 py-3.5"
              >
                <summary className="cursor-pointer font-medium text-ink">{otazka}</summary>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted">{odpoved}</p>
                {odkaz ? (
                  <Link
                    href={odkaz.href}
                    className="mt-2 inline-block text-[0.95rem] font-medium text-brand underline underline-offset-4"
                  >
                    {odkaz.text}
                  </Link>
                ) : null}
              </details>
            ))}
          </div>
        </section>

        <p className="mt-6 rounded-2xl bg-surface-2 px-4 py-3.5 text-sm leading-relaxed text-ink-muted">
          <strong className="text-ink">Výsledek je orientační, ne právně závazný.</strong>{" "}
          Doporučující tabulka ministerstva je pomůcka, kterou soudy používají jen podpůrně;
          konkrétní částku určuje soud podle potřeb dítěte a možností obou rodičů. Oficiální
          kalkulačka je na{" "}
          <a
            href="https://vyzivne.justice.cz/kalkulacka-vyzivneho/"
            className="underline underline-offset-4"
            rel="noopener"
          >
            vyzivne.justice.cz
          </a>
          .
        </p>

        {/* Jedna nabídka Klidoo na konci, ne tři po celé stránce. Kdo sem
            dojel, výsledek už má a rozcestí pod ním minul — tady dostane
            poslední, klidnou verzi téže nabídky. */}
        <section className="mt-12 rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink">
            Výživné je jedna položka. Zbytek si pamatuje {ZNACKA}.
          </h2>
          <ul className="mt-4 space-y-2 text-[0.95rem] text-ink">
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-parent-a" aria-hidden />
              U koho jsou děti tenhle týden — vidí to oba rodiče
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-parent-b" aria-hidden />
              Kdo co zaplatil a kdo komu kolik dluží, i s účtenkami
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-parent-a" aria-hidden />
              Druhý rodič má přístup zdarma
            </li>
          </ul>
          <Link
            href="/registrace"
            className="mt-5 inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
          >
            Vyzkoušet zdarma
          </Link>
          <p className="mt-3 text-sm text-ink-muted">
            {ZKUSEBNI_SLIB.dni} dní zdarma se všemi funkcemi, bez karty. Potom{" "}
            {korun(CENIK[0].cena)} měsíčně za celou rodinu.
          </p>
        </section>

        <DalsiCteni
          odkazy={[
            {
              href: "/kalkulacka",
              nazev: "Kalkulačka střídavé péče",
              popis: "Kolik nocí stráví děti u každého rodiče — podle vašeho rytmu střídání.",
            },
            {
              href: "/jak-funguje-stridava-pece",
              nazev: "Jak funguje střídavá péče",
              popis: "Podmínky, rytmy, trvalé bydliště a dávky. Bez právničiny.",
            },
          ]}
        />
      </Sloupec>

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

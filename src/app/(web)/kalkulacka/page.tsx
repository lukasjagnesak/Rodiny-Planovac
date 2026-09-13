import type { Metadata } from "next";
import Link from "next/link";
import {
  DalsiCteni,
  Hero,
  Pitch,
  Sloupec,
} from "@/components/web/prvky";
import { Kalkulacka } from "@/components/kalkulacka/kalkulacka";
import { LeadForm } from "@/components/web/lead-form";
import { ZNACKA } from "@/lib/brand";

const TITULEK = "Kalkulačka střídavé péče — kolik nocí u koho";
const POPISEK =
  "Spočítejte, u koho jsou děti který den a kolik nocí za rok stráví u každého rodiče. " +
  "Sudý a lichý týden, střídání po týdnu, schéma 2-2-3 i vlastní rozpis. Zdarma a bez registrace.";

export const metadata: Metadata = {
  title: TITULEK,
  description: POPISEK,
  alternates: { canonical: "/kalkulacka" },
  openGraph: { title: `${TITULEK} | ${ZNACKA}`, description: POPISEK, type: "website" },
};

/** Otázky, na které lidé v tomhle okamžiku hledají odpověď. */
const OTAZKY = [
  {
    otazka: "Jak se počítají noci ve střídavé péči?",
    odpoved:
      "Noc ze dne na den patří tomu rodiči, u kterého dítě ten večer usíná. Kalkulačka to " +
      "počítá stejně — proto ti u střídání po týdnu nevyjde přesně půl na půl každý měsíc, " +
      "ale za rok se to srovná.",
  },
  {
    otazka: "Proč u sudých a lichých týdnů někdy vyjdou dva týdny po sobě?",
    odpoved:
      "Protože některé roky mají 53 kalendářních týdnů. Na přelomu takového roku naváže " +
      "lichý týden na lichý a jeden rodič má děti dva týdny v kuse. Není to chyba výpočtu, " +
      "je to vlastnost číslování týdnů — a je dobré na to myslet dopředu.",
  },
  {
    otazka: "Co je schéma 2-2-3?",
    odpoved:
      "Dva dny u jednoho rodiče, dva u druhého a víkend se střídá. Děti tak nejsou od " +
      "žádného rodiče déle než tři dny, což se doporučuje u menších dětí. Cyklus se opakuje " +
      "po dvou týdnech.",
  },
  {
    otazka: "Můžeme mít rozpis, který nesedí na celé týdny?",
    odpoved:
      "Ano. Vyber Vlastní rozpis dnů a naklikej, který den patří komu. Rozpis může být " +
      "jednotýdenní, nebo dvoutýdenní — když se sudý a lichý týden liší.",
  },
  {
    otazka: "Ukládáte jména dětí?",
    odpoved:
      "Ne. Ke kalkulačce je nezadáváš a nikam se neukládají. Samotný výpočet navíc " +
      "probíhá u tebe v prohlížeči — na server se něco pošle až ve chvíli, kdy si rozpis " +
      "sám uložíš.",
  },
];

export default function KalkulackaPage() {
  return (
    <>
      <Hero
        nadtitulek="Kalkulačka · rozpis dnů a nocí"
        nadpis="Kolik nocí u koho"
        perex="Zadej, jak se u vás střídáte, a hned uvidíš rozpis dnů i to, kolik nocí stráví děti u každého z rodičů. Zdarma, bez registrace."
        siroky
      />

      <Sloupec siroky>
        <Kalkulacka />

        <article className="proza mt-10">
          <h2>Jak kalkulačka počítá</h2>
          <p>
            Noc patří tomu rodiči, u kterého dítě ten večer usíná — ne tomu, kdo měl toho dne
            víc hodin. Uvnitř pobytu je to jednoduché, den a noc patří témuž. Na dni předání
            záleží na tom, kdy se předává: odpoledne znamená, že dítě už spí u přebírajícího,
            ráno druhý den, že ještě u odcházejícího. Proto ti u týdenního střídání nevyjde
            přesně sedm nocí každý týden, ale za rok se to srovná.
          </p>
          <p>
            Sudý a lichý týden se počítá podle čísla kalendářního týdne, ne podle toho, kolikátý
            je to týden od začátku péče — stejně, jak to dělají soudy a školní rozvrhy. Schéma
            2-2-3 a vlastní rozpis dnů se opakují v čtrnáctidenním nebo týdenním cyklu, který si
            zadáš.
          </p>
          <p>Výpočet proběhne u tebe v prohlížeči. Na server se nic nepošle, dokud si sám rozpis neuložíš.</p>

          <h2>Co s tím dál</h2>
          <p>
            Rozpis dnů je základ, na kterém se pak počítá i{" "}
            <Link href="/kalkulacka-vyzivneho">výživné</Link> — rozsah péče je jedna ze dvou
            věcí, které rozhodují, kolik kdo platí. Když se s druhým rodičem na rozpisu
            shodnete, nejrychlejší cesta je{" "}
            <Link href="/vzor-dohody-o-stridave-peci">dohoda, kterou soud schválí</Link>, ne
            spor o to, kdo bude mít děti o víc dní navíc.
          </p>
          <p>
            A pak přijde to, na co kalkulačka neodpoví: kdo v tom kterém týdnu veze na kroužek,
            kdo zaplatil lyžák a kdo ví, že ve čtvrtek je třídní schůzka. To všechno běží dál i
            po tom, co je rozpis dnů hotový.
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
          magnet="stridava-pece"
          nadpis="Ať vám neuteče, co se změní"
          popis="Číslování týdnů, doporučené rozsahy péče i soudní praxe se čas od času mění. Dáme vědět, když se změní něco, co ovlivní váš rozpis."
          tlacitko="Dát vědět"
          hotovo="Díky. Ozveme se, až se něco změní."
        />

        <DalsiCteni
          odkazy={[
            {
              href: "/kalkulacka-vyzivneho",
              nazev: "Kalkulačka výživného",
              popis: "Kolik vyjde výživné podle tabulky ministerstva — i při střídavé péči.",
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
        nadpis={`Rozpis je začátek. ${ZNACKA} pamatuje zbytek.`}
        perex="Kalendář s nocí předání, kdo veze na kroužek a kdo zaplatil co za dítě — na jednom místě, ne ve dvou hlavách."
        polozky={[
          {
            nazev: "Kalendář s nocí předání",
            popis: "Stejný výpočet jako tady, ale rovnou v appce a s ručními výjimkami.",
          },
          {
            nazev: "Kroužky a odvoz",
            popis: "U každého termínu jméno, kdo veze tam a kdo zpátky.",
          },
          {
            nazev: "Výdaje s účtenkou",
            popis: "Vyfotíš, appka spočítá, kdo komu kolik dluží.",
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

      {/* Strukturovaná data, aby otázky mohly vyjet přímo ve vyhledávání. */}
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

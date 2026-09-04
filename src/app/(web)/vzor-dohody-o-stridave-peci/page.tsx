import type { Metadata } from "next";
import Link from "next/link";
import {
  DalsiCteni,
  Hero,
  Pitch,
  Poznamka,
  Sloupec,
  Tabulka,
} from "@/components/web/prvky";
import { LeadForm } from "@/components/web/lead-form";
import { ZNACKA } from "@/lib/brand";

const TITULEK = "Vzor dohody o střídavé péči (2026)";
const POPISEK =
  "Vzor dohody o střídavé péči k okopírování. Co musí obsahovat, aby ji soud schválil, " +
  "a na co se nejčastěji zapomíná. Zdarma.";

export const metadata: Metadata = {
  title: TITULEK,
  description: POPISEK,
  alternates: { canonical: "/vzor-dohody-o-stridave-peci" },
  openGraph: { title: `${TITULEK} | ${ZNACKA}`, description: POPISEK, type: "article" },
};

export default function VzorDohody() {
  return (
    <>
      <Hero
        nadtitulek="Vzor · aktualizováno 2026"
        nadpis="Dohoda o střídavé péči, kterou soud nevrátí"
        perex="Připravený text, do kterého doplníte jména a termíny. Včetně sedmi bodů, na které se nejčastěji zapomíná a kvůli kterým se rodiče o rok později znovu hádají."
      />

      <Sloupec>
        <article className="proza">
          <Poznamka druh="pozor">
            <strong className="text-ink">Než začnete.</strong> Vzor je orientační pomůcka, ne
            právní služba. Každá rodina má jiné poměry a finální text si nechte projít
            advokátem specializovaným na rodinné právo. Dohodu rodičů o péči o nezletilé dítě
            schvaluje soud a bez jeho schválení není účinná.
          </Poznamka>

          <h2>Co dohoda musí obsahovat</h2>
          <p>
            Soud zkoumá jedinou věc: jestli je ujednání v zájmu dítěte. Prakticky to znamená,
            že text musí být natolik konkrétní, aby podle něj šlo žít bez dalšího vyjednávání.
            Dohoda, která říká „rodiče se budou střídat po týdnu“, je pro soud i pro život
            nedostatečná.
          </p>

          <Tabulka
            hlavicka={["Náležitost", "Musí být"]}
            radky={[
              ["Označení dítěte i obou rodičů", "vždy"],
              ["Rytmus střídání a přesný den i hodina předání", "vždy"],
              ["Místo předávání", "vždy"],
              ["Výživné, nebo výslovné ujednání, že se neplatí", "vždy"],
              ["Prázdniny, svátky, narozeniny", "vždy"],
              ["Kdo hradí kroužky, lékaře, školu", "doporučeno"],
              ["Jak si rodiče předávají informace", "doporučeno"],
            ]}
          />

          <h2>Sedm bodů, na které se zapomíná</h2>
          <p>
            Tohle není právní minimum. Je to seznam věcí, kvůli kterým se rodiče vracejí
            k soudu, protože je v dohodě neměli.
          </p>
          <ol>
            <li>
              <strong>Nemoc dítěte.</strong> Zůstává u toho rodiče, u kterého onemocnělo, nebo
              se střídání dodrží? Rozhodněte předem, v horečce se to řeší špatně.
            </li>
            <li>
              <strong>Zahraniční cesty.</strong> Kdo drží pas, do kdy se druhý rodič dozví
              o výjezdu a co když termín zasáhne do jeho týdne.
            </li>
            <li>
              <strong>Věci dítěte.</strong> Co putuje mezi domovy a co má být zdvojené.
              Nejčastější zdroj drobných konfliktů vůbec.
            </li>
            <li>
              <strong>Změna termínu.</strong> Do kdy se dá požádat o výměnu a co znamená
              mlčení druhého rodiče.
            </li>
            <li>
              <strong>Kontakt s dítětem u druhého rodiče.</strong> Denní telefonát, videohovor,
              nebo nic — ale ať to je napsané.
            </li>
            <li>
              <strong>Nový partner.</strong> Ne jako zákaz, ale jako dohoda o tom, kdy a jak se
              s ním dítě seznámí.
            </li>
            <li>
              <strong>Revize dohody.</strong> Termín, kdy si sednete a text projdete. Dítě za
              tři roky bude jiné.
            </li>
          </ol>
        </article>

        <LeadForm
          id="stahnout"
          magnet="vzor-dohody"
          nadpis="Vzor dohody — celý text"
          popis="Text k okopírování do Wordu, s poznámkami u míst, kde se nejčastěji chybuje. Otevře se rovnou tady, nic nemusíte hledat v příloze."
          tlacitko="Chci vzor"
          hotovo="Díky. Vzor je připravený — otevřete si ho, zkopírujte do Wordu a doplňte údaje."
          odkaz={{ href: "/vzor-dohody-o-stridave-peci/text", popisek: "Otevřít vzor dohody" }}
        />

        <article className="proza">
          <h2>Co dělat po podpisu</h2>
          <p>
            Dohodu podáte k okresnímu soudu podle bydliště dítěte spolu s návrhem na její
            schválení. Soud zpravidla nařídí jednání, kde ověří, že oba rodiče text chápou
            stejně a že odpovídá zájmu dítěte. Do doby schválení platí dosavadní stav.
          </p>
          <p>
            Až ji soud schválí, začne ta těžší část: podle dohody se musí každý týden reálně
            žít. A to je přesně místo, kde většina rodičů zjistí, že papír a provoz jsou dvě
            různé věci.
          </p>
          <p>
            Než text finalizujete, projděte si{" "}
            <Link href="/jak-funguje-stridava-pece">rytmy střídání a jejich dopady</Link> a{" "}
            <Link href="/kalkulacka-vyzivneho">orientační výši výživného</Link> — obojí do
            dohody patří.
          </p>
        </article>

        <DalsiCteni
          odkazy={[
            {
              href: "/jak-funguje-stridava-pece",
              nazev: "Jak funguje střídavá péče",
              popis: "Podmínky, rytmy, výživné a trvalé bydliště. Bez právničiny.",
            },
            {
              href: "/checklist-prvnich-30-dni",
              nazev: "Checklist prvních 30 dní",
              popis: "Co zařídit hned po schválení, ať se to za půl roku neřeší dohadem.",
            },
          ]}
        />
      </Sloupec>

      <Pitch
        nadpis="Dohoda je papír. Klidoo je ten týden."
        perex="Kalendář pro dvě domácnosti, kde oba rodiče vidí totéž. Kdo veze dítě na kroužek, kdy je předávka, co se zaplatilo. Bez dohadování a bez zpráv ve dvě ráno."
        polozky={[
          {
            nazev: "Rozvrh na dvě domácnosti",
            popis: "Každý den má barvu podle toho, kdo má dítě. Vidíte to na první pohled.",
          },
          {
            nazev: "Kroužky a vyzvedávání",
            popis: "U každé aktivity je jasně napsáno, kdo veze a kdo vyzvedává.",
          },
          {
            nazev: "Sdílené výdaje",
            popis: "Škola, lékař, brusle. Zapíšete jednou, dopočítá se samo.",
          },
          {
            nazev: "Druhý rodič zdarma",
            popis: "Platí jedna domácnost. Druhý rodič dostane přístup bez placení.",
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
            "@type": "Article",
            headline: TITULEK,
            description: POPISEK,
            inLanguage: "cs",
            publisher: { "@type": "Organization", name: ZNACKA },
          }),
        }}
      />
    </>
  );
}

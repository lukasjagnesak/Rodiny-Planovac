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

const TITULEK = "Jak funguje střídavá péče: podmínky, rytmus a výživné";
const POPISEK =
  "Jak střídavá péče funguje v praxi — podmínky, jaké rytmy střídání se používají, " +
  "jak je to s výživným a trvalým bydlištěm. Srozumitelně a bez právničiny.";

export const metadata: Metadata = {
  title: TITULEK,
  description: POPISEK,
  alternates: { canonical: "/jak-funguje-stridava-pece" },
  openGraph: { title: `${TITULEK} | ${ZNACKA}`, description: POPISEK, type: "article" },
};

export default function JakFungujeStridavaPece() {
  return (
    <>
      <Hero
        nadtitulek="Průvodce · čtení na 8 minut"
        nadpis="Jak funguje střídavá péče"
        perex="Bez právničiny a bez tvrzení, že je to pro každého. Co musí být splněno, jaké rytmy se v Česku používají a co vás čeká v prvních měsících."
      />

      <Sloupec>
        <article className="proza">
          <h2>Co střídavá péče je</h2>
          <p>
            Dítě žije střídavě u obou rodičů a oba mají stejná rodičovská práva i povinnosti.
            Není to totéž jako široký styk, kdy jeden rodič má dítě ve výhradní péči a druhý
            ho vídá o víkendech. U střídavé péče je dítě u obou doma.
          </p>
          <p>
            Neznamená to automaticky přesnou půlku času. Soudy schvalují i nerovnoměrné
            rozdělení, když lépe odpovídá provozu rodiny a škole.
          </p>

          <h2>Kdy ji soud schválí</h2>
          <p>
            Rozhoduje jediné kritérium: zájem dítěte. V praxi soud zkoumá čtyři věci.
          </p>
          <ol>
            <li>
              <strong>Oba rodiče jsou způsobilí a mají o péči skutečný zájem.</strong> Ne jako
              argument ve sporu, ale doopravdy.
            </li>
            <li>
              <strong>Vzdálenost mezi domovy.</strong> Dítě musí zvládnout docházet do stejné
              školy z obou míst. Tohle bývá nejčastější důvod zamítnutí.
            </li>
            <li>
              <strong>Vazba dítěte k oběma rodičům.</strong> Posuzuje se podle věku a
              dosavadního zapojení do péče.
            </li>
            <li>
              <strong>Schopnost rodičů spolu komunikovat.</strong> Nemusíte být přátelé. Musíte
              být schopni se domluvit na tom, kdo vyzvedne dítě ze školky.
            </li>
          </ol>

          <Poznamka>
            <strong className="text-ink">Rozšířený omyl.</strong> Nesouhlas jednoho rodiče
            střídavou péči automaticky nevylučuje. Soud zkoumá, jestli je nesouhlas věcný,
            nebo jestli jde o pokračování sporu mezi dospělými. Zároveň ale platí opak:
            dlouhodobě vyhrocený konflikt je legitimní důvod střídavou péči nenařídit, protože
            by dítě žilo uprostřed přestřelky.
          </Poznamka>

          <h2>Jaké rytmy se používají</h2>
          <p>
            Zákon žádný rytmus nepředepisuje. Tohle jsou varianty, které v Česku uvidíte
            nejčastěji, a to, komu sedí.
          </p>

          <Tabulka
            posledniCiselny
            hlavicka={["Rytmus", "Komu sedí", "Předávek za měsíc"]}
            radky={[
              ["Týden / týden", "Školní děti, nejběžnější varianta", "4"],
              ["14 dní / 14 dní", "Starší děti, větší vzdálenost", "2"],
              ["2–2–3 (střídavě)", "Předškoláci, kteří hůř snášejí dlouhý odstup", "~9"],
              ["Půlka týdne", "Malé děti, rodiče blízko sebe", "~9"],
            ]}
          />

          <p>
            Platí jednoduché pravidlo: <strong>čím menší dítě, tím kratší intervaly</strong> — a
            tím víc předávek, které je potřeba uhlídat. Rodiče předškoláků mají v kalendáři
            skoro desetkrát měsíčně okamžik, kdy se něco může pokazit.
          </p>
          <p>
            Kolik nocí vám který rytmus reálně vyjde, si můžete naklikat v{" "}
            <Link href="/kalkulacka">kalkulačce střídavé péče</Link> — včetně vlastního rozpisu
            po dnech.
          </p>

          <h2>Výživné při střídavé péči</h2>
          <p>
            Nejčastější mýtus je, že se při střídavé péči neplatí. Platí se tehdy, když mají
            rodiče výrazně odlišné příjmy — dítě má právo na srovnatelnou životní úroveň
            v obou domácnostech. Při podobných příjmech a rovnoměrném střídání se výživné
            často nestanoví vůbec.
          </p>
          <p>
            Orientační výši si spočítáte v{" "}
            <Link href="/kalkulacka-vyzivneho">
              kalkulačce podle doporučující tabulky Ministerstva spravedlnosti
            </Link>
            .
          </p>

          <h2>Trvalé bydliště, škola, dávky</h2>
          <p>
            Dítě má vždy jen jedno trvalé bydliště, i když bydlí střídavě. Rodiče se na něm
            musí dohodnout, jinak rozhodne soud. Od trvalého bydliště se odvíjí spádová škola a
            část administrativy.
          </p>
          <p>
            Přídavek na dítě a další dávky se nedělí — pobírá je jeden rodič. Daňové
            zvýhodnění na dítě může za daný měsíc uplatnit také jen jeden z rodičů. Domluvte se
            na tom písemně předem, tohle je zdroj sporů každý únor.
          </p>
        </article>

        <LeadForm
          magnet="checklist-30-dni"
          nadpis="Checklist prvních 30 dní"
          popis="Devatenáct věcí, které je potřeba zařídit v prvním měsíci střídavé péče — od zdvojení věcí přes školu až po daňové zvýhodnění. Jedna strana k vytištění na lednici."
          tlacitko="Chci checklist"
          hotovo="Díky. Checklist je připravený k otevření i vytištění — a dáme vědět, až přibude něco dalšího."
          odkaz={{ href: "/checklist-prvnich-30-dni", popisek: "Otevřít checklist" }}
        />

        <article className="proza">
          <h2>Co bývá nejtěžší</h2>
          <p>
            Právní část se vyřeší jednou. Provozní část se řeší každý týden až do zletilosti
            dítěte, a právě na ní se střídavá péče nejčastěji zadrhne.
          </p>
          <ul>
            <li>
              <strong>Informace se ztrácejí.</strong> Škola napíše jednomu rodiči, druhý o tom
              neví. Zubař, plavky, výlet, souhlas s focením.
            </li>
            <li>
              <strong>Věci zůstávají u druhého.</strong> Cvičky, čtenářský deník, nabíječka.
              Vypadá to jako maličkost, dokud dítě nemá v pondělí ráno tělocvik.
            </li>
            <li>
              <strong>Peníze se nepočítají.</strong> Kdo zaplatil lyžák, kdo brusle, kdo tábor.
              Za rok si to nikdo nepamatuje a vzniká pocit křivdy.
            </li>
            <li>
              <strong>Domlouvání zabírá energii.</strong> Deset zpráv o tom, kdo vyzvedne Emu ve
              čtvrtek, je deset příležitostí k hádce.
            </li>
          </ul>
          <p>
            Nic z toho není právní problém. Je to provozní problém — a ten se dá vyřešit tím,
            že oba rodiče koukají do stejného rozvrhu.
          </p>
        </article>

        <DalsiCteni
          odkazy={[
            {
              href: "/vzor-dohody-o-stridave-peci",
              nazev: "Vzor dohody o střídavé péči",
              popis: "Co musí obsahovat, aby ji soud schválil, a sedm bodů, na které se zapomíná.",
            },
            {
              href: "/kalkulacka-vyzivneho",
              nazev: "Kalkulačka výživného",
              popis: "Podle tabulky ministerstva, s příjmy obou rodičů i rozsahem péče.",
            },
          ]}
        />
      </Sloupec>

      <Pitch
        nadpis="Kdo, kdy, kam. Bez dohadování."
        perex={`${ZNACKA} je rozvrh dětí pro dvě domácnosti. Oba rodiče vidí stejný týden, stejné kroužky a stejné výdaje — takže se není o čem přít.`}
        polozky={[
          {
            nazev: "Jeden týden, dvě barvy",
            popis: "Na první pohled víte, u koho dítě je a kdo ho kam veze.",
          },
          {
            nazev: "Nic se neztratí",
            popis:
              "Zprávy ze školy, doklady od lékaře, potvrzení o platbě — všechno na jednom místě.",
          },
          {
            nazev: "Připomínky předem",
            popis: "Notifikace před předávkou i před kroužkem. Oběma rodičům.",
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
            "@type": "Article",
            headline: TITULEK,
            description: POPISEK,
            inLanguage: "cs",
            about: "Střídavá péče",
            publisher: { "@type": "Organization", name: ZNACKA },
          }),
        }}
      />
    </>
  );
}

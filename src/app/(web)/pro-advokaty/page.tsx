import type { Metadata } from "next";
import Link from "next/link";
import { Scale } from "lucide-react";
import { DalsiCteni, Hero, Poznamka, Sloupec, Tabulka } from "@/components/web/prvky";
import { LeadForm } from "@/components/web/lead-form";
import { PARTNERSKY_EMAIL } from "@/lib/partneri";
import { ZNACKA } from "@/lib/brand";

const TITULEK = "Pro advokáty: co klientům zbyde po rozsudku";
const POPISEK =
  "Klidoo pro advokátní kanceláře specializované na rodinné právo. Materiály pro klienty, " +
  "doložitelný přehled výdajů a nástroj, díky kterému se klienti nevracejí s provozními spory.";

export const metadata: Metadata = {
  title: TITULEK,
  description: POPISEK,
  alternates: { canonical: "/pro-advokaty" },
  openGraph: { title: `${TITULEK} | ${ZNACKA}`, description: POPISEK, type: "website" },
};

const CO_NABIZIME = [
  {
    nazev: "Přístup pro kancelář zdarma",
    popis:
      "Účet, ve kterém si režim naklikáte s klientem přímo na schůzce. Ukázat rytmus " +
      "střídání na kalendáři trvá minutu; vysvětlovat ho slovy dvacet.",
  },
  {
    nazev: "Materiály pro klienty",
    popis:
      "Vzor dohody, checklist prvních 30 dní a kalkulačky. Můžete je posílat jako přílohu " +
      "k e-mailu nebo odkazem — jsou zdarma a bez registrace.",
  },
  {
    nazev: "Doložitelný přehled výdajů",
    popis:
      "Klient vám u sporu o mimořádné výdaje přinese soupis s doklady a datem, ne pytel " +
      "účtenek a tvrzení proti tvrzení. Export do tabulky je součástí.",
  },
  {
    nazev: "Zpětná vazba k vzorům",
    popis:
      "Naše vzory čtou tisíce rodičů. Když v nich uvidíte nepřesnost, opravíme ji a uvedeme " +
      "vás jako odborného garanta — pokud o to stojíte.",
  },
];

export default function ProAdvokaty() {
  return (
    <>
      <Hero
        nadtitulek={
          <>
            <Scale size={16} aria-hidden />
            Pro advokátní kanceláře
          </>
        }
        nadpis="Spor skončí rozsudkem. Klientovi začne provoz."
        perex="Rodinné právo má nepříjemnou vlastnost: velká část klientů se vrací s věcmi, které nejsou právní. Kdo zaplatil lyžák, kdo nepřevzal dítě včas, kdo se nedozvěděl o zubaři. Klidoo tuhle vrstvu odstraní."
      >
        <Link
          href="#spoluprace"
          className="inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
        >
          Domluvit spolupráci
        </Link>
      </Hero>

      <Sloupec>
        <article className="proza">
          <h2>Proč vás to má zajímat</h2>
          <p>
            Dohoda nebo rozsudek řeší rámec. Neřeší, jestli se rodiče v úterý domluví na
            vyzvednutí ze školky a jestli si po roce vzpomenou, kdo zaplatil tábor. Právě
            z těchhle věcí vyrůstá většina návrhů na změnu úpravy poměrů — a stojí čas vás
            i klienta.
          </p>
          <p>
            Klient, který má provoz podchycený, se vrací méně často a s lepšími podklady. To je
            dobré pro něj i pro pověst kanceláře. Konfliktní klientelu vám ostatně nikdo
            nevezme — jen jí ubude spory, které nikam nevedou.
          </p>

          <h2>Co u sporu opravdu pomůže</h2>
        </article>

        <Tabulka
          hlavicka={["Typická situace", "Čím se obvykle dokládá", "S Klidoo"]}
          radky={[
            [
              "Spor o mimořádné výdaje",
              "Pytel účtenek, výpisy z účtu",
              "Soupis s doklady, daty a rozdělením",
            ],
            [
              "Tvrzení o nedodržování rytmu",
              "Zprávy v telefonu, svědci",
              "Historie kalendáře a předávek",
            ],
            [
              "„O tom mi nikdo neřekl“",
              "Screenshoty konverzací",
              "Společný záznam události u obou rodičů",
            ],
            [
              "Návrh na změnu poměrů",
              "Odhad počtu nocí",
              "Spočítané noci za období",
            ],
          ]}
        />

        <Poznamka>
          <strong className="text-ink">Žádné provize.</strong> Advokátům provizi za
          doporučení klienta nenabízíme a nabízet nebudeme — profesní pravidla to
          neumožňují a nechceme vás dostat do situace, kterou byste museli řešit s komorou.
          Spolupráce s kanceláří stojí na tom, že nástroj klientům pomáhá. Provizní program
          máme jen pro{" "}
          <Link href="/pro-mediatory">mediátory</Link>, kterých se stejná pravidla netýkají.
        </Poznamka>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Co pro kanceláře děláme
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {CO_NABIZIME.map(({ nazev, popis }) => (
              <div key={nazev} className="card p-5">
                <h3 className="font-display font-semibold text-ink">{nazev}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-muted">{popis}</p>
              </div>
            ))}
          </div>
        </section>

        <LeadForm
          id="spoluprace"
          magnet="advokati"
          partner
          varianta="svetly"
          nadpis="Ozveme se do dvou pracovních dnů"
          popis="Napište, jestli chcete přístup pro kancelář, materiály pro klienty, nebo si o tom nejdřív povídat. Ozve se člověk, ne automat."
          tlacitko="Odeslat"
          hotovo="Díky, máme to. Ozveme se do dvou pracovních dnů."
        />

        <p className="text-sm text-ink-subtle">
          Radši e-mailem? Napište na{" "}
          <a href={`mailto:${PARTNERSKY_EMAIL}`} className="text-brand underline">
            {PARTNERSKY_EMAIL}
          </a>
          .
        </p>

        <DalsiCteni
          odkazy={[
            {
              href: "/pro-mediatory",
              nazev: "Pro mediátory",
              popis: `Provizní program a nástroj, který dohodu udrží naživu.`,
            },
            {
              href: "/vzor-dohody-o-stridave-peci",
              nazev: "Náš vzor dohody",
              popis: "To, co posíláme klientům. Rádi ho probereme s vámi.",
            },
          ]}
        />
      </Sloupec>

      <div className="h-16" />
    </>
  );
}

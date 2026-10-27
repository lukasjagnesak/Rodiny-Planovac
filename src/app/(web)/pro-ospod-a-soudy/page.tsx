import type { Metadata } from "next";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { DalsiCteni, Hero, Poznamka, Sloupec, Vlastnosti } from "@/components/web/prvky";
import { LeadForm } from "@/components/web/lead-form";
import { Formulace } from "@/components/web/formulace";
import { PARTNERSKY_EMAIL } from "@/lib/partneri";
import { ZNACKA } from "@/lib/brand";

const TITULEK = "Pro OSPOD a soudy";
const POPISEK =
  `${ZNACKA} pro orgány sociálně-právní ochrany dětí a soudy: neutrální nástroj pro ` +
  "rodiče ve střídavé péči, rok zdarma pro rodiny, které k nám pošlete, a formulace do dohody.";

export const metadata: Metadata = {
  title: TITULEK,
  description: POPISEK,
  alternates: { canonical: "/pro-ospod-a-soudy" },
  openGraph: { title: `${TITULEK} | ${ZNACKA}`, description: POPISEK, type: "website" },
};

/**
 * Stránka pro OSPOD a soudy.
 *
 * Publikum je jiné než u mediátorů: veřejná instituce, žádný obchod.
 * Proto bez provize a bez prodejních slov — co nástroj dělá, co nedělá,
 * a že rodiny od nich nic neplatí. A hlavně neutralita: pracovnice OSPOD
 * se první zeptá, jestli to není nástroj jednoho rodiče proti druhému.
 *
 * Nic, co aplikace neumí. Přístup pro pracovníky OSPOD k datům rodiny
 * zatím není — proto tu stojí, že výpis přináší rodič.
 */
export default function ProOspodASoudy() {
  return (
    <>
      <Hero
        nadtitulek={
          <>
            <Landmark size={16} aria-hidden />
            Pro OSPOD a soudy
          </>
        }
        nadpis="Rozhodnutí řeší rámec. Klidoo řeší úterky."
        perex="Kdo má děti o prázdninách, kdo zaplatil tábor, proč se nepředalo v pátek. Z drobností, které nikde nejsou zapsané, vznikají další podání. Klidoo je místo, kde je to zapsané — pro oba rodiče stejně."
      >
        <Link
          href="#spoluprace"
          className="inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
        >
          Domluvit spolupráci
        </Link>
      </Hero>

      <Sloupec>
        <Vlastnosti
          polozky={[
            {
              nazev: "Neutrální k oběma rodičům",
              popis:
                "Oba vidí totéž a mají stejná práva. Žádné soukromé poznámky „na toho druhého“.",
            },
            {
              nazev: "Záznam, který nejde přepsat",
              popis:
                "Odeslanou zprávu nemůže upravit ani smazat žádný z rodičů. Čas odeslání i přečtení je u ní.",
            },
            {
              nazev: "Výpis pro řízení",
              popis:
                "Rodič si stáhne výpis zpráv a souhrn péče a nákladů za období a přinese ho sám.",
            },
            {
              nazev: "Rok zdarma pro rodiny od vás",
              popis:
                "Přes kód vašeho pracoviště. Bez karty, druhý rodič neplatí nikdy. Bez provize.",
            },
          ]}
        />

        <article className="proza mt-12">
          <h2>Co Klidoo dělá</h2>
          <ul>
            <li>
              <strong>Kalendář péče</strong> podle dohody nebo rozhodnutí: střídání po týdnu,
              2-2-3, víkendy, prázdniny podle okresu, výjimky. Počítá noci u každého rodiče.
            </li>
            <li>
              <strong>Výdaje na děti</strong> s doklady a rozdělením podle dohodnutého klíče,
              včetně výživného.
            </li>
            <li>
              <strong>Zprávy mezi rodiči</strong> ve věcech dětí, oddělené od osobního
              telefonu, s časem odeslání a přečtení.
            </li>
            <li>
              <strong>Kroužky, škola, lékař, doklady</strong> na jednom místě pro oba.
            </li>
          </ul>

          <h2>Co Klidoo nedělá</h2>
          <ul>
            <li>Nehodnotí rodiče a nic nikomu neoznamuje.</li>
            <li>Nenahrazuje dohodu, rozhodnutí ani práci OSPOD.</li>
            <li>
              Nedává nám ani vám přístup k datům rodin. Výpis do řízení přináší rodič sám
              a sám rozhodne, komu ho dá.
            </li>
          </ul>
        </article>

        <Poznamka>
          <strong className="text-ink">Bez provize a bez reklamy.</strong> Veřejné instituci
          žádnou odměnu za doporučení nenabízíme. Pracoviště dostane kód, přes který mají
          rodiny rok zdarma — nic víc. Jak chráníme data, popisujeme na stránce{" "}
          <Link href="/bezpecnost">Bezpečnost a data</Link>.
        </Poznamka>

        <article className="proza">
          <h2>Formulace do dohody</h2>
          <p>
            Pro dohodu rodičů nebo návrh na její schválení. Neutrální, s lhůtami k doplnění
            a s výhradou jiného nástroje, na kterém se rodiče shodnou.
          </p>
        </article>

        <Formulace id="formulace" />

        <LeadForm
          id="spoluprace"
          magnet="ospod"
          partner
          varianta="svetly"
          nadpis="Kód pro vaše pracoviště"
          popis="Napište pracoviště a kontakt. Pošleme kód, přes který mají rodiny rok zdarma, a letáček k vytištění. Ozve se člověk, ne automat."
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
              href: "/bezpecnost",
              nazev: "Bezpečnost a data",
              popis: "Kde data leží, kdo je vidí a co s nimi nikdy neděláme.",
            },
            {
              href: "/pro-mediatory",
              nazev: "Pro mediátory",
              popis: "Jak Klidoo udrží mediační dohodu naživu.",
            },
          ]}
        />
      </Sloupec>

      <div className="h-16" />
    </>
  );
}

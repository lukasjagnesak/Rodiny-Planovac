import type { Metadata } from "next";
import Link from "next/link";
import { Handshake } from "lucide-react";
import { DalsiCteni, Hero, Poznamka, Sloupec, Tabulka } from "@/components/web/prvky";
import { LeadForm } from "@/components/web/lead-form";
import {
  MINIMALNI_VYPLATA_KC,
  PARTNERSKY_EMAIL,
  PLATNOST_DOPORUCENI_DNI,
  PROVIZE_PROCENTO,
  VYPLATA_OBDOBI,
} from "@/lib/partneri";
import { ZNACKA } from "@/lib/brand";

const TITULEK = "Pro mediátory: provize za doporučení";
const POPISEK =
  `Partnerský program Klidoo pro mediátory. ${PROVIZE_PROCENTO} % z předplatného ` +
  "doporučených rodin a nástroj, díky kterému dohoda vydrží i po skončení mediace.";

export const metadata: Metadata = {
  title: TITULEK,
  description: POPISEK,
  alternates: { canonical: "/pro-mediatory" },
  openGraph: { title: `${TITULEK} | ${ZNACKA}`, description: POPISEK, type: "website" },
};

export default function ProMediatory() {
  return (
    <>
      <Hero
        nadtitulek={
          <>
            <Handshake size={16} aria-hidden />
            Partnerský program
          </>
        }
        nadpis="Dohoda vydrží tak dlouho, jak dlouho podle ní jde žít"
        perex="Odejdou od vás domluvení. Za tři měsíce se pohádají o to, kdo veze na kroužek a kdo zaplatil tábor — protože rytmus, na kterém jste se shodli, existuje jen na papíře. Klidoo z něj udělá provoz."
      >
        <Link
          href="#program"
          className="inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
        >
          Zapojit se do programu
        </Link>
      </Hero>

      <Sloupec>
        <article className="proza">
          <h2>Proč to má smysl pro vaši praxi</h2>
          <p>
            Mediace stojí a padá s tím, jestli výsledek přežije návrat do všedního dne. Rytmus
            střídání, klíč na mimořádné výdaje a způsob předávání informací se domluví u vás —
            a pak se na ně měsíc zapomíná, dokud první konflikt nedokáže, že dohoda nikde
            nebyla.
          </p>
          <p>
            Klidoo dohodu přepíše do kalendáře. Rytmus je vidět, výdaje se evidují s doklady a
            informace mají jedno místo. To, co jste dojednali, tím pádem zůstává na očích i
            v týdnu, kdy spolu rodiče zrovna nemluví.
          </p>
        </article>

        <section className="mt-10" id="program">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Podmínky programu
          </h2>
          <Tabulka
            hlavicka={["Co", "Jak"]}
            radky={[
              [
                "Provize",
                `${PROVIZE_PROCENTO} % z předplatného, které doporučená rodina zaplatí v prvním roce`,
              ],
              [
                "Doporučení",
                `Vlastní odkaz s kódem. Počítá se ${PLATNOST_DOPORUCENI_DNI} dní od prvního prokliku`,
              ],
              ["Výplata", `${VYPLATA_OBDOBI}, od ${MINIMALNI_VYPLATA_KC.toLocaleString("cs-CZ")} Kč`],
              ["Přístup pro vás", "Zdarma, včetně ukázkové rodiny pro práci na sezení"],
              ["Materiály", "Vzor dohody, checklist a kalkulačky pod vaším odkazem"],
              ["Závazek", "Žádný. Program lze kdykoli opustit"],
            ]}
          />
        </section>

        <Poznamka>
          <strong className="text-ink">Provizi říkáme provize.</strong> Klientům se to řekne
          nahlas — do materiálů i na stránku, kam je pošlete, patří věta o tom, že za
          doporučení dostáváte podíl. Mediace stojí na nestrannosti a skryté odměně by ji
          rozbily. Když vám to nesedí, můžete program používat bez provize; přístup a
          materiály zůstanou.
        </Poznamka>

        <article className="proza">
          <h2>Co s tím na sezení uděláte</h2>
          <ol>
            <li>
              <strong>Rytmus si naklikáte přímo na místě.</strong> Rodiče vidí kalendář, ne
              popis. „Každý druhý týden“ najednou znamená konkrétní dny včetně toho, že jednomu
              vyjdou tři víkendy po sobě.
            </li>
            <li>
              <strong>Klíč na výdaje dostane tvar.</strong> Zadá se poměr a hranice, od které
              je výdaj mimořádný. Pak už se jen zapisuje.
            </li>
            <li>
              <strong>Informace mají jedno místo.</strong> Škola, lékař, kroužky. Odpadne
              „mně nikdo nic neřekl“, které bývá jádrem druhé mediace.
            </li>
            <li>
              <strong>Rodina odchází s nastaveným nástrojem</strong>, ne s dobrým úmyslem.
            </li>
          </ol>

          <h2>Co k tomu potřebujeme</h2>
          <p>
            Jméno, kontakt a to, kde působíte. Zapsané mediátory si ověříme v seznamu
            Ministerstva spravedlnosti; pokud zapsaný nejste, napište to rovnou — program je
            otevřený i vám, jen si o tom chceme povědět předem.
          </p>
        </article>

        <LeadForm
          magnet="mediatori"
          partner
          varianta="svetly"
          nadpis="Přihlásit se do programu"
          popis="Pošleme partnerský odkaz, přístup zdarma a materiály pro klienty. Ozve se člověk, ne automat."
          tlacitko="Odeslat"
          hotovo="Díky, máme to. Ozveme se do dvou pracovních dnů s partnerským odkazem."
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
              href: "/pro-advokaty",
              nazev: "Pro advokáty",
              popis: "Bez provizí — kanceláře mají jiná pravidla a jiný užitek.",
            },
            {
              href: "/vzor-dohody-o-stridave-peci",
              nazev: "Náš vzor dohody",
              popis: "To, co posíláme rodičům. Připomínky vítáme.",
            },
          ]}
        />
      </Sloupec>

      <div className="h-16" />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Sloupec, Nadtitulek } from "@/components/web/prvky";
import {
  TLACITKO_HLAVNI,
  TLACITKO_VEDLEJSI,
  VyzvaRegistrace,
} from "@/components/web/vyzva-registrace";
import { Ikona } from "@/components/ui/ikona";
import type { NazevIkony } from "@/lib/ikony";
import { ZNACKA } from "@/lib/brand";
import { BEZ_KARTY, PRO_JEDNOHO } from "@/lib/texty";

const TITULEK = "Jak funguje Klidoo: kalendář péče a výdaje";
const POPISEK =
  "Podívejte se na kalendář péče, kroužky, předávky a výdaje. Ukázky skutečné aplikace a jednoduchý začátek.";

export const metadata: Metadata = {
  title: { absolute: TITULEK },
  description: POPISEK,
  alternates: { canonical: "/jak-funguje" },
  openGraph: { title: TITULEK, description: POPISEK, type: "website", url: "/jak-funguje" },
};

/**
 * Důkaz, že aplikace funguje: skutečné obrazovky (ukázková rodina,
 * smyšlená jména) a co na nich rodič dělá. Sem vede „Podívat se do
 * aplikace“ z homepage a „Jak funguje“ z navigace.
 */
const BLOKY: {
  ikona: NazevIkony;
  stitek: string;
  nadpis: string;
  text: string;
  body: string[];
  snimek: string;
  alt: string;
}[] = [
  {
    ikona: "kalendar",
    stitek: "Kalendář péče",
    nadpis: "Víte, kdy jsou děti u koho. I o prázdninách.",
    text: "Nastavíte režim jednou a kalendář se vyplní sám na měsíce dopředu. Každý den má barvu rodiče, u kterého děti spí, den předání je vidět na první pohled.",
    body: [
      "Týden/týden, 2–2–3, sudé a liché týdny nebo vlastní rozpis",
      "Prázdniny a svátky podle okresu školy",
      "Změnu dnů navrhnete, druhý rodič ji schválí",
    ],
    snimek: "kalendar",
    alt: "Kalendář péče v aplikaci Klidoo s barevně rozlišenými dny a návrhem prohození",
  },
  {
    ikona: "auto",
    stitek: "Kroužky a doprava",
    nadpis: "Kdo veze tam a kdo zpátky.",
    text: "U každého kroužku je napsané, kdy je, kdo dítě odveze a kdo vyzvedne. Včetně toho, kdo to má příští týden, kdy jsou děti u druhého rodiče.",
    body: ["Pravidelné termíny a výjimky", "Řidič u každého termínu", "Cenu kroužku lze rozdělit mezi rodiče"],
    snimek: "krouzky",
    alt: "Seznam kroužků v aplikaci Klidoo s časy a tím, kdo veze",
  },
  {
    ikona: "skola",
    stitek: "Školní akce a rozvrhy",
    nadpis: "Rozvrh a akce ze školy pro oba rodiče.",
    text: "Rozvrh každého dítěte, odpadlé hodiny, suplování i zprávy z EduPage se stahují samy. Oba rodiče je vidí ve stejnou chvíli, bez přeposílání.",
    body: ["Propojení s EduPage", "Více dětí, i na různých školách", "Školní akce v kalendáři"],
    snimek: "rozvrh",
    alt: "Týdenní rozvrh dítěte v aplikaci Klidoo",
  },
  {
    ikona: "bankovka",
    stitek: "Výdaje a vyrovnání",
    nadpis: "Účtenky, podíly a kdo komu dluží.",
    text: "Vyfotíte účtenku, zadáte částku a podíl podle vaší dohody. Klidoo spočítá, kolik kdo zaplatil a kolik zbývá vyrovnat, a připraví QR platbu.",
    body: ["Podíl 50/50 nebo jak jste se dohodli", "Žádost o proplacení se schválením", "Přehled podle dětí a kategorií"],
    snimek: "vydaje",
    alt: "Výdaje v aplikaci Klidoo s kategoriemi a tím, kdo komu dluží",
  },
];

const KROKY: { nazev: string; popis: string; ikona: NazevIkony }[] = [
  { nazev: "Vytvoříte rodinu", popis: "Jméno rodiny a děti.", ikona: "rodina" },
  { nazev: "Nastavíte péči", popis: "Vyberete režim a den, kdy začíná.", ikona: "kalendar" },
  { nazev: "Doplníte, co potřebujete", popis: "Kroužky, školu, výdaje. Kdykoli později.", ikona: "mic" },
];

export default function JakFunguje() {
  return (
    <>
      <section className="pb-10 pt-10 sm:pb-14 sm:pt-16">
        <Sloupec siroky>
          <Nadtitulek>Jak funguje {ZNACKA}</Nadtitulek>
          <h1 className="mt-3 max-w-3xl font-display text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.9rem]">
            Jak vám Klidoo usnadní plánování péče
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
            Kalendář péče, kroužky, škola a výdaje na jednom místě. Níže jsou skutečné obrazovky
            aplikace, jen s vymyšlenou rodinou.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <VyzvaRegistrace stranka="jak-funguje" misto="hero" className={TLACITKO_HLAVNI}>
              Vytvořit rodinný kalendář
            </VyzvaRegistrace>
            <Link href="/cenik" className={TLACITKO_VEDLEJSI}>
              Ceník
            </Link>
          </div>
          <p className="mt-3 text-sm text-ink-muted">
            {BEZ_KARTY} · {PRO_JEDNOHO}
          </p>
        </Sloupec>
      </section>

      {BLOKY.map((b, i) => (
        <section
          key={b.snimek}
          className={i % 2 === 0 ? "border-y border-line bg-surface py-12 sm:py-16" : "py-12 sm:py-16"}
        >
          <Sloupec siroky>
            <div
              className={`grid items-center gap-8 lg:grid-cols-[1fr_auto] lg:gap-14 ${
                i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-brand">
                  <Ikona nazev={b.ikona} size={18} />
                  {b.stitek}
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                  {b.nadpis}
                </h2>
                <p className="mt-3 max-w-xl text-[1.0625rem] leading-relaxed text-ink-muted">{b.text}</p>
                <ul className="mt-4 space-y-2">
                  {b.body.map((bod) => (
                    <li key={bod} className="flex items-start gap-2.5 text-[0.95rem] text-ink">
                      <span className="mt-0.5 text-brand">
                        <Ikona nazev="stit" size={16} />
                      </span>
                      {bod}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mx-auto w-[230px] sm:w-[260px]">
                <div className="rounded-[2rem] border-[9px] border-ink/85 bg-canvas shadow-lg">
                  <div className="overflow-hidden rounded-[1.5rem]">
                    <Image
                      src={`/ukazky/${b.snimek}.png`}
                      alt={b.alt}
                      width={780}
                      height={1688}
                      sizes="(min-width: 640px) 260px, 230px"
                      priority={i === 0}
                      className="block h-auto w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Sloupec>
        </section>
      ))}

      <section className="py-14 sm:py-20">
        <Sloupec siroky>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Tři kroky k začátku
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {KROKY.map(({ nazev, popis, ikona }, i) => (
              <li key={nazev} className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-ink">
                    {i + 1}
                  </span>
                  <span className="text-brand">
                    <Ikona nazev={ikona} size={22} />
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{nazev}</h3>
                <p className="mt-1 text-[0.95rem] text-ink-muted">{popis}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <VyzvaRegistrace stranka="jak-funguje" misto="kroky" className={TLACITKO_HLAVNI}>
              Vytvořit rodinný kalendář
            </VyzvaRegistrace>
            <p className="text-sm text-ink-muted">Druhého rodiče můžete pozvat později.</p>
          </div>
        </Sloupec>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sloupec, Nadtitulek } from "@/components/web/prvky";
import { UkazkyAplikace } from "@/components/web/ukazky";
import { KartaSoukromi } from "@/components/web/karta-soukromi";
import { ZakladajiciPromo } from "@/components/web/zakladajici";
import {
  TLACITKO_HLAVNI,
  TLACITKO_VEDLEJSI,
  VyzvaRegistrace,
} from "@/components/web/vyzva-registrace";
import { Ikona } from "@/components/ui/ikona";
import type { NazevIkony } from "@/lib/ikony";
import { ZNACKA } from "@/lib/brand";
import { CENIK, ZDARMA_S_PODMINKOU, ZKUSEBNI_DNI, korun } from "@/lib/tarify";
import {
  BENEFITY,
  BEZ_KARTY,
  DEFINICE,
  HLAVNI_POPIS,
  PO_SKONCENI,
  PRO_JEDNOHO,
  TAGLINE,
} from "@/lib/texty";

const POPIS_STRANKY =
  "Aplikace pro střídavou péči. Mějte předávky, kroužky, školní akce, rozvrhy a výdaje na děti pohromadě. Funguje i pro jednoho rodiče.";

export const metadata: Metadata = {
  title: { absolute: "Střídavá péče: kalendář, předávky a výdaje | Klidoo" },
  description: POPIS_STRANKY,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${ZNACKA} — ${TAGLINE}`,
    description: DEFINICE,
    type: "website",
    url: "/",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: ZNACKA }],
  },
};

/**
 * Homepage podle zadání 2026: devět sekcí v pořadí hodnota → produkt →
 * důvěra → nabídka → akce. V každé sekci nejvýš jedno plné tlačítko,
 * vedlejší akce jen obrysem nebo odkazem. Ceny z `tarify.ts`, hlavní
 * věty z `texty.ts`.
 */

const IKONY_BENEFITU: NazevIkony[] = ["predani", "skola", "bankovka"];

/** 02 — situace, které rodič pozná. Problém, pak funkce. Nikoho neobviňují. */
const SITUACE: { citat: string; funkce: string; popis: string; ikona: NazevIkony }[] = [
  {
    citat: "Dnes vyzvedáváš ty, nebo já?",
    funkce: "Kalendář péče s předávkami",
    popis: "U koho děti spí a kdo je vyzvedává, je napsané den po dni. Vidí to oba.",
    ikona: "predani",
  },
  {
    citat: "O tom výletu jsem vůbec nevěděl.",
    funkce: "Školní akce a rozvrhy",
    popis: "Akce, rozvrh a zprávy ze školy (i z EduPage) na jednom místě pro oba rodiče.",
    ikona: "autobus",
  },
  {
    citat: "Kdo platil ten tábor?",
    funkce: "Výdaje a účtenky",
    popis: "Kdo co zaplatil, jak se to dělí podle vaší dohody a kolik zbývá vyrovnat.",
    ikona: "stan",
  },
];

/** 03 — tři kroky k prvnímu kalendáři. Pořadí je skutečné, proto čísla. */
const KROKY: { nazev: string; popis: string; ikona: NazevIkony }[] = [
  { nazev: "Vytvoříte rodinu", popis: "Jméno rodiny a děti. Stačí pár údajů.", ikona: "rodina" },
  {
    nazev: "Nastavíte péči",
    popis: "Týden/týden, 2–2–3, sudé a liché týdny nebo vlastní rozpis.",
    ikona: "kalendar",
  },
  {
    nazev: "Doplníte kroužky, školu a výdaje",
    popis: "Kdykoli později, nic z toho není povinné.",
    ikona: "mic",
  },
];

/** 08 — odpovědi podle obchodních podmínek a skutečného chování aplikace. */
const OTAZKY = [
  {
    otazka: "Musí se připojit druhý rodič?",
    odpoved:
      "Nemusí. Kalendář, výdaje, školní akce a rozvrhy dávají smysl i bez druhé strany. Druhého rodiče pozvete, až budete chtít. Jeho přístup je v ceně.",
  },
  {
    otazka: "Potřebuji platební kartu?",
    odpoved: `Ne. ${ZDARMA_S_PODMINKOU}, ostatní ${ZKUSEBNI_DNI} dní, vždy bez karty a se všemi funkcemi. Kartu zadáte, jen pokud se rozhodnete pokračovat.`,
  },
  {
    otazka: "Co se stane po skončení období zdarma?",
    odpoved: `${PO_SKONCENI} Pokračovat stojí ${korun(CENIK[0].cena)} měsíčně nebo ${korun(CENIK[1].cena)} ročně za celou rodinu.`,
  },
  {
    otazka: "Kdo vidí moje údaje?",
    odpoved:
      "Jen členové rodiny, které sami pozvete. Kalendář, kroužky, události a výdaje vidí všichni členové. Doklady dětí jen rodiče a pečující osoby. Nastavení a propojení s Googlem nebo EduPage zůstávají jen vám. Přístup hlídá přímo databáze.",
  },
  {
    otazka: "Jak zruším předplatné?",
    odpoved:
      "V aplikaci v části Předplatné, jedním kliknutím a bez psaní podpoře. Do konce zaplaceného období vše běží dál, pak se aplikace přepne do čtení. Nic se nesmaže.",
  },
  {
    otazka: "Umí to sudé a liché týdny?",
    odpoved:
      "Ano, a také střídání po týdnu, čtrnáctidenní cyklus, schéma 2–2–3 nebo vlastní rozpis po dnech.",
  },
];

export default async function Domu() {
  const supabase = await createClient();

  // Kdo je přihlášený, chce aplikaci, ne prodejní stránku.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/prehled");
  } catch {
    // Supabase nedostupná — ukážeme veřejnou stránku, ta ji nepotřebuje.
  }

  return (
    <>
      {/* ── 01 Hero ──────────────────────────────────────────────── */}
      <section className="pb-12 pt-8 sm:pb-16 sm:pt-16">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="font-display text-[2.1rem] font-semibold leading-[1.06] tracking-tight text-ink sm:text-[3.1rem]">
              {HLAVNI_POPIS}
            </h1>
            <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-muted sm:text-lg">
              Mějte přehled o tom, kdy jsou děti u kterého rodiče, kdo je vyzvedává a jak se dělí
              společné výdaje. {ZNACKA} pomáhá organizovat život ve dvou domácnostech.
            </p>

            <ul className="mt-5 space-y-2">
              {BENEFITY.map((b, i) => (
                <li key={b} className="flex items-center gap-3 text-[0.98rem] text-ink">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Ikona nazev={IKONY_BENEFITU[i]} size={18} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <VyzvaRegistrace stranka="homepage" misto="hero" className={TLACITKO_HLAVNI}>
                Začít zdarma
              </VyzvaRegistrace>
              <Link href="/jak-funguje" className={TLACITKO_VEDLEJSI}>
                Podívat se do aplikace
              </Link>
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-muted">
              <span className="flex items-center gap-1.5">
                <span className="text-brand">
                  <Ikona nazev="stit" size={16} />
                </span>
                {BEZ_KARTY}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-brand">
                  <Ikona nazev="rodina" size={16} />
                </span>
                {PRO_JEDNOHO}
              </span>
            </p>
          </div>

          {/* Skutečný kalendář ukázkové rodiny. Na telefonu až pod
              tlačítkem a oříznutý, ať nadpis a výzva zůstanou nahoře. */}
          <div className="mx-auto w-[240px] sm:w-[280px]">
            <div className="max-h-[420px] overflow-hidden rounded-[2.25rem] border-[10px] border-ink/85 bg-canvas shadow-xl lg:max-h-none">
              <div className="overflow-hidden rounded-[1.6rem]">
                <Image
                  src="/ukazky/kalendar.png"
                  alt="Kalendář péče v aplikaci Klidoo: barevně rozlišené dny u každého rodiče a nejbližší předávka"
                  width={780}
                  height={1688}
                  sizes="(min-width: 640px) 280px, 240px"
                  priority
                  className="block h-auto w-full"
                />
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-ink-subtle">
              Skutečná aplikace, ukázková rodina.
            </p>
          </div>
        </div>
      </section>

      {/* ── 02 Známé situace ─────────────────────────────────────── */}
      <section className="border-y border-line bg-surface py-14 sm:py-16">
        <Sloupec siroky>
          <h2 className="max-w-3xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Tohle zná skoro každý rodič ve dvou domácnostech.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {SITUACE.map(({ citat, funkce, popis, ikona }) => (
              <div key={citat} className="flex flex-col rounded-2xl border border-line bg-canvas p-5">
                <p className="font-display text-lg font-semibold leading-snug text-ink">„{citat}“</p>
                <div className="mt-4 flex items-start gap-3 border-t border-line pt-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Ikona nazev={ikona} size={20} />
                  </span>
                  <span>
                    <span className="block font-semibold text-ink">{funkce}</span>
                    <span className="mt-0.5 block text-[0.9375rem] leading-relaxed text-ink-muted">
                      {popis}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Sloupec>
      </section>

      {/* ── 03 Jak to funguje ────────────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <Sloupec siroky>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Začněte jednoduše.
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
                <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-muted">{popis}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <VyzvaRegistrace stranka="homepage" misto="kroky" className={TLACITKO_HLAVNI}>
              Vytvořit kalendář
            </VyzvaRegistrace>
            <p className="text-sm text-ink-muted">Druhého rodiče můžete pozvat později.</p>
          </div>
        </Sloupec>
      </section>

      {/* ── 04 Produkt v praxi ───────────────────────────────────── */}
      <section className="border-y border-line bg-surface py-14 sm:py-20">
        <Sloupec siroky>
          <Nadtitulek>Produkt v praxi</Nadtitulek>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Vše důležité na jednom místě.
          </h2>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-muted">
            Skutečné obrazovky aplikace, jen s vymyšlenou rodinou.
          </p>
          <div className="mt-10">
            <UkazkyAplikace
              jen={["kalendar", "krouzky", "vydaje", "rozvrh"]}
              nazvy={{
                kalendar: "Kalendář péče",
                krouzky: "Kroužky a doprava",
                vydaje: "Výdaje a účtenky",
                rozvrh: "Školní akce a rozvrhy",
              }}
              bezDalsich
            />
          </div>
        </Sloupec>
      </section>

      {/* ── 05 Jeden rodič ───────────────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <Sloupec siroky>
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Jeden rodič s dítětem: sekce slibuje, že aplikace dává smysl
                i bez druhé strany. */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/foto/tata-a-dcera.jpg"
                alt="Otec sedí večer u stolu vedle dcery, která kreslí."
                fill
                sizes="(min-width: 1024px) 32rem, 100vw"
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Druhý rodič se zatím nechce přidat?
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-ink-muted">
                Začněte sami. Vytvořte si přehled střídání, kroužků a výdajů. Druhého rodiče
                pozvete později, až budete chtít.
              </p>
              <VyzvaRegistrace
                stranka="homepage"
                misto="jeden-rodic"
                className={`${TLACITKO_VEDLEJSI} mt-6`}
              >
                Začít s vlastním kalendářem
              </VyzvaRegistrace>
            </div>
          </div>
        </Sloupec>
      </section>

      {/* ── 06 Důvěra ────────────────────────────────────────────── */}
      <section className="border-y border-line bg-surface py-14 sm:py-16">
        <Sloupec siroky>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Klidoo jsem nezačal budovat jako firma. Ale jako táta.
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-muted">
                Klidoo vzniklo z vlastní potřeby: dostat předávky, kroužky, účtenky a zprávy
                o tom, kdo koho kdy vyzvedne, z hlavy někam, kde to uvidí oba rodiče. Každá funkce
                řeší něco, co v provozu dvou domácností opakovaně drhlo.
              </p>
              <Link
                href="/o-klidoo"
                className="mt-4 inline-flex items-center gap-1 font-medium text-brand underline-offset-4 hover:underline"
              >
                Přečíst příběh Klidoo ›
              </Link>
            </div>
            <KartaSoukromi className="self-start bg-canvas" />
          </div>
        </Sloupec>
      </section>

      {/* ── 07 Cena ──────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <Sloupec siroky>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Jedna cena za celou rodinu.
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div className="rounded-2xl border-2 border-brand bg-surface p-6">
              <p className="font-display text-4xl font-semibold tracking-tight text-ink">
                {korun(CENIK[0].cena)}
                <span className="text-base font-normal text-ink-subtle"> / měsíc za rodinu</span>
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                nebo {korun(CENIK[1].cena)} ročně · druhý rodič bez dalšího poplatku
              </p>
              <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-muted">{PO_SKONCENI}</p>
              <VyzvaRegistrace
                stranka="homepage"
                misto="cena"
                className={`${TLACITKO_HLAVNI} mt-6 w-full sm:w-auto`}
              >
                Začít zdarma
              </VyzvaRegistrace>
              <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <Link href="/cenik" className="text-brand underline-offset-4 hover:underline">
                  Celý ceník
                </Link>
                <Link
                  href="/obchodni-podminky#zakladajici"
                  className="text-brand underline-offset-4 hover:underline"
                >
                  Podmínky nabídky
                </Link>
              </p>
            </div>
            <ZakladajiciPromo />
          </div>
        </Sloupec>
      </section>

      {/* ── 08 FAQ ───────────────────────────────────────────────── */}
      <section className="border-t border-line bg-surface py-14 sm:py-16">
        <Sloupec>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Nejčastější otázky
          </h2>
          <div className="mt-6 space-y-3">
            {OTAZKY.map(({ otazka, odpoved }) => (
              <details key={otazka} className="group rounded-2xl border border-line bg-canvas px-4 py-3.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-ink">
                  {otazka}
                  <span
                    aria-hidden
                    className="text-ink-subtle transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted">{odpoved}</p>
              </details>
            ))}
          </div>
        </Sloupec>
      </section>

      {/* ── 09 Závěr ─────────────────────────────────────────────── */}
      <section className="bg-vyzva py-14 sm:py-20">
        <Sloupec>
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-vyzva-ink sm:text-4xl">
              {TAGLINE}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-lg leading-relaxed text-vyzva-ink-muted">
              Mějte praktické věci pohromadě.
            </p>
            <VyzvaRegistrace
              stranka="homepage"
              misto="zaver"
              className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-vyzva-btn px-7 font-semibold text-vyzva-btn-ink transition-opacity hover:opacity-90"
            >
              Vytvořit kalendář zdarma
            </VyzvaRegistrace>
          </div>
        </Sloupec>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: ZNACKA,
              url: "https://klidoo.cz",
              logo: "https://klidoo.cz/icons/icon-512.png",
              email: "info@klidoo.cz",
              description: DEFINICE,
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: ZNACKA,
              url: "https://klidoo.cz",
              inLanguage: "cs",
            },
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: ZNACKA,
              applicationCategory: "LifestyleApplication",
              operatingSystem: "Web",
              inLanguage: "cs",
              description: DEFINICE,
              offers: CENIK.map((tarif) => ({
                "@type": "Offer",
                name: tarif.nazev,
                price: tarif.cena,
                priceCurrency: "CZK",
                url: "https://klidoo.cz/cenik",
              })),
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: OTAZKY.map(({ otazka, odpoved }) => ({
                "@type": "Question",
                name: otazka,
                acceptedAnswer: { "@type": "Answer", text: odpoved },
              })),
            },
          ]),
        }}
      />
    </>
  );
}

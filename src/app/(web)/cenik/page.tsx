import type { Metadata } from "next";
import Link from "next/link";
import { Sloupec, Nadtitulek, DalsiCteni } from "@/components/web/prvky";
import { CENIK, CO_JE_V_CENE, ZAKLADAJICI, ZKUSEBNI_DNI, korun } from "@/lib/tarify";
import { DokudJsouMista, ZakladajiciPromo } from "@/components/web/zakladajici";
import { KartaSoukromi } from "@/components/web/karta-soukromi";
import { SrovnaniTarifu } from "@/components/predplatne/srovnani";
import {
  TLACITKO_HLAVNI,
  TLACITKO_VEDLEJSI,
  VyzvaRegistrace,
} from "@/components/web/vyzva-registrace";
import { Ikona } from "@/components/ui/ikona";
import type { NazevIkony } from "@/lib/ikony";
import { ZNACKA } from "@/lib/brand";
import { BEZ_KARTY, DEFINICE, DRUHY_RODIC, PO_SKONCENI } from "@/lib/texty";

const TITULEK = "Ceník Klidoo – jedna cena za celou rodinu";
const POPISEK =
  "Zjistěte cenu Klidoo, co zahrnuje předplatné a jak funguje období zdarma. Druhý rodič bez dalšího poplatku.";

export const metadata: Metadata = {
  title: { absolute: TITULEK },
  description: POPISEK,
  alternates: { canonical: "/cenik" },
  openGraph: { title: TITULEK, description: POPISEK, type: "website", url: "/cenik" },
};

/**
 * Ceník podle zadání 2026: H1 → standardní tarify → nabídka pro
 * zakládající rodiny zvlášť → co je v ceně → co se stane po skončení
 * zdarma → otázky → výzva. Akce a standard se nemíchají: akce má vlastní
 * rámeček s podmínkami a po vyčerpání míst sama zmizí.
 *
 * Cena je povinná informace před uzavřením smlouvy na dálku — a rodič,
 * který ji nevidí, si ji domyslí.
 */

/** Ikony k položkám `CO_JE_V_CENE` (stejné pořadí). */
const IKONY_V_CENE: NazevIkony[] = ["kalendar", "rodina", "bankovka", "auto", "skola", "zvonek"];

const OTAZKY = [
  {
    otazka: "Co se stane, až období zdarma skončí?",
    odpoved: `${PO_SKONCENI} Kalendář, výdaje i doklady zůstanou čitelné. Jakmile předplatné zaplatíte, můžete zase zapisovat, tam kde jste skončili.`,
  },
  {
    otazka: "Musím zadávat kartu, abych to mohl zkusit?",
    odpoved:
      "Ne. Období zdarma se zapne samo při založení rodiny a nic se z ničeho nestrhává. Kartu zadáváte, až když se rozhodnete pokračovat.",
  },
  {
    otazka: "Když zaplatím dřív, přijdu o zbytek období zdarma?",
    odpoved:
      "Ne. Karta se strhne až v den, kdy by období zdarma skončilo, a tři dny předem vám přijde upozornění.",
  },
  {
    otazka: "Platí druhý rodič taky?",
    odpoved:
      "Ne. Předplatné platí rodina, ne uživatel. Druhý rodič, prarodiče, nový partner, teta i chůva mají přístup v ceně. Druhý rodič se přidá přes pozvánku, kterou mu pošlete.",
  },
  {
    otazka: "Jak předplatné zruším?",
    odpoved:
      "V aplikaci v části Předplatné jedním kliknutím, bez psaní podpoře. Do konce zaplaceného období vše běží dál a pak se aplikace přepne do čtení.",
  },
  {
    otazka: "Proč je roční tarif levnější?",
    odpoved:
      "Ročním předplatným ušetříte dva měsíce. Péče o děti ve dvou domácnostech je běh na roky, ne na týdny.",
  },
];

export default function Cenik() {
  return (
    <>
      <section className="pb-8 pt-10 sm:pb-12 sm:pt-16">
        <Sloupec siroky>
          <Nadtitulek>Ceník</Nadtitulek>
          <h1 className="mt-3 max-w-3xl font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[2.75rem]">
            Jeden přehled. Jedna cena za celou rodinu.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
            {DRUHY_RODIC} Platí jedna domácnost, ne každý účet zvlášť. Začít můžete zdarma a
            bez platební karty.
          </p>
        </Sloupec>
      </section>

      {/* ── Nabídka pro zakládající rodiny: první, dokud jsou místa ─ */}
      {ZAKLADAJICI.aktivni ? (
        <DokudJsouMista>
          <section className="pb-12 sm:pb-16">
            <Sloupec siroky>
              <div className="grid gap-6 rounded-3xl border-2 border-brand/30 bg-brand-soft/60 p-5 sm:p-8 lg:grid-cols-[1fr_1fr] lg:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">
                    Jen pro prvních {ZAKLADAJICI.mist} rodin
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                    Zakládající rodiny: první rok zdarma
                  </h2>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-muted">
                    Prvních {ZAKLADAJICI.mist} rodin má 12 měsíců zdarma od založení rodiny, se
                    všemi funkcemi a bez platební karty. Jeden účet může mít jednu zakládající
                    rodinu. Po roce se sami rozhodnete, jestli pokračovat za běžnou cenu níže.
                    Platba se sama nikdy nespustí.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                    <VyzvaRegistrace stranka="cenik" misto="zakladajici" className={TLACITKO_HLAVNI}>
                      Získat rok zdarma
                    </VyzvaRegistrace>
                    <Link
                      href="/obchodni-podminky#zakladajici"
                      className="text-sm font-medium text-brand underline-offset-4 hover:underline"
                    >
                      Podmínky nabídky ›
                    </Link>
                  </div>
                </div>
                <ZakladajiciPromo />
              </div>
            </Sloupec>
          </section>
        </DokudJsouMista>
      ) : null}

      {/* ── Standardní tarify ─────────────────────────────────────── */}
      <section className="border-y border-line bg-surface py-12 sm:py-16">
        <Sloupec siroky>
          <div className="grid gap-4 sm:grid-cols-2">
            {CENIK.map((tarif) => {
              const rocni = tarif.id === "rocni";
              return (
                <div
                  key={tarif.id}
                  className={
                    rocni
                      ? "relative rounded-2xl border-2 border-brand bg-canvas p-6"
                      : "relative rounded-2xl border border-line-strong bg-canvas p-6"
                  }
                >
                  {rocni ? (
                    <span className="absolute right-5 top-5 rounded-pill bg-brand px-2.5 py-1 text-xs font-semibold text-brand-ink">
                      ušetříte {tarif.usetri} %
                    </span>
                  ) : null}
                  <h2 className="font-display text-lg font-semibold text-ink">{tarif.nazev}</h2>
                  <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
                    {korun(tarif.cena)}
                    <span className="text-base font-normal text-ink-subtle"> / {tarif.obdobi}</span>
                  </p>
                  {rocni ? (
                    <p className="mt-1 text-sm text-ink-subtle">
                      vychází na {korun(tarif.mesicne)} měsíčně
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-ink-subtle">za celou rodinu</p>
                  )}
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-muted">{tarif.popis}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-3 text-sm text-ink-muted sm:grid-cols-3">
            <p className="flex items-start gap-2.5">
              <span className="text-brand">
                <Ikona nazev="stit" size={18} />
              </span>
              {BEZ_KARTY} na začátek. {ZKUSEBNI_DNI} dní zdarma pro každou rodinu.
            </p>
            <p className="flex items-start gap-2.5">
              <span className="text-brand">
                <Ikona nazev="rodina" size={18} />
              </span>
              Druhý rodič, prarodiče i chůva jsou v ceně.
            </p>
            <p className="flex items-start gap-2.5">
              <span className="text-brand">
                <Ikona nazev="zamek" size={18} />
              </span>
              Platba kartou přes Stripe, číslo karty k nám nedorazí.
            </p>
          </div>
        </Sloupec>
      </section>

      {/* ── Co je v ceně ──────────────────────────────────────────── */}
      <section className="border-y border-line bg-surface py-12 sm:py-16">
        <Sloupec siroky>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Co je v ceně
          </h2>
          <div className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {CO_JE_V_CENE.map(({ nazev, popis }, i) => (
              <div key={nazev} className="flex gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Ikona nazev={IKONY_V_CENE[i] ?? "stit"} size={20} />
                </span>
                <span>
                  <span className="block font-display text-base font-semibold text-ink">{nazev}</span>
                  <span className="mt-1 block text-[0.95rem] leading-relaxed text-ink-muted">{popis}</span>
                </span>
              </div>
            ))}
          </div>
        </Sloupec>
      </section>

      {/* ── Po skončení zdarma ────────────────────────────────────── */}
      <section className="py-12 sm:py-16">
        <Sloupec siroky>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Co se stane po skončení období zdarma
          </h2>
          <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-muted">{PO_SKONCENI}</p>
          <SrovnaniTarifu className="mt-8" />
          <KartaSoukromi className="mt-8 max-w-2xl" />
        </Sloupec>
      </section>

      {/* ── Otázky ────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-surface py-12 sm:py-16">
        <Sloupec>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Časté otázky k placení
          </h2>
          <dl className="mt-7 space-y-6">
            {OTAZKY.map(({ otazka, odpoved }) => (
              <div key={otazka}>
                <dt className="font-display font-semibold text-ink">{otazka}</dt>
                <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-muted">{odpoved}</dd>
              </div>
            ))}
          </dl>
        </Sloupec>
      </section>

      <section className="py-12 sm:py-16">
        <Sloupec siroky>
          <div className="rounded-2xl border border-line-strong bg-surface p-7 text-center sm:p-10">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Začněte zdarma, rozhodnete se později
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[0.95rem] leading-relaxed text-ink-muted">
              Založení rodiny trvá pár minut a kalendář je hotový hned. Kartu po vás nikdo nechce.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <VyzvaRegistrace stranka="cenik" misto="zaver" className={TLACITKO_HLAVNI}>
                Začít zdarma
              </VyzvaRegistrace>
              <Link href="/jak-funguje" className={TLACITKO_VEDLEJSI}>
                Jak Klidoo funguje
              </Link>
            </div>
          </div>

          <DalsiCteni
            odkazy={[
              {
                href: "/jak-funguje-stridava-pece",
                nazev: "Jak funguje střídavá péče",
                popis: "Režimy péče, co říká zákon a na čem se rodiny nejčastěji zaseknou.",
              },
              {
                href: "/kalkulacka",
                nazev: "Kalkulačka péče",
                popis: "Rozpis nocí na celý rok bez registrace.",
              },
            ]}
          />
        </Sloupec>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Product",
              name: ZNACKA,
              description: DEFINICE,
              offers: CENIK.map((tarif) => ({
                "@type": "Offer",
                name: tarif.nazev,
                price: tarif.cena,
                priceCurrency: "CZK",
                url: "https://klidoo.cz/cenik",
                availability: "https://schema.org/InStock",
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

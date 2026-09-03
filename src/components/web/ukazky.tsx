"use client";

import * as React from "react";
import {
  Bike,
  CalendarDays,
  Car,
  Check,
  LayoutDashboard,
  MessageCircle,
  Moon,
  Table2,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Ukázky aplikace na webu.
 *
 * Nejsou to snímky obrazovky, ale ta samá aplikace vykreslená z těch
 * samých proměnných — barvy rodičů, diagonála dne předání i šrafa prázdnin
 * jsou stejné jako v kalendáři. Obrázky by se rozostřily na retině,
 * zestárly při první změně designu a v tmavém režimu by svítily.
 *
 * Data jsou vymyšlená, ale realistická: rozvod je citlivé téma a
 * vyšperkovaná ukázka, která nesedí na skutečný provoz, spíš odradí.
 */

type Obrazovka = "kalendar" | "prehled" | "vydaje" | "krouzky" | "zpravy" | "rozvrh";

const ZALOZKY: { id: Obrazovka; popisek: string; Ikona: typeof CalendarDays }[] = [
  { id: "kalendar", popisek: "Kalendář", Ikona: CalendarDays },
  { id: "prehled", popisek: "Dnešek", Ikona: LayoutDashboard },
  { id: "vydaje", popisek: "Výdaje", Ikona: Wallet },
  { id: "krouzky", popisek: "Kroužky", Ikona: Bike },
  { id: "zpravy", popisek: "Zprávy", Ikona: MessageCircle },
  { id: "rozvrh", popisek: "Rozvrh", Ikona: Table2 },
];

const POPISKY: Record<Obrazovka, { nadpis: string; text: string }> = {
  kalendar: {
    nadpis: "Kalendář, kde je vidět i noc předání",
    text: "Každý den má barvu rodiče, u kterého dítě spí. Den předání je přepůlený diagonálně směrem k tomu, kdo dítě přebírá — proto sedí počet nocí, ne jen zaškrtnutých dnů. Prázdniny mají vlastní pruh.",
  },
  prehled: {
    nadpis: "Ráno otevřeš a víš, co dnes je",
    text: "U koho děti spí, kdy končí škola, kdo veze na kroužek a co se chystá zítra. Bez ptaní se druhého rodiče.",
  },
  vydaje: {
    nadpis: "Účtenka se vyfotí, vyrovnání se spočítá",
    text: "Každý výdaj má svůj podíl — půl na půl nebo jak jste se dohodli. Na konci měsíce je vidět jedno číslo místo dvou různých vzpomínek.",
  },
  krouzky: {
    nadpis: "Kdo veze tam a kdo zpátky",
    text: "U každého termínu je jméno. Deset zpráv o tom, kdo vyzvedne dítě ve čtvrtek, je deset příležitostí k hádce.",
  },
  zpravy: {
    nadpis: "Zprávu nejde smazat ani přepsat",
    text: "Domlouvání jde psaním, ne telefonováním — ale s razítkem odeslání i přečtení, které zůstane. Když jde o soud, je vidět, kdo co a kdy napsal.",
  },
  rozvrh: {
    nadpis: "Rozvrh i změny stažené ze školy",
    text: "Napojí se na EduPage a samo si drží rozvrh, odpadlé hodiny i suplování — pro každé dítě zvlášť, i když chodí na jinou školu.",
  },
};

export function UkazkyAplikace() {
  const [aktivni, setAktivni] = React.useState<Obrazovka>("kalendar");
  const popisek = POPISKY[aktivni];

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1fr_auto]">
      <div className="order-2 lg:order-1">
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Ukázky obrazovek aplikace"
        >
          {ZALOZKY.map(({ id, popisek: text, Ikona }) => {
            const vybrana = id === aktivni;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={vybrana}
                onClick={() => setAktivni(id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
                  vybrana
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line-strong bg-surface text-ink-muted hover:text-ink",
                )}
              >
                <Ikona size={16} aria-hidden />
                {text}
              </button>
            );
          })}
        </div>

        <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight text-ink">
          {popisek.nadpis}
        </h3>
        <p className="mt-2.5 max-w-lg text-[0.95rem] leading-relaxed text-ink-muted">
          {popisek.text}
        </p>

        {/* Zbylé obrazovky vypsané textem — telefon jich najednou ukáže
            jen jednu a to necháváme, ale ať je hned vidět, že aplikace
            není jen těch šest záložek nahoře. */}
        <ul className="mt-7 grid gap-x-6 gap-y-2 border-t border-line pt-5 text-sm text-ink-muted sm:grid-cols-2">
          {DALSI.map((polozka) => (
            <li key={polozka} className="flex items-center gap-2">
              <Check size={14} className="shrink-0 text-brand" aria-hidden />
              {polozka}
            </li>
          ))}
        </ul>
      </div>

      <div className="order-1 mx-auto lg:order-2">
        <Telefon>
          {aktivni === "kalendar" ? <ObrazovkaKalendar /> : null}
          {aktivni === "prehled" ? <ObrazovkaPrehled /> : null}
          {aktivni === "vydaje" ? <ObrazovkaVydaje /> : null}
          {aktivni === "krouzky" ? <ObrazovkaKrouzky /> : null}
          {aktivni === "zpravy" ? <ObrazovkaZpravy /> : null}
          {aktivni === "rozvrh" ? <ObrazovkaRozvrh /> : null}
        </Telefon>
      </div>
    </div>
  );
}

/** Co se do šesti záložek nevešlo, ale v appce je. */
const DALSI = [
  "Události — škola, lékař, výlety",
  "Dokumenty rodiny na jednom místě",
  "Kontakty — škola, lékaři, kroužky",
  "Notifikace přímo do telefonu",
];

/** Rám telefonu. Aplikace se používá skoro výhradně na mobilu. */
function Telefon({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[300px] rounded-[2.25rem] border-[10px] border-ink/85 bg-bg shadow-xl">
      <div className="relative overflow-hidden rounded-[1.6rem]">
        <div className="absolute left-1/2 top-0 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-ink/85" />
        <div className="flex min-h-[540px] flex-col bg-bg pb-1 pt-6">{children}</div>
      </div>
    </div>
  );
}

function Lista({ titulek, podtitulek }: { titulek: string; podtitulek?: string }) {
  return (
    <div className="border-b border-line px-3.5 pb-2.5">
      <p className="font-display text-base font-semibold text-ink">{titulek}</p>
      {podtitulek ? <p className="text-xs text-ink-subtle">{podtitulek}</p> : null}
    </div>
  );
}

/* ── Kalendář ─────────────────────────────────────────────────────── */

const DNY = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

/**
 * Duben ve střídání po týdnu: pondělí až sobota patří jednomu rodiči,
 * v neděli se předává — a ten den je proto přepůlený. Jarní prázdniny
 * padnou na druhý týden.
 */
/**
 * Duben: 1. dubna padne na středu, takže mřížka začíná dvěma dny z března.
 * Střídá se po týdnu, v neděli se předává — ten den je proto přepůlený.
 * Jarní prázdniny padnou na druhý celý týden.
 */
const PRVNI_DEN_SLOUPEC = 2; // 1. dubna je středa
const DNI_V_MESICI = 30;
const PRAZDNINY_OD = 6;
const PRAZDNINY_DO = 12;

interface DenUkazky {
  cislo: number;
  mimo: boolean;
  strana: "a" | "b" | "p";
  prazdniny: boolean;
}

function ukazkovyMesic(): DenUkazky[] {
  return Array.from({ length: 35 }, (_, i) => {
    const cislo = i - PRVNI_DEN_SLOUPEC + 1;
    const mimo = cislo < 1 || cislo > DNI_V_MESICI;
    const tyden = Math.floor(i / 7);
    const nedele = i % 7 === 6;

    // Dny mimo měsíc: vlevo konec března, vpravo začátek května.
    const cisloMimo = cislo < 1 ? 31 + cislo : cislo - DNI_V_MESICI;

    return {
      cislo: mimo ? cisloMimo : cislo,
      mimo,
      strana: nedele ? "p" : tyden % 2 === 0 ? "b" : "a",
      prazdniny: !mimo && cislo >= PRAZDNINY_OD && cislo <= PRAZDNINY_DO,
    };
  });
}

function ObrazovkaKalendar() {
  const dny = ukazkovyMesic();

  return (
    <div className="flex flex-1 flex-col">
      <Lista titulek="Duben" podtitulek="Kuba a Ema" />

      <div className="grid grid-cols-7 border-b border-line text-center">
        {DNY.map((d) => (
          <span key={d} className="py-1.5 text-[10px] font-medium text-ink-subtle">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {dny.map((den, i) => (
          <div
            key={i}
            className={cn(
              "relative flex min-h-[54px] flex-col overflow-hidden border-b border-r border-line p-1",
              den.mimo && "opacity-40",
            )}
            style={{
              backgroundColor:
                den.strana === "p" ? undefined : `var(--parent-${den.strana}-bg)`,
              // Den předání: vlevo nahoře ten, kdo má dítě přes den,
              // vpravo dole ten, u koho tu noc spí.
              backgroundImage:
                den.strana === "p"
                  ? "linear-gradient(135deg, var(--parent-a-bg) 0 50%, var(--parent-b-bg) 50% 100%)"
                  : undefined,
              boxShadow: den.prazdniny ? "inset 0 0 0 2px var(--holiday)" : undefined,
            }}
          >
            {den.prazdniny ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[18%]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, var(--holiday-stripe) 0 3px, transparent 3px 8px)",
                }}
              />
            ) : null}
            <span className="text-[11px] font-medium text-ink">{den.cislo}</span>
            {/* Kroužky se v mřížce ukazují tečkou, na název není místo —
                stejně jako v aplikaci na úzkém telefonu. */}
            {!den.mimo && [7, 14, 21, 28].includes(den.cislo) ? (
              <span
                aria-hidden
                className="relative mt-auto h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "var(--parent-b)" }}
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-3.5 py-2.5 text-[11px] text-ink-subtle">
        <span className="flex items-center gap-1.5">
          <Moon size={11} aria-hidden />
          16 nocí u tebe
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--parent-b)" }}
            aria-hidden
          />
          14 u druhého rodiče
        </span>
      </div>

      <div className="mx-3.5 rounded-xl border border-line p-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-ink-subtle">
          Nejbližší předání
        </p>
        <p className="mt-0.5 text-[11px] text-ink">
          Neděle 12. dubna, 17:00 — u školy
        </p>
        <p className="text-[10px] text-ink-subtle">
          Přes den u tebe, na noc u druhého rodiče
        </p>
      </div>

      <SpodniLista aktivni="kalendar" />
    </div>
  );
}

/* ── Přehled ──────────────────────────────────────────────────────── */

function ObrazovkaPrehled() {
  return (
    <div className="flex flex-1 flex-col">
      <Lista titulek="Dobré ráno, Lukáši" podtitulek="čtvrtek 16. dubna" />

      <div className="space-y-2.5 px-3.5 py-3">
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: "var(--parent-a-bg)" }}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-subtle">
            Dnes u koho
          </p>
          <p
            className="mt-0.5 text-sm font-semibold"
            style={{ color: "var(--parent-a-text)" }}
          >
            Děti spí u tebe
          </p>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            Předání v pátek v 17:00 u školy
          </p>
        </div>

        <div className="rounded-xl border border-line p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-subtle">
            Dnes a zítra
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {[
              { cas: "13:40", text: "Kuba končí ve škole" },
              { cas: "16:00", text: "Ema — plavání, veze máma" },
              { cas: "18:30", text: "Zubař Kuba (zítra)" },
            ].map((r) => (
              <li key={r.cas} className="flex gap-2 text-[11px]">
                <span className="w-9 shrink-0 font-medium text-ink">{r.cas}</span>
                <span className="text-ink-muted">{r.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Dlazdice popisek="Nocí tento měsíc" hodnota="16" />
          <Dlazdice popisek="Výdaje za duben" hodnota="8 590 Kč" />
        </div>
      </div>

      <SpodniLista aktivni="prehled" />
    </div>
  );
}

function Dlazdice({ popisek, hodnota }: { popisek: string; hodnota: string }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-[10px] text-ink-subtle">{popisek}</p>
      <p className="mt-0.5 font-display text-lg font-semibold text-ink">{hodnota}</p>
    </div>
  );
}

/* ── Výdaje ───────────────────────────────────────────────────────── */

/**
 * Čísla musí sedět: 4 900 + 2 400 zaplatíš ty, 1 290 druhý rodič.
 * Dohromady 8 590 Kč, půlka je 4 295 — takže ti chybí 3 005 Kč.
 * Ukázka, ve které nesedí součet, je horší než žádná.
 */
const VYDAJE = [
  { nazev: "Lyžák Kuba", castka: "4 900 Kč", kdo: "Zaplatil jsi ty", podil: "50 / 50" },
  { nazev: "Plavání — pololetí", castka: "2 400 Kč", kdo: "Zaplatil jsi ty", podil: "50 / 50" },
  { nazev: "Boty Ema", castka: "1 290 Kč", kdo: "Zaplatila máma", podil: "50 / 50" },
];

function ObrazovkaVydaje() {
  return (
    <div className="flex flex-1 flex-col">
      <Lista titulek="Výdaje" podtitulek="Duben" />

      <div className="space-y-2 px-3.5 py-3">
        <div className="rounded-xl bg-brand-soft p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-brand">
            Vyrovnání za duben
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink">
            Máma ti pošle 3 005 Kč
          </p>
          <div className="mt-2 flex h-1.5 overflow-hidden rounded-full">
            <span className="w-[85%]" style={{ backgroundColor: "var(--parent-a)" }} />
            <span className="flex-1" style={{ backgroundColor: "var(--parent-b)" }} />
          </div>
          <p className="mt-1.5 text-[10px] text-ink-muted">
            Ty 7 300 Kč · máma 1 290 Kč
          </p>
        </div>

        {VYDAJE.map((v) => (
          <div key={v.nazev} className="rounded-xl border border-line p-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-[12px] font-medium text-ink">{v.nazev}</p>
              <p className="shrink-0 text-[12px] font-semibold text-ink">{v.castka}</p>
            </div>
            <p className="mt-0.5 text-[10px] text-ink-subtle">
              {v.kdo} · dělí se {v.podil}
            </p>
          </div>
        ))}

        <p className="pt-1 text-center text-[10px] text-ink-subtle">
          Účtenku stačí vyfotit — zůstane u výdaje
        </p>
      </div>

      <SpodniLista aktivni="vydaje" />
    </div>
  );
}

/* ── Kroužky ──────────────────────────────────────────────────────── */

function ObrazovkaKrouzky() {
  return (
    <div className="flex flex-1 flex-col">
      <Lista titulek="Kroužky" podtitulek="Tento týden" />

      <div className="space-y-2.5 px-3.5 py-3">
        {[
          { nazev: "Plavání — Ema", cas: "Út 16:00", tam: "Máma", zpet: "Táta" },
          { nazev: "Fotbal — Kuba", cas: "St 17:30", tam: "Táta", zpet: "Táta" },
          { nazev: "Housle — Ema", cas: "Čt 15:00", tam: "Babička", zpet: "Máma" },
        ].map((k) => (
          <div key={k.nazev} className="rounded-xl border border-line p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-[12px] font-medium text-ink">{k.nazev}</p>
              <p className="shrink-0 text-[10px] text-ink-subtle">{k.cas}</p>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-muted">
              <span className="flex items-center gap-1">
                <Car size={11} aria-hidden /> Tam: {k.tam}
              </span>
              <span className="flex items-center gap-1">
                <Car size={11} className="-scale-x-100" aria-hidden /> Zpět: {k.zpet}
              </span>
            </div>
          </div>
        ))}

        <p className="pt-1 text-center text-[10px] text-ink-subtle">
          Cenu kroužku lze rozdělit mezi rodiče a poslat rovnou do výdajů
        </p>
      </div>

      <SpodniLista aktivni="krouzky" />
    </div>
  );
}

/* ── Zprávy ───────────────────────────────────────────────────────── */

function ObrazovkaZpravy() {
  return (
    <div className="flex flex-1 flex-col">
      <Lista titulek="Zprávy" podtitulek="Ty a Petra" />

      <div className="flex-1 space-y-2.5 px-3.5 py-3">
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-line bg-surface-2 p-2.5">
          <p className="text-[11px] text-ink">V pátek to bude o hodinu později, mám poradu.</p>
          <p className="mt-1 text-[9px] text-ink-subtle">Petra · 17:42</p>
        </div>

        <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-soft p-2.5">
          <p className="text-[11px] text-ink">V pořádku, počkáme.</p>
          <p className="mt-1 flex items-center justify-end gap-1 text-[9px] text-ink-subtle">
            18:03 <Check size={10} className="text-brand" aria-hidden /> přečteno
          </p>
        </div>
      </div>

      <p className="px-3.5 pb-2.5 text-center text-[10px] text-ink-subtle">
        Zprávu nejde smazat ani upravit — jen odpovědět
      </p>

      <SpodniLista aktivni="zpravy" />
    </div>
  );
}

/* ── Rozvrh ───────────────────────────────────────────────────────── */

const HODINY_UKAZKY = [
  { poradi: 1, predmet: "Matematika", cas: "8:00–8:45" },
  { poradi: 2, predmet: "Český jazyk", cas: "8:55–9:40" },
  { poradi: 3, predmet: "Tělesná výchova", cas: "9:50–10:35", zruseno: true },
  { poradi: 4, predmet: "Angličtina", cas: "10:55–11:40" },
];

function ObrazovkaRozvrh() {
  return (
    <div className="flex flex-1 flex-col">
      <Lista titulek="Rozvrh" podtitulek="Kuba · středa" />

      <div className="space-y-1.5 px-3.5 py-3">
        {HODINY_UKAZKY.map((h) => (
          <div
            key={h.poradi}
            className="flex items-center gap-2.5 rounded-xl border border-line p-2.5"
          >
            <span className="tnum flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[10px] font-medium text-ink-subtle">
              {h.poradi}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-[12px] font-medium",
                  h.zruseno ? "text-ink-subtle line-through" : "text-ink",
                )}
              >
                {h.predmet}
              </span>
              <span className="tnum text-[10px] text-ink-subtle">
                {h.zruseno ? "odpadá" : h.cas}
              </span>
            </span>
          </div>
        ))}
      </div>

      <p className="px-3.5 pb-2.5 text-center text-[10px] text-ink-subtle">
        Stáhne se samo z EduPage, i s odpadlými hodinami
      </p>

      <SpodniLista aktivni="rozvrh" />
    </div>
  );
}

/* ── Spodní lišta ─────────────────────────────────────────────────── */

// Spodní lišta má v appce jen čtyři hlavní ikony, zbytek je pod „Více" —
// stejné čtyři jako tady, ať mockup neklame na to, jak appka doopravdy
// vypadá. Zprávy a rozvrh se otevírají odjinud, proto tu při nich
// nesvítí žádná ikona — to je i ve skutečné appce tak.
const SPODNI_POLOZKY = ZALOZKY.slice(0, 4);

function SpodniLista({ aktivni }: { aktivni: Obrazovka }) {
  return (
    <div className="mt-auto flex border-t border-line px-1 pb-1.5 pt-1.5">
      {SPODNI_POLOZKY.map(({ id, popisek, Ikona }) => (
        <span
          key={id}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 text-[9px]",
            id === aktivni ? "text-brand" : "text-ink-subtle",
          )}
        >
          <Ikona size={15} aria-hidden />
          {popisek}
        </span>
      ))}
    </div>
  );
}

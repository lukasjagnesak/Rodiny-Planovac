"use client";

import * as React from "react";
import Image from "next/image";
import {
  Bike,
  CalendarDays,
  Check,
  LayoutDashboard,
  MessageCircle,
  History,
  Table2,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Ukázky aplikace na webu — skutečné snímky obrazovek.
 *
 * Dřív tu byly ručně překreslené imitace. Vypadaly jinak než aplikace
 * a rodič po registraci viděl něco jiného, než čemu uvěřil. Teď jsou to
 * snímky opravdových obrazovek s ukázkovou rodinou (`lib/ukazkova-rodina`),
 * které dělá `scripts/snimky-aplikace.mjs` do `public/ukazky`. Když se
 * aplikace viditelně změní, snímky se pořídí znovu — postup je ve skriptu.
 *
 * Jména jsou smyšlená, data obyčejný měsíc obyčejné rodiny.
 */

type Obrazovka = "kalendar" | "prehled" | "vydaje" | "krouzky" | "zpravy" | "rozvrh" | "historie";

const ZALOZKY: { id: Obrazovka; popisek: string; Ikona: typeof CalendarDays }[] = [
  { id: "kalendar", popisek: "Kalendář", Ikona: CalendarDays },
  { id: "prehled", popisek: "Přehled", Ikona: LayoutDashboard },
  { id: "vydaje", popisek: "Výdaje", Ikona: Wallet },
  { id: "krouzky", popisek: "Kroužky", Ikona: Bike },
  { id: "zpravy", popisek: "Zprávy", Ikona: MessageCircle },
  { id: "rozvrh", popisek: "Rozvrh", Ikona: Table2 },
  { id: "historie", popisek: "Historie", Ikona: History },
];

const POPISKY: Record<Obrazovka, { nadpis: string; text: string }> = {
  kalendar: {
    nadpis: "Kalendář, kde je vidět i noc předání",
    text: "Každý den má barvu rodiče, u kterého dítě spí. Den předání je přepůlený diagonálně směrem k tomu, kdo dítě přebírá — proto sedí počet nocí, ne jen zaškrtnutých dnů. Prázdniny mají vlastní pruh.",
  },
  prehled: {
    nadpis: "Ráno otevřete a víte, co dnes je",
    text: "U koho děti spí, kdy končí škola, kdo veze na kroužek a co se chystá zítra. Bez ptaní se druhého rodiče.",
  },
  vydaje: {
    nadpis: "Účtenka se vyfotí, vyrovnání se spočítá",
    text: "Každý výdaj má svůj podíl — půl na půl nebo jak jste se dohodli. Na konci měsíce je vidět, kolik kdo zaplatil a kolik z toho připadá na koho.",
  },
  krouzky: {
    nadpis: "Kdo veze tam a kdo zpátky",
    text: "U každého termínu je jméno. Deset zpráv o tom, kdo vyzvedne dítě ve čtvrtek, je deset příležitostí k hádce.",
  },
  zpravy: {
    nadpis: "Zprávu nejde smazat ani přepsat",
    text: "Domlouvání jde psaním, ne telefonováním — ale s razítkem odeslání i přečtení, které zůstane. Když jde o soud, je vidět, kdo co a kdy napsal.",
  },
  rozvrh: {
    nadpis: "Rozvrh i změny stažené ze školy",
    text: "Napojí se na EduPage a samo si drží rozvrh, odpadlé hodiny i suplování — pro každé dítě zvlášť, i když chodí na jinou školu.",
  },
  historie: {
    nadpis: "Kdo co změnil, je vidět",
    text: "Každá změna rozvrhu, výdaje nebo události se zapíše sama — kdo, kdy a co. Nikdo z rodičů ji nemůže smazat. Výpis má ověřovací kód, podle kterého soud zjistí, že je pravý.",
  },
};

export function UkazkyAplikace() {
  const [aktivni, setAktivni] = React.useState<Obrazovka>("kalendar");
  const popisek = POPISKY[aktivni];

  // Na telefonu: záložky, telefon, popis — kdo vidí telefon, má mít
  // přepínač nad ním, ne až pod ním. Na počítači záložky a popis vlevo,
  // telefon vpravo přes oba řádky.
  return (
    <div className="grid items-start gap-x-10 gap-y-7 lg:grid-cols-[1fr_auto] lg:grid-rows-[auto_1fr]">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Ukázky obrazovek aplikace">
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

      <div className="mx-auto lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <Telefon>
          {/* Všechny snímky v DOM, viditelný jen vybraný: přepnutí záložky
              pak nečeká na stažení obrázku. */}
          {ZALOZKY.map(({ id, popisek: text }) => (
            <Image
              key={id}
              src={`/ukazky/${id}.png`}
              alt={`Obrazovka ${text} v aplikaci Klidoo s ukázkovou rodinou`}
              width={780}
              height={1688}
              sizes="280px"
              className={cn("block h-auto w-full", id === aktivni ? "" : "hidden")}
            />
          ))}
        </Telefon>
        <p className="mt-3 text-center text-xs text-ink-subtle">
          Skutečná aplikace, ukázková rodina.
        </p>
      </div>

      <div>
        <h3 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {popisek.nadpis}
        </h3>
        <p className="mt-2.5 max-w-lg text-[0.95rem] leading-relaxed text-ink-muted">
          {popisek.text}
        </p>

        <ul className="mt-7 grid gap-x-6 gap-y-2 border-t border-line pt-5 text-sm text-ink-muted sm:grid-cols-2">
          {DALSI.map((polozka) => (
            <li key={polozka} className="flex items-center gap-2">
              <Check size={14} className="shrink-0 text-brand" aria-hidden />
              {polozka}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Co se do záložek nevešlo, ale v aplikaci je. */
const DALSI = [
  "Události — škola, lékař, výlety",
  "Dokumenty rodiny na jednom místě",
  "Kontakty — škola, lékaři, kroužky",
  "Notifikace přímo do telefonu",
];

/** Rám telefonu. Aplikace se používá skoro výhradně na mobilu. */
function Telefon({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[280px] rounded-[2.25rem] border-[10px] border-ink/85 bg-canvas shadow-xl">
      <div className="overflow-hidden rounded-[1.6rem]">{children}</div>
    </div>
  );
}

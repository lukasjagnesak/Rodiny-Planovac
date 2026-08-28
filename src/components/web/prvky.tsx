import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/format";
import { Znak } from "@/components/ui/logo";

/**
 * Stavební prvky veřejného webu.
 *
 * Berou barvy i písmo ze stejných proměnných jako aplikace, takže web
 * nemůže vypadat jinak než produkt — ani po změně palety.
 */

/** Obsahový sloupec. Úzký na čtení, široký na mřížky. */
export function Sloupec({
  children,
  siroky = false,
  className,
}: {
  children: React.ReactNode;
  siroky?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 sm:px-6",
        siroky ? "max-w-5xl" : "max-w-2xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Malý popisek nad nadpisem — typ stránky, doba čtení, zdroj dat. */
export function Nadtitulek({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
      {children}
    </p>
  );
}

export function Hero({
  nadtitulek,
  nadpis,
  perex,
  children,
  siroky = false,
}: {
  nadtitulek?: React.ReactNode;
  nadpis: React.ReactNode;
  perex?: React.ReactNode;
  children?: React.ReactNode;
  siroky?: boolean;
}) {
  return (
    <section className="pb-8 pt-10 sm:pb-12 sm:pt-16">
      <Sloupec siroky={siroky}>
        {nadtitulek ? <Nadtitulek>{nadtitulek}</Nadtitulek> : null}
        <h1
          className={cn(
            "font-display font-semibold tracking-tight text-ink",
            "text-[2rem] leading-[1.1] sm:text-5xl",
            nadtitulek ? "mt-3" : "",
          )}
        >
          {nadpis}
        </h1>
        {perex ? (
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-muted">{perex}</p>
        ) : null}
        {children ? <div className="mt-7">{children}</div> : null}
      </Sloupec>
    </section>
  );
}

/**
 * Vysvětlivka nebo varování v textu. Modrá je poznámka, teplá je pozor —
 * odstíny jsou stejné jako stavové barvy v aplikaci.
 */
export function Poznamka({
  children,
  druh = "info",
}: {
  children: React.ReactNode;
  druh?: "info" | "pozor";
}) {
  const pozor = druh === "pozor";
  return (
    <div
      className={cn(
        "my-7 rounded-r-xl border-l-[3px] px-4 py-3.5 text-[0.95rem] leading-relaxed",
        pozor
          ? "border-warning bg-warning-soft text-ink-muted"
          : "border-info bg-info-soft text-ink-muted",
      )}
    >
      {children}
    </div>
  );
}

/**
 * Tabulka, která se na mobilu posouvá vodorovně místo toho, aby rozhodila
 * stránku.
 *
 * `posledniCiselny` zapne tabulární číslice a zákaz zalomení v posledním
 * sloupci. Jen tam, kde jsou v něm opravdu čísla — u vět by se text vyjel
 * mimo stránku.
 */
export function Tabulka({
  hlavicka,
  radky,
  posledniCiselny = false,
}: {
  hlavicka: string[];
  radky: React.ReactNode[][];
  posledniCiselny?: boolean;
}) {
  return (
    <div className="my-7 overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[32rem] border-collapse text-[0.95rem]">
        <thead>
          <tr>
            {hlavicka.map((h) => (
              <th
                key={h}
                scope="col"
                className="border-b border-line bg-surface-2 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-subtle"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {radky.map((radek, i) => (
            <tr key={i} className="border-b border-line last:border-b-0">
              {radek.map((bunka, j) => (
                <td
                  key={j}
                  className={cn(
                    "px-4 py-3 align-top text-ink-muted",
                    j === 0 ? "font-medium text-ink" : "",
                    posledniCiselny && j === radek.length - 1 && radek.length > 1
                      ? "tnum whitespace-nowrap"
                      : "",
                  )}
                >
                  {bunka}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Mřížka vlastností — krátký název tučně, věta pod tím. */
export function Vlastnosti({
  polozky,
}: {
  polozky: { nazev: string; popis: string }[];
}) {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2">
      {polozky.map(({ nazev, popis }) => (
        <div key={nazev}>
          <h3 className="font-display text-base font-semibold text-ink">{nazev}</h3>
          <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-muted">{popis}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Produktová sekce na konci obsahové stránky. Člověk sem doputuje po
 * přečtení článku, takže tohle je první moment, kdy má smysl mluvit o
 * produktu — ne dřív.
 */
export function Pitch({
  nadpis,
  perex,
  polozky,
  children,
}: {
  nadpis: React.ReactNode;
  perex: React.ReactNode;
  polozky: { nazev: string; popis: string }[];
  children?: React.ReactNode;
}) {
  return (
    <section id="klidoo" className="mt-16 border-y border-line bg-surface py-14 sm:py-16">
      <Sloupec>
        <Nadtitulek>
          <Znak size={22} />
          Klidoo
        </Nadtitulek>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {nadpis}
        </h2>
        <p className="mt-3 text-lg leading-relaxed text-ink-muted">{perex}</p>
        <Vlastnosti polozky={polozky} />
        {children ? <div className="mt-10">{children}</div> : null}
      </Sloupec>
    </section>
  );
}

/** Odkaz na sousední stránku — na konci článku, aby čtení pokračovalo. */
export function DalsiCteni({
  odkazy,
}: {
  odkazy: { href: string; nazev: string; popis: string }[];
}) {
  return (
    <div className="mt-12 grid gap-3 sm:grid-cols-2">
      {odkazy.map(({ href, nazev, popis }) => (
        <Link
          key={href}
          href={href}
          className="card block p-4 transition-colors hover:border-brand"
        >
          <span className="font-display font-semibold text-ink">{nazev}</span>
          <span className="mt-1 block text-sm text-ink-muted">{popis}</span>
        </Link>
      ))}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Hero, Sloupec, VyzvaPas } from "@/components/web/prvky";
import { dobaCteni } from "@/lib/clanky-typy";
import { vydane } from "@/lib/clanky";
import { formatDatum } from "@/lib/dates";
import { ZNACKA } from "@/lib/brand";

const POPISEK =
  "Praktické texty o provozu rodiny se dvěma domovy — noci, prázdniny, " +
  "dohoda, Vánoce. Bez rad, jak vychovávat, a bez právního poučování.";

export const metadata: Metadata = {
  title: "Články",
  description: POPISEK,
  alternates: { canonical: "/clanky" },
  openGraph: { title: `Články | ${ZNACKA}`, description: POPISEK, type: "website" },
};

/**
 * Texty vycházejí podle data, takže se stránka musí čas od času
 * přegenerovat sama. Bez tohohle by nový článek čekal na nejbližší
 * nasazení, což u naplánovaného kalendáře znamená, že by nevyšel vůbec.
 */
export const revalidate = 3600;

export default function Clanky() {
  const clanky = vydane();

  return (
    <>
      <Hero
        nadtitulek="Články"
        nadpis="O provozu dvou domovů"
        perex="Co se počítá, co patří do dohody a kdy se má domlouvat co. Píšeme jen o tom, čemu rozumíme — výchovné rady ani právní poučení tu nenajdete."
      />

      <Sloupec>
        {clanky.length === 0 ? (
          <p className="text-ink-muted">První texty tu budou během pár dní.</p>
        ) : (
          <ul className="space-y-4">
            {clanky.map((clanek) => (
              <li key={clanek.slug}>
                <Link
                  href={`/clanky/${clanek.slug}`}
                  className="card block p-5 transition-colors hover:bg-surface-2 sm:p-6"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle">
                    <time dateTime={clanek.datum}>{formatDatum(clanek.datum)}</time>
                    <span aria-hidden>·</span>
                    <span>{dobaCteni(clanek)} min čtení</span>
                    {clanek.druh === "pribeh" ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="rounded-pill bg-surface-2 px-2 py-0.5 font-medium">
                          Modelový příběh
                        </span>
                      </>
                    ) : null}
                  </div>
                  <h2 className="mt-2 font-display text-lg font-semibold tracking-tight text-ink">
                    {clanek.titul}
                  </h2>
                  <p className="mt-1.5 leading-relaxed text-ink-muted">{clanek.perex}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Sloupec>

      <VyzvaPas
        nadpis="Přestaňte si to pamatovat"
        text="Kalendář péče, kroužky, odvozy i výdaje na jednom místě — a vidí to oba rodiče. 30 dní zdarma, bez zadání karty."
      />
    </>
  );
}

import * as React from "react";
import Link from "next/link";
import { Info } from "lucide-react";
import type { Blok, Clanek } from "@/lib/clanky-typy";
import { rozlozTucne } from "@/lib/clanky-typy";

/** Tučné kusy uvnitř odstavce. Žádné vkládání HTML, jen React. */
function Text({ text }: { text: string }) {
  return (
    <>
      {rozlozTucne(text).map((kus, i) =>
        kus.tucne ? (
          <strong key={i} className="font-semibold text-ink">
            {kus.text}
          </strong>
        ) : (
          <React.Fragment key={i}>{kus.text}</React.Fragment>
        ),
      )}
    </>
  );
}

function Kus({ blok }: { blok: Blok }) {
  switch (blok.typ) {
    case "nadpis":
      return (
        <h2 className="mt-10 font-display text-xl font-semibold tracking-tight text-ink">
          {blok.text}
        </h2>
      );

    case "odstavec":
      return (
        <p className="mt-4 leading-relaxed text-ink-muted">
          <Text text={blok.text} />
        </p>
      );

    case "seznam":
      return (
        <ul className="mt-4 space-y-2">
          {blok.polozky.map((polozka, i) => (
            <li key={i} className="flex gap-3 leading-relaxed text-ink-muted">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>
                <Text text={polozka} />
              </span>
            </li>
          ))}
        </ul>
      );

    case "cislovany":
      return (
        <ol className="mt-4 space-y-2">
          {blok.polozky.map((polozka, i) => (
            <li key={i} className="flex gap-3 leading-relaxed text-ink-muted">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-semibold text-brand">
                {i + 1}
              </span>
              <span>
                <Text text={polozka} />
              </span>
            </li>
          ))}
        </ol>
      );

    case "citace":
      return (
        <blockquote className="mt-6 border-l-2 border-brand pl-4 text-lg italic leading-relaxed text-ink">
          <Text text={blok.text} />
          {blok.kdo ? (
            <footer className="mt-2 text-sm not-italic text-ink-subtle">{blok.kdo}</footer>
          ) : null}
        </blockquote>
      );

    // Otázka je vizuálně blíž nadpisu než odstavci: v rozhovoru se podle
    // ní listuje, čte se jako orientační bod.
    case "otazka":
      return (
        <p className="mt-9 font-display text-lg font-semibold leading-snug text-ink">
          {blok.text}
        </p>
      );

    case "odpoved":
      return (
        <p className="mt-3 leading-relaxed text-ink-muted">
          <Text text={blok.text} />
        </p>
      );

    case "poznamka":
      return (
        <div className="mt-6 flex gap-3 rounded-2xl bg-surface-2 p-4">
          <Info aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <p className="text-sm leading-relaxed text-ink-muted">
            <Text text={blok.text} />
          </p>
        </div>
      );
  }
}

/**
 * Označení modelového příběhu.
 *
 * Vypisuje se podle `druh`, ne podle rozhodnutí autora — kdyby to byl
 * jen další odstavec v textu, jednou by se na něj zapomnělo. Vymyšlený
 * příběh podaný jako záznam skutečného rozhovoru je u produktu pro
 * rodiče v rozchodu krátkodobý zisk a trvalá škoda.
 *
 * Je nahoře, ne v patičce. Čtenář to má vědět dřív, než text přečte.
 */
export function OznaceniPribehu() {
  return (
    <p className="mt-6 rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed text-ink-muted">
      <strong className="font-semibold text-ink">Modelový příběh.</strong> Není to
      záznam skutečného rozhovoru. Situace jsou složené z toho, co slýcháme od
      rodičů a mediátorů; jména jsou vymyšlená a nepatří konkrétním lidem.
    </p>
  );
}

export function ClanekTelo({ clanek }: { clanek: Clanek }) {
  return (
    <article className="max-w-prose">
      {clanek.druh === "pribeh" ? <OznaceniPribehu /> : null}

      {clanek.bloky.map((blok, i) => (
        <Kus key={i} blok={blok} />
      ))}

      {clanek.dalsi?.length ? (
        <div className="mt-12 border-t border-line pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
            Související
          </h2>
          <ul className="mt-3 space-y-2">
            {clanek.dalsi.map(({ text, odkaz }) => (
              <li key={odkaz}>
                <Link href={odkaz} className="text-brand hover:underline">
                  {text}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { POPIS, druhyNalezu, ztisit, type Nalez } from "@/lib/ton";

const KLIC = "klidoo-hlidac-tonu";

/** Zapnutý, dokud ho rodič sám nevypne. Volba se pamatuje v tomto zařízení. */
export function useHlidacTonu(): [boolean, (zapnuto: boolean) => void] {
  const [zapnuto, setZapnuto] = React.useState(true);
  React.useEffect(() => {
    try {
      if (localStorage.getItem(KLIC) === "vypnuto") setZapnuto(false);
    } catch {
      // Bez úložiště zůstane zapnutý.
    }
  }, []);
  const nastav = React.useCallback((hodnota: boolean) => {
    setZapnuto(hodnota);
    try {
      localStorage.setItem(KLIC, hodnota ? "zapnuto" : "vypnuto");
    } catch {}
  }, []);
  return [zapnuto, nastav];
}

/** Text zprávy se zvýrazněnými místy. */
function Zvyrazneni({ text, nalezy }: { text: string; nalezy: Nalez[] }) {
  const casti: React.ReactNode[] = [];
  let pozice = 0;
  nalezy.forEach((n, i) => {
    if (n.start > pozice) casti.push(text.slice(pozice, n.start));
    casti.push(
      <mark key={i} className="rounded bg-warning-soft px-0.5 text-ink underline decoration-warning decoration-2">
        {text.slice(n.start, n.konec)}
      </mark>,
    );
    pozice = n.konec;
  });
  if (pozice < text.length) casti.push(text.slice(pozice));
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{casti}</p>;
}

/**
 * Upozornění před odesláním. Neblokuje — rodič může zprávu upravit,
 * nechat ztišit křik, nebo ji odeslat tak, jak je.
 */
export function UpozorneniTonu({
  text,
  nalezy,
  onUpravit,
  onZtisit,
  onOdeslat,
  busy,
}: {
  text: string;
  nalezy: Nalez[];
  onUpravit: () => void;
  onZtisit: (novy: string) => void;
  onOdeslat: () => void;
  busy: boolean;
}) {
  const druhy = druhyNalezu(nalezy);
  const jdeZtisit = druhy.includes("krik") && ztisit(text) !== text;

  return (
    <div className="space-y-3 rounded-2xl border border-warning/50 bg-warning-soft p-4">
      <div className="flex gap-2.5">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
        <div>
          <p className="font-semibold text-ink">Než odešlete: tahle zpráva může vyznít útočně</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            Zprávy nejdou vzít zpět a končí i ve výpisu pro soud. Zvýrazněná místa:
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-surface p-3">
        <Zvyrazneni text={text} nalezy={nalezy} />
      </div>

      <ul className="space-y-2.5 text-sm">
        {druhy.map((d) => (
          <li key={d}>
            <span className="font-semibold text-ink">{POPIS[d].nazev}. </span>
            <span className="text-ink-muted">{POPIS[d].rada}</span>
            <span className="mt-0.5 block text-ink-subtle">Třeba: {POPIS[d].priklad}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onUpravit}>
          Upravit zprávu
        </Button>
        {jdeZtisit ? (
          <Button size="sm" variant="secondary" onClick={() => onZtisit(ztisit(text))}>
            Ztlumit velká písmena a vykřičníky
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onOdeslat} disabled={busy}>
          Odeslat i tak
        </Button>
      </div>
    </div>
  );
}

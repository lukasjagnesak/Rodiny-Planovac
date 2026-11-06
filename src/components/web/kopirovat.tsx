"use client";

import * as React from "react";
import { Copy, Check, Printer } from "lucide-react";

/**
 * Zkopírovat vzor do schránky a vytisknout ho.
 *
 * Vzor je na stránce jako obyčejný text schválně — takhle se dá vložit do
 * Wordu bez formátovacích zbytků a nemusí se nikde hledat příloha.
 */
export function NastrojeDokumentu({ text }: { text: string }) {
  const [zkopirovano, setZkopirovano] = React.useState(false);

  async function kopiruj() {
    try {
      await navigator.clipboard.writeText(text);
      setZkopirovano(true);
      setTimeout(() => setZkopirovano(false), 2500);
    } catch {
      // Starší prohlížeč nebo odepřené oprávnění — text je vidět,
      // označit a zkopírovat ho jde pořád ručně.
    }
  }

  return (
    <div className="no-print flex flex-wrap gap-2">
      <button
        type="button"
        onClick={kopiruj}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 font-medium text-brand-ink transition-colors hover:bg-brand-hover"
      >
        {zkopirovano ? <Check size={18} /> : <Copy size={18} />}
        {zkopirovano ? "Zkopírováno" : "Zkopírovat text"}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-5 font-medium text-ink transition-colors hover:bg-surface-2"
      >
        <Printer size={18} />
        Vytisknout
      </button>
    </div>
  );
}

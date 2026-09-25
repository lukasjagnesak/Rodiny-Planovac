import Link from "next/link";
import { Znak } from "@/components/ui/logo";
import { ZNACKA } from "@/lib/brand";
import { ZKUSEBNI_SLIB } from "@/lib/tarify";

/**
 * Čí ta kalkulačka vlastně je.
 *
 * Kdo přijde z reklamy, vidí nástroj a nikde ani slovo o tom, že za ním
 * stojí aplikace, kterou si může rovnou zkusit. Nabídka pod výsledkem
 * pak přijde jako z čistého nebe — „Klidoo" je do té chvíle jen slovo
 * v patičce.
 *
 * Proto pruh nad nástrojem, ne tlačítko: člověk si přišel počítat, ne
 * registrovat se, a odvádět ho hned pryč by bylo proti němu i proti nám.
 * Řekne, čí to je a že se to dá zkusit zadarmo — a jde z cesty.
 */
export function PruhKlidoo({ co }: { co: string }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Znak size={28} className="mt-0.5" />
        <p className="min-w-0 text-sm leading-relaxed text-ink-muted">
          {co} od <strong className="font-semibold text-ink">{ZNACKA}</strong> — aplikace pro
          rodiče, kteří se o děti střídají. {ZKUSEBNI_SLIB.vetaKratka}
        </p>
      </div>
      <Link
        href="/registrace"
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-brand px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
      >
        Vyzkoušet zdarma
      </Link>
    </div>
  );
}

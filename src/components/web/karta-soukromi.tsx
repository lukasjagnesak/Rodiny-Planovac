import Link from "next/link";
import { Ikona } from "@/components/ui/ikona";
import { SOUKROMI } from "@/lib/texty";
import { cn } from "@/lib/format";

/**
 * Karta soukromí — registrace, homepage a ceník. Jen tvrzení, která
 * odpovídají oprávněním v databázi a zásadám ochrany údajů; žádné
 * „100 % bezpečné“ (master brief 2026, kap. 2.2 a 9).
 */
export function KartaSoukromi({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-4 sm:p-5", className)}>
      <p className="flex items-center gap-2.5 font-semibold text-ink">
        <span className="text-success">
          <Ikona nazev="stit" size={20} />
        </span>
        {SOUKROMI.nadpis}
      </p>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">{SOUKROMI.text}</p>
      <p className="mt-2 text-[0.9375rem] text-ink-muted">
        Odpovídá zveřejněným{" "}
        <Link
          href="/zasady-ochrany-osobnich-udaju"
          className="underline decoration-dotted underline-offset-4 hover:text-ink"
        >
          zásadám ochrany osobních údajů
        </Link>
        . Podrobně na stránce{" "}
        <Link href="/bezpecnost" className="underline decoration-dotted underline-offset-4 hover:text-ink">
          Bezpečnost a data
        </Link>
        .
      </p>
    </div>
  );
}

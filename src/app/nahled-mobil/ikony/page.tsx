import { notFound } from "next/navigation";
import { Ikona, IkonaDlazdice } from "@/components/ui/ikona";
import { NAZVY_IKON } from "@/lib/ikony";
import { EVENT_KINDS, EXPENSE_CATEGORIES } from "@/lib/constants";

/**
 * Katalog ikon Klidoo — jen pro vývoj. Nová ikona se tu zkontroluje
 * vedle ostatních, ve dvou velikostech a na barevném podkladu.
 */
export default function KatalogIkon() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-4xl space-y-10 p-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Ikony Klidoo</h1>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Celá sada
        </h2>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {NAZVY_IKON.map((n) => (
            <li
              key={n}
              className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-3 text-ink"
            >
              <div className="flex items-end gap-3">
                <Ikona nazev={n} size={32} />
                <Ikona nazev={n} size={20} />
              </div>
              <code className="text-xs text-ink-muted">{n}</code>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Typy událostí a kategorie výdajů
        </h2>
        <div className="flex flex-wrap gap-3">
          {[...Object.values(EVENT_KINDS), ...Object.values(EXPENSE_CATEGORIES)].map((m) => (
            <div key={m.label} className="flex items-center gap-2 text-sm text-ink">
              <IkonaDlazdice nazev={m.ikona} barva={m.color} />
              {m.label}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

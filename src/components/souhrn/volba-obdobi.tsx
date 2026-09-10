"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import {
  endOfMonth,
  endOfYear,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/format";
import { toDateKey } from "@/lib/dates";

/**
 * Období, za které se souhrn počítá.
 *
 * Předvolby nejsou náhodné — jsou to lhůty, na které se ptají soudy
 * a úřady: uplynulý rok kvůli rozsahu péče, loňský kalendářní rok kvůli
 * daním a doložení nákladů, tento měsíc na běžnou kontrolu mezi rodiči.
 */
const PREDVOLBY = {
  "tento-mesic": {
    popisek: "Tento měsíc",
    rozsah: () => ({ od: startOfMonth(new Date()), do: endOfMonth(new Date()) }),
  },
  "minulych-12": {
    popisek: "Posledních 12 měsíců",
    rozsah: () => ({ od: subMonths(new Date(), 12), do: new Date() }),
  },
  letos: {
    popisek: "Letos",
    rozsah: () => ({ od: startOfYear(new Date()), do: new Date() }),
  },
  loni: {
    popisek: "Loni",
    rozsah: () => {
      const loni = subYears(new Date(), 1);
      return { od: startOfYear(loni), do: endOfYear(loni) };
    },
  },
} as const;

export type KlicObdobi = keyof typeof PREDVOLBY | "vlastni";

/**
 * Přeloží parametry z adresy na skutečné období.
 *
 * Běží i na serveru, proto tady a ne uvnitř komponenty. Nesmyslné datum
 * v adrese nesmí shodit stránku — vrátí se výchozí období, protože
 * dokument s chybějícími čísly je horší než dokument za jiné období.
 */
export function urciObdobi(
  od?: string,
  doData?: string,
): { od: Date; do: Date; klic: KlicObdobi } {
  const platne = (h?: string) => {
    if (!h || !/^\d{4}-\d{2}-\d{2}$/.test(h)) return null;
    const d = new Date(`${h}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const zacatek = platne(od);
  const konec = platne(doData);

  if (zacatek && konec && zacatek <= konec) {
    for (const [klic, p] of Object.entries(PREDVOLBY)) {
      const r = p.rozsah();
      if (toDateKey(r.od) === toDateKey(zacatek) && toDateKey(r.do) === toDateKey(konec)) {
        return { od: zacatek, do: konec, klic: klic as KlicObdobi };
      }
    }
    return { od: zacatek, do: konec, klic: "vlastni" };
  }

  const vychozi = PREDVOLBY["minulych-12"].rozsah();
  return { od: vychozi.od, do: vychozi.do, klic: "minulych-12" };
}

export function VolbaObdobi({
  aktivni,
  od,
  do: doData,
}: {
  aktivni: KlicObdobi;
  od: string;
  do: string;
}) {
  const router = useRouter();

  function nastav(odKlic: string, doKlic: string) {
    router.push(`/souhrn?od=${odKlic}&do=${doKlic}`);
  }

  return (
    <div className="no-print space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Souhrn pro soud a advokáta
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Kolik nocí děti u koho byly, co se za ně utratilo a kdo vozil. Vyber období,
          zkontroluj a vytiskni — nebo ulož jako PDF.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(PREDVOLBY).map(([klic, p]) => (
          <button
            key={klic}
            type="button"
            onClick={() => {
              const r = p.rozsah();
              nastav(toDateKey(r.od), toDateKey(r.do));
            }}
            className={cn(
              "rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
              aktivni === klic
                ? "border-brand bg-brand-soft text-brand"
                : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {p.popisek}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-ink-muted">Od</span>
          <Input
            type="date"
            defaultValue={od}
            max={doData}
            onChange={(e) => e.target.value && nastav(e.target.value, doData)}
            className="w-auto"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-muted">Do</span>
          <Input
            type="date"
            defaultValue={doData}
            min={od}
            onChange={(e) => e.target.value && nastav(od, e.target.value)}
            className="w-auto"
          />
        </label>
        <Button onClick={() => window.print()} className="ml-auto">
          <Printer className="h-4 w-4" />
          Tisk / uložit PDF
        </Button>
      </div>
    </div>
  );
}

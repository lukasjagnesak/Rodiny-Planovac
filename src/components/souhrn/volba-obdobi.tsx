"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/format";
import { toDateKey } from "@/lib/dates";
import { PREDVOLBY, type KlicObdobi } from "@/lib/obdobi";

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

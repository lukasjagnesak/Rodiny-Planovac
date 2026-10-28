"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const parametry = useSearchParams();
  const [tisknu, setTisknu] = React.useState(false);
  const [chyba, setChyba] = React.useState<string | null>(null);

  // Po vytvoření kódu se stránka načte znovu i s kódem v patičce —
  // teprve pak se tiskne, aby kód byl na papíře.
  React.useEffect(() => {
    if (parametry.get("tisk") !== "1" || !parametry.get("kod")) return;
    const casovac = setTimeout(() => {
      window.print();
      router.replace(`/souhrn?od=${od}&do=${doData}&kod=${parametry.get("kod")}`);
    }, 400);
    return () => clearTimeout(casovac);
  }, [parametry, router, od, doData]);

  async function tisk() {
    setTisknu(true);
    setChyba(null);
    try {
      const odpoved = await fetch("/api/vypisy/souhrn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ od, do: doData }),
      });
      const data = (await odpoved.json()) as { kod?: string; chyba?: string };
      if (!odpoved.ok || !data.kod) throw new Error(data.chyba ?? "Kód se nepodařilo vytvořit.");
      router.replace(`/souhrn?od=${od}&do=${doData}&kod=${data.kod}&tisk=1`);
    } catch (e) {
      setChyba(e instanceof Error ? e.message : "Kód se nepodařilo vytvořit.");
    } finally {
      setTisknu(false);
    }
  }

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
          Kolik nocí děti u koho byly, co se za ně utratilo a kdo vozil. Vyberte období,
          zkontrolujte a vytiskněte — nebo uložte jako PDF.
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
        <Button onClick={tisk} disabled={tisknu} className="ml-auto">
          <Printer className="h-4 w-4" />
          {tisknu ? "Připravuji…" : "Tisk / uložit PDF"}
        </Button>
      </div>
      {chyba ? <p className="text-sm text-danger">{chyba}</p> : null}
      <p className="text-xs text-ink-muted">
        Vytištěný souhrn dostane ověřovací kód. Na klidoo.cz/overit pak soud nebo advokát zjistí,
        že čísla pocházejí z Klidoo. Vytvoření souhrnu se zapíše do historie rodiny.
      </p>
    </div>
  );
}

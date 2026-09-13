"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/client";
import { hlaskaChyby } from "@/lib/format";
import {
  jeUpravene,
  posun,
  prepni,
  serazeneKarty,
  ulozitelnyTvar,
  type KartaVolba,
} from "@/lib/prehled-karty";
import type { SessionContext } from "@/lib/types";

/**
 * Skládání přehledu — co se ukazuje a v jakém pořadí.
 *
 * Pořadí se mění šipkami, ne tažením. Na mobilu, kde se přehled používá
 * nejvíc, se tažením v dlouhém seznamu trefuje mizerně, a šipky navíc
 * fungují i z klávesnice a odečítače obrazovky.
 *
 * Ukládá se až na tlačítko. Napřed to ukládalo samo po každém kliknutí,
 * jenže přerovnat pár karet znamená pět zápisů za sebou a rodič se mezi
 * nimi nemá jak rozmyslet.
 */
export function PrehledSettings({ session }: { session: SessionContext }) {
  const router = useRouter();
  const vychozi = React.useMemo(
    () => serazeneKarty(session.profile.prehled_karty),
    [session.profile.prehled_karty],
  );

  const [volby, setVolby] = React.useState<KartaVolba[]>(vychozi);
  const [uklada, setUklada] = React.useState(false);
  const [chyba, setChyba] = React.useState<string | null>(null);
  const [hotovo, setHotovo] = React.useState(false);

  const zmeneno = React.useMemo(
    () => ulozitelnyTvar(volby).join() !== ulozitelnyTvar(vychozi).join(),
    [volby, vychozi],
  );

  function uprav(nove: KartaVolba[]) {
    setVolby(nove);
    setHotovo(false);
    setChyba(null);
  }

  async function uloz() {
    setUklada(true);
    setChyba(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ prehled_karty: ulozitelnyTvar(volby) })
      .eq("id", session.userId);

    setUklada(false);
    if (error) {
      setChyba(hlaskaChyby(error));
      return;
    }
    setHotovo(true);
    router.refresh();
  }

  const zapnutych = volby.filter((v) => v.zapnuta).length;

  return (
    <Card>
      <CardHeader
        title="Co se ukazuje na přehledu"
        description="Vypni, co nepotřebuješ, a přerovnej zbytek. Platí jen pro tebe — druhý rodič má svoje."
      />

      <ul className="divide-y divide-line border-y border-line">
        {volby.map((karta, i) => (
          <li
            key={karta.id}
            className="flex items-center gap-2 px-3 py-3 sm:px-4"
            aria-label={karta.nazev}
          >
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => uprav(posun(volby, karta.id, -1))}
                disabled={i === 0}
                className="rounded-md p-1 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                aria-label={`Posunout „${karta.nazev}" nahoru`}
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => uprav(posun(volby, karta.id, 1))}
                disabled={i === volby.length - 1}
                className="rounded-md p-1 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                aria-label={`Posunout „${karta.nazev}" dolů`}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{karta.nazev}</span>
                <span className="block text-sm text-ink-muted">{karta.popis}</span>
              </span>
              <input
                type="checkbox"
                checked={karta.zapnuta}
                onChange={() => uprav(prepni(volby, karta.id))}
                className="h-5 w-5 shrink-0 accent-[var(--brand)]"
              />
            </label>
          </li>
        ))}
      </ul>

      <CardBody className="space-y-3 pt-4">
        {zapnutych === 0 ? (
          <Alert tone="warning">
            Všechno je vypnuté — na přehledu zůstane jenom pozdrav. To se dá, ale nejspíš to
            není, co jsi chtěl.
          </Alert>
        ) : null}
        {chyba ? <Alert tone="danger">{chyba}</Alert> : null}
        {hotovo ? <Alert tone="success">Uloženo. Přehled už vypadá takhle.</Alert> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={uloz} disabled={uklada || !zmeneno}>
            {uklada ? "Ukládám…" : "Uložit rozvržení"}
          </Button>
          {jeUpravene(volby) ? (
            <Button
              variant="secondary"
              onClick={() => uprav(serazeneKarty(null))}
              disabled={uklada}
            >
              <RotateCcw className="h-4 w-4" />
              Výchozí pořadí
            </Button>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

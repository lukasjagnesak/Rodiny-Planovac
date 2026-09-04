"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Repeat, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmSheet } from "@/components/ui/sheet";
import { Alert } from "@/components/ui/misc";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatDayShort } from "@/lib/dates";
import { formatMoney, hlaskaChyby } from "@/lib/format";
import { FREKVENCE_POPIS, pristiTermin } from "@/lib/opakovani";
import type { OpakovanyVydaj, SessionContext } from "@/lib/types";

/**
 * Přehled pravidelných výdajů.
 *
 * Zastavit jde jedním kliknutím a je to schválně měkčí varianta než
 * smazání: dítě přestane chodit na kroužek, ale platby z minulého pololetí
 * mají v přehledu zůstat. Smazání šablony proto historii nemaže —
 * vygenerované výdaje zůstávají a jen se odpojí.
 */
export function OpakovaneVydaje({
  session,
  polozky,
  muzeUpravovat,
}: {
  session: SessionContext;
  polozky: OpakovanyVydaj[];
  muzeUpravovat: boolean;
}) {
  const router = useRouter();
  const [mazany, setMazany] = React.useState<OpakovanyVydaj | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [chyba, setChyba] = React.useState<string | null>(null);

  if (polozky.length === 0) return null;

  async function prepni(polozka: OpakovanyVydaj) {
    setChyba(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("vydaje_opakovane")
      .update({ aktivni: !polozka.aktivni, updated_at: new Date().toISOString() })
      .eq("id", polozka.id);
    if (error) setChyba(hlaskaChyby(error));
    else router.refresh();
  }

  async function smaz() {
    if (!mazany) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("vydaje_opakovane").delete().eq("id", mazany.id);
    setBusy(false);
    setMazany(null);
    if (error) setChyba(hlaskaChyby(error));
    else router.refresh();
  }

  const dnes = new Date();

  return (
    <>
      <Card>
        <CardHeader
          title="Pravidelné výdaje"
          description="Zapisují se samy. Zastavit je můžeš kdykoli."
        />
        <CardBody className="space-y-2 pt-3">
          {chyba ? <Alert tone="danger">{chyba}</Alert> : null}

          {polozky.map((p) => {
            const meta = EXPENSE_CATEGORIES[p.category];
            const dite = session.children.find((d) => d.id === p.child_id);
            const pristi = p.aktivni
              ? pristiTermin({ zacina: p.zacina, konci: p.konci, frekvence: p.frekvence }, dnes)
              : null;

            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
                  style={{ backgroundColor: `${meta.color}22` }}
                  aria-hidden
                >
                  {meta.emoji}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {p.title}
                    {dite ? <span className="text-ink-subtle"> · {dite.name}</span> : null}
                  </p>
                  <p className="truncate text-xs text-ink-subtle">
                    {formatMoney(Number(p.amount), p.currency)} · {FREKVENCE_POPIS[p.frekvence]}
                    {p.aktivni
                      ? pristi
                        ? ` · příště ${formatDayShort(pristi)}`
                        : " · doběhlo"
                      : " · zastaveno"}
                  </p>
                </div>

                {muzeUpravovat ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => prepni(p)}
                      aria-label={p.aktivni ? "Zastavit opakování" : "Znovu spustit"}
                      title={p.aktivni ? "Zastavit" : "Spustit"}
                      className="rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-ink"
                    >
                      {p.aktivni ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMazany(p)}
                      aria-label="Smazat opakování"
                      className="rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Repeat className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
                )}
              </div>
            );
          })}
        </CardBody>
      </Card>

      <ConfirmSheet
        open={Boolean(mazany)}
        onClose={() => setMazany(null)}
        onConfirm={smaz}
        busy={busy}
        title="Smazat pravidelný výdaj"
        message={
          mazany
            ? `Přestane se zapisovat „${mazany.title}". Platby, které už vznikly, zůstanou v přehledu — smaže se jen samotné opakování.`
            : ""
        }
      />
    </>
  );
}

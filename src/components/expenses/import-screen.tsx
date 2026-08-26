"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Alert, EmptyState, Spinner } from "@/components/ui/misc";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_ORDER } from "@/lib/constants";
import { prectiCsv, type RadekImportu } from "@/lib/import-vydaju";
import { formatDay } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import type { ExpenseCategory, SessionContext } from "@/lib/types";

/**
 * Český Excel ukládá CSV ve Windows-1250. Bez toho by se z „Oblečení"
 * stalo „Obleèení" a rodič by si myslel, že je rozbitá aplikace.
 */
async function prectiSoubor(soubor: File): Promise<string> {
  const buffer = await soubor.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1250").decode(buffer);
  }
}

interface Vybrany extends RadekImportu {
  vybrano: boolean;
}

export function ImportScreen({ session }: { session: SessionContext }) {
  const router = useRouter();
  const [radky, setRadky] = React.useState<Vybrany[]>([]);
  const [nazevSouboru, setNazevSouboru] = React.useState<string | null>(null);
  const [dite, setDite] = React.useState("");
  const [hromadna, setHromadna] = React.useState<ExpenseCategory | "">("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hotovo, setHotovo] = React.useState<number | null>(null);

  const deti = session.children.filter((c) => !c.archived);

  async function nacti(soubor: File) {
    setError(null);
    setHotovo(null);

    try {
      const obsah = await prectiSoubor(soubor);
      const { radky: prectene } = prectiCsv(obsah);

      if (prectene.length === 0) {
        setError("V souboru nejsou žádné řádky s daty.");
        return;
      }

      setNazevSouboru(soubor.name);
      // Řádky s chybou se schválně nepředvybírají — ať je vidět, že se
      // s nimi musí něco udělat, místo aby propadly do přehledu.
      setRadky(prectene.map((r) => ({ ...r, vybrano: r.chyba === null })));
    } catch {
      setError("Soubor se nepodařilo přečíst. Ulož ho z Excelu jako CSV.");
    }
  }

  function nastavKategorii(cislo: number, kategorie: ExpenseCategory | null) {
    setRadky((r) => r.map((x) => (x.cislo === cislo ? { ...x, kategorie } : x)));
  }

  function prepni(cislo: number) {
    setRadky((r) => r.map((x) => (x.cislo === cislo ? { ...x, vybrano: !x.vybrano } : x)));
  }

  function nastavVsem() {
    if (!hromadna) return;
    setRadky((r) => r.map((x) => (x.vybrano ? { ...x, kategorie: hromadna } : x)));
  }

  const kImportu = radky.filter((r) => r.vybrano && r.chyba === null);
  const celkem = kImportu.reduce((s, r) => s + (r.castka ?? 0), 0);

  async function importuj() {
    if (kImportu.length === 0) return;

    setBusy(true);
    setError(null);
    const supabase = createClient();

    const dnes = new Date().toISOString().slice(0, 10);
    const { error: chyba } = await supabase.from("expenses").insert(
      kImportu.map((r) => ({
        family_id: session.family.id,
        child_id: dite || null,
        category: r.kategorie ?? "other",
        title: r.popis.slice(0, 200),
        amount: Math.abs(r.castka ?? 0),
        currency: session.family.currency,
        spent_on: r.datum ?? dnes,
        paid_by: session.userId,
        note: r.poznamka,
      })),
    );

    setBusy(false);
    if (chyba) {
      setError(chyba.message);
      return;
    }

    setHotovo(kImportu.length);
    setRadky([]);
    setNazevSouboru(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Link
        href="/vydaje"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Výdaje
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Import z tabulky
        </h1>
        <p className="text-sm text-ink-muted">
          Nahraj CSV a před uložením zkontroluj, co se z něj přečetlo.
        </p>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {hotovo !== null ? (
        <Alert tone="success">
          Uloženo {hotovo} výdajů. Najdeš je v přehledu.
        </Alert>
      ) : null}

      {radky.length === 0 ? (
        <>
          <Card>
            <CardBody>
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong px-6 py-10 text-center transition-colors hover:border-brand">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <FileSpreadsheet className="h-6 w-6" />
                </span>
                <span className="font-medium text-ink">Vybrat soubor CSV</span>
                <span className="max-w-sm text-sm text-ink-muted">
                  V Excelu <strong>Soubor → Uložit jako → CSV</strong>. Středník i čárka
                  jako oddělovač jsou v pořádku, diakritika taky.
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const soubor = e.target.files?.[0];
                    if (soubor) nacti(soubor);
                  }}
                />
              </label>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Jak má tabulka vypadat" />
            <CardBody className="space-y-2 pt-3 text-sm text-ink-muted">
              <p>
                Stačí sloupce <strong className="text-ink">datum</strong>,{" "}
                <strong className="text-ink">popis</strong> a{" "}
                <strong className="text-ink">částka</strong>. Poznají se podle názvu
                v prvním řádku, takže na pořadí nezáleží. Kategorie a poznámka jsou navíc.
              </p>
              <p>
                Datum může být <code>15.3.2026</code> i <code>2026-03-15</code>, částka{" "}
                <code>1 890 Kč</code> i <code>1890,50</code>. Kategorii se pokusím
                uhodnout z popisu a před uložením ji můžeš opravit.
              </p>
            </CardBody>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardBody className="space-y-4">
              <p className="text-sm text-ink-muted">
                <strong className="text-ink">{nazevSouboru}</strong> — {radky.length} řádků,
                z toho {kImportu.length} k uložení
                {celkem > 0 ? (
                  <>
                    {" "}
                    za <span className="tnum">{formatMoney(celkem, session.family.currency)}</span>
                  </>
                ) : null}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Komu výdaje patří" hint="nepovinné">
                  <Select value={dite} onChange={(e) => setDite(e.target.value)}>
                    <option value="">Celá rodina</option>
                    {deti.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Nastavit kategorii všem vybraným">
                  <div className="flex gap-2">
                    <Select
                      value={hromadna}
                      onChange={(e) => setHromadna(e.target.value as ExpenseCategory)}
                    >
                      <option value="">— vyber —</option>
                      {EXPENSE_CATEGORY_ORDER.map((k) => (
                        <option key={k} value={k}>
                          {EXPENSE_CATEGORIES[k].emoji} {EXPENSE_CATEGORIES[k].label}
                        </option>
                      ))}
                    </Select>
                    <Button variant="secondary" onClick={nastavVsem} disabled={!hromadna}>
                      Použít
                    </Button>
                  </div>
                </Field>
              </div>
            </CardBody>
          </Card>

          <ul className="space-y-2">
            {radky.map((r) => (
              <li key={r.cislo}>
                <Card
                  className="p-3"
                  style={{
                    borderLeft: `3px solid ${
                      r.chyba ? "var(--danger)" : "var(--line-strong)"
                    }`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={r.vybrano}
                      disabled={r.chyba !== null}
                      onChange={() => prepni(r.cislo)}
                      aria-label={`Zahrnout řádek ${r.cislo}`}
                      className="mt-1 h-5 w-5 shrink-0 rounded-md border-line-strong accent-[var(--brand)] disabled:opacity-40"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium text-ink">
                          {r.popis || <em className="text-ink-subtle">bez popisu</em>}
                        </span>
                        <span className="tnum text-sm text-ink-muted">
                          {r.castka !== null
                            ? formatMoney(Math.abs(r.castka), session.family.currency)
                            : "—"}
                        </span>
                        <span className="tnum text-xs text-ink-subtle">
                          {r.datum ? formatDay(r.datum) : "bez data → dnes"}
                        </span>
                      </div>

                      {r.chyba ? (
                        <p className="mt-1 text-xs text-danger">
                          Řádek {r.cislo}: {r.chyba}
                        </p>
                      ) : (
                        <Select
                          className="mt-2 h-9 py-1 text-sm"
                          value={r.kategorie ?? "other"}
                          onChange={(e) =>
                            nastavKategorii(r.cislo, e.target.value as ExpenseCategory)
                          }
                        >
                          {EXPENSE_CATEGORY_ORDER.map((k) => (
                            <option key={k} value={k}>
                              {EXPENSE_CATEGORIES[k].emoji} {EXPENSE_CATEGORIES[k].label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          <div className="safe-bottom sticky bottom-20 flex gap-2 lg:bottom-4">
            <Button
              size="lg"
              className="flex-1 shadow-[var(--shadow-pop)]"
              onClick={importuj}
              disabled={busy || kImportu.length === 0}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Uložit {kImportu.length}{" "}
              {kImportu.length === 1 ? "výdaj" : kImportu.length < 5 ? "výdaje" : "výdajů"}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setRadky([])} disabled={busy}>
              Zrušit
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

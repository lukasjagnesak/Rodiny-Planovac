"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, EmptyState, Segmented } from "@/components/ui/misc";
import { ConfirmSheet } from "@/components/ui/sheet";
import { DOKLAD_DRUHY, DOKLAD_DRUH_ORDER } from "@/lib/constants";
import { formatDay } from "@/lib/dates";
import type { DokladDruh, Dokument, SessionContext } from "@/lib/types";

export function DokumentyScreen({
  session,
  dokumenty,
}: {
  session: SessionContext;
  dokumenty: Dokument[];
}) {
  const router = useRouter();
  const deti = session.children.filter((c) => !c.archived);

  const [dite, setDite] = React.useState(deti[0]?.id ?? "");
  const [druh, setDruh] = React.useState<DokladDruh>("pojistenec");
  const [nazev, setNazev] = React.useState("");
  const [platiDo, setPlatiDo] = React.useState("");
  const [soubor, setSoubor] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mazany, setMazany] = React.useState<Dokument | null>(null);
  const vstup = React.useRef<HTMLInputElement>(null);

  const canEdit = session.myMembership.role !== "viewer";

  const moje = React.useMemo(
    () => dokumenty.filter((d) => d.child_id === dite || (!dite && d.child_id === null)),
    [dokumenty, dite],
  );

  async function nahraj() {
    if (!soubor) {
      setError("Vyber soubor.");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();

    try {
      const pripona = soubor.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${session.family.id}/${dite || "rodina"}/${crypto.randomUUID()}.${pripona}`;

      const { error: uploadError } = await supabase.storage
        .from("dokumenty")
        .upload(path, soubor, { contentType: soubor.type || undefined, upsert: false });
      if (uploadError) throw uploadError;

      const { error: rowError } = await supabase.from("dokumenty").insert({
        family_id: session.family.id,
        child_id: dite || null,
        druh,
        nazev: nazev.trim() || DOKLAD_DRUHY[druh].label,
        storage_path: path,
        mime_type: soubor.type || null,
        size_bytes: soubor.size,
        plati_do: platiDo || null,
        created_by: session.userId,
      });
      if (rowError) throw rowError;

      setSoubor(null);
      setNazev("");
      setPlatiDo("");
      if (vstup.current) vstup.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nahrání se nepovedlo.");
    } finally {
      setBusy(false);
    }
  }

  /** Odkaz platí hodinu, takže se generuje až při kliknutí. */
  async function otevri(dokument: Dokument) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("dokumenty")
      .createSignedUrl(dokument.storage_path, 3600);

    if (error || !data) {
      setError("Soubor se nepodařilo otevřít.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function smaz() {
    if (!mazany) return;
    setBusy(true);
    const supabase = createClient();

    await supabase.storage.from("dokumenty").remove([mazany.storage_path]);
    const { error } = await supabase.from("dokumenty").delete().eq("id", mazany.id);

    setBusy(false);
    setMazany(null);
    if (error) setError(error.message);
    else router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Doklady</h1>
        <p className="text-sm text-ink-muted">
          Kartička pojištěnce, průkazy a očkování — po ruce oběma rodičům
        </p>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {deti.length > 1 ? (
        <Segmented
          value={dite}
          onChange={setDite}
          options={deti.map((c) => ({
            value: c.id,
            label: (
              <span className="flex items-center gap-1.5">
                <Dot color={c.color} /> {c.name}
              </span>
            ),
          }))}
        />
      ) : null}

      {moje.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="Zatím žádné doklady"
            description="Vyfoť kartičku pojištěnce. Až ji budeš na pohotovosti potřebovat, budeš ji mít."
          />
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {moje.map((d) => {
            const propadly = d.plati_do && d.plati_do < new Date().toISOString().slice(0, 10);
            return (
              <li key={d.id}>
                <Card className="flex items-center gap-3 p-4">
                  <span className="text-2xl" aria-hidden>
                    {DOKLAD_DRUHY[d.druh].emoji}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{d.nazev}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-subtle">
                      <span>{DOKLAD_DRUHY[d.druh].label}</span>
                      {d.plati_do ? (
                        <span className={propadly ? "text-danger" : undefined}>
                          · platí do {formatDay(d.plati_do)}
                        </span>
                      ) : null}
                    </p>
                  </div>

                  {propadly ? <Badge color="var(--danger)">propadlý</Badge> : null}

                  <button
                    type="button"
                    onClick={() => otevri(d)}
                    aria-label={`Otevřít ${d.nazev}`}
                    className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-ink"
                  >
                    <Download className="h-4 w-4" />
                  </button>

                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => setMazany(d)}
                      aria-label={`Smazat ${d.nazev}`}
                      className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {canEdit ? (
        <Card>
          <CardHeader title="Přidat doklad" />
          <CardBody className="space-y-4 pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Co to je">
                <Select value={druh} onChange={(e) => setDruh(e.target.value as DokladDruh)}>
                  {DOKLAD_DRUH_ORDER.map((d) => (
                    <option key={d} value={d}>
                      {DOKLAD_DRUHY[d].emoji} {DOKLAD_DRUHY[d].label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Platí do" hint="nepovinné">
                <Input
                  type="date"
                  value={platiDo}
                  onChange={(e) => setPlatiDo(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Popis" hint="nepovinné">
              <Input
                value={nazev}
                onChange={(e) => setNazev(e.target.value)}
                placeholder={DOKLAD_DRUHY[druh].label}
              />
            </Field>

            <Field label="Soubor" hint="fotka nebo PDF">
              <Input
                ref={vstup}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setSoubor(e.target.files?.[0] ?? null)}
              />
            </Field>

            <Button onClick={nahraj} disabled={busy || !soubor}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Nahrát
            </Button>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="flex gap-3 text-sm text-ink-muted">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <div className="space-y-1.5">
            <p>
              <strong className="text-ink">Doklady vidí jen ten, kdo o dítě pečuje.</strong>{" "}
              Na rozdíl od účtenek se k nim role „jen pro čtení" nedostane. Soubory leží
              v privátním úložišti a otevírají se odkazem, který platí hodinu.
            </p>
            <p>
              Dávej sem jen to, co má smysl mít po ruce u lékaře nebo na úřadě. Čím míň
              citlivého se někde válí, tím líp — i když je to zamčené.
            </p>
          </div>
        </CardBody>
      </Card>

      <ConfirmSheet
        open={mazany !== null}
        onClose={() => setMazany(null)}
        onConfirm={smaz}
        title="Smazat doklad"
        message={`Opravdu smazat ${mazany?.nazev ?? "doklad"}? Smaže se i nahraný soubor.`}
        busy={busy}
      />
    </div>
  );
}

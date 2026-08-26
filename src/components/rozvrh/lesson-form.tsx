"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/misc";
import { PARITA_LABELS, ZVONENI, vychoziCasy } from "@/lib/rozvrh";
import { DOW_LONG } from "@/lib/dates";
import type { RozvrhHodina, RozvrhParita, SessionContext } from "@/lib/types";

const PARITY: RozvrhParita[] = ["vzdy", "sudy", "lichy"];

export function LessonForm({
  open,
  onClose,
  session,
  childId,
  den,
  hodina,
  obsazenaPoradi,
}: {
  open: boolean;
  onClose: () => void;
  session: SessionContext;
  childId: string;
  den: number;
  hodina: RozvrhHodina | null;
  /** Pořadí, která už ten den existují — aby se nedaly založit dvakrát. */
  obsazenaPoradi: number[];
}) {
  const router = useRouter();
  const [poradi, setPoradi] = React.useState(1);
  const [predmet, setPredmet] = React.useState("");
  const [ucebna, setUcebna] = React.useState("");
  const [ucitel, setUcitel] = React.useState("");
  const [zacatek, setZacatek] = React.useState("08:00");
  const [konec, setKonec] = React.useState("08:45");
  const [parita, setParita] = React.useState<RozvrhParita>("vzdy");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Nová hodina navrhne první volné pořadí a k němu čas podle zvonění.
  React.useEffect(() => {
    if (!open) return;
    setError(null);

    if (hodina) {
      setPoradi(hodina.poradi);
      setPredmet(hodina.predmet);
      setUcebna(hodina.ucebna ?? "");
      setUcitel(hodina.ucitel ?? "");
      setZacatek(hodina.zacatek.slice(0, 5));
      setKonec(hodina.konec.slice(0, 5));
      setParita(hodina.parita);
      return;
    }

    const volne = ZVONENI.find((z) => z.poradi > 0 && !obsazenaPoradi.includes(z.poradi));
    const navrh = volne ?? ZVONENI[1];
    setPoradi(navrh.poradi);
    setPredmet("");
    setUcebna("");
    setUcitel("");
    setZacatek(navrh.zacatek);
    setKonec(navrh.konec);
    setParita("vzdy");
  }, [open, hodina, obsazenaPoradi]);

  /** Při změně pořadí se časy dotáhnou ze zvonění, pokud je uživatel neupravil ručně. */
  function zmenPoradi(nove: number) {
    const stare = vychoziCasy(poradi);
    const bylyVychozi = zacatek === stare.zacatek && konec === stare.konec;
    setPoradi(nove);
    if (bylyVychozi) {
      const casy = vychoziCasy(nove);
      setZacatek(casy.zacatek);
      setKonec(casy.konec);
    }
  }

  async function uloz() {
    if (!predmet.trim()) {
      setError("Vyplň předmět.");
      return;
    }
    if (konec <= zacatek) {
      setError("Konec musí být později než začátek.");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();

    const radek = {
      family_id: session.family.id,
      child_id: childId,
      den,
      poradi,
      predmet: predmet.trim(),
      ucebna: ucebna.trim() || null,
      ucitel: ucitel.trim() || null,
      zacatek,
      konec,
      parita,
      ze_edupage: false,
    };

    const { error } = hodina
      ? await supabase.from("rozvrh_hodiny").update(radek).eq("id", hodina.id)
      : await supabase.from("rozvrh_hodiny").insert(radek);

    setBusy(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "Tuhle hodinu už v ten den máš. Uprav ji, nebo zvol jiné pořadí."
          : error.message,
      );
      return;
    }
    onClose();
    router.refresh();
  }

  async function smaz() {
    if (!hodina) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("rozvrh_hodiny").delete().eq("id", hodina.id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={hodina ? "Upravit hodinu" : "Přidat hodinu"}
      description={DOW_LONG[den % 7]}
      footer={
        <>
          {hodina ? (
            <Button variant="danger" onClick={smaz} disabled={busy}>
              Smazat
            </Button>
          ) : null}
          <Button className="flex-1" onClick={uloz} disabled={busy}>
            {busy ? <Spinner /> : null} Uložit
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Hodina">
            <Select value={poradi} onChange={(e) => zmenPoradi(Number(e.target.value))}>
              {ZVONENI.map((z) => (
                <option key={z.poradi} value={z.poradi}>
                  {z.poradi}. ({z.zacatek})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Týden">
            <Select
              value={parita}
              onChange={(e) => setParita(e.target.value as RozvrhParita)}
            >
              {PARITY.map((p) => (
                <option key={p} value={p}>
                  {PARITA_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Předmět" required>
          <Input
            value={predmet}
            onChange={(e) => setPredmet(e.target.value)}
            placeholder="Matematika"
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Od">
            <Input type="time" value={zacatek} onChange={(e) => setZacatek(e.target.value)} />
          </Field>
          <Field label="Do">
            <Input type="time" value={konec} onChange={(e) => setKonec(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Učebna">
            <Input value={ucebna} onChange={(e) => setUcebna(e.target.value)} placeholder="2.B" />
          </Field>
          <Field label="Učitel">
            <Input value={ucitel} onChange={(e) => setUcitel(e.target.value)} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}

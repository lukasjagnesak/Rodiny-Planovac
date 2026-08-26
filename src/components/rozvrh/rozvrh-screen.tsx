"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getISOWeek } from "date-fns";
import { Download, MapPin, Plus, Table2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, Segmented, Spinner } from "@/components/ui/misc";
import { LessonForm } from "./lesson-form";
import {
  denVTydnu,
  hodinTydne,
  konecVyucovani,
  maParitu,
  zacatekVyucovani,
} from "@/lib/rozvrh";
import { DOW_SHORT } from "@/lib/dates";
import { cn } from "@/lib/format";
import type { RozvrhHodina, SessionContext } from "@/lib/types";

/** Pondělí až pátek — víkendová hodina se dá založit, ale mřížka je školní. */
const DNY = [1, 2, 3, 4, 5];
const NAZVY: Record<number, string> = {
  1: "Pondělí",
  2: "Úterý",
  3: "Středa",
  4: "Čtvrtek",
  5: "Pátek",
};

export function RozvrhScreen({
  session,
  hodiny,
  edupagePropojeno,
}: {
  session: SessionContext;
  hodiny: RozvrhHodina[];
  edupagePropojeno: boolean;
}) {
  const router = useRouter();
  const deti = session.children.filter((c) => !c.archived);
  const [childId, setChildId] = React.useState(deti[0]?.id ?? "");

  const dnes = React.useMemo(() => new Date(), []);
  const dnesniDen = denVTydnu(dnes);
  const [den, setDen] = React.useState(DNY.includes(dnesniDen) ? dnesniDen : 1);

  // Náhled týdne — u rozvrhů se sudým/lichým se dá přepnout.
  const [nahled, setNahled] = React.useState<"sudy" | "lichy">(
    getISOWeek(dnes) % 2 === 0 ? "sudy" : "lichy",
  );

  const [formOpen, setFormOpen] = React.useState(false);
  const [editovana, setEditovana] = React.useState<RozvrhHodina | null>(null);
  const [novyDen, setNovyDen] = React.useState(1);
  const [stahuji, setStahuji] = React.useState(false);
  const [zprava, setZprava] = React.useState<string | null>(null);
  const [chyba, setChyba] = React.useState<string | null>(null);

  const canEdit = session.myMembership.role !== "viewer";

  const moje = React.useMemo(
    () => hodiny.filter((h) => h.child_id === childId),
    [hodiny, childId],
  );

  const rozlisujeTydny = maParitu(moje);

  /** Hodiny, které se v náhledu ukážou — podle zvoleného sudého/lichého týdne. */
  const viditelne = React.useMemo(() => {
    if (!rozlisujeTydny) return moje;
    return moje.filter((h) => h.parita === "vzdy" || h.parita === nahled);
  }, [moje, rozlisujeTydny, nahled]);

  const proDen = React.useCallback(
    (d: number) => viditelne.filter((h) => h.den === d).sort((a, b) => a.poradi - b.poradi),
    [viditelne],
  );

  const dnesKonec = konecVyucovani(moje, dnes);
  const dnesZacatek = zacatekVyucovani(moje, dnes);

  function pridej(d: number) {
    setNovyDen(d);
    setEditovana(null);
    setFormOpen(true);
  }

  function uprav(h: RozvrhHodina) {
    setNovyDen(h.den);
    setEditovana(h);
    setFormOpen(true);
  }

  async function stahni() {
    setStahuji(true);
    setZprava(null);
    setChyba(null);

    const response = await fetch("/api/edupage/rozvrh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId }),
    });
    const data = await response.json();

    setStahuji(false);
    if (!response.ok) {
      setChyba(data.error);
      return;
    }
    setZprava(
      data.pocet === 0
        ? "EduPage nevrátilo žádné hodiny. Zkontroluj, jestli je účet přepnutý na dítě."
        : `Staženo ${data.pocet} hodin za ${data.dnu} školních dní.`,
    );
    router.refresh();
  }

  if (deti.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Table2 className="h-6 w-6" />}
          title="Nejdřív přidej dítě"
          description="Rozvrh se vede ke konkrétnímu dítěti."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Rozvrh</h1>
          <p className="text-sm text-ink-muted">
            {hodinTydne(moje)} hodin týdně
            {dnesZacatek && dnesKonec ? (
              <>
                {" · "}
                <span className="tnum text-ink">
                  dnes {dnesZacatek}–{dnesKonec}
                </span>
              </>
            ) : null}
          </p>
        </div>
        {canEdit && edupagePropojeno ? (
          <Button variant="secondary" onClick={stahni} disabled={stahuji}>
            {stahuji ? <Spinner /> : <Download className="h-4 w-4" />}
            {stahuji ? "Stahuji…" : "Z EduPage"}
          </Button>
        ) : null}
      </div>

      {chyba ? <Alert tone="danger">{chyba}</Alert> : null}
      {zprava ? <Alert tone="success">{zprava}</Alert> : null}

      {deti.length > 1 ? (
        <Segmented
          value={childId}
          onChange={setChildId}
          options={deti.map((c) => ({ value: c.id, label: c.name }))}
        />
      ) : null}

      {rozlisujeTydny ? (
        <div className="flex items-center gap-2">
          <Segmented
            value={nahled}
            onChange={setNahled}
            options={[
              { value: "sudy", label: "Sudý týden" },
              { value: "lichy", label: "Lichý týden" },
            ]}
          />
          <span className="text-xs text-ink-subtle">
            teď je {getISOWeek(dnes)}. ({getISOWeek(dnes) % 2 === 0 ? "sudý" : "lichý"})
          </span>
        </div>
      ) : null}

      {moje.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Table2 className="h-6 w-6" />}
            title="Rozvrh je zatím prázdný"
            description={
              edupagePropojeno
                ? "Přidej hodiny ručně, nebo je stáhni z EduPage."
                : "Přidej první hodinu — časy se předvyplní podle běžného zvonění."
            }
            action={
              canEdit ? <Button onClick={() => pridej(1)}>Přidat hodinu</Button> : undefined
            }
          />
        </Card>
      ) : (
        <>
          {/* ── Mobil: jeden den ───────────────────────────────── */}
          <div className="space-y-3 lg:hidden">
            <Segmented
              value={String(den)}
              onChange={(v) => setDen(Number(v))}
              options={DNY.map((d) => ({
                value: String(d),
                label: (
                  <span className={cn(d === dnesniDen && "font-bold")}>{DOW_SHORT[d % 7]}</span>
                ),
              }))}
            />
            <DenCard
              den={den}
              hodiny={proDen(den)}
              canEdit={canEdit}
              onAdd={() => pridej(den)}
              onEdit={uprav}
              dnesni={den === dnesniDen}
            />
          </div>

          {/* ── Desktop: celý týden vedle sebe ─────────────────── */}
          <div className="hidden gap-3 lg:grid lg:grid-cols-5">
            {DNY.map((d) => (
              <DenCard
                key={d}
                den={d}
                hodiny={proDen(d)}
                canEdit={canEdit}
                onAdd={() => pridej(d)}
                onEdit={uprav}
                dnesni={d === dnesniDen}
              />
            ))}
          </div>
        </>
      )}

      {childId ? (
        <LessonForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          session={session}
          childId={childId}
          den={novyDen}
          hodina={editovana}
          obsazenaPoradi={moje.filter((h) => h.den === novyDen).map((h) => h.poradi)}
        />
      ) : null}
    </div>
  );
}

function DenCard({
  den,
  hodiny,
  canEdit,
  onAdd,
  onEdit,
  dnesni,
}: {
  den: number;
  hodiny: RozvrhHodina[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (h: RozvrhHodina) => void;
  dnesni: boolean;
}) {
  const konec = hodiny.length > 0 ? hodiny[hodiny.length - 1].konec.slice(0, 5) : null;

  return (
    <Card className={cn(dnesni && "ring-1 ring-brand")}>
      <div className="flex items-baseline justify-between gap-2 px-3 pt-3">
        <h2 className="text-sm font-semibold text-ink">{NAZVY[den]}</h2>
        {konec ? (
          <span className="tnum text-xs text-ink-subtle">do {konec}</span>
        ) : null}
      </div>

      <CardBody className="space-y-1.5 p-3 pt-2">
        {hodiny.length === 0 ? (
          <p className="py-3 text-center text-xs text-ink-subtle">volno</p>
        ) : (
          hodiny.map((h) => {
            const obsah = (
              <>
                <span className="tnum w-4 shrink-0 text-xs text-ink-subtle">{h.poradi}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-ink">{h.predmet}</span>
                    {h.parita !== "vzdy" ? (
                      <Badge>{h.parita === "sudy" ? "sudý" : "lichý"}</Badge>
                    ) : null}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-subtle">
                    <span className="tnum">
                      {h.zacatek.slice(0, 5)}–{h.konec.slice(0, 5)}
                    </span>
                    {h.ucebna ? (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" /> {h.ucebna}
                      </span>
                    ) : null}
                    {h.ucitel ? <span className="truncate">{h.ucitel}</span> : null}
                  </span>
                </span>
              </>
            );

            return canEdit ? (
              <button
                key={h.id}
                type="button"
                onClick={() => onEdit(h)}
                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
              >
                {obsah}
              </button>
            ) : (
              <div key={h.id} className="flex items-start gap-2 px-2 py-1.5">
                {obsah}
              </div>
            );
          })
        )}

        {canEdit ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong py-2 text-xs font-medium text-ink-subtle transition-colors hover:border-brand hover:text-brand"
          >
            <Plus className="h-3.5 w-3.5" /> Hodina
          </button>
        ) : null}
      </CardBody>
    </Card>
  );
}

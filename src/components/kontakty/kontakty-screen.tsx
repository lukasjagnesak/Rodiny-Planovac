"use client";

import * as React from "react";
import {
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Contact as ContactIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Segmented } from "@/components/ui/misc";
import { KontaktForm } from "./kontakt-form";
import { KONTAKT_DRUHY, KONTAKT_DRUH_ORDER } from "@/lib/constants";
import type { Kontakt, KontaktDruh, SessionContext } from "@/lib/types";

export function KontaktyScreen({
  session,
  kontakty,
}: {
  session: SessionContext;
  kontakty: Kontakt[];
}) {
  const [dite, setDite] = React.useState("vse");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editovany, setEditovany] = React.useState<Kontakt | null>(null);

  const canEdit = session.myMembership.role !== "viewer";
  const deti = session.children.filter((c) => !c.archived);

  const viditelne = React.useMemo(() => {
    if (dite === "vse") return kontakty;
    // Kontakty celé rodiny (pediatr) patří ke každému dítěti.
    return kontakty.filter((k) => k.child_id === dite || k.child_id === null);
  }, [kontakty, dite]);

  const skupiny = React.useMemo(
    () =>
      KONTAKT_DRUH_ORDER.map((druh) => ({
        druh,
        polozky: viditelne.filter((k) => k.druh === druh),
      })).filter((s) => s.polozky.length > 0),
    [viditelne],
  );

  function otevri(kontakt: Kontakt | null) {
    setEditovany(kontakt);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Kontakty
          </h1>
          <p className="text-sm text-ink-muted">
            Učitelé, lékaři a všichni, na koho může být potřeba rychle zavolat
          </p>
        </div>
        {canEdit ? (
          <Button onClick={() => otevri(null)}>
            <Plus className="h-4 w-4" /> Přidat
          </Button>
        ) : null}
      </div>

      {deti.length > 1 ? (
        <Segmented
          value={dite}
          onChange={setDite}
          options={[
            { value: "vse", label: "Vše" },
            ...deti.map((c) => ({
              value: c.id,
              label: (
                <span className="flex items-center gap-1.5">
                  <Dot color={c.color} /> {c.name}
                </span>
              ),
            })),
          ]}
        />
      ) : null}

      {skupiny.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ContactIcon className="h-6 w-6" />}
            title="Zatím žádné kontakty"
            description="Třídní učitel, pediatr, zubař — ať je má po ruce i druhý rodič."
            action={canEdit ? <Button onClick={() => otevri(null)}>Přidat první</Button> : undefined}
          />
        </Card>
      ) : (
        skupiny.map(({ druh, polozky }) => (
          <section key={druh} className="space-y-2">
            <h2 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              <span aria-hidden>{KONTAKT_DRUHY[druh].emoji}</span>
              {KONTAKT_DRUHY[druh].label}
            </h2>

            <ul className="space-y-2.5">
              {polozky.map((kontakt) => (
                <KontaktCard
                  key={kontakt.id}
                  kontakt={kontakt}
                  deti={session.children}
                  canEdit={canEdit}
                  onEdit={() => otevri(kontakt)}
                  barva={KONTAKT_DRUHY[druh].color}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      <KontaktForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        session={session}
        kontakt={editovany}
      />
    </div>
  );
}

function KontaktCard({
  kontakt,
  deti,
  canEdit,
  onEdit,
  barva,
}: {
  kontakt: Kontakt;
  deti: SessionContext["children"];
  canEdit: boolean;
  onEdit: () => void;
  barva: string;
}) {
  const dite = deti.find((c) => c.id === kontakt.child_id);

  return (
    <li>
      <Card className="p-4" style={{ borderLeft: `3px solid ${barva}` }}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-ink">{kontakt.jmeno}</span>
              {dite ? <Badge color={dite.color}>{dite.name}</Badge> : null}
            </div>

            {kontakt.role || kontakt.organizace ? (
              <p className="mt-0.5 text-sm text-ink-muted">
                {[kontakt.role, kontakt.organizace].filter(Boolean).join(" · ")}
              </p>
            ) : null}

            {kontakt.hodiny ? (
              <p className="mt-2 flex gap-2 text-sm text-ink-muted">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-pre-line">{kontakt.hodiny}</span>
              </p>
            ) : null}

            {kontakt.poznamka ? (
              <p className="mt-2 text-sm text-ink-muted">{kontakt.poznamka}</p>
            ) : null}

            {/* Na mobilu jsou to rovnou akce — zavolat, napsat, navigovat. */}
            <div className="mt-3 flex flex-wrap gap-2">
              {kontakt.telefon ? (
                <Akce href={`tel:${kontakt.telefon.replace(/\s/g, "")}`} icon={<Phone />}>
                  {kontakt.telefon}
                </Akce>
              ) : null}

              {kontakt.email ? (
                <Akce href={`mailto:${kontakt.email}`} icon={<Mail />}>
                  {kontakt.email}
                </Akce>
              ) : null}

              {kontakt.adresa ? (
                <Akce
                  href={`https://maps.apple.com/?q=${encodeURIComponent(kontakt.adresa)}`}
                  icon={<MapPin />}
                  externi
                >
                  {kontakt.adresa}
                </Akce>
              ) : null}

              {kontakt.web ? (
                <Akce href={kontakt.web} icon={<ExternalLink />} externi>
                  Web
                </Akce>
              ) : null}
            </div>
          </div>

          {canEdit ? (
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Upravit ${kontakt.jmeno}`}
              className="shrink-0 rounded-lg p-2 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Pencil className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </Card>
    </li>
  );
}

function Akce({
  href,
  icon,
  children,
  externi,
}: {
  href: string;
  icon: React.ReactElement<{ className?: string }>;
  children: React.ReactNode;
  externi?: boolean;
}) {
  return (
    <a
      href={href}
      {...(externi ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1.5 text-sm text-ink transition-colors hover:bg-surface-2"
    >
      {React.cloneElement(icon, { className: "h-3.5 w-3.5 shrink-0 text-ink-subtle" })}
      <span className="truncate">{children}</span>
    </a>
  );
}

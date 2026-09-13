"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sheet, ConfirmSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/misc";
import { KONTAKT_DRUHY, KONTAKT_DRUH_ORDER } from "@/lib/constants";
import type { Kontakt, KontaktDruh, SessionContext } from "@/lib/types";
import { hlaskaChyby } from "@/lib/format";

export function KontaktForm({
  open,
  onClose,
  session,
  kontakt,
}: {
  open: boolean;
  onClose: () => void;
  session: SessionContext;
  kontakt: Kontakt | null;
}) {
  const router = useRouter();
  const [druh, setDruh] = React.useState<KontaktDruh>("skola");
  const [jmeno, setJmeno] = React.useState("");
  const [role, setRole] = React.useState("");
  const [organizace, setOrganizace] = React.useState("");
  const [telefon, setTelefon] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [adresa, setAdresa] = React.useState("");
  const [hodiny, setHodiny] = React.useState("");
  const [web, setWeb] = React.useState("");
  const [poznamka, setPoznamka] = React.useState("");
  const [childId, setChildId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mazani, setMazani] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setDruh(kontakt?.druh ?? "skola");
    setJmeno(kontakt?.jmeno ?? "");
    setRole(kontakt?.role ?? "");
    setOrganizace(kontakt?.organizace ?? "");
    setTelefon(kontakt?.telefon ?? "");
    setEmail(kontakt?.email ?? "");
    setAdresa(kontakt?.adresa ?? "");
    setHodiny(kontakt?.hodiny ?? "");
    setWeb(kontakt?.web ?? "");
    setPoznamka(kontakt?.poznamka ?? "");
    setChildId(kontakt?.child_id ?? "");
  }, [open, kontakt]);

  async function uloz() {
    if (!jmeno.trim()) {
      setError("Vyplň jméno.");
      return;
    }

    setBusy(true);
    setError(null);

    const radek = {
      family_id: session.family.id,
      child_id: childId || null,
      druh,
      jmeno: jmeno.trim(),
      role: role.trim() || null,
      organizace: organizace.trim() || null,
      telefon: telefon.trim() || null,
      email: email.trim() || null,
      adresa: adresa.trim() || null,
      hodiny: hodiny.trim() || null,
      web: web.trim() || null,
      poznamka: poznamka.trim() || null,
    };

    const supabase = createClient();
    const { error } = kontakt
      ? await supabase.from("kontakty").update(radek).eq("id", kontakt.id)
      : await supabase.from("kontakty").insert(radek);

    setBusy(false);
    if (error) {
      setError(hlaskaChyby(error));
      return;
    }
    onClose();
    router.refresh();
  }

  async function smaz() {
    if (!kontakt) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("kontakty").delete().eq("id", kontakt.id);
    setBusy(false);
    setMazani(false);
    if (error) {
      setError(hlaskaChyby(error));
      return;
    }
    onClose();
    router.refresh();
  }

  const deti = session.children.filter((c) => !c.archived);

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={kontakt ? "Upravit kontakt" : "Nový kontakt"}
        size="lg"
        footer={
          <>
            {kontakt ? (
              <Button variant="danger" onClick={() => setMazani(true)} disabled={busy}>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kategorie">
              <Select value={druh} onChange={(e) => setDruh(e.target.value as KontaktDruh)}>
                {KONTAKT_DRUH_ORDER.map((d) => (
                  <option key={d} value={d}>
                    {KONTAKT_DRUHY[d].emoji} {KONTAKT_DRUHY[d].label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Ke komu patří" hint="nepovinné">
              <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
                <option value="">Celá rodina</option>
                {deti.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Jméno" required>
            <Input
              value={jmeno}
              onChange={(e) => setJmeno(e.target.value)}
              placeholder="MUDr. Jana Nováková"
              autoFocus
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Role" hint="nepovinné">
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="třídní učitelka"
              />
            </Field>
            <Field label="Organizace" hint="nepovinné">
              <Input
                value={organizace}
                onChange={(e) => setOrganizace(e.target.value)}
                placeholder="ZŠ Mukařov"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Telefon">
              <Input
                type="tel"
                inputMode="tel"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                placeholder="+420 123 456 789"
              />
            </Field>
            <Field label="E-mail">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Adresa">
            <Input
              value={adresa}
              onChange={(e) => setAdresa(e.target.value)}
              placeholder="Školní 12, Mukařov"
            />
          </Field>

          <Field
            label="Ordinační / konzultační hodiny"
            hint="jak to má napsané ordinace"
          >
            <Textarea
              rows={3}
              value={hodiny}
              onChange={(e) => setHodiny(e.target.value)}
              placeholder={"Po, St 8–12\nÚt 13–18\nPá jen objednaní"}
            />
          </Field>

          <Field label="Web">
            <Input
              value={web}
              onChange={(e) => setWeb(e.target.value)}
              placeholder="https://…"
            />
          </Field>

          <Field label="Poznámka">
            <Textarea
              rows={2}
              value={poznamka}
              onChange={(e) => setPoznamka(e.target.value)}
            />
          </Field>
        </div>
      </Sheet>

      <ConfirmSheet
        open={mazani}
        onClose={() => setMazani(false)}
        onConfirm={smaz}
        title="Smazat kontakt"
        message={`Opravdu smazat ${kontakt?.jmeno ?? "kontakt"}? Vidí ho celá rodina.`}
        busy={busy}
      />
    </>
  );
}

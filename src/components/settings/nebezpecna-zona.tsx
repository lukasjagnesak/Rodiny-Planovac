"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { Alert, Spinner } from "@/components/ui/misc";
import type { SessionContext } from "@/lib/types";

/**
 * Smazání rodiny a účtu.
 *
 * Zásady ochrany osobních údajů to slibují a GDPR to vyžaduje, takže to
 * musí jít bez psaní podpoře. Zároveň je to jediné místo v aplikaci, po
 * kterém se nedá nic vrátit — proto se potvrzuje opsáním názvu rodiny,
 * respektive vlastního e-mailu. Zaškrtávátko by omylem zvládl každý.
 */
export function NebezpecnaZona({ session }: { session: SessionContext }) {
  const jsemSpravce = session.myMembership.role === "owner";
  const dalsiClenove = session.members.filter((c) => c.userId !== session.userId).length;

  return (
    <Card className="border-danger/30">
      <CardHeader
        title={
          <span className="flex items-center gap-2 text-danger">
            <AlertTriangle className="h-4 w-4" />
            Konec s Klidoo
          </span>
        }
        description="Obojí je nevratné a proběhne to hned."
      />
      <CardBody className="space-y-3 pt-3">
        {jsemSpravce ? (
          <SmazatRodinu session={session} dalsiClenove={dalsiClenove} />
        ) : (
          <p className="text-sm text-ink-muted">
            Rodinu <strong className="text-ink">{session.family.name}</strong> může smazat jen její
            správce. Ty z ní můžeš odejít smazáním svého účtu.
          </p>
        )}
        <SmazatUcet session={session} />
      </CardBody>
    </Card>
  );
}

function SmazatRodinu({
  session,
  dalsiClenove,
}: {
  session: SessionContext;
  dalsiClenove: number;
}) {
  const router = useRouter();
  const [otevreno, setOtevreno] = React.useState(false);
  const [nazev, setNazev] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [chyba, setChyba] = React.useState<string | null>(null);

  const sedi = nazev.trim() === session.family.name.trim();

  async function smazat() {
    setBusy(true);
    setChyba(null);
    try {
      const odpoved = await fetch("/api/rodina/smazat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ familyId: session.family.id, potvrzeni: nazev }),
      });
      const data = (await odpoved.json()) as { chyba?: string };
      if (!odpoved.ok) {
        setChyba(data.chyba ?? "Smazání se nepovedlo.");
        setBusy(false);
        return;
      }
      // Zbylé rodiny se načtou samy; kdo neměl jinou, skončí v průvodci.
      router.push("/prehled");
      router.refresh();
    } catch {
      setChyba("Smazání se nepovedlo. Zkus to prosím znovu.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Smazat rodinu {session.family.name}</p>
          <p className="text-xs text-ink-subtle">
            Kalendář, výdaje, účtenky i doklady
            {dalsiClenove > 0
              ? ` — a to i pro ${dalsiClenove === 1 ? "druhého člena" : `dalších ${dalsiClenove} členů`}.`
              : "."}
          </p>
        </div>
        <Button variant="danger" size="sm" onClick={() => setOtevreno(true)}>
          <Trash2 className="h-4 w-4" />
          Smazat rodinu
        </Button>
      </div>

      <Sheet
        open={otevreno}
        onClose={() => setOtevreno(false)}
        title="Smazat rodinu"
        description="Tohle se nedá vzít zpět."
      >
        <div className="space-y-4">
          <Alert tone="danger">
            Smaže se kalendář péče, všechny výdaje a účtenky, kroužky, události, doklady i rozvrhy
            {dalsiClenove > 0 ? " — všem členům rodiny, ne jen tobě" : ""}. Běžící předplatné
            zrušíme ve Stripe, aby se dál nic nestrhávalo.
          </Alert>

          <Field label={`Opiš název rodiny: ${session.family.name}`}>
            <Input
              value={nazev}
              onChange={(e) => setNazev(e.target.value)}
              placeholder={session.family.name}
              autoComplete="off"
            />
          </Field>

          {chyba ? <Alert tone="danger">{chyba}</Alert> : null}

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOtevreno(false)}>
              Zpět
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={!sedi || busy}
              onClick={smazat}
            >
              {busy ? <Spinner /> : "Smazat napořád"}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

function SmazatUcet({ session }: { session: SessionContext }) {
  const router = useRouter();
  const [otevreno, setOtevreno] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [chyba, setChyba] = React.useState<string | null>(null);

  const muj = (session.profile.email ?? "").trim().toLowerCase();
  const sedi = email.trim().toLowerCase() === muj && muj.length > 0;

  async function smazat() {
    setBusy(true);
    setChyba(null);
    try {
      const odpoved = await fetch("/api/ucet/smazat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ potvrzeni: email }),
      });
      const data = (await odpoved.json()) as { chyba?: string };
      if (!odpoved.ok) {
        setChyba(data.chyba ?? "Smazání se nepovedlo.");
        setBusy(false);
        return;
      }
      // Účet už neexistuje, takže session je k ničemu — pryč s ní.
      await createClient().auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setChyba("Smazání se nepovedlo. Zkus to prosím znovu.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Smazat můj účet</p>
          <p className="text-xs text-ink-subtle">
            Rodiny, ve kterých zůstávají ostatní, běží dál. Ty, kde bys byl poslední, se smažou.
          </p>
        </div>
        <Button variant="danger" size="sm" onClick={() => setOtevreno(true)}>
          <Trash2 className="h-4 w-4" />
          Smazat účet
        </Button>
      </div>

      <Sheet
        open={otevreno}
        onClose={() => setOtevreno(false)}
        title="Smazat účet"
        description="Tohle se nedá vzít zpět."
      >
        <div className="space-y-4">
          <Alert tone="danger">
            Smaže se tvůj profil, přihlášení i propojení s Googlem a EduPage. Rodiny,
            ve kterých zůstává někdo další, se nemažou — jen v nich přestaneš být. Pokud jsi v nich
            byl správcem, převezme to nejdéle přítomný člen.
          </Alert>

          <Field label={`Opiš svůj e-mail: ${session.profile.email ?? ""}`}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={session.profile.email ?? ""}
              autoComplete="off"
            />
          </Field>

          {chyba ? <Alert tone="danger">{chyba}</Alert> : null}

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOtevreno(false)}>
              Zpět
            </Button>
            <Button variant="danger" className="flex-1" disabled={!sedi || busy} onClick={smazat}>
              {busy ? <Spinner /> : "Smazat napořád"}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

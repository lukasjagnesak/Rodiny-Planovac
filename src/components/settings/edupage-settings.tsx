"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, GraduationCap, RefreshCw, Unlink } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/dates";

interface Account {
  email: string;
  subdomena: string | null;
  dite_id: number | null;
  je_rodic: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
}

export function EdupageSettings({
  account,
  configured,
}: {
  account: Account | null;
  configured: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [heslo, setHeslo] = React.useState("");
  const [subdomena, setSubdomena] = React.useState("");
  const [busy, setBusy] = React.useState<"connect" | "sync" | "disconnect" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  async function connect() {
    setBusy("connect");
    setError(null);
    setMessage(null);

    const response = await fetch("/api/edupage/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, heslo, subdomena: subdomena || null }),
    });
    const data = await response.json();

    setBusy(null);
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setHeslo("");
    setMessage(
      data.jeRodic
        ? "Účet propojen — je to rodičovský účet."
        : "Účet propojen.",
    );
    router.refresh();
  }

  async function sync() {
    setBusy("sync");
    setError(null);
    setMessage(null);

    const response = await fetch("/api/edupage/sync", { method: "POST" });
    const data = await response.json();

    setBusy(null);
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setMessage(`Staženo ${data.pocet} položek.`);
    router.refresh();
  }

  async function disconnect() {
    setBusy("disconnect");
    await fetch("/api/edupage/connect", { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">EduPage</h1>
        <p className="text-sm text-ink-muted">
          Stáhne úkoly, písemky a školní akce, ať je vidí oba rodiče na jednom místě.
        </p>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      {!configured ? (
        <Card>
          <CardBody>
            <Alert tone="warning">
              Propojení není na serveru zapnuté. Chybí <code>EDUPAGE_SIDECAR_URL</code> nebo{" "}
              <code>EDUPAGE_SIDECAR_SECRET</code> — postup je v README.
            </Alert>
          </CardBody>
        </Card>
      ) : account ? (
        <>
          <Card>
            <CardBody className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{account.email}</p>
                <p className="text-sm text-ink-muted">
                  {account.je_rodic ? "Rodičovský účet" : "Účet žáka"}
                  {account.last_sync_at
                    ? ` · naposledy ${formatDateTime(account.last_sync_at)}`
                    : " · zatím nestaženo"}
                </p>
              </div>
            </CardBody>
          </Card>

          {account.last_sync_error ? (
            <Alert tone="danger">Poslední stažení selhalo: {account.last_sync_error}</Alert>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={sync} disabled={busy === "sync"}>
              {busy === "sync" ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
              {busy === "sync" ? "Stahuji…" : "Stáhnout úkoly"}
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={disconnect}
              disabled={busy === "disconnect"}
            >
              <Unlink className="h-4 w-4" /> Odpojit
            </Button>
          </div>
        </>
      ) : (
        <Card>
          <CardHeader
            title="Propojit účet"
            description="Přihlašuješ se stejnými údaji jako do EduPage."
          />
          <CardBody className="space-y-4 pt-3">
            <Field label="E-mail" required>
              <Input
                type="email"
                autoComplete="off"
                placeholder="rodic@example.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="Heslo" required>
              <Input
                type="password"
                autoComplete="off"
                value={heslo}
                onChange={(e) => setHeslo(e.target.value)}
              />
            </Field>

            <Field
              label="Adresa školy v EduPage"
              hint="nepovinné — bez ní se hledá automaticky"
            >
              <Input
                placeholder="zskomenskeho"
                value={subdomena}
                onChange={(e) => setSubdomena(e.target.value)}
              />
            </Field>

            <Button onClick={connect} disabled={busy === "connect" || !email || !heslo}>
              {busy === "connect" ? <Spinner /> : <GraduationCap className="h-4 w-4" />}
              Propojit
            </Button>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Co je dobré vědět" />
        <CardBody className="space-y-2.5 pt-3 text-sm text-ink-muted">
          <p>
            <strong className="text-ink">Heslo se ukládá zašifrovaně</strong> a používá se jen
            při stahování. Každý rodič si propojuje svůj vlastní účet — nikdo nemusí své školní
            heslo nikomu dávat.
          </p>
          <p>
            <strong className="text-ink">EduPage nemá veřejné rozhraní.</strong> Data se
            načítají stejnou cestou jako v mobilní aplikaci, takže se stahování může rozbít,
            kdykoli EduPage něco změní.
          </p>
          <p>
            <strong className="text-ink">Dvoufázové ověření to zastaví.</strong> Účet chráněný
            druhým faktorem nebo přihlášení přes Google či Microsoft touto cestou nefunguje.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

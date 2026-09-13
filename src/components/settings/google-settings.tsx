"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarSync, CheckCircle2, RefreshCw, Unlink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/dates";
import type { GoogleAccount } from "@/lib/types";

const ERROR_MESSAGES: Record<string, string> = {
  nenastaveno:
    "Na serveru chybí GOOGLE_CLIENT_ID a GOOGLE_CLIENT_SECRET. Doplň je do .env a restartuj aplikaci.",
  "neplatny-stav": "Ověření se nezdařilo. Zkus propojení spustit znovu.",
  "bez-refresh-tokenu":
    "Google nevrátil trvalý přístup. Odeber aplikaci v nastavení účtu Google (Zabezpečení → Aplikace třetích stran) a zkus to znovu.",
  access_denied: "Přístup ke kalendáři jsi nepovolil.",
};

export function GoogleSettings({
  account,
  configured,
  status,
  error,
}: {
  account: GoogleAccount | null;
  configured: boolean;
  status: string | null;
  error: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"sync" | "disconnect" | "prefs" | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const [prefs, setPrefs] = React.useState({
    custody: account?.sync_custody ?? true,
    activities: account?.sync_activities ?? true,
    events: account?.sync_events ?? true,
  });

  async function savePrefs(next: typeof prefs) {
    setPrefs(next);
    setBusy("prefs");
    const supabase = createClient();
    await supabase
      .from("google_accounts")
      .update({
        sync_custody: next.custody,
        sync_activities: next.activities,
        sync_events: next.events,
      })
      .eq("user_id", account!.user_id);
    setBusy(null);
    router.refresh();
  }

  async function sync() {
    setBusy("sync");
    setMessage(null);
    setLocalError(null);

    const response = await fetch("/api/google/sync", { method: "POST" });
    const data = await response.json();

    setBusy(null);
    if (!response.ok) {
      setLocalError(data.error ?? "Synchronizace selhala.");
      return;
    }
    setMessage(
      `Hotovo — přidáno ${data.created}, upraveno ${data.updated}, smazáno ${data.deleted}.`,
    );
    router.refresh();
  }

  async function disconnect() {
    setBusy("disconnect");
    await fetch("/api/google/disconnect", { method: "POST" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Google kalendář
        </h1>
        <p className="text-sm text-ink-muted">
          Kdo má děti, kroužky i události se přenesou do tvého kalendáře. Každý člen rodiny si
          propojí svůj vlastní účet.
        </p>
      </div>

      {error ? <Alert tone="danger">{ERROR_MESSAGES[error] ?? error}</Alert> : null}
      {status === "propojeno" ? (
        <Alert tone="success">Účet propojen. Teď spusť první synchronizaci.</Alert>
      ) : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      {localError ? <Alert tone="danger">{localError}</Alert> : null}

      {!configured ? (
        <Card>
          <CardBody>
            <Alert tone="warning">
              Propojení zatím není na serveru nastavené. Doplň <code>GOOGLE_CLIENT_ID</code> a{" "}
              <code>GOOGLE_CLIENT_SECRET</code> — postup najdeš v README.
            </Alert>
          </CardBody>
        </Card>
      ) : !account ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <CalendarSync className="h-7 w-7" />
            </div>
            <div>
              <p className="font-semibold text-ink">Kalendář zatím není propojený</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
                Po propojení uvidíš v Google kalendáři barevné bloky péče, kroužky s časem i
                lékařské prohlídky.
              </p>
            </div>
            <ButtonLink href="/api/google/oauth" size="lg">
              Propojit s Googlem
            </ButtonLink>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardBody className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">
                  {account.google_email ?? "Google účet propojen"}
                </p>
                <p className="text-sm text-ink-muted">
                  {account.last_sync_at
                    ? `Naposledy synchronizováno ${formatDateTime(account.last_sync_at)}`
                    : "Zatím nesynchronizováno"}
                </p>
              </div>
            </CardBody>
          </Card>

          {account.last_sync_error ? (
            <Alert tone="danger">Poslední synchronizace selhala: {account.last_sync_error}</Alert>
          ) : null}

          <Card>
            <CardHeader title="Co přenášet" description="Změna se projeví při další synchronizaci" />
            <CardBody className="space-y-3 pt-3">
              <Checkbox
                label="Střídavá péče"
                description="Celodenní bloky „Děti u mámy / u táty“."
                checked={prefs.custody}
                disabled={busy === "prefs"}
                onChange={(e) => savePrefs({ ...prefs, custody: e.target.checked })}
              />
              <Checkbox
                label="Kroužky"
                description="Včetně místa a toho, kdo veze."
                checked={prefs.activities}
                disabled={busy === "prefs"}
                onChange={(e) => savePrefs({ ...prefs, activities: e.target.checked })}
              />
              <Checkbox
                label="Události"
                description="Škola v přírodě, třídní schůzky, lékař."
                checked={prefs.events}
                disabled={busy === "prefs"}
                onChange={(e) => savePrefs({ ...prefs, events: e.target.checked })}
              />
            </CardBody>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={sync} disabled={busy === "sync"}>
              {busy === "sync" ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
              {busy === "sync" ? "Synchronizuji…" : "Synchronizovat teď"}
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

          <p className="text-center text-xs text-ink-subtle">
            Synchronizuje se 90 dní dopředu. Automaticky běží každou hodinu.
          </p>
        </>
      )}
    </div>
  );
}

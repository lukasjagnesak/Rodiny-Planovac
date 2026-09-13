"use client";

import * as React from "react";
import { Bell, BellOff, CheckCircle2, Send, ShieldAlert, Smartphone } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/misc";
import { jePodporovan, aktualniOdber, zapniNotifikace, vypniNotifikace } from "@/lib/push-client";

const WHAT_ARRIVES = [
  { emoji: "🚗", text: "Večer předem: „Zítra vezeš Kubu na fotbal, 16:00, ZŠ Komenského.“" },
  { emoji: "❓", text: "Když na zítřejší kroužek nikdo není přiřazený jako řidič." },
  { emoji: "🔄", text: "Den před předáním dětí." },
  { emoji: "🩺", text: "Připomínky událostí podle toho, co si u nich nastavíš." },
];

type Stav = "zjistuje" | "nepodporovano" | "zamitnuto" | "vypnuto" | "zapnuto";

export function PushSettings({ verejnyKlic }: { verejnyKlic: string | null }) {
  const [stav, setStav] = React.useState<Stav>("zjistuje");
  const [busy, setBusy] = React.useState<"zapnout" | "vypnout" | "test" | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!jePodporovan()) {
      setStav("nepodporovano");
      return;
    }
    if (Notification.permission === "denied") {
      setStav("zamitnuto");
      return;
    }
    aktualniOdber().then((odber) => setStav(odber ? "zapnuto" : "vypnuto"));
  }, []);

  async function zapnout() {
    if (!verejnyKlic) {
      setError("Server nemá nastavené notifikace — chybí VAPID klíč.");
      return;
    }
    setBusy("zapnout");
    setError(null);
    try {
      await zapniNotifikace(verejnyKlic);
      setStav("zapnuto");
    } catch (e) {
      setStav(Notification.permission === "denied" ? "zamitnuto" : "vypnuto");
      setError(e instanceof Error ? e.message : "Zapnutí selhalo.");
    }
    setBusy(null);
  }

  async function vypnout() {
    setBusy("vypnout");
    const odber = await aktualniOdber();
    if (odber) await vypniNotifikace(odber);
    setStav("vypnuto");
    setBusy(null);
  }

  async function poslatTest() {
    setBusy("test");
    setError(null);
    setMessage(null);
    const response = await fetch("/api/push/test", { method: "POST" });
    const data = await response.json();
    setBusy(null);
    if (!response.ok) setError(data.error);
    else setMessage("Zpráva odeslána — měla by za chvíli přijít jako notifikace.");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Notifikace</h1>
        <p className="text-sm text-ink-muted">
          Připomínky chodí přímo do zařízení, kde máš Klidoo otevřený nebo nainstalovaný — bez
          dalšího účtu a bez SMS.
        </p>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      {stav === "zjistuje" ? (
        <Card>
          <CardBody className="flex items-center gap-3 text-sm text-ink-muted">
            <Spinner /> Zjišťuju stav…
          </CardBody>
        </Card>
      ) : stav === "nepodporovano" ? (
        <Card>
          <CardBody>
            <Alert tone="warning">
              <span className="flex items-start gap-2">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Tenhle prohlížeč notifikace nepodporuje. Na iPhonu appku nejdřív přidej na
                  plochu (tlačítko <strong>Sdílet → Přidat na plochu</strong>) a otevři ji odtud —
                  Safari povoluje notifikace jen nainstalovaným appkám.
                </span>
              </span>
            </Alert>
          </CardBody>
        </Card>
      ) : stav === "zamitnuto" ? (
        <Card>
          <CardBody>
            <Alert tone="danger">
              <span className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Notifikace jsou u prohlížeče zablokované. Odblokuj je v nastavení stránky
                  (ikona zámku vedle adresy) a stránku obnov.
                </span>
              </span>
            </Alert>
          </CardBody>
        </Card>
      ) : stav === "zapnuto" ? (
        <>
          <Card>
            <CardBody className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">Notifikace jsou zapnuté na tomhle zařízení</p>
                <p className="text-sm text-ink-muted">Připomínky ti budou chodit automaticky.</p>
              </div>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={poslatTest} disabled={busy === "test"}>
              {busy === "test" ? <Spinner /> : <Send className="h-4 w-4" />}
              Poslat zkušební notifikaci
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={vypnout}
              disabled={busy === "vypnout"}
            >
              <BellOff className="h-4 w-4" /> Vypnout na tomhle zařízení
            </Button>
          </div>
        </>
      ) : (
        <Card>
          <CardBody className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Bell className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">Notifikace jsou vypnuté</p>
              <p className="text-sm text-ink-muted">
                Zapni si je na každém zařízení zvlášť — telefon i počítač.
              </p>
            </div>
            <Button onClick={zapnout} disabled={busy === "zapnout"}>
              {busy === "zapnout" ? <Spinner /> : "Zapnout"}
            </Button>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Co ti bude chodit" />
        <CardBody className="pt-3">
          <ul className="space-y-2.5">
            {WHAT_ARRIVES.map((item) => (
              <li key={item.text} className="flex gap-3 text-sm">
                <span className="shrink-0" aria-hidden>
                  {item.emoji}
                </span>
                <span className="text-ink-muted">{item.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-xs text-ink-subtle">
            <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Každé zařízení se zapíná zvlášť — notifikace chodí jen tomu, koho se týkají.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCircle2, Copy, Send, Unlink } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/misc";

const WHAT_ARRIVES = [
  { emoji: "🚗", text: "Večer předem: „Zítra vezeš Kubu na fotbal, 16:00, ZŠ Komenského.“" },
  { emoji: "❓", text: "Když na zítřejší kroužek nikdo není přiřazený jako řidič." },
  { emoji: "🔄", text: "Den před předáním dětí." },
  { emoji: "🩺", text: "Připomínky událostí podle toho, co si u nich nastavíš." },
];

export function TelegramSettings({
  connected,
  pendingCode,
  botUsername,
  configured,
}: {
  connected: boolean;
  pendingCode: string | null;
  botUsername: string | null;
  configured: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = React.useState(pendingCode);
  const [busy, setBusy] = React.useState<"code" | "test" | "unlink" | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function generateCode() {
    setBusy("code");
    setError(null);
    const response = await fetch("/api/telegram/link-code", { method: "POST" });
    const data = await response.json();
    setBusy(null);
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setCode(data.code);
  }

  async function sendTest() {
    setBusy("test");
    setError(null);
    setMessage(null);
    const response = await fetch("/api/telegram/test", { method: "POST" });
    const data = await response.json();
    setBusy(null);
    if (!response.ok) setError(data.error);
    else setMessage("Zpráva odeslána — mrkni do Telegramu.");
  }

  async function unlink() {
    setBusy("unlink");
    await fetch("/api/telegram/link-code", { method: "DELETE" });
    setBusy(null);
    setCode(null);
    router.refresh();
  }

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Telegram notifikace
        </h1>
        <p className="text-sm text-ink-muted">
          Připomínky chodí přímo do Telegramu — zdarma, bez SMS a bez nutnosti mít otevřenou
          aplikaci.
        </p>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      {!configured ? (
        <Card>
          <CardBody>
            <Alert tone="warning">
              Na serveru chybí <code>TELEGRAM_BOT_TOKEN</code>. Vytvoř bota přes @BotFather a token
              doplň do <code>.env</code> — návod je v README.
            </Alert>
          </CardBody>
        </Card>
      ) : connected ? (
        <>
          <Card>
            <CardBody className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">Telegram je propojený</p>
                <p className="text-sm text-ink-muted">Připomínky ti budou chodit automaticky.</p>
              </div>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={sendTest} disabled={busy === "test"}>
              {busy === "test" ? <Spinner /> : <Send className="h-4 w-4" />}
              Poslat zkušební zprávu
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={unlink}
              disabled={busy === "unlink"}
            >
              <Unlink className="h-4 w-4" /> Odpojit
            </Button>
          </div>
        </>
      ) : (
        <Card>
          <CardHeader title="Propojení ve třech krocích" />
          <CardBody className="space-y-4 pt-3">
            <Step number={1} title="Otevři bota v Telegramu">
              {botUsername ? (
                <ButtonLink
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  variant="secondary"
                  size="sm"
                >
                  @{botUsername}
                </ButtonLink>
              ) : (
                <p className="text-sm text-ink-muted">
                  Bot zatím neodpovídá — zkontroluj token na serveru.
                </p>
              )}
            </Step>

            <Step number={2} title="Vygeneruj si kód">
              {code ? (
                <div className="flex items-center gap-2">
                  <code className="tnum rounded-xl bg-brand-soft px-4 py-2.5 text-xl font-bold tracking-[0.3em] text-brand">
                    {code}
                  </code>
                  <Button size="sm" variant="secondary" onClick={copyCode}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={generateCode} disabled={busy === "code"}>
                  {busy === "code" ? <Spinner /> : "Vygenerovat kód"}
                </Button>
              )}
            </Step>

            <Step number={3} title="Pošli kód botovi">
              <p className="text-sm text-ink-muted">
                Napiš mu kód jako běžnou zprávu. Odpoví ti potvrzením a tuhle stránku pak stačí
                obnovit.
              </p>
              <Button size="sm" variant="secondary" onClick={() => router.refresh()}>
                Obnovit stav
              </Button>
            </Step>
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
            Každý člen rodiny si Telegram propojuje zvlášť — zprávy chodí jen tomu, koho se týkají.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
        {number}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium text-ink">{title}</p>
        {children}
      </div>
    </div>
  );
}

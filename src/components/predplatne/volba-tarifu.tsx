"use client";

import * as React from "react";
import { Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/misc";
import { cn } from "@/lib/format";
import { CENIK, korun, type Tarif } from "@/lib/tarify";

/**
 * Výběr tarifu a odchod do Stripe.
 *
 * Roční je předvybraný: platí se jednou za rok, což je u aplikace, kterou
 * rodič otevře každý den, i tak levnější než jeden oběd.
 */
export function VolbaTarifu({
  familyId,
  brana,
}: {
  familyId: string;
  brana: boolean;
}) {
  const [tarif, setTarif] = React.useState<Tarif>("rocni");
  const [souhlas, setSouhlas] = React.useState(false);
  const [ceka, setCeka] = React.useState(false);
  const [chyba, setChyba] = React.useState<string | null>(null);

  async function zaplatit() {
    setCeka(true);
    setChyba(null);
    try {
      const odpoved = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ familyId, tarif }),
      });
      const data = (await odpoved.json()) as { url?: string; chyba?: string };
      if (!odpoved.ok || !data.url) {
        setChyba(data.chyba ?? "Platbu se nepodařilo založit.");
        setCeka(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setChyba("Platbu se nepodařilo založit. Zkus to prosím znovu.");
      setCeka(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {CENIK.map((t) => {
          const vybrany = t.id === tarif;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTarif(t.id)}
              aria-pressed={vybrany}
              className={cn(
                "relative rounded-2xl border p-4 text-left transition-all",
                vybrany
                  ? "border-brand bg-brand-soft/50 ring-2 ring-brand/30"
                  : "border-line bg-surface hover:border-line-strong",
              )}
            >
              {t.usetri > 0 ? (
                <span className="absolute right-3 top-3 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-brand-ink">
                  −{t.usetri} %
                </span>
              ) : null}
              <span className="block text-sm font-medium text-ink-muted">{t.nazev}</span>
              <span className="mt-1 block text-2xl font-semibold text-ink">
                {korun(t.cena)}
                <span className="text-sm font-normal text-ink-muted"> / {t.obdobi}</span>
              </span>
              {t.id === "rocni" ? (
                <span className="mt-0.5 block text-xs text-ink-subtle">
                  vychází na {korun(t.mesicne)} měsíčně
                </span>
              ) : null}
              <span className="mt-2 block text-sm text-ink-muted">{t.popis}</span>
              {vybrany ? (
                <Check className="absolute bottom-3 right-3 h-4 w-4 text-brand" />
              ) : null}
            </button>
          );
        })}
      </div>

      {chyba ? <Alert tone="danger">{chyba}</Alert> : null}

      {brana ? (
        <>
          {/* Bez tohohle souhlasu běží čtrnáctidenní lhůta na odstoupení dál
              i po zaplacení. Zákon ho chce výslovný, ne schovaný v textu. */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3">
            <input
              type="checkbox"
              checked={souhlas}
              onChange={(e) => setSouhlas(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-line-strong accent-[var(--brand)]"
            />
            <span className="text-sm text-ink-muted">
              Souhlasím s{" "}
              <Link
                href="/obchodni-podminky"
                target="_blank"
                className="text-brand underline underline-offset-4"
              >
                obchodními podmínkami
              </Link>{" "}
              a žádám, aby předplatné začalo platit hned. Beru na vědomí, že tím zaniká právo
              odstoupit od smlouvy do 14 dnů.
            </span>
          </label>

          <Button size="lg" className="w-full" onClick={zaplatit} disabled={ceka || !souhlas}>
            {ceka ? <Spinner /> : `Předplatit za ${korun(CENIK.find((t) => t.id === tarif)!.cena)}`}
          </Button>
          <p className="text-center text-xs text-ink-subtle">
            Platba přes Stripe. Kartu ani její číslo nevidíme.
          </p>
        </>
      ) : (
        <Alert tone="warning">
          Platební brána se právě dokončuje. Napiš nám a předplatné ti nastavíme ručně — do té
          doby aplikace běží dál.
        </Alert>
      )}
    </div>
  );
}

/** Správa už běžícího předplatného — karta, faktury, zrušení. */
export function SpravaPredplatneho({ familyId }: { familyId: string }) {
  const [ceka, setCeka] = React.useState(false);
  const [chyba, setChyba] = React.useState<string | null>(null);

  async function otevrit() {
    setCeka(true);
    setChyba(null);
    try {
      const odpoved = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ familyId }),
      });
      const data = (await odpoved.json()) as { url?: string; chyba?: string };
      if (!odpoved.ok || !data.url) {
        setChyba(data.chyba ?? "Portál se nepodařilo otevřít.");
        setCeka(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setChyba("Portál se nepodařilo otevřít.");
      setCeka(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button variant="secondary" onClick={otevrit} disabled={ceka}>
        {ceka ? <Spinner /> : <ExternalLink className="h-4 w-4" />}
        Spravovat platbu a faktury
      </Button>
      {chyba ? <Alert tone="danger">{chyba}</Alert> : null}
    </div>
  );
}

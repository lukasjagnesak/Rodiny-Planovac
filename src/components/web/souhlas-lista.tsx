"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { prectiSouhlas, ulozSouhlas, type Souhlas } from "@/lib/souhlas";

/**
 * Lišta se souhlasem.
 *
 * „Jen nutné" je stejně velké a stejně blízko jako „Přijmout vše" —
 * schované odmítnutí je podle úřadu vada, ne optimalizace, a u publika,
 * které řeší rozvod, je to navíc rychlá cesta ke ztrátě důvěry.
 *
 * Do doby, než člověk klikne, neběží žádný skript třetí strany.
 */
export function SouhlasLista() {
  const [zobrazit, setZobrazit] = React.useState(false);
  const [podrobnosti, setPodrobnosti] = React.useState(false);
  const [analytika, setAnalytika] = React.useState(true);
  const [marketing, setMarketing] = React.useState(true);

  React.useEffect(() => {
    setZobrazit(prectiSouhlas() === null);

    // Odkaz „změnit nastavení" v zásadách lištu vyvolá znovu.
    const znovu = (e: Event) => {
      const detail = (e as CustomEvent<Souhlas | null>).detail;
      if (detail === null) setZobrazit(true);
    };
    window.addEventListener("klidoo-souhlas", znovu);
    return () => window.removeEventListener("klidoo-souhlas", znovu);
  }, []);

  if (!zobrazit || typeof document === "undefined") return null;

  function rozhodni(volba: { analytika: boolean; marketing: boolean }) {
    ulozSouhlas(volba);
    setZobrazit(false);
  }

  return createPortal(
    <div
      role="dialog"
      aria-label="Nastavení soukromí"
      className="safe-bottom fixed inset-x-0 bottom-0 z-[70] border-t border-line bg-surface/97 backdrop-blur-md"
    >
      <div className="mx-auto w-full max-w-3xl px-5 py-4 sm:px-6">
        <p className="text-sm leading-relaxed text-ink-muted">
          <strong className="text-ink">Můžeme měřit, co na webu funguje?</strong> Návštěvnost si
          počítáme sami anonymně a k tomu souhlas nepotřebujeme. Google Analytics a Meta nám
          navíc řeknou, které reklamy mají smysl — ty bez tvého svolení nespustíme.{" "}
          <Link
            href="/zasady-ochrany-osobnich-udaju"
            className="underline underline-offset-4 hover:text-ink"
          >
            Co to znamená
          </Link>
        </p>

        {podrobnosti ? (
          <div className="mt-3 space-y-2.5 rounded-xl border border-line bg-bg p-3">
            <Checkbox
              checked
              disabled
              readOnly
              label="Nutné"
              description="Přihlášení a základní chod webu. Bez nich to nejde vypnout."
            />
            <Checkbox
              checked={analytika}
              onChange={(e) => setAnalytika(e.target.checked)}
              label="Analytika"
              description="Google Analytics — které stránky lidé čtou a kde odcházejí."
            />
            <Checkbox
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              label="Marketing"
              description="Meta Pixel a Google Ads — měření reklam a jejich cílení."
            />
          </div>
        ) : null}

        <div className="mt-3.5 flex flex-wrap gap-2">
          {podrobnosti ? (
            <Button className="flex-1 sm:flex-none" onClick={() => rozhodni({ analytika, marketing })}>
              Uložit volbu
            </Button>
          ) : (
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => rozhodni({ analytika: true, marketing: true })}
            >
              Přijmout vše
            </Button>
          )}

          <Button
            variant="secondary"
            className="flex-1 sm:flex-none"
            onClick={() => rozhodni({ analytika: false, marketing: false })}
          >
            Jen nutné
          </Button>

          {podrobnosti ? null : (
            <Button
              variant="ghost"
              className="flex-1 sm:flex-none"
              onClick={() => setPodrobnosti(true)}
            >
              Vybrat podrobně
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

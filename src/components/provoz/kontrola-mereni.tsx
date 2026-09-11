"use client";

import * as React from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ADS_ID, ADS_STITKY, GA_ID, META_PIXEL_ID, adsCil } from "@/lib/marketing";
import { prectiSouhlas, type Souhlas } from "@/lib/souhlas";

/**
 * Kontrola měření konverzí.
 *
 * Existuje proto, že jediný způsob, jak dřív poznat, jestli se konverze
 * odesílá, bylo otevřít vývojářské nástroje, najít správnou záložku,
 * napsat správný filtr a číst požadavky. To se nedá dělat pokaždé, když
 * se něco změní v `.env` — a přesně tam ta chyba vždycky je.
 *
 * Stránka říká dvě věci: co je nastavené a co se doopravdy stane, když
 * se konverze pošle. To druhé se nedá odhadnout z konfigurace, takže se
 * to tu zkouší doopravdy.
 */

type Vysledek = { ok: boolean; text: string } | null;

const DRUHY: { klic: string; nazev: string; kde: string }[] = [
  { klic: "registrace", nazev: "Registrace", kde: "odeslání registračního formuláře nebo návrat od Googlu" },
  { klic: "rodina", nazev: "Přihlášení rodiny", kde: "dokončení průvodce na /vitejte" },
  { klic: "predplatne", nazev: "Předplatné", kde: "návrat ze Stripe na /dekujeme" },
];

function Radek({
  popis,
  hodnota,
  ok,
  poznamka,
}: {
  popis: string;
  hodnota: string;
  ok: boolean | null;
  poznamka?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-line py-2.5 last:border-0">
      <span className="mt-0.5 shrink-0">
        {ok === null ? (
          <AlertTriangle className="h-4 w-4 text-warning" />
        ) : ok ? (
          <Check className="h-4 w-4 text-success" />
        ) : (
          <X className="h-4 w-4 text-danger" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="text-sm text-ink">{popis}</span>
          <span className="break-all font-mono text-xs text-ink-muted">{hodnota}</span>
        </div>
        {poznamka ? <p className="mt-0.5 text-xs text-ink-subtle">{poznamka}</p> : null}
      </div>
    </div>
  );
}

export function KontrolaMereni() {
  // Až po připojení: na serveru neexistuje ani souhlas, ani gtag, a když
  // by se to vykreslilo rovnou, React by si stěžoval na rozdílný výstup.
  const [nacteno, setNacteno] = React.useState(false);
  const [souhlas, setSouhlas] = React.useState<Souhlas | null>(null);
  const [gtag, setGtag] = React.useState(false);
  const [skript, setSkript] = React.useState(false);
  const [vysledky, setVysledky] = React.useState<Record<string, Vysledek>>({});
  const [bezi, setBezi] = React.useState<string | null>(null);

  const zmer = React.useCallback(() => {
    setSouhlas(prectiSouhlas());
    setGtag(typeof window.gtag === "function");
    setSkript(Boolean(document.getElementById("google-ads")));
  }, []);

  React.useEffect(() => {
    setNacteno(true);
    zmer();
  }, [zmer]);

  function zkus(druh: string) {
    const cil = adsCil(druh);

    if (!cil) {
      setVysledky((p) => ({
        ...p,
        [druh]: { ok: false, text: "Chybí ID účtu nebo štítek — doplň je v .env a přestav aplikaci." },
      }));
      return;
    }

    if (typeof window.gtag !== "function") {
      setVysledky((p) => ({
        ...p,
        [druh]: { ok: false, text: "Značka Google se vůbec nenačetla. Bez marketingového souhlasu se nenačte." },
      }));
      return;
    }

    setBezi(druh);
    let hotovo = false;

    // `event_callback` zavolá gtag až ve chvíli, kdy událost opravdu
    // odešle. Když se neozve, konverze neodletěla — a to je přesně ten
    // stav, který v Google Ads vypadá jako „Nesprávně nakonfigurováno".
    const casovac = setTimeout(() => {
      if (hotovo) return;
      hotovo = true;
      setBezi(null);
      setVysledky((p) => ({
        ...p,
        [druh]: {
          ok: false,
          text: "Google se do pěti sekund neozval. Značka je načtená, ale událost neodešla — obvykle chybí souhlas s marketingem nebo ji blokuje rozšíření v prohlížeči.",
        },
      }));
    }, 5000);

    window.gtag("event", "conversion", {
      send_to: cil,
      event_callback: () => {
        if (hotovo) return;
        hotovo = true;
        clearTimeout(casovac);
        setBezi(null);
        setVysledky((p) => ({
          ...p,
          [druh]: { ok: true, text: `Odesláno na ${cil}. V Google Ads se objeví do pár hodin.` },
        }));
      },
    });
  }

  const marketing = Boolean(souhlas?.marketing);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Co je nastavené"
          description="Hodnoty z .env se zapékají při sestavení obrazu. Změna v .env se projeví až po přestavbě, ne po restartu."
          action={
            <Button size="sm" variant="secondary" onClick={zmer}>
              Načíst znovu
            </Button>
          }
        />
        <CardBody className="pt-0">
          {!nacteno ? (
            <p className="py-4 text-sm text-ink-muted">Zjišťuji…</p>
          ) : (
            <>
              <Radek
                popis="ID účtu Google Ads"
                hodnota={ADS_ID || "chybí"}
                ok={Boolean(ADS_ID)}
                poznamka={ADS_ID ? undefined : "NEXT_PUBLIC_ADS_ID v .env"}
              />
              {DRUHY.map(({ klic, nazev }) => (
                <Radek
                  key={klic}
                  popis={`Štítek — ${nazev}`}
                  hodnota={ADS_STITKY[klic] || "chybí"}
                  ok={Boolean(ADS_STITKY[klic])}
                />
              ))}
              <Radek
                popis="Google Analytics"
                hodnota={GA_ID || "nepoužívá se"}
                ok={GA_ID ? true : null}
                poznamka={
                  GA_ID
                    ? undefined
                    : "Na konverze v Ads to nevadí, jen nebudou data v GA4."
                }
              />
              <Radek
                popis="Meta Pixel"
                hodnota={META_PIXEL_ID || "nepoužívá se"}
                ok={META_PIXEL_ID ? true : null}
              />
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Co se děje v tomhle prohlížeči"
          description="Platí jen pro tebe a tenhle počítač. Každý návštěvník má vlastní souhlas."
        />
        <CardBody className="pt-0">
          {!nacteno ? (
            <p className="py-4 text-sm text-ink-muted">Zjišťuji…</p>
          ) : (
            <>
              <Radek
                popis="Souhlas s marketingem"
                hodnota={
                  souhlas === null ? "nerozhodnuto" : marketing ? "udělen" : "odmítnut"
                }
                ok={marketing}
                poznamka={
                  marketing
                    ? undefined
                    : "Bez něj se značka nenačte a konverze se neposílají. Je to tak správně — jen se podle toho nedá testovat."
                }
              />
              <Radek popis="Skript značky v stránce" hodnota={skript ? "načten" : "není"} ok={skript} />
              <Radek popis="Funkce gtag" hodnota={gtag ? "existuje" : "není"} ok={gtag} />
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Zkušební odeslání"
          description="Pošle skutečnou konverzi. Přičte se v Google Ads, ale bez prokliku z reklamy se nepřiřadí k žádné kampani."
        />
        <CardBody className="space-y-3 pt-0">
          {DRUHY.map(({ klic, nazev, kde }) => {
            const v = vysledky[klic];
            return (
              <div key={klic} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{nazev}</p>
                    <p className="text-xs text-ink-subtle">Ostrá konverze nastává při: {kde}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={bezi !== null}
                    onClick={() => zkus(klic)}
                  >
                    {bezi === klic ? "Odesílám…" : "Odeslat zkušebně"}
                  </Button>
                </div>
                {v ? (
                  <p
                    className={`mt-2 text-xs ${v.ok ? "text-success" : "text-danger"}`}
                  >
                    {v.text}
                  </p>
                ) : null}
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

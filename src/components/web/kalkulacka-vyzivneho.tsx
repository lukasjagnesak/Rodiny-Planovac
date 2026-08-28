"use client";

import * as React from "react";
import {
  ETAPY,
  VYCHOZI_VYZIVNE,
  spocitejVyzivne,
  type VyzivneVstup,
} from "@/lib/vyzivne";
import { Field, Input, Select } from "@/components/ui/field";

const kc = (castka: number) => `${castka.toLocaleString("cs-CZ")} Kč`;

/**
 * Kalkulačka výživného.
 *
 * Počítá u člověka v prohlížeči a nic neodesílá — kdo kolik bere je
 * citlivý údaj a na veřejné stránce bez přihlášení nemá co dělat.
 * Barvy rodičů jsou stejné jako v kalendáři aplikace, aby si člověk
 * spojil, co uvidí potom.
 */
export function KalkulackaVyzivneho() {
  const [vstup, setVstup] = React.useState<VyzivneVstup>(VYCHOZI_VYZIVNE);
  const vysledek = React.useMemo(() => spocitejVyzivne(vstup), [vstup]);

  const zmen = <K extends keyof VyzivneVstup>(klic: K, hodnota: VyzivneVstup[K]) =>
    setVstup((stary) => ({ ...stary, [klic]: hodnota }));

  const peceB = 100 - vstup.peceA;

  return (
    <div className="card p-5 sm:p-6">
      <div className="space-y-5">
        <Field
          label="Etapa dítěte"
          hint="Tabulka pracuje se čtyřmi etapami, ne s přesným věkem."
        >
          <Select value={vstup.etapa} onChange={(e) => zmen("etapa", e.target.value)}>
            {ETAPY.map((etapa) => (
              <option key={etapa.id} value={etapa.id}>
                {etapa.popis}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="prijem-a"
              className="block text-sm font-medium text-parent-a-text"
            >
              Čistý měsíční příjem — rodič A
            </label>
            <Input
              id="prijem-a"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              value={vstup.prijemA}
              onChange={(e) => zmen("prijemA", Number(e.target.value))}
              className="tnum border-parent-a/40 bg-parent-a-bg"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="prijem-b"
              className="block text-sm font-medium text-parent-b-text"
            >
              Čistý měsíční příjem — rodič B
            </label>
            <Input
              id="prijem-b"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              value={vstup.prijemB}
              onChange={(e) => zmen("prijemB", Number(e.target.value))}
              className="tnum border-parent-b/40 bg-parent-b-bg"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="pece" className="block text-sm font-medium text-ink">
            Rozsah péče
            <span className="ml-2 font-normal text-ink-subtle">
              Kolik času dítě stráví u rodiče A. Při 50 % jde o klasickou střídavou péči.
            </span>
          </label>
          <input
            id="pece"
            type="range"
            min={0}
            max={100}
            step={5}
            value={vstup.peceA}
            onChange={(e) => zmen("peceA", Number(e.target.value))}
            className="w-full accent-[var(--brand)]"
          />
          <div className="tnum flex justify-between text-sm font-semibold">
            <span className="text-parent-a-text">Rodič A {vstup.peceA} %</span>
            <span className="text-parent-b-text">{peceB} % rodič B</span>
          </div>
        </div>

        <Field
          label="Počet vyživovacích povinností rodiče"
          hint="Včetně tohoto dítěte. Tabulka počítá nejvýš se čtyřmi."
        >
          <Select
            value={String(vstup.povinnosti)}
            onChange={(e) => zmen("povinnosti", Number(e.target.value))}
          >
            <option value="1">1 dítě</option>
            <option value="2">2 děti</option>
            <option value="3">3 děti</option>
            <option value="4">4 děti</option>
          </Select>
        </Field>
      </div>

      <div className="mt-6 border-t border-line pt-6" aria-live="polite">
        {vysledek.bezVyzivneho ? (
          <>
            <p className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Bez výživného
            </p>
            <p className="mt-2 text-[0.95rem] text-ink-muted">
              Při těchto příjmech a tomto rozdělení péče přispívají oba rodiče srovnatelně.
              Soud v takové situaci výživné často nestanoví.
            </p>
          </>
        ) : (
          <>
            <p className="tnum font-display text-4xl font-semibold leading-none tracking-tight text-ink sm:text-5xl">
              {kc(vysledek.castka)}
              <span className="ml-2 text-xl font-medium text-ink-muted sm:text-2xl">
                měsíčně
              </span>
            </p>
            <p className="mt-3 text-[0.95rem] text-ink-muted">
              Platí{" "}
              <strong
                className={
                  vysledek.platce === "a" ? "text-parent-a-text" : "text-parent-b-text"
                }
              >
                rodič {vysledek.platce === "a" ? "A" : "B"}
              </strong>{" "}
              rodiči {vysledek.platce === "a" ? "B" : "A"}.
            </p>
            <p className="tnum mt-2 text-sm text-ink-subtle">
              Rozpětí podle tabulky: {kc(vysledek.rozpeti.od)} – {kc(vysledek.rozpeti.do)}
              {"  ·  "}
              {vysledek.procenta.od}–{vysledek.procenta.do} % z čistého příjmu
            </p>
          </>
        )}
      </div>
    </div>
  );
}

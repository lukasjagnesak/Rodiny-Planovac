"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import {
  ETAPY,
  MAX_DALSICH_DETI,
  MAX_DETI,
  VYCHOZI_VYZIVNE,
  spocitejVyzivne,
  type VyzivneVstup,
} from "@/lib/vyzivne";
import { Field, Input, Select } from "@/components/ui/field";

const kc = (castka: number) => `${castka.toLocaleString("cs-CZ")} Kč`;

const POCTY_DALSICH = Array.from({ length: MAX_DALSICH_DETI + 1 }, (_, i) => i);

function popisDalsich(pocet: number): string {
  if (pocet === 0) return "Žádné";
  if (pocet === 1) return "1 dítě";
  if (pocet < 5) return `${pocet} děti`;
  return `${pocet} dětí`;
}

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

  const zmenDite = (poradi: number, etapa: string) =>
    setVstup((stary) => ({
      ...stary,
      deti: stary.deti.map((d, i) => (i === poradi ? { etapa } : d)),
    }));

  // Nové dítě dědí etapu po posledním — sourozenci bývají blízko věkem
  // a je to o klik míň.
  const pridejDite = () =>
    setVstup((stary) => ({
      ...stary,
      deti: [...stary.deti, { etapa: stary.deti[stary.deti.length - 1]?.etapa ?? "druhy-stupen" }],
    }));

  const odeberDite = (poradi: number) =>
    setVstup((stary) => ({
      ...stary,
      deti: stary.deti.length > 1 ? stary.deti.filter((_, i) => i !== poradi) : stary.deti,
    }));

  const peceB = 100 - vstup.peceA;

  return (
    <div className="card p-5 sm:p-6">
      <div className="space-y-5">
        <div className="space-y-2.5">
          <span className="block text-sm font-medium text-ink">
            Společné děti
            <span className="ml-2 font-normal text-ink-subtle">
              Tabulka pracuje se čtyřmi etapami, ne s přesným věkem.
            </span>
          </span>

          {vstup.deti.map((dite, poradi) => (
            <div key={poradi} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-sm text-ink-subtle">{poradi + 1}.</span>
              <Select
                aria-label={`Etapa ${poradi + 1}. dítěte`}
                value={dite.etapa}
                onChange={(e) => zmenDite(poradi, e.target.value)}
                className="flex-1"
              >
                {ETAPY.map((etapa) => (
                  <option key={etapa.id} value={etapa.id}>
                    {etapa.popis}
                  </option>
                ))}
              </Select>
              {vstup.deti.length > 1 ? (
                <button
                  type="button"
                  onClick={() => odeberDite(poradi)}
                  aria-label={`Odebrat ${poradi + 1}. dítě`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <X size={18} />
                </button>
              ) : null}
            </div>
          ))}

          {vstup.deti.length < MAX_DETI ? (
            <button
              type="button"
              onClick={pridejDite}
              className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand-soft"
            >
              <Plus size={16} /> Přidat dítě
            </button>
          ) : null}
        </div>

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

        {/* Každý rodič může mít jiný počet vyživovacích povinností —
            koeficient se proto počítá zvlášť pro každého. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="dalsi-a" className="block text-sm font-medium text-parent-a-text">
              Další děti rodiče A
              <span className="block text-xs font-normal text-ink-subtle">
                Z jiného vztahu, mimo ty výše
              </span>
            </label>
            <Select
              id="dalsi-a"
              value={String(vstup.dalsiDetiA)}
              onChange={(e) => zmen("dalsiDetiA", Number(e.target.value))}
              className="border-parent-a/40 bg-parent-a-bg"
            >
              {POCTY_DALSICH.map((n) => (
                <option key={n} value={n}>
                  {popisDalsich(n)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="dalsi-b" className="block text-sm font-medium text-parent-b-text">
              Další děti rodiče B
              <span className="block text-xs font-normal text-ink-subtle">
                Z jiného vztahu, mimo ty výše
              </span>
            </label>
            <Select
              id="dalsi-b"
              value={String(vstup.dalsiDetiB)}
              onChange={(e) => zmen("dalsiDetiB", Number(e.target.value))}
              className="border-parent-b/40 bg-parent-b-bg"
            >
              {POCTY_DALSICH.map((n) => (
                <option key={n} value={n}>
                  {popisDalsich(n)}
                </option>
              ))}
            </Select>
          </div>
        </div>
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
            </p>

            {/* U víc dětí je celková částka bez rozpadu k ničemu — soud
                stanovuje výživné na každé dítě zvlášť. */}
            {vysledek.podleDeti.length > 1 ? (
              <ul className="mt-4 space-y-1.5 border-t border-line pt-3">
                {vysledek.podleDeti.map((dite, poradi) => (
                  <li key={poradi} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 text-ink-muted">
                      {poradi + 1}. dítě — {dite.etapa.popis}
                    </span>
                    <span className="tnum shrink-0 font-medium text-ink">{kc(dite.castka)}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {vysledek.povinnostiA !== vysledek.povinnostiB ? (
              <p className="mt-3 text-xs text-ink-subtle">
                Počítáno s {vysledek.povinnostiA} vyživovacími povinnostmi u rodiče A a{" "}
                {vysledek.povinnostiB} u rodiče B.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

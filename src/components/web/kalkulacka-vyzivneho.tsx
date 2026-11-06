"use client";

import * as React from "react";
import { ArrowDown, ChevronDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/format";
import { zmer } from "@/lib/mereni";
import {
  ETAPY,
  MAX_DALSICH_DETI,
  MAX_DETI,
  VYCHOZI_VYZIVNE,
  spocitejVyzivne,
  type VyzivneVstup,
  type VyzivneVysledek,
} from "@/lib/vyzivne";
import { Select } from "@/components/ui/field";
import { VyzivnePdf } from "./vyzivne-pdf";
import { VyzivnePokracovat } from "./vyzivne-pokracovat";

const kc = (castka: number) => `${castka.toLocaleString("cs-CZ")} Kč`;

const POCTY_DALSICH = Array.from({ length: MAX_DALSICH_DETI + 1 }, (_, i) => i);

function popisDalsich(pocet: number): string {
  if (pocet === 0) return "Žádné";
  if (pocet === 1) return "1 dítě";
  if (pocet < 5) return `${pocet} děti`;
  return `${pocet} dětí`;
}

/**
 * Věk místo názvu etapy.
 *
 * Na telefonu se „11–15" přečte rychleji než „2. stupeň ZŠ (zhruba
 * 11–15 let)" a vejde se do dlaždice. Celý název etapy dostane čtečka
 * obrazovky a vidí ho i člověk — pod dlaždicemi u vybrané.
 */
const VEK: Record<string, string> = {
  predskolni: "0–5",
  "prvni-stupen": "6–10",
  "druhy-stupen": "11–15",
  stredni: "16+",
};

const bezZavorky = (popis: string) => popis.replace(/\s*\(.*\)\s*$/, "");

/**
 * Rychlé volby rozsahu péče.
 *
 * Symetricky a s písmenem rodiče: „víc u jednoho" by nechalo otázku,
 * u kterého. Posuvník pod nimi zůstává pro přesné nastavení.
 */
const PREDVOLBY = [
  { pece: 70, nazev: "Víc u A", podil: "70 / 30" },
  { pece: 50, nazev: "Napůl", podil: "50 / 50" },
  { pece: 30, nazev: "Víc u B", podil: "30 / 70" },
];

function popisPece(peceA: number): string {
  if (peceA >= 45 && peceA <= 55) return "Klasická střídavá péče.";
  const u = peceA > 50 ? "A" : "B";
  if (Math.max(peceA, 100 - peceA) >= 80) return `Dítě je hlavně u rodiče ${u}.`;
  return `Víc času u rodiče ${u}.`;
}

/**
 * Kalkulačka výživného.
 *
 * Počítá u člověka v prohlížeči a nic neodesílá — kdo kolik bere je
 * citlivý údaj a na veřejné stránce bez přihlášení nemá co dělat.
 * Barvy rodičů jsou stejné jako v kalendáři aplikace, aby si člověk
 * spojil, co uvidí potom.
 *
 * Stavba je udělaná pro telefon, odkud chodí většina lidí z reklamy:
 * čtyři pole, ne osm (děti z jiných vztahů jsou pod „Upřesnit"),
 * dlaždice místo rozbalovacích seznamů a částka, která je během
 * vyplňování pořád vidět ve spodní liště. Pod výsledkem je rozcestí:
 * kdo se o děti už střídá, jde do aplikace; kdo se teprve domlouvá,
 * dostane PDF. Obojí je v jednom pohledu s částkou.
 */
export function KalkulackaVyzivneho() {
  const [vstup, setVstup] = React.useState<VyzivneVstup>(VYCHOZI_VYZIVNE);
  const vysledek = React.useMemo(() => spocitejVyzivne(vstup), [vstup]);
  const [upresnit, setUpresnit] = React.useState(false);

  /**
   * Kolik lidí kalkulačku opravdu použije.
   *
   * Počítá se průběžně při psaní, takže tu není žádné „spočítat", co by
   * šlo změřit — a bez toho se ze zobrazení stránky nepozná, jestli
   * člověk něco zadal, nebo se jen podíval a odešel. Hlásí se první
   * změna, ne každá: jde o lidi, ne o stisky kláves. Stav (ne jen ref)
   * proto, že od první změny se smí ukázat lišta s částkou.
   */
  const [zacal, setZacal] = React.useState(false);
  const nahlasPouziti = () => {
    if (zacal) return;
    setZacal(true);
    zmer("vyzivne-zadani");
  };

  const zmen = <K extends keyof VyzivneVstup>(klic: K, hodnota: VyzivneVstup[K]) => {
    nahlasPouziti();
    setVstup((stary) => ({ ...stary, [klic]: hodnota }));
  };

  const zmenDite = (poradi: number, etapa: string) => {
    nahlasPouziti();
    setVstup((stary) => ({
      ...stary,
      deti: stary.deti.map((d, i) => (i === poradi ? { etapa } : d)),
    }));
  };

  // Nové dítě dědí etapu po posledním — sourozenci bývají blízko věkem
  // a je to o klik míň.
  const pridejDite = () => {
    nahlasPouziti();
    setVstup((stary) => ({
      ...stary,
      deti: [...stary.deti, { etapa: stary.deti[stary.deti.length - 1]?.etapa ?? "druhy-stupen" }],
    }));
  };

  const odeberDite = (poradi: number) => {
    nahlasPouziti();
    setVstup((stary) => ({
      ...stary,
      deti: stary.deti.length > 1 ? stary.deti.filter((_, i) => i !== poradi) : stary.deti,
    }));
  };

  const peceB = 100 - vstup.peceA;
  const upresneno = vstup.dalsiDetiA > 0 || vstup.dalsiDetiB > 0;

  // ── Lišta s částkou ──────────────────────────────────────────────
  const vysledekRef = React.useRef<HTMLDivElement>(null);
  const coDalRef = React.useRef<HTMLElement>(null);
  const [vysledekVidet, setVysledekVidet] = React.useState(true);
  const [pise, setPise] = React.useState(false);

  React.useEffect(() => {
    const prvky = [vysledekRef.current, coDalRef.current].filter(
      (p): p is HTMLDivElement | HTMLElement => p !== null,
    );
    if (prvky.length === 0 || typeof IntersectionObserver === "undefined") return;

    const videt = new Map<Element, boolean>();
    const hlidac = new IntersectionObserver((zaznamy) => {
      for (const z of zaznamy) videt.set(z.target, z.isIntersecting);
      setVysledekVidet([...videt.values()].some(Boolean));
    });
    prvky.forEach((p) => hlidac.observe(p));
    return () => hlidac.disconnect();
  }, []);

  // Při psaní lištu schovat: na telefonu by ji otevřená klávesnice
  // vytlačila nahoru přes pole, do kterého člověk zrovna píše.
  const naFocus = (udalost: React.FocusEvent) => {
    if (udalost.target instanceof HTMLInputElement && udalost.target.type !== "radio") setPise(true);
  };
  const naBlur = () => setPise(false);

  const listaVidet = zacal && !vysledekVidet && !pise;

  return (
    <>
      <div
        className="card p-4 sm:p-6"
        onFocusCapture={naFocus}
        onBlurCapture={naBlur}
      >
        <div className="space-y-5">
          {vstup.deti.map((dite, poradi) => (
            <fieldset key={poradi} className="space-y-2">
              <legend className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">
                  {vstup.deti.length > 1 ? `Věk ${poradi + 1}. dítěte` : "Věk dítěte"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-xs text-ink-muted">
                    {bezZavorky(ETAPY.find((e) => e.id === dite.etapa)?.popis ?? "")}
                  </span>
                  {vstup.deti.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => odeberDite(poradi)}
                      aria-label={`Odebrat ${poradi + 1}. dítě`}
                      className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </span>
              </legend>
              <div className="grid grid-cols-4 gap-1.5">
                {ETAPY.map((etapa) => (
                  <label key={etapa.id} className="block cursor-pointer">
                    <input
                      type="radio"
                      name={`etapa-${poradi}`}
                      value={etapa.id}
                      checked={dite.etapa === etapa.id}
                      onChange={() => zmenDite(poradi, etapa.id)}
                      aria-label={etapa.popis}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "tnum flex h-11 items-center justify-center rounded-xl border text-sm transition-colors",
                        "border-line-strong bg-surface font-medium text-ink hover:bg-surface-2",
                        "peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:font-semibold",
                        "peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40",
                      )}
                    >
                      {VEK[etapa.id]}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          {vstup.deti.length < MAX_DETI ? (
            <button
              type="button"
              onClick={pridejDite}
              className="-ml-2 -mt-2 inline-flex h-9 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
            >
              <Plus size={16} /> Přidat další dítě
            </button>
          ) : null}

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-ink">Čistý měsíční příjem</legend>
            <div className="grid grid-cols-2 gap-2.5">
              <PoleKc
                id="prijem-a"
                popisek="Rodič A"
                strana="a"
                hodnota={vstup.prijemA}
                onZmena={(v) => zmen("prijemA", v)}
              />
              <PoleKc
                id="prijem-b"
                popisek="Rodič B"
                strana="b"
                hodnota={vstup.prijemB}
                onZmena={(v) => zmen("prijemB", v)}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-2.5">
            <legend className="text-sm font-semibold text-ink">Kolik času je dítě u kterého rodiče</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {PREDVOLBY.map((p) => {
                const vybrana = vstup.peceA === p.pece;
                return (
                  <button
                    key={p.pece}
                    type="button"
                    aria-pressed={vybrana}
                    onClick={() => zmen("peceA", p.pece)}
                    className={cn(
                      "flex h-[3.25rem] flex-col items-center justify-center rounded-xl border transition-colors",
                      vybrana
                        ? "border-brand bg-brand-soft text-ink"
                        : "border-line-strong bg-surface text-ink hover:bg-surface-2",
                    )}
                  >
                    <span className="text-[0.8125rem] font-semibold">{p.nazev}</span>
                    <span className="tnum text-xs text-ink-muted">{p.podil}</span>
                  </button>
                );
              })}
            </div>

            {/* Poměr jako pruh ve dvou barvách: je z něj hned vidět,
                čí část je větší, i bez čtení čísel. */}
            <div className="flex h-2 overflow-hidden rounded-full" aria-hidden>
              <span className="bg-parent-a transition-all" style={{ width: `${vstup.peceA}%` }} />
              <span className="flex-1 bg-parent-b" />
            </div>
            <input
              id="pece"
              type="range"
              min={0}
              max={100}
              step={5}
              value={vstup.peceA}
              onChange={(e) => zmen("peceA", Number(e.target.value))}
              aria-label="Podíl péče rodiče A v procentech"
              aria-valuetext={`Rodič A ${vstup.peceA} %, rodič B ${peceB} %`}
              className="w-full accent-[var(--brand)]"
            />
            <div className="tnum flex items-baseline justify-between text-sm font-semibold">
              <span className="text-parent-a-text">Rodič A {vstup.peceA} %</span>
              <span className="text-parent-b-text">{peceB} % rodič B</span>
            </div>
            <p className="-mt-1 text-xs text-ink-muted">{popisPece(vstup.peceA)}</p>
          </fieldset>

          {/* Každý rodič může mít jiný počet vyživovacích povinností —
              koeficient se proto počítá zvlášť pro každého. Většiny lidí
              se to netýká, a tak je to schované: dvě pole, která devět
              z deseti lidí nechá na „Žádné", jen prodlužují cestu
              k výsledku. */}
          <div>
            <button
              type="button"
              aria-expanded={upresnit}
              aria-controls="upresnit-vyzivne"
              onClick={() => setUpresnit((v) => !v)}
              className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-dashed border-line-strong px-3 text-left text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2"
            >
              <span>
                Upřesnit: děti z jiných vztahů
                {upresneno && !upresnit ? <span className="text-ink"> · zadáno</span> : null}
              </span>
              <ChevronDown
                size={18}
                className={cn("shrink-0 transition-transform", upresnit && "rotate-180")}
                aria-hidden
              />
            </button>

            {upresnit ? (
              <div id="upresnit-vyzivne" className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="dalsi-a" className="block text-xs font-semibold text-parent-a-text">
                    Další děti rodiče A
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
                <div className="space-y-1">
                  <label htmlFor="dalsi-b" className="block text-xs font-semibold text-parent-b-text">
                    Další děti rodiče B
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
                <p className="col-span-2 text-xs text-ink-muted">
                  Z jiného vztahu, mimo děti výše. Další dítě platícího rodiče výživné sníží,
                  další dítě toho druhého ho zvýší.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div
          ref={vysledekRef}
          id="vysledek-vyzivneho"
          className="mt-5 border-t border-line pt-5"
          aria-live="polite"
        >
          <Vysledek vysledek={vysledek} />
        </div>
      </div>

      {/* Rozcestí hned pod částkou. Obě cesty končí v aplikaci, jen každá
          v jinou chvíli: kdo se už střídá, potřebuje kalendář teď; kdo
          se teprve domlouvá, by 30 dní zkoušení promarnil dřív, než bude
          mít rozvrh, a tak dostane PDF a e-maily, které ho k aplikaci
          dovedou, až bude potřeba. */}
      <section
        ref={coDalRef}
        id="co-dal"
        aria-labelledby="co-dal-nadpis"
        className="mt-6 scroll-mt-20 space-y-3"
      >
        <h2
          id="co-dal-nadpis"
          className="font-display text-[1.375rem] font-semibold tracking-tight text-ink"
        >
          Co s výsledkem dál?
        </h2>
        <VyzivnePokracovat vstup={vstup} />
        <VyzivnePdf vstup={vstup} />
      </section>

      <ListaVysledku vysledek={vysledek} videt={listaVidet} />
    </>
  );
}

/** Výsledek výpočtu: částka, kdo platí, rozpětí a rozpad po dětech. */
function Vysledek({ vysledek }: { vysledek: VyzivneVysledek }) {
  if (vysledek.bezVyzivneho) {
    return (
      <>
        <p className="text-sm text-ink-muted">Výživné podle tabulky</p>
        <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Bez výživného
        </p>
        <p className="mt-2 text-[0.95rem] text-ink-muted">
          Při těchto příjmech a tomto rozdělení péče přispívají oba rodiče srovnatelně. Soud
          v takové situaci výživné často nestanoví.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="text-sm text-ink-muted">Výživné podle tabulky</p>
      <p className="tnum mt-1 font-display text-[2.75rem] font-semibold leading-none tracking-tight text-ink sm:text-5xl">
        {kc(vysledek.castka)}
        <span className="ml-2 text-xl font-medium text-ink-muted sm:text-2xl">měsíčně</span>
      </p>
      <p className="mt-3 text-[0.95rem] text-ink">
        Platí{" "}
        <strong className={vysledek.platce === "a" ? "text-parent-a-text" : "text-parent-b-text"}>
          rodič {vysledek.platce === "a" ? "A" : "B"}
        </strong>{" "}
        rodiči {vysledek.platce === "a" ? "B" : "A"}.
      </p>
      <p className="tnum mt-1 text-sm text-ink-muted">
        Rozpětí podle tabulky {kc(vysledek.rozpeti.od)} – {kc(vysledek.rozpeti.do)}
      </p>

      {/* U víc dětí je celková částka bez rozpadu k ničemu — soud
          stanovuje výživné na každé dítě zvlášť. */}
      {vysledek.podleDeti.length > 1 ? (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-3">
          {vysledek.podleDeti.map((dite, poradi) => (
            <li key={poradi} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 text-ink-muted">
                {poradi + 1}. dítě — {bezZavorky(dite.etapa.popis)}
              </span>
              <span className="tnum shrink-0 font-medium text-ink">{kc(dite.castka)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {vysledek.povinnostiA !== vysledek.povinnostiB ? (
        <p className="mt-3 text-xs text-ink-muted">
          Počítáno s {vysledek.povinnostiA} vyživovacími povinnostmi u rodiče A a{" "}
          {vysledek.povinnostiB} u rodiče B.
        </p>
      ) : null}
    </>
  );
}

/**
 * Částka v korunách.
 *
 * Při psaní holé číslice, jinak s mezerami po tisících. Přeformátovat
 * číslo uprostřed psaní znamená skákající kurzor; až po opuštění pole
 * se to nikoho nedotkne a „42 000" se čte líp než „42000".
 */
function PoleKc({
  id,
  popisek,
  strana,
  hodnota,
  onZmena,
}: {
  id: string;
  popisek: string;
  strana: "a" | "b";
  hodnota: number;
  onZmena: (hodnota: number) => void;
}) {
  const [upravuje, setUpravuje] = React.useState(false);
  const zobrazeno = upravuje
    ? hodnota > 0
      ? String(hodnota)
      : ""
    : hodnota.toLocaleString("cs-CZ");

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className={cn(
          "block text-xs font-semibold",
          strana === "a" ? "text-parent-a-text" : "text-parent-b-text",
        )}
      >
        {popisek}
      </label>
      <div
        className={cn(
          "flex h-12 items-center gap-1.5 rounded-xl border px-3 transition-shadow focus-within:ring-2",
          strana === "a"
            ? "border-parent-a/40 bg-parent-a-bg focus-within:border-parent-a focus-within:ring-parent-a/25"
            : "border-parent-b/40 bg-parent-b-bg focus-within:border-parent-b focus-within:ring-parent-b/25",
        )}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={zobrazeno}
          onFocus={(e) => {
            setUpravuje(true);
            // Pole je předvyplněné vzorovou částkou a člověk ji chce
            // přepsat, ne k ní připisovat. Označit až po překreslení:
            // přechod z „42 000" na „42000" by výběr jinak zrušil a nové
            // číslo by se připsalo za staré.
            const pole = e.currentTarget;
            requestAnimationFrame(() => pole.select());
          }}
          onBlur={() => setUpravuje(false)}
          onChange={(e) => onZmena(Math.min(Number(e.target.value.replace(/\D/g, "")) || 0, 10_000_000))}
          className="tnum w-full min-w-0 bg-transparent text-[1.0625rem] font-medium text-ink outline-none"
        />
        <span
          className={cn("text-sm", strana === "a" ? "text-parent-a-text" : "text-parent-b-text")}
          aria-hidden
        >
          Kč
        </span>
      </div>
    </div>
  );
}

/**
 * Částka přilepená ke spodku obrazovky, dokud člověk vyplňuje.
 *
 * Výsledek je na telefonu pod formulářem a bez lišty by člověk po
 * každé změně rolovat dolů, aby viděl, co se stalo. Lišta se ukáže až
 * po první změně (do té doby by ukazovala výsledek za vzorové příjmy),
 * zmizí, jakmile je vidět výsledek nebo nabídka pod ním, a při psaní
 * uhne klávesnici. Jen na telefonu — na počítači je výsledek na očích.
 */
function ListaVysledku({ vysledek, videt }: { vysledek: VyzivneVysledek; videt: boolean }) {
  const dolu = () => {
    zmer("vyzivne-lista");
    document.getElementById("co-dal")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      inert={!videt}
      aria-hidden={!videt}
      className={cn(
        "safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/97 shadow-[0_-8px_24px_rgba(37,30,25,0.08)] backdrop-blur-md transition-transform duration-200 sm:hidden",
        videt ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-ink-muted">
            {vysledek.bezVyzivneho
              ? "Výživné podle tabulky"
              : `Výživné · platí rodič ${vysledek.platce === "a" ? "A" : "B"}`}
          </p>
          <p className="tnum font-display text-2xl font-semibold leading-tight text-ink">
            {vysledek.bezVyzivneho ? (
              "Bez výživného"
            ) : (
              <>
                {kc(vysledek.castka)}
                <span className="ml-1 font-sans text-sm font-normal text-ink-muted">/ měs.</span>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={dolu}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 text-[0.9375rem] font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
        >
          Co s tím dál
          <ArrowDown size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}

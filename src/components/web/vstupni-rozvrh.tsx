"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/format";
import { zmer } from "@/lib/mereni";
import { ZKUSEBNI_SLIB } from "@/lib/tarify";
import {
  RYTMY,
  nahledCtyrTydnu,
  planZVolby,
  type Kdo,
  type NahledRozvrhu,
  type Rytmus,
} from "@/lib/rozvrh-nahled";
import { OdkazMereny } from "./odkaz-mereny";

const DNY = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

const STRANY: { id: Kdo; nazev: string }[] = [
  { id: "ja", nazev: "U mě" },
  { id: "druhy", nazev: "U druhého rodiče" },
];

/**
 * Náhled rozpisu na vstupní stránce z reklamy — a jediná akce stránky.
 *
 * Dvě otázky, hned celý měsíc v barvách obou domácností, a tlačítko, které
 * rozpis uloží a pustí člověka do aplikace, kde už na něj čeká. Kalendář je
 * nejsilnější argument, jaký máme: člověk nevidí naše tvrzení, ale svůj
 * vlastní týden.
 *
 * Obsah mezi horní a spodní výzvou dostává stránka jako `children`, aby
 * obě tlačítka ukládala tentýž rozpis, který je nahoře naklikaný.
 */
export function VstupniRozvrh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [rytmus, setRytmus] = React.useState<Rytmus>("tyden");
  const [kdo, setKdo] = React.useState<Kdo>("ja");
  const [busy, setBusy] = React.useState(false);
  const [chyba, setChyba] = React.useState<string | null>(null);

  // Dnešek až v prohlížeči. Stránka se vykresluje předem při sestavení,
  // a kalendář počítaný na serveru by ukazoval den, kdy se sestavovala.
  const [dnes, setDnes] = React.useState<Date | null>(null);
  React.useEffect(() => setDnes(new Date()), []);

  const plan = React.useMemo(() => (dnes ? planZVolby(rytmus, kdo, dnes) : null), [rytmus, kdo, dnes]);
  const nahled = React.useMemo(() => (plan && dnes ? nahledCtyrTydnu(plan, dnes) : null), [plan, dnes]);
  const otazka = RYTMY.find((r) => r.id === rytmus)?.otazka ?? "";

  // První volba = člověk si rozpis naklikal. Pro Facebook je to „Lead",
  // podle kterého se reklama učí, koho oslovovat.
  const [zacal, setZacal] = React.useState(false);
  const nahlasZadani = () => {
    if (zacal) return;
    setZacal(true);
    zmer("rozvrh-zadani");
  };

  async function uloz() {
    if (busy || !plan) return;
    // Měří se klik, ne úspěch — neúspěšný klik je člověk, který chtěl.
    zmer("rozvrh-ulozit");
    setBusy(true);
    setChyba(null);

    try {
      const zdroj = new URLSearchParams(window.location.search).get("utm_source");
      const odpoved = await fetch("/api/kalkulacka", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vstup: plan, email: null, souhlasMarketing: false, zdroj }),
      });
      const data = await odpoved.json().catch(() => null);
      if (!odpoved.ok || !data?.token) {
        setChyba(data?.error ?? "Uložení se nepovedlo. Zkuste to prosím znovu.");
        setBusy(false);
        return;
      }
      // Registrace a po ní průvodce, který si rozpis vyzvedne podle tokenu.
      const cil = `/vitejte?plan=${encodeURIComponent(data.token)}`;
      router.push(`/registrace?dal=${encodeURIComponent(cil)}`);
    } catch {
      setChyba("Nejsme online. Zkuste to prosím znovu.");
      setBusy(false);
    }
  }

  // Tlačítko u spodního okraje na telefonu. Na menších telefonech je hlavní
  // tlačítko pod první obrazovkou, a kdo nedoroluje, neví, co dál.
  const horni = React.useRef<HTMLDivElement>(null);
  const dolni = React.useRef<HTMLDivElement>(null);
  const [tlacitkoVidet, setTlacitkoVidet] = React.useState(true);
  React.useEffect(() => {
    const prvky = [horni.current, dolni.current].filter((p): p is HTMLDivElement => p !== null);
    if (prvky.length === 0 || typeof IntersectionObserver === "undefined") return;
    const videt = new Map<Element, boolean>();
    const hlidac = new IntersectionObserver((zaznamy) => {
      for (const z of zaznamy) videt.set(z.target, z.isIntersecting);
      setTlacitkoVidet([...videt.values()].some(Boolean));
    });
    prvky.forEach((p) => hlidac.observe(p));
    return () => hlidac.disconnect();
  }, []);
  const listaVidet = !tlacitkoVidet && plan !== null;

  const tlacitko = (popisek: string) => (
    <button
      type="button"
      onClick={uloz}
      disabled={busy || !plan}
      className="inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-[1.0625rem] font-semibold text-brand-ink transition-colors hover:bg-brand-hover disabled:cursor-progress disabled:opacity-60 sm:w-auto"
    >
      {busy ? "Ukládám…" : popisek}
      {busy ? null : <ArrowRight size={18} aria-hidden />}
    </button>
  );

  return (
    <>
      <section id="rozvrh" className="card scroll-mt-4 p-4 sm:p-6" aria-label="Váš rozpis">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-ink">Jak se střídáte?</legend>
          <div className="grid grid-cols-3 gap-1.5">
            {RYTMY.map((r) => (
              <Dlazdice
                key={r.id}
                name="rytmus"
                vybrano={rytmus === r.id}
                onVyber={() => {
                  nahlasZadani();
                  setRytmus(r.id);
                }}
                nazev={r.nazev}
                popis={r.popis}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-semibold text-ink">{otazka}</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {STRANY.map((s) => (
              <Dlazdice
                key={s.id}
                name="kdo"
                vybrano={kdo === s.id}
                onVyber={() => {
                  nahlasZadani();
                  setKdo(s.id);
                }}
                nazev={s.nazev}
                strana={s.id === "ja" ? "a" : "b"}
              />
            ))}
          </div>
        </fieldset>

        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
              Příští čtyři týdny
            </h2>
            <span className="flex items-center gap-3 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-parent-a" aria-hidden />U vás
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-parent-b" aria-hidden />U druhého
              </span>
            </span>
          </div>
          <Kalendar nahled={nahled} />
          <p className="tnum mt-2 text-sm text-ink" aria-live="polite">
            {nahled ? (
              <>
                Za čtyři týdny <strong>{nahled.nociJa} nocí u vás</strong> a{" "}
                <strong>{nahled.nociDruhy} u druhého rodiče</strong>.
              </>
            ) : (
              " "
            )}
          </p>
        </div>

        {chyba ? <p className="mt-3 text-sm text-danger">{chyba}</p> : null}
        <div ref={horni} className="mt-3">{tlacitko("Uložit do Klidoo zdarma")}</div>
        <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-ink-muted">
          {ZKUSEBNI_SLIB.dni} dní zdarma se všemi funkcemi, bez karty. Druhý rodič v ceně.
          Rozpis na vás v aplikaci počká.
        </p>
        {/* Vedlejší cesta až za hlavní akcí: kdo se střídá neobvykle, ten
            ji najde, a nikomu jinému nestojí mezi kalendářem a tlačítkem. */}
        <OdkazMereny
          href="/kalkulacka"
          udalost="rozvrh-jinak"
          className="mt-3 inline-block text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          Střídáte se jinak? Nastavte si rozpis po dnech
        </OdkazMereny>
      </section>

      {children}

      <section className="mt-12 rounded-3xl border border-line bg-surface p-6 text-center sm:p-8">
        <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink">
          Rozpis máte naklikaný. Stačí ho uložit.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[0.95rem] leading-relaxed text-ink-muted">
          Po registraci ho najdete v kalendáři a můžete pozvat druhého rodiče.
        </p>
        <div ref={dolni} className="mt-5">{tlacitko("Uložit rozpis a vyzkoušet")}</div>
      </section>

      <div
        inert={!listaVidet}
        aria-hidden={!listaVidet}
        className={cn(
          "safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/97 px-5 py-3 shadow-[0_-8px_24px_rgba(37,30,25,0.08)] backdrop-blur-md transition-transform duration-200 sm:hidden",
          listaVidet ? "translate-y-0" : "translate-y-full",
        )}
      >
        {tlacitko("Uložit do Klidoo zdarma")}
      </div>
    </>
  );
}

/**
 * Volba jako dlaždice. Pod ní je skutečný přepínač, takže funguje šipkami
 * i se čtečkou obrazovky; dlaždice je jen jeho viditelná podoba.
 */
function Dlazdice({
  name,
  vybrano,
  onVyber,
  nazev,
  popis,
  strana,
}: {
  name: string;
  vybrano: boolean;
  onVyber: () => void;
  nazev: string;
  popis?: string;
  strana?: "a" | "b";
}) {
  return (
    <label className="block cursor-pointer">
      <input
        type="radio"
        name={name}
        checked={vybrano}
        onChange={onVyber}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex min-h-12 flex-col items-center justify-center rounded-xl border px-1.5 py-1.5 text-center transition-colors",
          "border-line-strong bg-surface text-ink hover:bg-surface-2",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40",
          vybrano &&
            (strana === "b"
              ? "border-parent-b bg-parent-b-bg"
              : strana === "a"
                ? "border-parent-a bg-parent-a-bg"
                : "border-brand bg-brand-soft"),
        )}
      >
        <span className={cn("text-sm", vybrano ? "font-semibold" : "font-medium")}>{nazev}</span>
        {popis ? <span className="text-xs text-ink-muted">{popis}</span> : null}
      </span>
    </label>
  );
}

/**
 * Čtyři týdny po řádcích, dny v barvě domácnosti, dnešek orámovaný.
 *
 * Než prohlížeč zná dnešní datum, kreslí se prázdná mřížka stejné výšky —
 * aby stránka při dopočítání neposkočila.
 */
function Kalendar({ nahled }: { nahled: NahledRozvrhu | null }) {
  return (
    <div className="mt-3" role="grid" aria-label="Rozpis na příští čtyři týdny">
      <div className="grid grid-cols-7 gap-1 pb-1" role="row">
        {DNY.map((d) => (
          <span key={d} role="columnheader" className="text-center text-xs font-medium text-ink-muted">
            {d}
          </span>
        ))}
      </div>
      <div className="space-y-1">
        {(nahled?.tydny ?? Array.from({ length: 4 }, () => Array.from({ length: 7 }, () => null))).map(
          (tyden, t) => (
            <div key={t} className="grid grid-cols-7 gap-1" role="row">
              {tyden.map((den, i) =>
                den ? (
                  <span
                    key={den.klic}
                    role="gridcell"
                    aria-label={`${den.datum.getDate()}. ${den.datum.getMonth() + 1}., ${den.strana === "a" ? "u vás" : "u druhého rodiče"}${den.dnes ? ", dnes" : ""}`}
                    className={cn(
                      "tnum flex h-9 flex-col items-center justify-center rounded-lg text-sm font-medium",
                      den.strana === "a" ? "bg-parent-a-bg text-parent-a-text" : "bg-parent-b-bg text-parent-b-text",
                      den.dnes && "ring-2 ring-ink ring-offset-1 ring-offset-surface",
                    )}
                  >
                    {den.datum.getDate()}
                    {den.datum.getDate() === 1 ? (
                      <span className="-mt-1 text-[0.625rem] font-normal">
                        {den.datum.toLocaleDateString("cs-CZ", { month: "short" })}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span key={i} className="h-9 rounded-lg bg-surface-2" aria-hidden />
                ),
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

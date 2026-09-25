"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { zmer } from "@/lib/mereni";
import { rozvrhZPece } from "@/lib/vyzivne-plan";
import { spocitejVyzivne, type VyzivneVstup } from "@/lib/vyzivne";
import { ZKUSEBNI_DNI } from "@/lib/tarify";

/**
 * Věta o tom, co se do aplikace přenese — přesně podle toho, co se
 * z tohohle zadání přenést dá. Slibovat rozvrh u péče 60/40, pro kterou
 * aplikace žádný vzor nemá, by byl slib, který se nesplní.
 */
function coSePrenese(rozvrh: boolean, vyzivne: boolean): string {
  if (rozvrh && vyzivne) return "Děti, rozvrh péče i výživné se přenesou";
  if (rozvrh) return "Děti i rozvrh péče se přenesou";
  if (vyzivne) return "Děti i výživné se přenesou";
  return "Děti se přenesou";
}

/**
 * Přenesení výpočtu do aplikace — levá větev rozcestí pod výsledkem.
 *
 * Pro toho, kdo se o děti už střídá: potřebuje kalendář teď a dostane
 * účet, ve kterém je rozvrh péče, výživné jako opakovaná položka a místo
 * pro druhého rodiče. Tlačítko je hned pod nadpisem, aby bylo v jednom
 * pohledu s částkou; vysvětlivky jsou až pod ním pro toho, kdo váhá.
 *
 * Výpočet se uloží PŘED odchodem na registraci, protože po přesměrování
 * je stav komponenty pryč. Token putuje v adrese, takže přežije i
 * potvrzovací e-mail a přihlášení přes Google.
 */
export function VyzivnePokracovat({ vstup }: { vstup: VyzivneVstup }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [chyba, setChyba] = React.useState<string | null>(null);

  const vysledek = React.useMemo(() => spocitejVyzivne(vstup), [vstup]);
  const rozvrh = rozvrhZPece(vstup.peceA) !== null;
  const maCastku = !vysledek.bezVyzivneho && vysledek.castka > 0;

  /**
   * Doscrolloval k nabídce vůbec někdo?
   *
   * Bez tohohle se nedá rozlišit „nabídku viděl a nezaujala ho" od
   * „nikdy se k ní nedostal" — a to jsou dvě různé chyby s dvěma
   * různými opravami. Hlásí se jednou za návštěvu.
   */
  const karta = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const prvek = karta.current;
    if (!prvek || typeof IntersectionObserver === "undefined") return;

    const hlidac = new IntersectionObserver(
      (zaznamy) => {
        if (!zaznamy.some((z) => z.isIntersecting)) return;
        zmer("vyzivne-nabidka-videt");
        hlidac.disconnect();
      },
      { threshold: 0.4 },
    );
    hlidac.observe(prvek);
    return () => hlidac.disconnect();
  }, []);

  async function pokracuj() {
    if (busy) return;
    setBusy(true);
    setChyba(null);

    try {
      const zdroj = new URLSearchParams(window.location.search).get("utm_source");
      const odpoved = await fetch("/api/vyzivne/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vypocet: vstup, zdroj }),
      });

      if (!odpoved.ok) {
        const telo = await odpoved.json().catch(() => null);
        setChyba(telo?.error ?? "Nepovedlo se to. Zkuste to prosím znovu.");
        setBusy(false);
        return;
      }

      const { token } = await odpoved.json();
      zmer("vyzivne-prenos");

      // Vede to na převzetí, ne rovnou do průvodce: kdo už rodinu má,
      // by v průvodci skončil na přehledu a výpočet by se zahodil.
      const cil = `/prevzit/vyzivne?token=${encodeURIComponent(token)}`;
      router.push(`/registrace?dal=${encodeURIComponent(cil)}`);
    } catch {
      setChyba("Nejsme online. Zkuste to prosím znovu.");
      setBusy(false);
    }
  }

  return (
    <div ref={karta} className="rounded-2xl border-[1.5px] border-brand bg-surface p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-brand">
        Už se o děti střídáte
      </p>
      <h3 className="mt-1.5 font-display text-xl font-semibold leading-tight tracking-tight text-ink">
        Rozvrh, výdaje i výživné na jednom místě
      </h3>

      {chyba ? <p className="mt-3 text-sm text-danger">{chyba}</p> : null}

      <button
        type="button"
        onClick={pokracuj}
        disabled={busy}
        className="mt-4 inline-flex h-[3.125rem] w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover disabled:cursor-progress disabled:opacity-60 sm:w-auto"
      >
        {busy ? "Připravuji…" : "Vyzkoušet zdarma"}
        {busy ? null : <ArrowRight className="h-4 w-4" aria-hidden />}
      </button>

      <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-muted">
        {coSePrenese(rozvrh, maCastku)} — nic nevyplňujete znovu. {ZKUSEBNI_DNI} dní
        zdarma, bez karty. Druhý rodič v ceně. Příjmy se neukládají.
      </p>
    </div>
  );
}

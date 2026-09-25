"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Repeat, Users } from "lucide-react";
import { zmer } from "@/lib/mereni";
import { rozvrhZPece } from "@/lib/vyzivne-plan";
import { spocitejVyzivne, type VyzivneVstup } from "@/lib/vyzivne";
import { ZKUSEBNI_DNI } from "@/lib/tarify";
import { ZNACKA } from "@/lib/brand";

/**
 * Přenesení výpočtu do aplikace.
 *
 * Hlavní nabídka pod výsledkem, ne PDF. Za e-mail v políčku dostaneme
 * řádek v tabulce; tady dostaneme účet, ve kterém je rozvrh péče,
 * výživné jako opakovaná položka a místo pro druhého rodiče — a člověk
 * dostane něco, co PDF neumí: připomínku každý měsíc.
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
  const rozvrh = rozvrhZPece(vstup.peceA);
  const maCastku = !vysledek.bezVyzivneho && vysledek.castka > 0;

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
    <div ref={karta} className="card mt-4 border-brand/30 p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
        Vyzkoušejte {ZNACKA} zdarma
      </h3>
      <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-muted">
        Aplikace pro rodiče, kteří se o děti střídají — kalendář, sdílené výdaje
        a výživné na jednom místě.
      </p>

      {chyba ? <p className="mt-3 text-sm text-danger">{chyba}</p> : null}

      {/* Tlačítko je nahoře schválně: karta stojí hned pod spočítanou
          částkou, takže takhle je vidět v jednom pohledu s ní. Dole by
          za výčtem přenášených věcí bylo o obrazovku níž a spousta lidí
          by se k němu nedostala. Výčet je pod ním a slouží tomu, kdo se
          rozmýšlí, ne tomu, kdo je rozhodnutý. */}
      <button
        type="button"
        onClick={pokracuj}
        disabled={busy}
        className="mt-4 inline-flex h-[3.125rem] w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 font-semibold text-brand-ink transition-colors hover:bg-brand-hover disabled:cursor-progress disabled:opacity-60 sm:w-auto"
      >
        {busy ? "Připravuji…" : "Vyzkoušet zdarma"}
        {busy ? null : <ArrowRight className="h-4 w-4" aria-hidden />}
      </button>

      <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-muted">
        Co jste tu naklikali, se přenese, takže nemusíte nic vyplňovat znovu:
      </p>

      <ul className="mt-3 space-y-2.5">
        <Polozka ikona={<Users className="h-4 w-4" aria-hidden />}>
          {vstup.deti.length === 1 ? "Dítě i jeho etapa" : `${vstup.deti.length} děti i jejich etapy`}
        </Polozka>
        {rozvrh ? (
          <Polozka ikona={<CalendarDays className="h-4 w-4" aria-hidden />}>
            Rozvrh péče podle podílu {vstup.peceA} / {100 - vstup.peceA}
          </Polozka>
        ) : null}
        {maCastku ? (
          <Polozka ikona={<Repeat className="h-4 w-4" aria-hidden />}>
            Výživné jako opakovaná položka — každý měsíc připomene, že se má poslat
          </Polozka>
        ) : null}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-ink-subtle">
        {ZKUSEBNI_DNI} dní zdarma se všemi funkcemi, bez zadávání karty — nic se samo
        nestrhne. Druhý rodič má přístup v ceně. Příjmy se nikam neukládají; přenáší
        se jen etapy dětí, podíl péče a spočítaná částka.
      </p>
    </div>
  );
}

function Polozka({ ikona, children }: { ikona: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[0.95rem] text-ink">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        {ikona}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

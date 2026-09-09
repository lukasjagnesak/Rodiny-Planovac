"use client";

import * as React from "react";
import { Check, Download, Plus, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/format";
import { zmer } from "@/lib/mereni";
import {
  jeApple,
  jeSpustenaJakoAplikace,
  zpusobInstalace,
  type ZpusobInstalace,
} from "@/lib/instalace";

/** Výzva od Chromu, kterou zachytává skript v `app/layout.tsx`. */
interface Vyzva {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __klidooVyzva: Vyzva | null;
  }
}

/**
 * Zjistí, jestli a jak se dá Klidoo přidat na plochu.
 *
 * Vrací `null`, dokud se to neví — na serveru totiž nejde poznat nic
 * z toho, na čem to závisí, a nabídka, která po načtení stránky
 * poskočí, je horší než nabídka, která se ukáže o vteřinu později.
 */
function useZpusob(): {
  zpusob: ZpusobInstalace | null;
  vyzva: Vyzva | null;
  jakoAplikace: boolean;
} {
  const [stav, setStav] = React.useState<{
    zpusob: ZpusobInstalace | null;
    vyzva: Vyzva | null;
    jakoAplikace: boolean;
  }>({ zpusob: null, vyzva: null, jakoAplikace: false });

  React.useEffect(() => {
    function prepocti() {
      const jakoAplikace = jeSpustenaJakoAplikace(
        window.matchMedia("(display-mode: standalone)").matches,
        (window.navigator as Navigator & { standalone?: boolean }).standalone,
      );
      const vyzva = window.__klidooVyzva;
      setStav({
        zpusob: zpusobInstalace({
          jakoAplikace,
          maVyzvu: Boolean(vyzva),
          apple: jeApple(navigator.userAgent, navigator.maxTouchPoints),
        }),
        vyzva,
        jakoAplikace,
      });
    }

    prepocti();
    // Výzva od Chromu může dorazit až po vykreslení; skript v layoutu
    // o ní dá vědět vlastní událostí.
    window.addEventListener("klidoo-instalace", prepocti);
    return () => window.removeEventListener("klidoo-instalace", prepocti);
  }, []);

  return stav;
}

/**
 * Tlačítko „Přidat na plochu".
 *
 * Na Androidu a na počítači opravdu jedno ťuknutí: přehraje se výzva,
 * kterou prohlížeč poslal, a systém se zeptá sám. Na iPhonu takový
 * způsob neexistuje — Apple `beforeinstallprompt` nikdy nezavedl —
 * takže se otevře panel s návodem. Je to nepříjemné, ale poctivější než
 * tlačítko, které by tam nic neudělalo.
 */
export function TlacitkoInstalace({
  popisek = "Přidat na plochu",
  className,
}: {
  /** V úzkém pruhu se dlouhý popisek nevejde vedle textu. */
  popisek?: string;
  className?: string;
}) {
  const { zpusob, vyzva } = useZpusob();
  const [navod, setNavod] = React.useState(false);
  const [ceka, setCeka] = React.useState(false);

  if (zpusob === null || zpusob === "nic") return null;

  async function nainstaluj() {
    if (!vyzva) return;
    setCeka(true);
    zmer("instalace-vyzva");
    try {
      await vyzva.prompt();
      const { outcome } = await vyzva.userChoice;
      if (outcome === "accepted") zmer("instalace-hotovo");
    } catch {
      // Výzvu jde přehrát jen jednou; když prohlížeč odmítne, není co
      // hlásit — tlačítko zmizí samo, protože výzva je pryč.
    }
    setCeka(false);
  }

  return (
    <>
      <Button
        className={className}
        disabled={ceka}
        onClick={() => {
          if (zpusob === "vyzva") void nainstaluj();
          else {
            zmer("instalace-navod-ios");
            setNavod(true);
          }
        }}
      >
        <Download className="h-4 w-4" />
        {popisek}
      </Button>

      <Sheet open={navod} onClose={() => setNavod(false)} title="Přidat na plochu">
        <NavodIOS />
      </Sheet>
    </>
  );
}

/**
 * Návod pro iPhone a iPad.
 *
 * Ikony jsou vykreslené, ne popsané slovy. „Ťukni na ikonu sdílení" je
 * návod pro někoho, kdo ji už zná; kdo ne, hledá ji na obrazovce plné
 * jiných ikon.
 */
function NavodIOS() {
  const kroky = [
    {
      ikona: <Share className="h-5 w-5" />,
      text: (
        <>
          Ťukni dole na <strong className="text-ink">Sdílet</strong> — čtvereček se šipkou
          nahoru.
        </>
      ),
    },
    {
      ikona: <Plus className="h-5 w-5" />,
      text: (
        <>
          V nabídce sjeď níž a vyber{" "}
          <strong className="text-ink">Přidat na plochu</strong>.
        </>
      ),
    },
    {
      ikona: <Check className="h-5 w-5" />,
      text: (
        <>
          Potvrď <strong className="text-ink">Přidat</strong>. Klidoo pak najdeš mezi
          ostatními aplikacemi.
        </>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Na iPhonu a iPadu to Apple nedovoluje udělat za tebe — jsou to tři ťuknutí a máš
        hotovo napořád.
      </p>

      <ol className="space-y-3">
        {kroky.map((krok, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              {krok.ikona}
            </span>
            <span className="pt-1.5 text-sm text-ink-muted">{krok.text}</span>
          </li>
        ))}
      </ol>

      {/* Nejčastější důvod, proč to lidem nejde: mají otevřený jiný
          prohlížeč, kde položka „Přidat na plochu" v nabídce chybí. */}
      <p className="rounded-xl bg-surface-2 p-3 text-xs text-ink-subtle">
        Když v nabídce „Přidat na plochu“ nevidíš, otevři klidoo.cz v Safari — v jiných
        prohlížečích na iPhonu tam ta položka být nemusí.
      </p>
    </div>
  );
}

/**
 * Věta o tom, jak na tom uživatel je.
 *
 * Bez ní by karta v nastavení byla u půlky lidí prázdná: tlačítko se
 * nekreslí, když aplikaci na ploše už mají, a stejně tak v prohlížeči,
 * který přidávání nepodporuje. Prázdná karta vypadá jako rozbitá
 * stránka — a ty dva důvody, proč tam tlačítko není, potřebují každý
 * jinou odpověď.
 */
export function StavInstalace() {
  const { zpusob, jakoAplikace } = useZpusob();

  if (zpusob === null || zpusob !== "nic") return null;

  return jakoAplikace ? (
    <p className="flex items-start gap-2 rounded-xl bg-success/10 p-3 text-sm text-ink-muted">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      Klidoo máš na ploše — právě teď ho takhle používáš.
    </p>
  ) : (
    <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-muted">
      Tenhle prohlížeč přidání na plochu nenabízí. Otevři klidoo.cz v Chromu na Androidu
      nebo v Safari na iPhonu a zkus to znovu.
    </p>
  );
}

const KLIC_SKRYTO = "klidoo_instalace_skryto";

/**
 * Nenápadná nabídka nahoře v aplikaci.
 *
 * Ukáže se jednou. Kdo ji odklikne, už ji neuvidí — a tlačítko zůstane
 * v nastavení, kde si ho najde, až bude chtít. Vyskakovací okno u každého
 * otevření by z aplikace pro klidnější rodičovství udělalo něco, co
 * otravuje jako všechno ostatní.
 */
export function VyzvaInstalace() {
  const { zpusob } = useZpusob();
  const [skryto, setSkryto] = React.useState(true);

  React.useEffect(() => {
    try {
      setSkryto(window.localStorage.getItem(KLIC_SKRYTO) === "1");
    } catch {
      setSkryto(false);
    }
  }, []);

  if (skryto || zpusob === null || zpusob === "nic") return null;

  function zaviri() {
    setSkryto(true);
    try {
      window.localStorage.setItem(KLIC_SKRYTO, "1");
    } catch {
      /* soukromé okno — vrátí se to, a to nevadí */
    }
  }

  return (
    <div
      className={cn(
        "mb-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3",
        // Na počítači se aplikace na plochu nepřidává, tam je to zbytečné.
        "lg:hidden",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">Klidoo na ploše</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          Otevře se jedním ťuknutím, bez hledání v prohlížeči.
        </p>
      </div>
      <TlacitkoInstalace popisek="Přidat" className="shrink-0" />
      <button
        type="button"
        onClick={zaviri}
        aria-label="Skrýt nabídku"
        className="shrink-0 rounded-lg p-1.5 text-ink-subtle hover:bg-surface-2 hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

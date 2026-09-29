/**
 * Souhlas s měřicími a marketingovými cookies.
 *
 * GA4 ani Meta Pixel se v EU nesmí spustit dřív, než člověk klikne —
 * a „klikne" znamená aktivní volbu, ne předem zaškrtnuté políčko.
 * Odmítnutí proto musí být stejně snadné jako souhlas; lišta, kde je
 * odmítnutí schované o dvě kliknutí dál, je vada, ne optimalizace.
 *
 * Vlastní anonymní měření běží nezávisle na tomhle souhlasu: neukládá
 * IP ani nic, čím by šel člověk najít, a nepoužívá cookies.
 */

const KLIC = "klidoo_souhlas";

/** Verze textu. Změna účelu = nový souhlas, starý se zahodí. */
export const VERZE_SOUHLASU = 1;

export interface Souhlas {
  verze: number;
  /** Návštěvnost přes Google Analytics. */
  analytika: boolean;
  /** Reklamní publika a měření konverzí (Google Ads, Meta). */
  marketing: boolean;
  kdy: string;
}

export const ODMITNUTO: Souhlas = {
  verze: VERZE_SOUHLASU,
  analytika: false,
  marketing: false,
  kdy: "",
};

/** `null` = člověk se zatím nerozhodl, má se ukázat lišta. */
export function prectiSouhlas(): Souhlas | null {
  if (typeof window === "undefined") return null;

  try {
    const ulozeny = window.localStorage.getItem(KLIC);
    if (!ulozeny) return null;

    const rozbaleny = JSON.parse(ulozeny) as Partial<Souhlas>;
    if (rozbaleny.verze !== VERZE_SOUHLASU) return null;

    return {
      verze: VERZE_SOUHLASU,
      analytika: Boolean(rozbaleny.analytika),
      marketing: Boolean(rozbaleny.marketing),
      kdy: typeof rozbaleny.kdy === "string" ? rozbaleny.kdy : "",
    };
  } catch {
    // Soukromé okno nebo zakázané úložiště — bereme jako nerozhodnuto
    // a nic se nespustí.
    return null;
  }
}

export function ulozSouhlas(volba: { analytika: boolean; marketing: boolean }): Souhlas {
  const souhlas: Souhlas = {
    verze: VERZE_SOUHLASU,
    analytika: volba.analytika,
    marketing: volba.marketing,
    kdy: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(KLIC, JSON.stringify(souhlas));
  } catch {
    // Nevadí: bez uložení se lištra ukáže znovu, ale nic se nespustí.
  }

  window.dispatchEvent(new CustomEvent("klidoo-souhlas", { detail: souhlas }));
  return souhlas;
}

/** Odvolání souhlasu — odkaz v zásadách ochrany údajů. */
export function zapomenSouhlas(): void {
  try {
    window.localStorage.removeItem(KLIC);
  } catch {
    /* nevadí */
  }
  window.dispatchEvent(new CustomEvent("klidoo-souhlas", { detail: null }));
}

/**
 * Google Analytics 4 a Meta Pixel.
 *
 * Obojí se načítá až po souhlasu. Do té doby se v Googlu nastaví
 * Consent Mode v2 na „denied", takže gtag existuje, ale nic neposílá —
 * bez toho Google Ads pro evropský provoz odmítne měřit konverze úplně.
 *
 * ID se čtou z prostředí. Když chybí, celý blok mlčí a aplikace o tom
 * neví; vývoj ani náhled se tím nemá zdržovat.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: (...args: unknown[]) => void; push?: unknown };
    _fbq?: unknown;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

/**
 * Consent Mode v2 — musí se nastavit dřív, než se načte gtag.js,
 * jinak Google prvních pár událostí vyhodnotí podle výchozího stavu
 * (a ten je pro EU „povoleno", což nechceme).
 */
export function pripravConsentMode(): void {
  if (typeof window === "undefined" || !GA_ID) return;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer!.push(args);
    };
  }

  window.gtag!("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500,
  });
}

export function aktualizujConsentMode(volba: { analytika: boolean; marketing: boolean }): void {
  if (typeof window === "undefined" || !window.gtag) return;

  window.gtag("consent", "update", {
    ad_storage: volba.marketing ? "granted" : "denied",
    ad_user_data: volba.marketing ? "granted" : "denied",
    ad_personalization: volba.marketing ? "granted" : "denied",
    analytics_storage: volba.analytika ? "granted" : "denied",
  });
}

/** Načte skript jen jednou, i kdyby se volalo víckrát. */
function nactiSkript(id: string, src: string, pred?: () => void): void {
  if (document.getElementById(id)) return;
  pred?.();

  const skript = document.createElement("script");
  skript.id = id;
  skript.async = true;
  skript.src = src;
  document.head.appendChild(skript);
}

export function nactiGoogleAnalytics(): void {
  if (!GA_ID) return;

  nactiSkript("ga4", `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer!.push(args);
    };
  }

  window.gtag!("js", new Date());
  // IP se anonymizuje na straně Googlu; ukládat celou nepotřebujeme
  // a u tohohle publika ani nechceme.
  window.gtag!("config", GA_ID, { anonymize_ip: true });
}

export function nactiMetaPixel(): void {
  if (!META_PIXEL_ID || window.fbq) return;

  // Fronta, kterou Meta čeká, než doběhne její vlastní skript.
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  } as NonNullable<Window["fbq"]>;

  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;

  nactiSkript("meta-pixel", "https://connect.facebook.net/en_US/fbevents.js");

  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");
}

/** Zobrazení stránky — GA si ho při přechodu mezi stránkami nevšimne samo. */
export function marketingZobrazeni(cesta: string): void {
  if (typeof window === "undefined") return;
  if (window.gtag && GA_ID) window.gtag("event", "page_view", { page_path: cesta });
  if (window.fbq) window.fbq("track", "PageView");
}

/** Převod našich kroků trychtýře na jazyk, kterému rozumí reklamní systémy. */
const UDALOSTI: Record<string, { ga: string; meta: string | null }> = {
  kalkulacka: { ga: "kalkulacka_dokoncena", meta: "Lead" },
  lead: { ga: "generate_lead", meta: "Lead" },
  registrace: { ga: "sign_up", meta: "CompleteRegistration" },
  rodina: { ga: "rodina_zalozena", meta: "StartTrial" },
  druhy_rodic: { ga: "druhy_rodic_pripojen", meta: null },
  predplatne: { ga: "purchase", meta: "Purchase" },
};

export function marketingUdalost(
  druh: string,
  parametry: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;

  const mapa = UDALOSTI[druh];
  if (!mapa) return;

  if (window.gtag && GA_ID) window.gtag("event", mapa.ga, parametry);
  if (window.fbq && mapa.meta) window.fbq("track", mapa.meta, parametry);
}

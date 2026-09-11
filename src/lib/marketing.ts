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
 * Google Ads.
 *
 * Měření v GA4 na kampaň nestačí. Google Ads potřebuje vlastní
 * konverzní značku, jinak v rozhraní u každého klíčového slova svítí
 * nula a nedá se poznat, který dotaz vede k platící rodině — tedy to
 * jediné, kvůli čemu se reklama pouští.
 *
 * Štítek je u každé konverze jiný a vzniká až tím, že se konverze
 * v Google Ads založí. Proto jsou v prostředí zvlášť: bez štítku se
 * konverze prostě neposílá a nic se nerozbije.
 *
 * Čte se to takhle doslova schválně — sestavovač nahrazuje jen zapsané
 * `process.env.NEXT_PUBLIC_…`, přes proměnnou by v prohlížeči zbylo
 * `undefined`.
 */
export const ADS_ID = process.env.NEXT_PUBLIC_ADS_ID ?? "";

export const ADS_STITKY: Record<string, string> = {
  registrace: process.env.NEXT_PUBLIC_ADS_STITEK_REGISTRACE ?? "",
  rodina: process.env.NEXT_PUBLIC_ADS_STITEK_RODINA ?? "",
  predplatne: process.env.NEXT_PUBLIC_ADS_STITEK_PREDPLATNE ?? "",
};

/**
 * Cíl konverze ve tvaru, kterému rozumí gtag: `AW-123/AbC-def`.
 * `null` znamená, že se pro tenhle krok nic neposílá.
 */
export function adsCil(
  druh: string,
  id: string = ADS_ID,
  stitky: Record<string, string> = ADS_STITKY,
): string | null {
  const stitek = stitky[druh];
  if (!id || !stitek) return null;
  return `${id}/${stitek}`;
}

/** gtag musí existovat dřív, než se na něj zavolá. */
function zajistiGtag(): void {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer!.push(args);
    };
  }
}

/**
 * Consent Mode v2 — musí se nastavit dřív, než se načte gtag.js,
 * jinak Google prvních pár událostí vyhodnotí podle výchozího stavu
 * (a ten je pro EU „povoleno", což nechceme).
 *
 * Nesmí to viset na `GA_ID`. Souhlas se týká i Google Ads, a to je
 * samostatné ID: kdo měl vyplněné jen `NEXT_PUBLIC_ADS_ID`, tomu se
 * souhlas nikdy nenastavil a konverze z evropského provozu Google
 * zahodil — bez jediné chyby v konzoli.
 */
export function pripravConsentMode(): void {
  if (typeof window === "undefined") return;
  if (!GA_ID && !ADS_ID) return;

  zajistiGtag();

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
  if (typeof window === "undefined") return;
  if (!GA_ID && !ADS_ID) return;

  // Ne `if (!window.gtag) return`: fronta se dá naplnit i dřív, než
  // gtag.js doběhne, a souhlas musí být ve frontě první.
  zajistiGtag();

  window.gtag!("consent", "update", {
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
  zajistiGtag();

  window.gtag!("js", new Date());
  // IP se anonymizuje na straně Googlu; ukládat celou nepotřebujeme
  // a u tohohle publika ani nechceme.
  window.gtag!("config", GA_ID, { anonymize_ip: true });
}

/**
 * Google Ads. Načítá se na marketingový souhlas, tedy nezávisle na
 * analytice — proto si gtag.js v případě potřeby natáhne sám a nespoléhá
 * na to, že ho už načetlo GA.
 */
export function nactiGoogleAds(): void {
  if (!ADS_ID) return;

  nactiSkript("google-ads", `https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`);
  zajistiGtag();

  window.gtag!("js", new Date());
  window.gtag!("config", ADS_ID);
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

  // Google Ads chce vlastní událost s cílem, ne tu z GA4. Hodnota
  // a měna se přenášejí, takže se v kampaních dá vidět obrat, ne jen
  // počet konverzí.
  const cil = adsCil(druh);
  if (cil && window.gtag) {
    window.gtag("event", "conversion", { send_to: cil, ...parametry });
  }
}

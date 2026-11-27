/**
 * Aplikace z App Store a Google Play (obal Capacitor ve složce `mobil/`).
 *
 * Obal načítá stejný web z klidoo.cz a k hlavičce User-Agent přidává
 * `KlidooApp` (viz `mobil/capacitor.config.json`). Podle ní server
 * i prohlížeč poznají, že běží uvnitř aplikace z obchodu, a:
 *
 * - neukazují nákup, ceny ani odkazy na placení. Apple (pravidlo 3.1.3(f))
 *   i Google dovolují aplikaci bez vlastních plateb jen tehdy, když v ní
 *   není nákup ani výzva k nákupu jinde;
 * - nespouští Google Analytics, Google Ads ani Meta Pixel. Jinak by Apple
 *   vyžadoval dialog App Tracking Transparency;
 * - marketingové stránky webu přesměrují na přehled;
 * - přihlášení přes Google a Apple otevřou v systémovém prohlížeči
 *   (Google přihlášení ve webview blokuje) a vrátí se odkazem
 *   `cz.klidoo.app://auth`.
 *
 * Značka v hlavičce není bezpečnostní hranice — kdo si ji nastaví
 * v prohlížeči, jen přijde o ceník. Nic se podle ní nepovoluje.
 */

export const ZNACKA_APLIKACE = "KlidooApp";
export const SCHEMA_APLIKACE = "cz.klidoo.app";

export function jeAplikace(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent && userAgent.includes(ZNACKA_APLIKACE));
}

/** V prohlížeči: běží tahle stránka v aplikaci z obchodu? */
export function vAplikaciKlient(): boolean {
  return typeof navigator !== "undefined" && jeAplikace(navigator.userAgent);
}

/**
 * Veřejné stránky, které v aplikaci zůstávají: přihlášení, registrace
 * a právní texty (ty musí být dostupné). Ostatní marketingové stránky
 * (úvod, ceník, kalkulačky, články…) se přesměrují na přehled.
 */
const POVOLENE_VEREJNE = [
  "/prihlaseni",
  "/registrace",
  "/zasady-ochrany-osobnich-udaju",
  "/obchodni-podminky",
  "/smazani-uctu",
  "/bezpecnost",
  "/overit",
];

export function presmerovatVAplikaci(cesta: string, verejneMarketingove: (c: string) => boolean): boolean {
  if (!verejneMarketingove(cesta)) return false;
  return !POVOLENE_VEREJNE.some((p) => cesta === p || cesta.startsWith(`${p}/`));
}

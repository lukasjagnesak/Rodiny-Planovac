/**
 * Ikony Klidoo — vlastní sada pro aplikaci i web.
 *
 * Proč vlastní a ne emoji: emoji kreslí každý systém jinak (iPhone,
 * Android i Windows mají jiné obrázky), mají vlastní barvy, které se
 * neladí s paletou, a ve vážném prostředí — rozvod, děti, peníze —
 * působí jako hračka. Tyhle ikony vypadají všude stejně a berou barvu
 * z okolí (`currentColor`).
 *
 * Pravidla, ať sada drží pohromadě:
 * - mřížka 24 × 24, okraj aspoň 2 px,
 * - čára 1,75 px, kulaté konce i spoje, bez výplně,
 * - výplň jen u drobných teček (`fill="currentColor"`), nic jiného,
 * - žádné písmo uvnitř ikony.
 *
 * Nová ikona: přidat sem, zkontrolovat v katalogu /nahled-mobil/ikony
 * (vývoj) a `npm run ikony` vygeneruje i samostatné SVG do public/ikony
 * pro web, e-maily a sociální sítě. Přehled sady je v docs/ikony.md.
 *
 * Hodnota je vnitřek `<svg>` — prvky bez atributů čáry, ty dodá obal.
 */
export const IKONY = {
  // ── Události ───────────────────────────────────────────────────
  lekar:
    '<path d="M5 3h1.5v5a3.5 3.5 0 0 0 7 0V3H15"/><path d="M10 11.5v3a4.5 4.5 0 0 0 9 0V13"/><circle cx="19" cy="11" r="2"/>',
  tabule:
    '<rect x="3" y="4" width="18" height="11" rx="1.5"/><path d="M7 8.5h6M7 11.5h3.5"/><path d="M12 15v2.5M8.5 21l3.5-3.5 3.5 3.5"/>',
  stan: '<path d="M2.5 20h19"/><path d="M12 4.5 4.5 20M12 4.5 19.5 20"/><path d="M12 12.5 9.5 20M12 12.5l2.5 7.5"/><path d="M12 4.5V2.5"/>',
  autobus:
    '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M9 6.5h6"/><path d="M7.5 18v2.5M16.5 18v2.5"/><circle cx="8" cy="14.5" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="14.5" r="1" fill="currentColor" stroke="none"/>',
  fotoaparat:
    '<path d="M4 7.5h3l1.5-2.5h7L17 7.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  dort: '<path d="M3.5 20.5h17"/><path d="M5 20.5V14a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6.5"/><path d="M5 16.2c1.5 1.1 3 1.1 4.5 0s3-1.1 4.5 0 3 1.1 4.5 0"/><path d="M8.5 12V9.5M15.5 12V9.5"/><path d="M8.5 5.5c.8.7.8 1.6 0 2.2-.8-.6-.8-1.5 0-2.2zM15.5 5.5c.8.7.8 1.6 0 2.2-.8-.6-.8-1.5 0-2.2z" fill="currentColor"/>',
  prazdniny:
    '<circle cx="12" cy="9" r="3.5"/><path d="M12 2.5V4M5.5 9H4M20 9h-1.5M7.4 4.4l1 1M16.6 4.4l-1 1"/><path d="M3 17c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0"/><path d="M3 20.5c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0"/>',
  spendlik:
    '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',

  // ── Výdaje ─────────────────────────────────────────────────────
  bankovka:
    '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><circle cx="6.2" cy="9.5" r=".9" fill="currentColor" stroke="none"/><circle cx="17.8" cy="14.5" r=".9" fill="currentColor" stroke="none"/>',
  mic: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5l3.4 2.5-1.3 4h-4.2l-1.3-4z"/><path d="M12 3v4.5M20.6 9.7l-5.2.3M17.6 19.1l-3.5-5.1M6.4 19.1l3.5-5.1M3.4 9.7l5.2.3"/>',
  tricko:
    '<path d="M8 3.5 3.5 5.7 2.5 10l3 1.3v9.2h13v-9.2l3-1.3-1-4.3L16 3.5c-.6 1.6-2 2.6-4 2.6s-3.4-1-4-2.6z"/>',
  hvezda:
    '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  batoh:
    '<path d="M6 10a6 6 0 0 1 12 0v9.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.5z"/><path d="M9.5 4.6V4a2.5 2.5 0 0 1 5 0v.6"/><rect x="9" y="13.5" width="6" height="4.5" rx="1"/>',
  srdce:
    '<path d="M12 20s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/><path d="M12 10.6v5M9.5 13.1h5"/>',
  jablko:
    '<path d="M12 8c-1.6-1.1-5-1.4-6.4 1.6-1.4 3-.9 6.8 1.4 9.4 1.5 1.6 3.3 1.5 5 .7 1.7.8 3.5.9 5-.7 2.3-2.6 2.8-6.4 1.4-9.4C17 6.6 13.6 6.9 12 8z"/><path d="M12 8c0-2 .7-3.5 2.2-4.5"/>',
  letadlo: '<path d="M21 3.5 3 11l7 2.8L12.8 21z"/><path d="m10 13.8 5-5"/>',
  krabice:
    '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9"/>',

  // ── Kontakty ───────────────────────────────────────────────────
  skola:
    '<path d="M3 20.5h18"/><path d="M5 20.5V10l7-5 7 5v10.5"/><path d="M10 20.5v-5h4v5"/><circle cx="12" cy="10.5" r="1.5"/>',
  rodina:
    '<circle cx="7.5" cy="7" r="2.5"/><circle cx="16.5" cy="7" r="2.5"/><circle cx="12" cy="13" r="1.8"/><path d="M2.5 19v-1.5A3.5 3.5 0 0 1 6 14h1"/><path d="M21.5 19v-1.5A3.5 3.5 0 0 0 18 14h-1"/><path d="M8.5 20v-.5a3.5 3.5 0 0 1 7 0v.5"/>',
  vizitka:
    '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10.5" r="2"/><path d="M5.8 15.5c.6-1.3 1.8-2 3.2-2s2.6.7 3.2 2"/><path d="M14.5 10h3.5M14.5 13.5h3.5"/>',

  // ── Doklady ────────────────────────────────────────────────────
  karta_zdravi:
    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 9.5v5M6.5 12h5"/><path d="M14.5 10h3.5M14.5 13.5h3.5"/>',
  pas: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><circle cx="12" cy="10" r="3.2"/><path d="M8.8 10h6.4"/><path d="M9 17h6"/>',
  strikacka:
    '<path d="m17.5 3 3.5 3.5M19.2 4.8l-3 3"/><path d="m13.5 5 5.5 5.5"/><path d="M16 7.5 8 15.5l-3.2.7.7-3.2 8-8"/><path d="M5.2 18.8 3 21"/><path d="M10.5 10.5l1.2 1.2M12.5 8.5l1.2 1.2"/>',
  listina:
    '<path d="M14.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/><path d="M14.5 3 19 7.5V12"/><path d="M14.5 3v4.5H19"/><path d="M8.5 11h5.5M8.5 14.5h3"/><circle cx="17" cy="16.5" r="2.5"/><path d="m15.8 18.7-.8 2.8 2-1 2 1-.8-2.8"/>',
  dokument:
    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 16.5h4"/>',

  // ── Notifikace ─────────────────────────────────────────────────
  auto: '<path d="M4.5 16.5h15v-4l-1.9-4.3A2 2 0 0 0 15.8 7H8.2a2 2 0 0 0-1.8 1.2L4.5 12.5z"/><path d="M4.5 12.5h15"/><path d="M4.5 16.5V19H7v-2.5M17 16.5V19h2.5v-2.5"/><circle cx="8" cy="14.5" r=".9" fill="currentColor" stroke="none"/><circle cx="16" cy="14.5" r=".9" fill="currentColor" stroke="none"/>',
  otaznik:
    '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2.2-2.5 3.8"/><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none"/>',
  predani: '<path d="M4 8h13.5L14 4.5"/><path d="M20 16H6.5l3.5 3.5"/>',
  zvonek:
    '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
} as const;

export type NazevIkony = keyof typeof IKONY;

export const NAZVY_IKON = Object.keys(IKONY) as NazevIkony[];

/** Samostatné SVG — pro soubory v public/ikony, e-maily a web mimo React. */
export function svgIkony(nazev: NazevIkony, velikost = 24): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${velikost}" height="${velikost}" ` +
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
    `stroke-linecap="round" stroke-linejoin="round">${IKONY[nazev]}</svg>`
  );
}

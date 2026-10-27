/**
 * Kde smí běžet měřicí skripty Googlu a Mety.
 *
 * Jen na veřejném webu: na stránkách, kam lidé přicházejí z vyhledávače
 * a z reklamy, a na přihlášení a registraci, kde vzniká konverze. Uvnitř
 * aplikace ne — tam se píšou jména dětí, zprávy druhému rodiči a výdaje,
 * a Meta Pixel umí sám od sebe číst formuláře na stránce. Rodič, který
 * nám svěřil tohle, nemá mít v aplikaci reklamní kód. Ani se souhlasem.
 *
 * Vlastní měření (`/api/t`) jede dál všude — zůstává u nás a neposílá
 * nic třetí straně.
 *
 * Seznam je **povolený**, ne zakázaný: nová stránka aplikace je bez
 * měření sama od sebe, dokud ji sem někdo vědomě nepřidá. Test
 * `mereni-hranice` hlídá, že sedí s tím, co je ve veřejných skupinách.
 */
export const CESTY_S_MERENIM = [
  "/",
  "/jak-funguje-stridava-pece",
  "/vzor-dohody-o-stridave-peci",
  "/kalkulacka-vyzivneho",
  "/kalkulacka",
  "/vyzkouset",
  "/cenik",
  "/clanky",
  "/dekujeme",
  "/checklist-prvnich-30-dni",
  "/pro-advokaty",
  "/pro-mediatory",
  "/pro-ospod-a-soudy",
  "/bezpecnost",
  "/zasady-ochrany-osobnich-udaju",
  "/obchodni-podminky",
  "/prihlaseni",
  "/registrace",
];

export function smiMerit(cesta: string): boolean {
  return CESTY_S_MERENIM.some((c) =>
    c === "/" ? cesta === "/" : cesta === c || cesta.startsWith(`${c}/`),
  );
}

/** `id` prvků `<script>`, které měření vkládá do stránky. */
export const MERICI_SKRIPTY = ["ga4", "google-ads", "meta-pixel"];

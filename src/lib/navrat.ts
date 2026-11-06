/**
 * Kam člověka pustit po přihlášení.
 *
 * Cíl chodí v adrese (`?dal=…`), takže do něj může kdokoli napsat
 * cokoli. Pustit dál se smí jedině cesta na našem webu — jinak by
 * z přihlašovací stránky šlo udělat odrazový můstek na cizí web,
 * který vypadá, že přišel od nás.
 *
 * `//zlo.example` je v prohlížeči plnohodnotná adresa jinam, přestože
 * lomítkem začíná. Proto se dvojité lomítko vyřazuje zvlášť.
 */
export function bezpecnyCil(cil: string | null | undefined, vychozi: string): string {
  if (!cil) return vychozi;
  if (!cil.startsWith("/")) return vychozi;
  if (cil.startsWith("//")) return vychozi;
  // `/\` některé prohlížeče přečtou stejně jako `//`.
  if (cil.startsWith("/\\")) return vychozi;
  return cil;
}

/**
 * Kam poslat nepřihlášeného návštěvníka.
 *
 * Do `dal` patří cesta **i s dotazem**. Bez něj se ztratí všechno, co
 * v adrese neslo stav — třeba token odloženého výpočtu z kalkulačky.
 * A protože se adresa klonuje z té původní, musí se dotaz napřed
 * vymazat: jinak na přihlašovací stránce zůstanou viset cizí parametry
 * a `dal` přesto ukazuje na holou cestu.
 */
export function odkazNaPrihlaseni(adresa: URL): URL {
  const cil = `${adresa.pathname}${adresa.search}`;
  const url = new URL(adresa);
  url.pathname = "/prihlaseni";
  url.search = "";
  url.searchParams.set("dal", cil);
  return url;
}

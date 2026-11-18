import { type NextRequest } from "next/server";
import { SCHEMA_APLIKACE } from "@/lib/nativni";

/**
 * Návrat z přihlášení (Google, Apple, potvrzení e-mailu) do aplikace
 * z obchodu.
 *
 * Přihlášení proběhlo v systémovém prohlížeči, který o session ve webview
 * aplikace nic neví. Tahle stránka jen předá parametry (`code`, `dal`,
 * případnou chybu) zpět do aplikace odkazem `cz.klidoo.app://auth?…`.
 * Kód vymění až webview na `/auth/callback` — jen ono má PKCE ověřovač,
 * takže samotný kód v odkazu nikomu jinému k ničemu není.
 *
 * Proč stránka s tlačítkem, a ne rovnou přesměrování: Safari i Chrome
 * otevření jiné aplikace bez kliknutí občas zablokují. Skript to zkusí
 * sám, tlačítko je pojistka.
 */
const POVOLENE = ["code", "dal", "error", "error_code", "error_description"];

export function GET(request: NextRequest) {
  const vstup = request.nextUrl.searchParams;
  const ven = new URLSearchParams();
  for (const k of POVOLENE) {
    const v = vstup.get(k);
    if (v) ven.set(k, v.slice(0, 500));
  }
  const odkaz = `${SCHEMA_APLIKACE}://auth?${ven.toString()}`;
  const html = `<!doctype html>
<html lang="cs"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Návrat do aplikace Klidoo</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#fdf7f0;color:#2b2521;font:16px/1.5 system-ui,-apple-system,sans-serif;text-align:center;padding:1.5rem}
a{display:inline-block;margin-top:1rem;border-radius:12px;background:#2c8671;color:#fff;font-weight:600;padding:.8rem 1.5rem;text-decoration:none}</style>
</head><body><div>
<p>Přihlášení proběhlo. Vracíme vás do aplikace Klidoo.</p>
<a id="zpet" href="${odkaz.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">Otevřít aplikaci</a>
</div><script>location.replace(document.getElementById("zpet").href)</script></body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      // Jediný skript je ten vložený výš; nic dalšího se tu načítat nesmí.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
    },
  });
}

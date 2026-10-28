/**
 * Content-Security-Policy: přísná v aplikaci, se seznamem adres na webu.
 *
 * Spouští se přes `npm run test:csp`.
 */
const crypto = require("node:crypto");
const { sestavCsp, novyNonce, otiskSkriptu } = require("../.test-build/lib/csp.js");

let selhalo = 0;
function ok(popis, podminka) {
  console.log((podminka ? "  ✓ " : "  ✗ ") + popis);
  if (!podminka) selhalo++;
}

function pravidla(csp) {
  return Object.fromEntries(
    csp.split("; ").map((p) => {
      const [k, ...v] = p.split(" ");
      return [k, v];
    }),
  );
}

const SB = "https://abcdefgh.supabase.co";

(async () => {
  console.log("── aplikace ──");
  const app = pravidla(sestavCsp({ nonce: "N0nce==", otisky: ["sha256-abc"], supabase: SB }));
  ok("skript jen s nonce", app["script-src"].includes("'nonce-N0nce=='"));
  ok("vlastní skripty otiskem", app["script-src"].includes("'sha256-abc'"));
  ok("strict-dynamic", app["script-src"].includes("'strict-dynamic'"));
  ok("žádné unsafe-inline ve skriptech", !app["script-src"].includes("'unsafe-inline'"));
  ok("žádné unsafe-eval mimo vývoj", !app["script-src"].includes("'unsafe-eval'"));
  ok("žádný Google ani Meta ve skriptech", !app["script-src"].some((z) => /google|facebook/.test(z)));
  ok("data jen k nám a do Supabase", JSON.stringify(app["connect-src"]) === JSON.stringify(["'self'", SB, "wss://abcdefgh.supabase.co"]));
  ok("obrázky ze Supabase", app["img-src"].includes(SB));
  ok("žádné pluginy", app["object-src"][0] === "'none'");
  ok("base-uri jen naše", app["base-uri"][0] === "'self'");
  ok("nikdo cizí nás nevloží do rámu", app["frame-ancestors"].join() === "'self'");
  ok("formuláře jen k nám", app["form-action"].join() === "'self'");
  ok("https vynucené", "upgrade-insecure-requests" in app);

  console.log("── veřejný web ──");
  const web = pravidla(sestavCsp({ supabase: SB }));
  ok("bez nonce", !web["script-src"].some((z) => z.startsWith("'nonce-")));
  ok("gtag smí", web["script-src"].includes("https://www.googletagmanager.com"));
  ok("Pixel smí", web["script-src"].includes("https://connect.facebook.net"));
  ok("GA smí posílat", web["connect-src"].includes("https://*.google-analytics.com"));
  ok("žádná hvězdička na všechno", !Object.values(web).flat().some((z) => z === "*" || z === "https:"));

  console.log("── vývoj ──");
  const dev = pravidla(sestavCsp({ nonce: "x", supabase: "http://127.0.0.1:54321", vyvoj: true }));
  ok("eval jen ve vývoji", dev["script-src"].includes("'unsafe-eval'"));
  ok("místní Supabase přes ws", dev["connect-src"].includes("ws://127.0.0.1:54321"));
  ok("bez upgrade-insecure-requests", !("upgrade-insecure-requests" in dev));

  console.log("── rozbitá adresa Supabase ──");
  ok("nespadne", typeof sestavCsp({ nonce: "x", supabase: "\"nesmysl" }) === "string");

  console.log("── nonce a otisk ──");
  const a = novyNonce();
  ok("nonce má 16 bajtů", Buffer.from(a, "base64").length === 16);
  ok("pokaždé jiný", a !== novyNonce());
  const text = "\n(function(){})();\n";
  const ocekavany = "sha256-" + crypto.createHash("sha256").update(text).digest("base64");
  ok("otisk sedí s tím, co počítá prohlížeč", (await otiskSkriptu(text)) === ocekavany);

  console.log(selhalo === 0 ? "\nVšechno prošlo." : `\n${selhalo} selhalo.`);
  process.exit(selhalo === 0 ? 0 : 1);
})();

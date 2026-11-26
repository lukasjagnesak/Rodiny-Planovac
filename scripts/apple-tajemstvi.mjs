/**
 * Tajemství (client secret) pro přihlášení přes Apple v Supabase.
 *
 * Apple místo hesla chce JWT podepsaný vaším klíčem .p8. Platí nejvýš
 * 6 měsíců — pak ho vygenerujte znovu a vložte do Supabase.
 * Spouští se jen u vás na počítači, klíč nikam neodchází:
 *
 *   node scripts/apple-tajemstvi.mjs ~/Downloads/AuthKey_XXXXXXXXXX.p8 <TEAM_ID> <KEY_ID> cz.klidoo.web
 */
import { readFileSync } from "node:fs";
import { createPrivateKey, sign } from "node:crypto";

const [cesta, team, klicId, klient = "cz.klidoo.web"] = process.argv.slice(2);
if (!cesta || !/^[A-Z0-9]{10}$/.test(team ?? "") || !/^[A-Z0-9]{10}$/.test(klicId ?? "")) {
  console.error("Použití: node scripts/apple-tajemstvi.mjs <AuthKey.p8> <TEAM_ID> <KEY_ID> [cz.klidoo.web]");
  console.error("TEAM_ID a KEY_ID mají 10 znaků (velká písmena a číslice).");
  process.exit(1);
}

const b64u = (v) => Buffer.from(v).toString("base64url");
const ted = Math.floor(Date.now() / 1000);
const PLATNOST_DNI = 180; // Apple povoluje nejvýš 6 měsíců

const hlavicka = b64u(JSON.stringify({ alg: "ES256", kid: klicId }));
const obsah = b64u(
  JSON.stringify({
    iss: team,
    iat: ted,
    exp: ted + PLATNOST_DNI * 24 * 60 * 60,
    aud: "https://appleid.apple.com",
    sub: klient,
  }),
);
const podpis = sign("sha256", Buffer.from(`${hlavicka}.${obsah}`), {
  key: createPrivateKey(readFileSync(cesta, "utf8")),
  dsaEncoding: "ieee-p1363",
});

const vyprsi = new Date((ted + PLATNOST_DNI * 86400) * 1000).toLocaleDateString("cs-CZ");
console.log(`${hlavicka}.${obsah}.${b64u(podpis)}`);
console.error(`\nPlatí do ${vyprsi}. Před tímto datem vygenerujte nové a vložte do Supabase.`);

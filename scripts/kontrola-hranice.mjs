/**
 * Hledá volání funkce z klientského modulu v serverovém kódu.
 *
 * Modul označený `"use client"` se ze serverové komponenty nedá volat —
 * import i sestavení projdou a stránka spadne až v prohlížeči. Takhle
 * se rozbil souhrn pro soud a `curl` to neodhalil, protože stránka je
 * za přihlášením.
 *
 * Komponenty se nehlásí: ty se ze serveru vykreslovat smí. Hlásí se
 * jenom to, co se volá jako funkce.
 */
import fs from "node:fs";
import path from "node:path";

const KOREN = "src";

function soubory(adresar) {
  return fs.readdirSync(adresar, { withFileTypes: true }).flatMap((p) => {
    const cesta = path.join(adresar, p.name);
    if (p.isDirectory()) return soubory(cesta);
    return /\.tsx?$/.test(p.name) ? [cesta] : [];
  });
}

const vsechny = soubory(KOREN);
const klientske = new Set(
  vsechny.filter((c) => /^\s*["']use client["']/.test(fs.readFileSync(c, "utf8").slice(0, 60))),
);

function cil(imp, odkud) {
  const zaklad = imp.startsWith("@/")
    ? path.join("src", imp.slice(2))
    : imp.startsWith(".")
      ? path.normalize(path.join(path.dirname(odkud), imp))
      : null;
  if (!zaklad) return null;
  for (const p of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    if (fs.existsSync(zaklad + p)) return zaklad + p;
  }
  return null;
}

const nalezy = [];
for (const c of vsechny) {
  if (klientske.has(c)) continue;
  const s = fs.readFileSync(c, "utf8");
  for (const m of s.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
    const modul = cil(m[2], c);
    if (!modul || !klientske.has(modul)) continue;
    for (const kus of m[1].split(",")) {
      const cely = kus.trim();
      if (!cely || cely.startsWith("type ")) continue;
      const jmeno = cely.split(" as ").pop().trim();
      if (new RegExp(`\\b${jmeno}\\s*\\(`).test(s)) {
        nalezy.push(`${c}: volá ${jmeno}() z klientského modulu ${modul}`);
      }
    }
  }
}

if (nalezy.length === 0) {
  console.log("✓ Žádné volání klientské funkce ze serveru.");
  process.exit(0);
}
console.log("✗ Tohle spadne až v prohlížeči:\n");
for (const n of [...new Set(nalezy)].sort()) console.log("  " + n);
console.log("\nPřesuň sdílenou funkci do `src/lib/`.");
process.exit(1);

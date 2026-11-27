/**
 * Export všech textů, které uvidí uživatel.
 *
 * Vzniklo kvůli korektuře: opravovat texty přeskakováním po souborech
 * znamená, že se na půlku zapomene. Tenhle skript je vypíše na jedno
 * místo i s tím, kde v aplikaci jsou a čím jsou — nadpis, tlačítko,
 * zástupný text v poli, chybová hláška.
 *
 * Není to překladový systém. Je to soupis pro člověka, který má do
 * pravého sloupce dopsat, jak to má být.
 *
 *     npm run texty          # CSV do exporty/texty.csv
 *     npm run texty -- --md  # ještě čitelný přehled do exporty/texty.md
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

/* ── Kde to v aplikaci je ──────────────────────────────────────── */

/**
 * Cesta k souboru sama o sobě nikomu nic neřekne. Tohle ji přeloží na
 * místo, které jde v aplikaci najít — pořadí rozhoduje, bere se první
 * shoda.
 */
const MISTA = [
  [/^src\/app\/\(web\)\/page\.tsx/, "Web · Hlavní stránka"],
  [/^src\/app\/\(web\)\/cenik/, "Web · Ceník"],
  [/^src\/app\/\(web\)\/kalkulacka-vyzivneho/, "Web · Kalkulačka výživného"],
  [/^src\/app\/\(web\)\/kalkulacka/, "Web · Kalkulačka péče"],
  [/^src\/app\/\(web\)\/vzor-dohody/, "Web · Vzor dohody"],
  [/^src\/app\/\(web\)\/jak-funguje/, "Web · Jak funguje střídavá péče"],
  [/^src\/app\/\(web\)\/checklist/, "Web · Checklist 30 dní"],
  [/^src\/app\/\(web\)\/clanky/, "Web · Články"],
  [/^src\/app\/\(web\)\/pro-mediatory/, "Web · Pro mediátory"],
  [/^src\/app\/\(web\)\/pro-advokaty/, "Web · Pro advokáty"],
  [/^src\/app\/\(web\)\/obchodni-podminky/, "Web · Obchodní podmínky"],
  [/^src\/app\/\(web\)\/zasady/, "Web · Zásady ochrany údajů"],
  [/^src\/app\/\(web\)\/dekujeme/, "Web · Poděkování po platbě"],
  [/^src\/app\/\(web\)\/layout/, "Web · Hlavička a patička"],
  [/^src\/app\/\(auth\)\/prihlaseni/, "Přihlášení"],
  [/^src\/app\/\(auth\)\/registrace/, "Registrace"],
  [/^src\/app\/\(auth\)/, "Přihlášení a registrace"],
  [/^src\/app\/vitejte/, "Onboarding · Průvodce založením rodiny"],
  [/^src\/app\/pozvanka/, "Pozvánka druhého rodiče"],
  [/^src\/app\/partner/, "Partnerský portál"],
  [/^src\/app\/odhlasit/, "Odhlášení z e-mailů"],
  [/^src\/app\/chybi-nastaveni/, "Chyba · Chybí nastavení"],
  [/^src\/app\/\(app\)\/prehled/, "Aplikace · Přehled"],
  [/^src\/app\/\(app\)\/kalendar/, "Aplikace · Kalendář"],
  [/^src\/app\/\(app\)\/krouzky/, "Aplikace · Kroužky"],
  [/^src\/app\/\(app\)\/udalosti/, "Aplikace · Události"],
  [/^src\/app\/\(app\)\/vydaje/, "Aplikace · Výdaje"],
  [/^src\/app\/\(app\)\/rozvrh/, "Aplikace · Rozvrh"],
  [/^src\/app\/\(app\)\/zpravy/, "Aplikace · Zprávy"],
  [/^src\/app\/\(app\)\/souhrn/, "Aplikace · Souhrn pro soud"],
  [/^src\/app\/\(app\)\/deti/, "Aplikace · Děti a rodina"],
  [/^src\/app\/\(app\)\/oznameni/, "Aplikace · Oznámení"],
  [/^src\/app\/\(app\)\/predplatne/, "Aplikace · Předplatné"],
  [/^src\/app\/\(app\)\/provoz/, "Aplikace · Provoz (jen správce)"],
  [/^src\/app\/\(app\)\/nastaveni/, "Aplikace · Nastavení"],
  [/^src\/app\/\(app\)\/ukoly/, "Aplikace · Úkoly"],
  [/^src\/components\/settings\//, "Aplikace · Nastavení"],
  [/^src\/components\/dashboard\//, "Aplikace · Přehled"],
  [/^src\/components\/calendar\//, "Aplikace · Kalendář"],
  [/^src\/components\/expenses\//, "Aplikace · Výdaje"],
  [/^src\/components\/events\//, "Aplikace · Události"],
  [/^src\/components\/activities\//, "Aplikace · Kroužky"],
  [/^src\/components\/rozvrh\//, "Aplikace · Rozvrh"],
  [/^src\/components\/zpravy\//, "Aplikace · Zprávy"],
  [/^src\/components\/souhrn\//, "Aplikace · Souhrn pro soud"],
  [/^src\/components\/predplatne\//, "Aplikace · Předplatné"],
  [/^src\/components\/oznameni\//, "Aplikace · Oznámení"],
  [/^src\/components\/edupage\//, "Aplikace · EduPage"],
  [/^src\/components\/provoz\//, "Aplikace · Provoz (jen správce)"],
  [/^src\/components\/kalkulacka\//, "Web · Kalkulačka péče"],
  [/^src\/components\/partner\//, "Partnerský portál"],
  [/^src\/components\/web\/lead-form/, "Web · Formulář pro stažení"],
  [/^src\/components\/web\/souhlas-lista/, "Web · Lišta cookies"],
  [/^src\/components\/web\//, "Web · Společné prvky"],
  [/^src\/components\/ui\/instalace/, "Nabídka „Přidat na plochu“"],
  [/^src\/components\/ui\//, "Společné prvky rozhraní"],
  [/^src\/components\/app-shell/, "Aplikace · Menu a lišta"],
  [/^src\/lib\/mail-sablony/, "E-maily klientům"],
  [/^src\/lib\/sekvence/, "E-maily · Automatická série"],
  [/^src\/lib\/tarify/, "Ceník a zkušební období (texty sdílené)"],
  [/^src\/lib\/checklist/, "Web · Checklist 30 dní"],
  [/^src\/lib\/oznameni/, "Oznámení a připomínky"],
  [/^src\/lib\/reminders/, "Oznámení a připomínky"],
  [/^src\/lib\/prehled-karty/, "Aplikace · Přehled (názvy karet)"],
  [/^src\/lib\/constants/, "Číselníky (kategorie, druhy)"],
  [/^src\/lib\/format/, "Chybové hlášky"],
  [/^src\/obsah\/clanky/, "Web · Články (obsah)"],
  [/^src\/components\/family\//, "Aplikace · Děti a rodina"],
  [/^src\/components\/kontakty\//, "Aplikace · Kontakty"],
  [/^src\/components\/dokumenty\//, "Aplikace · Doklady"],
  [/^src\/lib\/import-vydaju/, "Aplikace · Výdaje (import)"],
  [/^src\/lib\/(dates|holidays|custody|obdobi|members|kalkulacka)/, "Číselníky (dny, svátky, pojmy)"],
  [/^src\/lib\/(predplatne|zpravy|provoz-souhrn|docx|google|edupage)/, "Hlášky a popisky v aplikaci"],
  [/^src\/app\/api\//, "Chybové hlášky ze serveru"],
];

/** Data, ne texty ke korektuře. */
const VYNECHAT = [
  /^src\/lib\/data\//,          // seznamy okresů a prázdnin
  /^src\/app\/nahled-mobil\//,  // vývojový náhled, v ostrém provozu 404
];

function kde(soubor) {
  for (const [vzor, nazev] of MISTA) if (vzor.test(soubor)) return nazev;
  return "Ostatní";
}

/* ── Čím to je ─────────────────────────────────────────────────── */

function typPodleKontextu(pred, klic) {
  if (klic) {
    const k = klic.toLowerCase();
    if (k === "placeholder") return "Zástupný text v poli";
    if (k === "alt" || k === "aria-label") return "Popis pro čtečku";
    if (k === "title" && /metadata|export const metadata/.test(pred)) return "Titulek stránky (SEO)";
    if (k === "description") return "Popis stránky (SEO)";
    if (k === "otazka") return "Otázka v často kladených";
    if (k === "odpoved") return "Odpověď v často kladených";
    if (k === "predmet") return "Předmět e-mailu";
    if (k === "nadpis" || k === "titulek") return "Nadpis";
    if (k === "perex") return "Perex";
    if (k === "popisek" || k === "label") return "Popisek";
    if (k === "tlacitko") return "Tlačítko";
    if (k === "nazev") return "Název";
    if (k === "popis") return "Popis";
  }
  const p = pred.slice(-260);
  if (/<(Button|ButtonLink)\b[^>]*$|<button\b[^>]*$/.test(p)) return "Tlačítko";
  if (/<h1\b[^>]*$/.test(p)) return "Nadpis h1";
  if (/<h2\b[^>]*$/.test(p)) return "Nadpis h2";
  if (/<h3\b[^>]*$/.test(p)) return "Nadpis h3";
  if (/<h4\b[^>]*$/.test(p)) return "Nadpis h4";
  if (/<label\b[^>]*$/.test(p)) return "Popisek pole";
  if (/<(Link|a)\b[^>]*$/.test(p)) return "Odkaz";
  if (/<(li|Li)\b[^>]*$/.test(p)) return "Položka seznamu";
  if (/<(th|td)\b[^>]*$/.test(p)) return "Buňka tabulky";
  if (/<(summary|figcaption|caption)\b[^>]*$/.test(p)) return "Popiska";
  if (/(setChyba|setError|throw new Error|chyba:)\s*\($/.test(p)) return "Chybová hláška";
  return "Text";
}

/* ── Vytahování ────────────────────────────────────────────────── */

const SKIP_PROPS = new Set([
  "className", "class", "href", "src", "id", "key", "type", "name", "value",
  "role", "rel", "target", "style", "width", "height", "viewBox", "fill",
  "stroke", "d", "as", "variant", "size", "dateTime", "method", "action",
  "autoComplete", "inputMode", "pattern", "accept", "lang", "charSet",
  "content", "property", "sizes", "color", "slug", "odkaz", "cesta", "ikona",
]);

const VIDITELNE_KLICE = new Set([
  "title", "label", "popisek", "nadpis", "perex", "popis", "description",
  "placeholder", "alt", "aria-label", "nazev", "otazka", "odpoved",
  "titulek", "text", "zprava", "tlacitko", "predmet", "hint", "co",
]);

/** Řetězec, který má smysl korigovat: česká věta, ne klíč ani třída. */
function jeText(s) {
  if (s.length < 2 || s.length > 600) return false;
  if (!/[a-záčďéěíňóřšťúůýžA-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(s)) return false;
  if (/^[a-z0-9-]+$/.test(s)) return false;            // slug, třída
  if (/^[a-z]+([A-Z][a-z]+)+$/.test(s)) return false;  // camelCase
  if (/^(https?:|\/|#|\.\/|mailto:|tel:)/.test(s)) return false;
  if (/^[\s\d.,:;·—–-]+$/.test(s)) return false;
  if (/^(flex|grid|block|none|auto|true|false|null)$/.test(s)) return false;
  // Úlomky kódu, které proklouzly mezi značkami
  if (/[;{}]|=>|\bconst\b|\bReact\.|\bawait\b|\bfunction\b/.test(s)) return false;
  // Hlášky do konzole a vývojářské poznámky uživatel nikdy neuvidí
  if (/^\[[a-z-]+\]/.test(s)) return false;
  if (/README|process\.env|localhost/.test(s)) return false;
  return true;
}

/** Komentáře pryč, ať se nekoriguje to, co uživatel nikdy neuvidí. */
function bezKonzole(zdroj) {
  return zdroj.replace(/console\.\w+\([^)]*\)/g, (m) => " ".repeat(m.length));
}

function bezKomentaru(zdroj) {
  return zdroj
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + " ".repeat(Math.max(0, m.length - p.length)));
}

/** Rozsekané řetězce („a" + "b") slepit zpátky do jedné věty. */
function slepRozdelene(zdroj) {
  let v = zdroj;
  for (let i = 0; i < 8; i++) {
    const dalsi = v.replace(/"([^"\\\n]*)"\s*\+\s*\n?\s*"([^"\\\n]*)"/g, (_, a, b) => `"${a}${b}"`);
    if (dalsi === v) break;
    v = dalsi;
  }
  return v;
}

const soubory = execSync(
  "find src -type f \\( -name '*.tsx' -o -name '*.ts' \\) | sort",
  { encoding: "utf8" },
).trim().split("\n");

const zaznamy = [];
const videno = new Set();

for (const soubor of soubory) {
  if (VYNECHAT.some((v) => v.test(soubor))) continue;
  const syrovy = readFileSync(soubor, "utf8");
  const zdroj = slepRozdelene(bezKonzole(bezKomentaru(syrovy)));
  const radky = zdroj.split("\n");
  const naRadku = (index) => zdroj.slice(0, index).split("\n").length;

  function pridej(text, typ, radek) {
    const cisty = text.replace(/\s+/g, " ").trim();
    if (!jeText(cisty)) return;
    const klic = `${soubor}|${cisty}`;
    if (videno.has(klic)) return;
    videno.add(klic);
    zaznamy.push({ kde: kde(soubor), typ, text: cisty, misto: `${soubor}:${radek}` });
  }

  // 1. Text přímo v JSX (mezi značkami)
  for (const m of zdroj.matchAll(/>([^<>{}]+)</g)) {
    pridej(m[1], typPodleKontextu(zdroj.slice(0, m.index), null), naRadku(m.index));
  }

  // 2. Hodnoty vlastností a klíčů v objektech
  for (const m of zdroj.matchAll(/([A-Za-z-]+)\s*[:=]\s*"([^"\\\n]{2,600})"/g)) {
    const [, klic, hodnota] = m;
    if (SKIP_PROPS.has(klic)) continue;
    if (!VIDITELNE_KLICE.has(klic) && !/[ěščřžýáíéúůďťň]/i.test(hodnota)) continue;
    pridej(hodnota, typPodleKontextu(zdroj.slice(0, m.index), klic), naRadku(m.index));
  }

  // 3. Samostatné řetězce s diakritikou (hlášky, pole v seznamech)
  for (const m of zdroj.matchAll(/"([^"\\\n]{4,600})"/g)) {
    if (!/[ěščřžýáíéúůďťňĚŠČŘŽÝÁÍÉÚŮ]/.test(m[1])) continue;
    pridej(m[1], typPodleKontextu(zdroj.slice(0, m.index), null), naRadku(m.index));
  }

  // 4. Šablonové řetězce (e-maily, oznámení) — jen ty s českou větou
  for (const m of zdroj.matchAll(/`([^`]{6,900})`/g)) {
    if (!/[ěščřžýáíéúůďťň]/i.test(m[1])) continue;
    if (/^\s*[a-z-]+:\s/.test(m[1])) continue;
    pridej(m[1].replace(/\$\{[^}]*\}/g, "…"), "Text ve zprávě", naRadku(m.index));
  }
  void radky;
}

/* ── Výstup ────────────────────────────────────────────────────── */

zaznamy.sort((a, b) => a.kde.localeCompare(b.kde, "cs") || a.misto.localeCompare(b.misto));

mkdirSync("exporty", { recursive: true });

const bunka = (s) => `"${String(s).replace(/"/g, '""')}"`;
const csv = [
  ["Kde", "Co to je", "Současný text", "Nový text", "Soubor"].map(bunka).join(";"),
  ...zaznamy.map((z) => [z.kde, z.typ, z.text, "", z.misto].map(bunka).join(";")),
].join("\r\n");
writeFileSync("exporty/texty.csv", "﻿" + csv, "utf8");

if (process.argv.includes("--md")) {
  const skupiny = new Map();
  for (const z of zaznamy) {
    if (!skupiny.has(z.kde)) skupiny.set(z.kde, []);
    skupiny.get(z.kde).push(z);
  }
  const md = ["# Texty v Klidoo", "", `Vyexportováno ${new Date().toISOString().slice(0, 10)} · ${zaznamy.length} textů.`, ""];
  for (const [misto, seznam] of skupiny) {
    md.push(`## ${misto}`, "", "| Co to je | Text | Soubor |", "|---|---|---|");
    for (const z of seznam) {
      md.push(`| ${z.typ} | ${z.text.replace(/\|/g, "\\|")} | \`${z.misto}\` |`);
    }
    md.push("");
  }
  writeFileSync("exporty/texty.md", md.join("\n"), "utf8");
}

const podleTypu = new Map();
for (const z of zaznamy) podleTypu.set(z.typ, (podleTypu.get(z.typ) ?? 0) + 1);
console.log(`${zaznamy.length} textů ve ${new Set(zaznamy.map((z) => z.kde)).size} místech → exporty/texty.csv`);
for (const [t, n] of [...podleTypu].sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(4)}  ${t}`);

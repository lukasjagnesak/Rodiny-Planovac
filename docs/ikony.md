# Ikony Klidoo

Vlastní sada ikon pro aplikaci i web. Nahrazuje emoji, která každý systém
kreslí jinak, mají vlastní barvy a ve vážném tématu (děti, peníze, soud)
působí jako hračka.

## Kde je

| Co | Kde |
|---|---|
| Zdroj (jediný) | `src/lib/ikony.ts` — `IKONY`, `svgIkony()` |
| React komponenta | `src/components/ui/ikona.tsx` — `<Ikona nazev="lekar" />`, `<IkonaDlazdice nazev="lekar" barva="#a8443a" />` |
| Samostatné SVG | `public/ikony/<nazev>.svg` (barva textu) a `<nazev>-znacka.svg` (barva značky) — pro web mimo React, e-maily, prezentace, sociální sítě |
| Ikony notifikací | `public/ikony/push/<nazev>.png` (192 px, dlaždice v barvě značky) a `<nazev>-odznak.png` (96 px, bílá na průhledném) |
| Katalog | `/nahled-mobil/ikony` (jen při vývoji) |

## Pravidla

- Mřížka 24 × 24, okraj aspoň 2 px.
- Čára 1,75 px, kulaté konce a spoje, bez výplně.
- Výplň jen u drobných teček (`fill="currentColor"`).
- Barvu bere z okolí (`currentColor`); na barevném podkladu přes `IkonaDlazdice`.
- **Barvy jen z palety Klidoo** — `BARVY_IKON` v `src/lib/barvy.ts`:
  zelenomodrá značky (světlá i tmavá), terakota (světlá i tmavá),
  jantarová, modrá, zelená, červená, šedá. Hodnoty jsou tytéž jako
  v `globals.css` (hlídá `test:barvy-pdf`); jiný odstín test `test:ikony`
  nepustí.
- Žádný text uvnitř ikony.
- **Emoji do rozhraní nepatří.** Test `npm run test:ikony` selže, když se
  emoji objeví ve zdrojácích (výjimka: články v `src/obsah`).
- Push notifikace mají ikonu ze sady: `ikona` v `posliPush` → `public/sw.js`
  ji zobrazí jako `icon` (obrázek vedle textu) a `badge` (ikonka ve
  stavovém řádku Androidu). Ukáže se na Androidu a v počítači; **iPhone
  vlastní ikonu webové notifikace nepodporuje** a ukazuje vždy ikonu
  aplikace z plochy. Do textu notifikace emoji nepatří.
- Google kalendář vlastní ikony u událostí neumí (jen text a barvu).

## Nová ikona

1. Nakreslit ji do `IKONY` v `src/lib/ikony.ts` podle pravidel výš.
2. Zkontrolovat v katalogu `/nahled-mobil/ikony` vedle ostatních.
3. `npm run ikony` — vygeneruje SVG do `public/ikony` a PNG pro
   notifikace do `public/ikony/push`.
4. `npm run test:ikony`.

## Sada

| Oblast | Ikony |
|---|---|
| Události | `lekar`, `tabule`, `stan`, `autobus`, `fotoaparat`, `dort`, `prazdniny`, `spendlik` |
| Výdaje | `bankovka`, `mic`, `tricko`, `hvezda`, `batoh`, `srdce`, `jablko`, `letadlo`, `krabice` |
| Kontakty | `skola`, `rodina`, `vizitka` |
| Doklady | `karta_zdravi`, `pas`, `strikacka`, `listina`, `dokument` |
| Notifikace | `auto`, `otaznik`, `predani`, `zvonek` |

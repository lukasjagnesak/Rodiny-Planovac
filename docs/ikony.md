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
| Katalog | `/nahled-mobil/ikony` (jen při vývoji) |

## Pravidla

- Mřížka 24 × 24, okraj aspoň 2 px.
- Čára 1,75 px, kulaté konce a spoje, bez výplně.
- Výplň jen u drobných teček (`fill="currentColor"`).
- Barvu bere z okolí (`currentColor`); na barevném podkladu přes `IkonaDlazdice`.
- Žádný text uvnitř ikony.
- **Emoji do rozhraní nepatří.** Test `npm run test:ikony` selže, když se
  emoji objeví ve zdrojácích (výjimka: články v `src/obsah`).
- Texty, které odcházejí ven (push notifikace, události v Google kalendáři),
  jsou bez emoji i bez ikon — jen slova.

## Nová ikona

1. Nakreslit ji do `IKONY` v `src/lib/ikony.ts` podle pravidel výš.
2. Zkontrolovat v katalogu `/nahled-mobil/ikony` vedle ostatních.
3. `npm run ikony` — vygeneruje SVG do `public/ikony`.
4. `npm run test:ikony`.

## Sada

| Oblast | Ikony |
|---|---|
| Události | `lekar`, `tabule`, `stan`, `autobus`, `fotoaparat`, `dort`, `prazdniny`, `spendlik` |
| Výdaje | `bankovka`, `mic`, `tricko`, `hvezda`, `batoh`, `srdce`, `jablko`, `letadlo`, `krabice` |
| Kontakty | `skola`, `rodina`, `vizitka` |
| Doklady | `karta_zdravi`, `pas`, `strikacka`, `listina`, `dokument` |
| Notifikace | `auto`, `otaznik`, `predani`, `zvonek` |

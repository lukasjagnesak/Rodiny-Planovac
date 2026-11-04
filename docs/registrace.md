# Registrační stránka `/registrace`

Vstupní stránka z reklam a Instagramu. Kód: `src/app/(registrace)/`.

## Rozložení

- **Telefon:** nadpis → jedna věta → tři výhody → karta nabídky → formulář
  → jistoty a cena → odkazy → jeden skutečný snímek aplikace. Úvod je
  krátký, aby byl formulář co nejvýš.
- **Počítač (≥ 1024 px):** přínosy a snímek vlevo, formulář vpravo (sticky).
- **Pozvaný druhý rodič** (`?pozvanka=`): bez úvodu, rovnou „Připojte se k rodině“.

## Nabídka

`ZakladajiciPromo` (`components/web/zakladajici.tsx`) ukazuje skutečný počet
volných míst z `/api/zakladajici` (databáze, migrace 0030). Žádný časovač ani
odpočet. Když místa dojdou, karta i tlačítko samy přejdou na běžných 30 dní.
Odkazy vedou na stejnou URL, kampaně se nerozbijí.

Podmínky nabídky: `/obchodni-podminky#zakladajici`. Garance ceny po roce
neexistuje, a proto ji stránka neslibuje.

## Měření

| Krok (zadání)            | Náš druh               | GA4                   | Meta                 |
|--------------------------|------------------------|-----------------------|----------------------|
| landing_view             | `registrace-zobrazeni` | `landing_view`        | —                    |
| registration_start       | `registrace-zacal`     | `registration_start`  | —                    |
| registration_submit      | `registrace-odeslano`  | `registration_submit` | —                    |
| sign_up                  | `registrace`           | `sign_up`             | CompleteRegistration |
| onboarding_complete      | `rodina`               | jen vlastní měření    | —                    |
| first_calendar_created   | `kalendar-zalozen`     | jen vlastní měření    | —                    |

- Reklamním systémům jde jen název kroku, nikdy obsah formuláře, děti ani
  dokumenty. A jen se souhlasem (lišta souhlasu beze změny).
- `/vitejte` (průvodce) je aplikace, a tak odtud reklamní skripty nic
  nedostávají. Poslední dva kroky jsou proto jen ve vlastním přehledu `/provoz`.
- Registrace se počítá jednou za účet (`lib/registrace-mereni.ts`), i když
  přijde formulářem i přes Google.
- Konverze Google Ads se řídí naším druhem (`adsCil`), takže je nové názvy
  GA4 nerozbijí.

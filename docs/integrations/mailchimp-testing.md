# Mailchimp: testy

## Jak se spouští

```bash
npm run test:mailchimp      # synchronizace, klient a webhook proti simulátoru
PGHOST=/var/lib/postgresql/klidoo-test PGPORT=54329 PGUSER=postgres ./scripts/test-db.sh   # tests/db/marketing.sql
npm test                    # celá sada včetně test:mailchimp
```

**Žádný test nesahá na síť.**
- Klient dostává podstrčený `fetch`, který simuluje Mailchimp API v3:
  - `PUT`, `GET`, `PATCH`, tagy, `delete-permanent`, archivace,
  - compliance stav, „Forgotten Email“,
  - vynucené 429/503/401 a výpadek sítě.
- Test „žádný test nesáhl mimo simulátor“ hlídá hostitele.
- Žádný skutečný e-mail tedy nemůže odejít.

## Výsledky (6. 11. 2026)

### `tests/mailchimp.test.js`: 32/32 ✓

| # | Scénář ze zadání | Test | Výsledek |
|---|---|---|---|
| 1 | Registrace se souhlasem | `1)` pending → potvrzení → tagy + uvítání; `1b)` bez DOI; DB `s1_*` | ✓ |
| 2 | Registrace bez souhlasu | `2)` nula zápisů; DB `s2_nic`, `s2b_ucet_bez_souhlasu` | ✓ |
| 3 | Aktualizace existujícího kontaktu | `3)` jen merge fields, bez `status` | ✓ |
| 4 | Opakované doručení stejné události | `4)` úloha 3×, jeden kontakt, jedno uvítání; DB `s3_jedna_cekajici`, `s9_duplicita` | ✓ |
| 5 | Změna e-mailu | `5)` přesun; `5b)` kolize adres; `5c)` upemail se nepřepisuje; DB `s7_*` | ✓ |
| 6 | Odvolání souhlasu | `6)`; DB `s4_odvolan`, `s10_*` | ✓ |
| 7 | Odhlášení v Mailchimpu | `7)` bez webhooku (reconciliace); DB `s9_odhlaseno`, `s9_stav` | ✓ |
| 8 | Aktualizace profilu po odhlášení | `8)` nula zápisů; `8b)`; `8c)` nový souhlas jen pending; DB `s9_profil_po_odhlaseni_nic`, `s9_stare_odhlaseni` | ✓ |
| 9 | API rate limit | `9)` 429 → přerušení, zbytek zpět do fronty | ✓ |
| 10 | Dočasná nedostupnost | `10)` 503 i síť, odstup 1→2→4 min, po 8 pokusech vzdání + hlášení | ✓ |
| 11 | Chybný API klíč | `11)` 401 → stop, hlášení bez klíče, nic vzdáno | ✓ |
| 12 | Zpracování po obnovení | `12)` před odstupem se nezkouší, po něm hotovo; `12b)` trvalá chyba → vzdát hned | ✓ |
| 13 | Uvítání jen jednou | `13)` odvolání a nový souhlas; `13b)` selhání tagu → uvolnit a příště jednou; DB `s8_*` | ✓ |
| 14 | Bezpečnost webhooku | `14a)` token; `14b)` HMAC (platný, změněné tělo, cizí klíč, starý čas, chybějící); `14c)` parsování a deduplikační klíč; DB `s9_podvrh` (podvržené KLIDOO_ID) | ✓ |
| 15 | Migrace s dry-run | `15)` dry-run 0 zápisů; počty; ostrá jen zařadí; opakování nezdvojí; odhlášené a cleaned zůstanou | ✓ |
| – | Smazání účtu | trvalý výmaz i archivace; adresa z fronty pryč; DB `s11_*` | ✓ |
| – | Text souhlasu | kód = migrace; checkbox není předvyplněný | ✓ |
| – | Klíč mimo prohlížeč | žádné `NEXT_PUBLIC_MAILCHIMP`, klientské soubory neimportují serverovou část | ✓ |

### `tests/db/marketing.sql`: všech 42 kontrol `t`

Čekané chyby ve výstupu:
- `permission denied for function marketing_zarad/marketing_stav`:
  přihlášený uživatel nesmí volat funkce workeru.
- `Historie souhlasů se nepřepisuje / nemaže`.
- `WARNING: neznámá verze souhlasu`: podvržená verze v metadatech
  nevytvoří souhlas, ale účet vznikne.

Ostatní DB scénáře (`bezpecnost.sql`, `zakladajici.sql`…) běží dál beze
změny.

### Ruční kontrola na sestaveném serveru (`next build` + `next start`)

| Požadavek | Odpověď |
|---|---|
| `POST /api/mailchimp/webhook` bez tokenu | 401 |
| … se špatným tokenem | 401 |
| … s tokenem, ale bez podpisu (signing secret nastaven) | 401 |
| … s platným podpisem | 200 |
| … s podpisem starším než 5 minut (replay) | 401 |
| `GET /api/mailchimp/webhook?t=<token>` (ověření Mailchimpem) | 200 |
| `GET /api/cron/marketing` bez `CRON_SECRET` | 401 |
| `POST /api/marketing/souhlas` bez přihlášení | 307 na přihlášení |
| `/registrace` | checkbox s textem souhlasu, bez `checked` |

## Co otestovat až s ostrým účtem

Tohle vyžaduje skutečný API klíč a ručně na vlastní adrese. Postup je
v `mailchimp-setup.md`, kap. 7 a 8.

1. Kontakt vznikne jako Pending a přijde potvrzovací e-mail.
2. Po potvrzení přijde webhook `subscribe`, kontakt má tagy a v DB
   historii `potvrzen_double_opt_in`.
3. Unsubscribe z e-mailu → webhook → `souhlas = false`.
4. Ověřit skutečný tvar payloadu `upemail` a `cleaned`. Klíče
   `data[old_email]`, `data[new_email]` a `data[email]` vychází ze
   staršího referenčního popisu Mailchimpu; aktuální průvodce uvádí jen
   subscribe a unsubscribe. Neznámý tvar se bezpečně ignoruje (200,
   `nerozpoznano`).

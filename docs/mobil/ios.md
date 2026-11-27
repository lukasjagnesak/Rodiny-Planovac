# iPhone a App Store

Potřeba: Mac s Xcode 16 nebo novějším a Apple Developer Program
(99 USD ročně). Přihlaste se **jako organizace** (D-U-N-S číslo firmy),
v App Store se pak u aplikace ukáže firma, ne vaše jméno.

## 0. Přihlášení přes Apple je pro App Store povinné
Klidoo nabízí přihlášení přes Google. Apple (pravidlo 4.8) proto vyžaduje,
aby šlo přihlásit i přes Apple. Před odesláním ke kontrole:
1. **Apple Developer → Identifiers:**
   - založte **Services ID** (např. `cz.klidoo.web`) se zapnutým
     Sign in with Apple;
   - Return URL: `https://<projekt>.supabase.co/auth/v1/callback`.
2. **Keys:** nový klíč se **Sign in with Apple**, stáhněte `.p8`.
3. **Supabase → Authentication → Providers → Apple:** vyplňte Services ID,
   Team ID, Key ID a obsah klíče.
4. Na serveru v `.env` nastavte `NEXT_PUBLIC_PRIHLASENI_APPLE=1` a spusťte
   `./deploy/update.sh`.

## 1. Identifikátor aplikace a push
1. **Apple Developer → Identifiers → +** App ID, Bundle ID
   `cz.klidoo.app`.
2. Zapněte **Push Notifications** a **Associated Domains**.
3. **Keys → +**, zaškrtněte **Apple Push Notifications service (APNs)**
   a stáhněte `AuthKey_XXXXXXXXXX.p8`. Jde to **jen jednou**, soubor si
   uschovejte.
4. Na serveru v `.env` (příklad pro klíč `AuthKey_ABC123DEFG.p8`):
   ```
   APNS_KLIC_P8_BASE64=<výstup: base64 -i AuthKey_ABC123DEFG.p8 | tr -d '\n'>
   APNS_KLIC_ID=ABC123DEFG
   APNS_TEAM_ID=<Team ID z Membership>
   APPLE_TEAM_ID=<totéž Team ID>
   ```
   Pak spusťte `./deploy/update.sh`.

## 2. Xcode
```bash
cd mobil
npm install
npx cap sync ios
npm run ios
```
1. V Xcode vyberte target **App → Signing & Capabilities** a jako Team
   zvolte svou firmu.
2. **+ Capability → Push Notifications.**
3. **+ Capability → Associated Domains** a přidejte `applinks:klidoo.cz`.
4. **General → Identity:**
   - Version `1.0`,
   - Build `1` (u každého dalšího nahrání o 1 víc).
5. Aplikace je jen pro iPhone a jen na výšku (nastaveno). Na iPadu poběží
   v režimu pro iPhone a snímky pro iPad nejsou potřeba.

**Vyzkoušet na svém iPhonu:**
- Připojte telefon kabelem, vyberte ho nahoře a stiskněte ▶︎.
- Push notifikace z takového sestavení jdou přes sandbox: dočasně dejte
  na serveru `APNS_SANDBOX=1`. Pro TestFlight a App Store ho vraťte na
  prázdné.

## 3. Nahrání
1. Nahoře vyberte cíl **Any iOS Device (arm64)**.
2. **Product → Archive.**
3. V okně Organizer zvolte **Distribute App → App Store Connect → Upload**.
4. Za pár minut je sestavení v App Store Connect → TestFlight. Tam si ho
   nainstalujete přes aplikaci TestFlight.

## 4. App Store Connect
1. **Apps → + → New App:**
   - platforma iOS,
   - název „Klidoo – střídavá péče“,
   - jazyk Czech,
   - Bundle ID `cz.klidoo.app`,
   - SKU `klidoo-ios`.
2. **App Information:**
   - kategorie Lifestyle, vedlejší Productivity,
   - Content Rights: neobsahuje obsah třetích stran.
3. **App Privacy:** URL `https://klidoo.cz/zasady-ochrany-osobnich-udaju`
   a vyplňte dotazník podle `obchody.md`.
4. **Pricing:** Free, dostupnost Czechia a Slovakia.
5. **Verze 1.0:**
   - snímky obrazovky, popis, klíčová slova, URL podpory, poznámky pro
     kontrolu a testovací účet (`obchody.md`);
   - vyberte sestavení z TestFlightu.
6. **Age Rating:** všude „None“, kromě „Unrestricted Web Access: No“.
   Vyjde 4+.
7. **Add for Review → Submit.** Kontrola trvá obvykle 1–2 dny.

## Časté důvody zamítnutí a jak jsou ošetřené
| Pravidlo | Riziko | Stav |
|---|---|---|
| 4.2 Minimální funkčnost | „jen web v obalu“ | Nativní push notifikace, offline obrazovka, odkazy z e-mailu do aplikace, systémové přihlašování |
| 4.8 Přihlášení | Google bez Apple | **Doplnit Apple přihlášení (krok 0)** |
| 3.1.1 Platby | nákup mimo Apple | V aplikaci žádný nákup, cena ani odkaz na placení (3.1.3(f)) |
| 5.1.1(v) Smazání účtu | musí jít v aplikaci | Nastavení → Smazat účet |
| 2.1 Úplnost | reviewer se nepřihlásí | Testovací účet s vyplněnou rodinou v poznámkách |
| 5.1.2 Sledování | ATT dialog | V aplikaci se nenačítá nic od Googlu ani Mety |

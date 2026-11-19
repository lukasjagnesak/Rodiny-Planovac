# Android a Google Play

Firemní účet Google Play Console (25 USD jednorázově, potřeba D-U-N-S
číslo firmy). Firemní účet nemá povinný 14denní test s 12 testery.

## 1. Firebase (push notifikace)
1. https://console.firebase.google.com → **Přidat projekt** „Klidoo“.
   Google Analytics v projektu **vypněte**.
2. **Přidat aplikaci → Android**, název balíčku `cz.klidoo.app`.
3. Stáhněte `google-services.json` a uložte ho do
   `mobil/android/app/google-services.json`. Je v `.gitignore`, do gitu
   nepatří.
4. **Nastavení projektu → Účty služeb → Vygenerovat nový soukromý klíč.**
   Stáhne se JSON. Na serveru:
   ```bash
   base64 -w0 klidoo-firebase-adminsdk-xxxx.json
   ```
   Výstup vložte do `.env` jako `FCM_SERVICE_ACCOUNT_BASE64=…`. Soubor pak
   smažte z počítače.

## 2. Podpisový klíč pro nahrávání (jen jednou, pečlivě uschovat)
```bash
keytool -genkeypair -v -keystore klidoo-upload.jks -alias klidoo-upload \
  -keyalg RSA -keysize 2048 -validity 10000
cp mobil/android/keystore.properties.example mobil/android/keystore.properties
```
Vyplňte `keystore.properties`: cestu k `.jks` a hesla. Klíč i hesla si
uložte do správce hesel. **Nikdy je nedávejte do gitu ani do chatu.**

Google Play pak aplikaci podepisuje vlastním klíčem (Play App Signing).
Ztracený klíč pro nahrávání jde přes podporu vyměnit.

## 3. Sestavení
Potřeba: Android Studio (obsahuje SDK a Javu 21).
```bash
cd mobil
npm install
npx cap sync android
cd android
./gradlew bundleRelease
```
Výsledek: `mobil/android/app/build/outputs/bundle/release/app-release.aab`.

Před každou novou verzí zvyšte v `mobil/android/app/build.gradle`
hodnotu `versionCode` (1, 2, 3…) a podle potřeby `versionName`.

## 4. Play Console
1. **Vytvořit aplikaci:** název „Klidoo – střídavá péče“, jazyk čeština,
   typ Aplikace, zdarma.
2. **Nastavení aplikace (Dashboard):** vyplňte podle `obchody.md`:
   - zásady ochrany soukromí,
   - přístup do aplikace (testovací účet),
   - reklamy: ne,
   - hodnocení obsahu,
   - cílová skupina: 18+,
   - bezpečnost údajů,
   - vládní aplikace: ne,
   - finanční funkce: ne,
   - zdraví: ne.
3. **Smazání účtu:** URL `https://klidoo.cz/smazani-uctu`.
4. **Testování → Interní testování:** nahrajte `.aab` a přidejte svůj
   e-mail jako testera. Aplikaci si nainstalujete z odkazu.
5. **Integrita aplikace → Podepisování aplikací:** zkopírujte SHA-256
   otisk „klíče pro podepisování aplikací“ do `.env` jako
   `ANDROID_SHA256_OTISKY=…` a spusťte `./deploy/update.sh`. Pak se
   pozvánky z e-mailu otevřou rovnou v aplikaci.
6. **Produkce → Vytvořit novou verzi:** nahrajte stejné `.aab`, země
   Česko (a Slovensko) a odešlete ke kontrole. Kontrola trvá obvykle
   1–3 dny.

## Ověření na telefonu
- Přihlášení e-mailem, Google a Apple (až bude zapnuté).
- Nastavení → Notifikace → Zapnout → Poslat zkušební notifikaci.
- Klepnutí na notifikaci otevře správnou stránku.
- V aplikaci není ceník ani tlačítko na placení.
- Odkaz na pozvánku z e-mailu (až bude nastavený otisk) se otevře
  v aplikaci.

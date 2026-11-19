# Klidoo v App Store a Google Play

## Jak to funguje

Aplikace v obchodech je nativní obal ([Capacitor](https://capacitorjs.com) 8,
složka `mobil/`), který načítá **stejný web z https://klidoo.cz**. Nová verze
webu se do aplikací dostane sama, bez nového schvalování. Nové sestavení
do obchodů je potřeba jen při změně nativní části (ikona, oprávnění, pluginy).

| Co | Řešení |
|---|---|
| Obsah | `server.url = https://klidoo.cz/prehled` (`mobil/capacitor.config.json`) |
| Rozpoznání aplikace | User-Agent obsahuje `KlidooApp` → `src/lib/nativni.ts` |
| Platby | **jen na webu**. V aplikaci není nákup, cena ani odkaz na placení |
| Měření | v aplikaci žádné Google Analytics, Google Ads ani Meta Pixel, lišta cookies se neukazuje |
| Marketingové stránky | v aplikaci přesměrují na přehled; přihlášení, registrace a právní texty zůstávají |
| Přihlášení Google/Apple | v systémovém prohlížeči → `/auth/aplikace` → `cz.klidoo.app://auth` → `/auth/callback` |
| Potvrzení e-mailu | odkaz z e-mailu vede přes `/auth/aplikace` zpět do aplikace |
| Push notifikace | iPhone přes APNs, Android přes FCM (`src/lib/push-nativni.ts`); tokeny v `push_subscriptions` |
| Odkazy z e-mailu | `https://klidoo.cz/pozvanka/…` se otevře v aplikaci (`/.well-known/…`) |
| Smazání účtu | v aplikaci Nastavení → Smazat účet; veřejně `https://klidoo.cz/smazani-uctu` |
| Bez internetu | `mobil/www/offline.html` |

### Proč bez plateb v aplikaci
- **Apple, pravidlo 3.1.3(f):** bezplatná aplikace, která doprovází placenou
  webovou službu, nemusí mít nákup přes Apple. Podmínkou je, že v ní není
  žádný nákup ani výzva k nákupu jinde.
- **Google Play:** pravidla plateb se týkají jen nákupů v aplikaci.
- Kdo zaplatil na webu, má v aplikaci plný přístup. Zakládající rodiny mají
  rok zdarma.
- Nativní platby (15 %) se dají doplnit později.

## Podíl webu na serveru

Migrace a proměnné jsou potřeba **jednou**. Pak se aplikace jen sestavuje.

1. Supabase SQL Editor: `supabase/migrations/0045_push_aplikace.sql`
   a `notify pgrst, 'reload schema';`
2. **Supabase → Authentication → URL Configuration → Redirect URLs:**
   přidat `https://klidoo.cz/auth/aplikace**`. Bez toho přihlášení přes
   Google v aplikaci skončí chybou.
3. `.env` na serveru: proměnné `APNS_*`, `FCM_SERVICE_ACCOUNT_BASE64`,
   `APPLE_TEAM_ID` a `ANDROID_SHA256_OTISKY` podle `.env.example`. Hodnoty
   vzniknou postupně podle `ios.md` a `android.md`.

## Postup
1. **Android:** `docs/mobil/android.md` (Firebase, podpisový klíč, Play Console).
2. **iPhone:** `docs/mobil/ios.md` (Apple Developer, Xcode, App Store Connect).
3. **Texty, obrázky a dotazníky do obchodů:** `docs/mobil/obchody.md`.

## Vývoj
```bash
cd mobil
npm install
npx cap sync          # po změně capacitor.config.json nebo pluginů
npm run zdroje        # zdrojové obrázky ikon z loga (assets/)
npm run ikony         # ikony a úvodní obrazovky pro Android i iOS
npm run android       # otevře Android Studio
npm run ios           # otevře Xcode (jen na Macu)
```

Testovat proti lokálnímu webu: dočasně změňte `server.url` na adresu
počítače v síti (např. `http://192.168.1.20:3000/prehled`) a nastavte
`"cleartext": true`. **Před sestavením do obchodu vraťte.**

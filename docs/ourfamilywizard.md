# OurFamilyWizard a co Klidoo chybí

Stav k 27. 10. 2026. Zdroje: web výrobce a srovnání advokátních kanceláří
v USA (odkazy dole). Ceny a rozsah tarifů se mezi zdroji liší — brát jako
orientační.

## Co to je

- **OurFamilyWizard (OFW)**, USA, na trhu od roku 2001. Uvádí přes milion
  rodičů a profesionálů a že je „přijímaná soudy ve všech 50 státech".
- Soudy ho v konfliktních případech **ukládají rozhodnutím**. Výrobce
  nabízí soudům hotovou formulaci do rozhodnutí („Get Order Language").
  Vzor nařízení počítá s tím, že rodiče zpřístupní účet advokátům,
  soudci, opatrovníkovi dítěte a koordinátorovi rodičovství.
- Platí **každý rodič zvlášť**, přibližně 110–300 USD ročně podle tarifu.
  Existuje program prominutí poplatku (přes soud, právní pomoc, sociální
  podporu) a sleva pro vojáky.
- Podobné: **TalkingParents** (nahrávané a přepisované hovory,
  certifikované výpisy pro soud) a **AppClose** (levnější, u soudů méně
  rozšířená).

## Funkce OFW a jak je na tom Klidoo

| Funkce OFW | Co dělá | Klidoo |
|---|---|---|
| Sdílený kalendář | Rozvrh péče, události | ✅ Má, včetně nocí, prázdnin podle okresu a EduPage |
| **Trade/Swap** | Žádost o výměnu termínu. Druhý rodič schválí nebo zamítne do určitého data, schválená změna se sama propíše do kalendáře | ✅ **Má od 27. 10. 2026** (migrace 0032, prohození dnů 0033). Při dvou rodičích nejde kalendář změnit bez souhlasu, hlídá to databáze; návrh i odpověď jsou ve Zprávách |
| Zprávy se záznamem | Nejde je měnit, čas doručení a přečtení | ✅ Má (nejdou upravit ani smazat, razítko odeslání a přečtení) |
| **ToneMeter** | Při psaní upozorní na útočné nebo emotivní formulace | ✅ **Má od 27. 10. 2026** — hlídač tónu v češtině (urážky, výhrůžky, obviňování, „vždycky/nikdy“, křik, ironie). Běží jen v prohlížeči, zprávu nikam neposílá; jde vypnout |
| Výdaje | Evidence, rozdělení, zůstatek | ✅ Má (účtenky, klíč, vyrovnání) |
| Žádost o proplacení a OFWpay | Žádost o úhradu, platba převodem v aplikaci, historie plateb | ✅ **Žádost se schválením má od 27. 10. 2026** (migrace 0036): schválit, rozporovat s důvodem, vypořádá potvrzení příjmu. Platba v aplikaci ne |
| **Auditní stopa** | Časová historie žádostí, výdajů, změn rozvrhu a přihlášení | ✅ **Má od 27. 10. 2026** (migrace 0034): rozvrh, výdaje, události, kroužky, děti, členové i stažené výpisy; nejde upravit ani smazat. Přihlášení zatím ne |
| **Přístup pro profesionály** | Advokát, soudce, opatrovník, mediátor vidí účet rodiny jen pro čtení, zdarma | ✅ **Má od 27. 10. 2026** (migrace 0035). Udělí kterýkoli rodič, druhý dostane zprávu a smí přístup odebrat. Přístup má datum konce, pozvánku jde přijmout jen z e-mailu, na který šla |
| Výpisy pro soud | Záznamy pro řízení | ✅ Výpis zpráv, historie (Word) a souhrn s ověřovacím kódem; klidoo.cz/overit ověří pravost i to, že soubor nikdo neupravil (SHA-256) |
| Info Bank | Pojištění, lékaři, velikosti, zdravotní údaje | ✅ Většinou má (děti, doklady, kontakty) |
| Deník a check-in | Soukromé i sdílené záznamy, ověření polohy při předání | ❌ Nemá. Soukromé poznámky schválně ne (neutralita), check-in zvážit |
| Nahrávané hovory (TalkingParents) | Hovor v aplikaci se nahraje a přepíše | ❌ Nemá a nedoporučuji (souhlasy, zákon) |
| Prominutí poplatku | Zdarma pro rodiny v nouzi a z řízení | ⚠️ Naplánováno (rodiny z mediace, OSPOD, soudu) |
| Formulace pro soudy | Hotový text do rozhodnutí | ❌ Chybí |

## Co má Klidoo navíc

- **Platí jedna domácnost, druhý rodič zdarma.** U OFW platí oba rodiče.
- Webová aplikace bez instalace.
- České prostředí: EduPage, jarní prázdniny podle okresu, kalkulačka
  výživného podle tabulky MSp, vzor dohody o střídavé péči.
- Počítání nocí, ne jen dní.

## Co doplnit, seřazeno podle důležitosti

1. **Žádost o změnu rozvrhu se schválením.** Nikdo nesmí kalendář změnit
   sám. Žádost, odpověď do termínu a po schválení automatická změna.
   *Ověřit: kdo dnes smí zapsat výjimku do kalendáře bez souhlasu druhého.*
2. **Historie změn viditelná oběma rodičům.** Kdo a kdy změnil rozvrh,
   výdaj nebo stáhl výpis. To je jádro „záznamu, kterému soud věří".
3. **Ověřitelný výpis pro soud.** PDF s ověřovacím kódem nebo QR, přes
   který soud na klidoo.cz zjistí, že výpis nikdo neupravil.
4. **Hlídač tónu zprávy v češtině.** Před odesláním upozorní na útočnou
   formulaci a nabídne klidnější. V češtině ho nikdo nemá. Musí být
   transparentní (rodič ví, že se text kontroluje, a kde).
5. **Přístup pro profesionály.** Advokát, mediátor nebo OSPOD jen pro
   čtení. Uděluje ho rodič, druhý rodič to vidí a jde ho kdykoli odebrat.
   ✅ Hotovo (0035, karta v Děti a rodina).
6. **Žádost o proplacení výdaje** se schválením nebo rozporováním. Platby
   v aplikaci zatím ne.
   ✅ Hotovo (0036): žádá ten, kdo platil; druhý schválí nebo rozporuje
   s důvodem; vypořádá to potvrzení příjmu od žadatele. Vše ve Zprávách.
7. **Formulace do dohody a rozhodnutí** a **přístup zdarma** pro rodiny
   z mediace, OSPOD a soudu.

Body 1–3 a 7 jsou zároveň nejsilnější argumenty pro kulatý stůl
9. 12. 2026: řeší neutralitu a důvěryhodnost záznamu, na které se
soudci a OSPOD budou ptát.

## Zdroje

- https://www.ourfamilywizard.com/homepage
- https://www.ourfamilywizard.com/blog/sharing-calendars-what-can-my-co-parent-see
- https://s3.amazonaws.com/static.contentres.com/media/documents/334e3c91-f180-4e98-8b52-c483096c7d80.pdf
- https://charlestonlaw.net/ourfamilywizard-vs-talkingparents/
- https://farzadlaw.com/ourfamilywizard-versus-talkingparents
- https://coparentsplit.com/blog/ourfamilywizard-pricing-2026-the-full-cost-for-both-parents
- https://kidtime.app/blog/ourfamilywizard-pricing-2026
- https://talkingparents.com/blog/use-talkingparents-over-competitors
- https://www.parentingpath.net/blog/best-co-parenting-apps-2026

/**
 * Hotová formulace do dohody rodičů a do návrhu na schválení dohody
 * soudem.
 *
 * Vzor, ne právní rada — mediátor nebo advokát ji přizpůsobí. Píše se
 * tak, aby obstála před soudem i před druhým rodičem:
 *
 * - **Neutrálně.** Oba rodiče mají stejná práva a povinnosti, nikdo
 *   nikoho „nehlídá". Aplikace je nástroj k evidenci a domluvě, ne
 *   k dohledu.
 * - **Bez závislosti na nás.** „případně jiný nástroj, na kterém se
 *   písemně shodnou" — dohoda nesmí padnout tím, že Klidoo skončí nebo
 *   se jeden z rodičů rozhodne jinak.
 * - **Bez finanční povinnosti druhého rodiče.** Jeho přístup je zdarma
 *   a v textu to stojí, aby to nebyl důvod se bránit.
 * - **Nic, co aplikace neumí.** Zprávy opravdu nejdou upravit ani
 *   smazat; změnu rozvrhu dnes navrhuje rodič zprávou.
 *
 * Hranaté závorky jsou místa k vyplnění nebo úpravě.
 */

export const FORMULACE_CLANEK = `Článek [X] – Komunikace a evidence péče

1. Rodiče se dohodli, že k evidenci rozvrhu péče o [nezletilé dítě / nezletilé děti], k domlouvání změn tohoto rozvrhu, k evidenci výdajů na [dítě / děti], které se podle této dohody dělí, a k vzájemné písemné komunikaci ve věcech [dítěte / dětí] budou používat sdílenou aplikaci Klidoo (klidoo.cz), případně jiný nástroj, na kterém se písemně shodnou.

2. Každý z rodičů si v aplikaci zřídí vlastní účet. Oba rodiče mají v aplikaci stejná práva. Přístup druhého rodiče je bezplatný.

3. Změnu dohodnutého rozvrhu péče navrhne rodič druhému rodiči prostřednictvím aplikace zpravidla nejméně [7] dní předem. Druhý rodič na návrh odpoví bez zbytečného odkladu, nejpozději do [3] dnů. Změna je dohodnutá teprve souhlasem obou rodičů.

4. Výdaje, které se podle této dohody dělí, zapíše rodič, který je uhradil, do aplikace do [30] dnů od jejich úhrady, zpravidla s dokladem. Druhý rodič svůj podíl uhradí do [30] dnů od zápisu, pokud výdaj v téže lhůtě písemně nerozporuje.

5. Rodiče berou na vědomí, že zprávy odeslané v aplikaci nelze dodatečně upravit ani smazat a že každý z nich může výpis z aplikace použít v řízení před soudem nebo orgánem sociálně-právní ochrany dětí.

6. V naléhavých případech, zejména při nemoci nebo úrazu [dítěte / dětí], rodiče komunikují i jinak, bez zbytečného odkladu, a informaci následně zapíší do aplikace.`;

/** Krátká verze — tam, kde na celý článek není místo. */
export const FORMULACE_KRATKA = `Rodiče se dohodli, že k evidenci rozvrhu péče, k domlouvání jeho změn, k evidenci společných výdajů na [dítě / děti] a k vzájemné písemné komunikaci ve věcech [dítěte / dětí] budou používat sdílenou aplikaci Klidoo (klidoo.cz), případně jiný nástroj, na kterém se písemně shodnou; přístup druhého rodiče je bezplatný.`;

export const FORMULACE_UPOZORNENI =
  "Vzor k úpravě, ne právní rada. Text nenahrazuje posouzení konkrétního případu advokátem " +
  "nebo mediátorem a jeho použití je na rozhodnutí rodičů, případně soudu.";

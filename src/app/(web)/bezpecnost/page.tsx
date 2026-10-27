import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { DalsiCteni, Hero, Poznamka, Sloupec, Vlastnosti } from "@/components/web/prvky";
import { PROVOZOVATEL } from "@/lib/provozovatel";
import { ZNACKA } from "@/lib/brand";

const TITULEK = "Bezpečnost a data";
const POPISEK =
  `Kde ${ZNACKA} ukládá údaje o vás a vašich dětech, kdo k nim má přístup, jak jsou ` +
  "chráněné a co s nimi nikdy neděláme.";

export const metadata: Metadata = {
  title: TITULEK,
  description: POPISEK,
  alternates: { canonical: "/bezpecnost" },
  openGraph: {
    title: `${TITULEK} | ${ZNACKA}`,
    description: POPISEK,
    type: "website",
  },
};

/** Technické podrobnosti pro ty, kdo je chtějí. */
const TECHNICKY: [string, string][] = [
  ["Přenos", "Jen HTTPS (TLS), prohlížeč si to pamatuje (HSTS) a jinak se nepřipojí"],
  ["Hesla", "Ukládají se jen jako jednosměrný otisk (bcrypt), čitelné je nemáme"],
  ["Oddělení rodin", "Pravidla přímo v databázi (Row Level Security) u každé tabulky"],
  ["Soubory", "Účtenky a doklady v neveřejném úložišti, přístup jen pro členy rodiny"],
  [
    "Propojení s Googlem a EduPage",
    "Přístupové údaje šifrované (AES-256-GCM), klíč není v databázi",
  ],
  ["Notifikace", "Text putuje šifrovaný, přečíst ho umí jen vaše zařízení"],
  [
    "Spuštění cizího kódu",
    "Content-Security-Policy: v aplikaci se spustí jen skript s jednorázovým kódem od našeho serveru",
  ],
  ["Platby", "Kartu zadáváte přímo Stripu, číslo karty k nám nikdy nedorazí"],
  [
    "Zranitelné knihovny",
    "Sledujeme bezpečnostní opravy knihoven, ze kterých aplikace stojí, a nasazujeme je",
  ],
];

/**
 * Stránka o bezpečnosti.
 *
 * Píše se pro rodiče, ne pro auditora: co se s daty děje, řečeno tak,
 * aby to šlo zopakovat advokátovi nebo pracovnici OSPOD. Technické
 * podrobnosti jsou v tabulce pro ty, kdo je chtějí.
 *
 * **Každá věta tady musí platit.** Žádné „bankovní zabezpečení" ani
 * „vojenské šifrování". Když se něco změní v kódu (měření, hlavičky,
 * mazání, zpracovatelé), musí se to změnit i tady — a naopak, co tu
 * stojí, je slib. Proto i oddíl „Co zatím nemáme".
 */
export default function Bezpecnost() {
  return (
    <>
      <Hero
        nadtitulek={
          <>
            <ShieldCheck size={16} aria-hidden />
            Aktualizováno 27. 10. 2026
          </>
        }
        nadpis="Bezpečnost a data"
        perex="Do Klidoo píšete věci, které nepatří nikomu dalšímu: jména dětí, zdravotní pojišťovnu, zprávy druhému rodiči, kolik stál tábor. Tady je, kde to leží, kdo to vidí a jak to chráníme."
      />

      <Sloupec>
        <Vlastnosti
          polozky={[
            {
              nazev: "Data v Evropské unii",
              popis: "Databáze i server aplikace běží v datových centrech v EU.",
            },
            {
              nazev: "Vidí je jen vaše rodina",
              popis:
                "Kdo do rodiny nepatří, k jejím údajům se nedostane. Hlídá to přímo databáze, ne jen aplikace.",
            },
            {
              nazev: "V aplikaci žádná reklama",
              popis:
                "Uvnitř aplikace neběží Google Analytics ani Meta Pixel. Ani když jste na webu souhlasili s měřením.",
            },
            {
              nazev: "Zprávy nejdou přepsat",
              popis:
                "Odeslanou zprávu nemůže upravit ani smazat nikdo z rodičů. Je u ní čas odeslání a přečtení.",
            },
            {
              nazev: "Nic neprodáváme",
              popis: "Údaje neprodáváme a nepoužíváme k reklamě. Platíte nám vy, ne inzerenti.",
            },
            {
              nazev: "Smazání znamená smazání",
              popis: "Rodinu i účet si smažete sami v nastavení, včetně nahraných fotek a dokladů.",
            },
          ]}
        />

        <article className="proza mt-12">
          <h2>Kde data leží</h2>
          <p>
            <strong>Databáze, přihlašování a soubory</strong> (účtenky, doklady) jsou u společnosti
            Supabase v datovém centru v Evropské unii. <strong>Samotná aplikace</strong> běží na
            serveru společnosti Hetzner v Helsinkách ve Finsku. Mezi vaším telefonem a námi, i mezi
            serverem a databází, jde všechno šifrovaně přes HTTPS.
          </p>

          <h2>Kdo vaše údaje vidí</h2>
          <ul>
            <li>
              <strong>Vy a členové rodiny, které sami pozvete.</strong> Druhý rodič vidí to
              společné: kalendář, děti, výdaje, zprávy. Pozvánka je odkaz, který jde použít jen
              jednou a platí 30 dní. Kdo je v rodině, vidíte v části Děti a rodina.
            </li>
            <li>
              <strong>Nikdo jiný z uživatelů.</strong> Každý dotaz do databáze prochází pravidly,
              která vrátí jen řádky vaší rodiny. Kdyby v aplikaci byla chyba, databáze cizí data
              stejně nevydá.
            </li>
            <li>
              <strong>My jako provozovatel</strong> máme k databázi technický přístup, protože ji
              spravujeme. Do obsahu rodin nenahlížíme. Sáhneme do něj jen tehdy, když nás o pomoc s
              konkrétním problémem požádáte vy, nebo když nám to uloží zákon.
            </li>
            <li>
              <strong>Soud, OSPOD, advokát</strong> od nás údaje nedostanou na požádání ani na
              telefonát. Jen na základě povinnosti, kterou stanoví zákon. Výpis pro řízení si
              stahujete sami a sami rozhodnete, komu ho dáte.
            </li>
          </ul>

          <h2>Bez reklamy a sledování uvnitř aplikace</h2>
          <p>
            Na veřejném webu (články, kalkulačky) měříme se souhlasem návštěvnost přes Google a
            Meta, abychom věděli, která reklama funguje. <strong>Uvnitř aplikace</strong>, tedy tam,
            kde jsou děti, kalendář, zprávy a doklady, tyhle skripty nejsou vůbec. Nenačtou se ani
            tehdy, když jste s měřením na webu souhlasili. Prohlížeči to navíc zakazujeme i
            bezpečnostní hlavičkou: v aplikaci smí stránka posílat data jen nám a do naší databáze.
          </p>
          <p>
            Jediné, co v aplikaci počítáme, je vlastní anonymní statistika (kolik lidí otevřelo
            kterou obrazovku). Neukládá jména, obsah ani nic, čím by šel člověk najít, a nikomu ji
            nepředáváme.
          </p>

          <h2>Záznam, kterému se dá věřit</h2>
          <p>
            Zprávy v Klidoo nejdou dodatečně upravit ani smazat — ne proto, že aplikace nemá
            tlačítko, ale proto, že to nedovolí databáze. U každé zprávy je čas odeslání a čas, kdy
            si ji druhý rodič přečetl. Když se pak řeší, kdo co napsal a kdy, není o čem se
            dohadovat.
          </p>
          <p>
            Když rodinu používají oba rodiče, <strong>rozvrh nemůže změnit jeden sám</strong>.
            Změnu navrhne jeden a schválí druhý; do té doby kalendář platí, jak byl. Návrh
            i odpověď se zapíšou do Zpráv. Každou změnu rozvrhu, výdaje
          nebo události navíc zapíše do <strong>historie změn</strong> sama databáze; vidí ji oba
          rodiče a nikdo ji nemůže upravit ani smazat. Výpisy pro soud mají ověřovací kód — na
          stránce <Link href="/overit">Ověření výpisu</Link> se pozná, že jsou pravé.
          </p>
          <Poznamka>
            Klidoo nestraní žádnému z rodičů. Oba mají stejná práva a vidí totéž. Soukromé poznámky
            „na toho druhého" tu schválně nejsou.
          </Poznamka>
        </article>

        <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight text-ink">
          Technicky
        </h2>
        {/* Seznam, ne tabulka: dva sloupce vět se na telefonu nevejdou
            a posouvat tabulku do strany kvůli čtení nikdo nebude. */}
        <dl className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface">
          {TECHNICKY.map(([co, jak]) => (
            <div key={co} className="px-4 py-3.5 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
              <dt className="font-semibold text-ink">{co}</dt>
              <dd className="mt-0.5 text-[0.95rem] leading-relaxed text-ink-muted sm:mt-0">
                {jak}
              </dd>
            </div>
          ))}
        </dl>

        <article className="proza mt-12">
          <h2>Vaše data, vaše rozhodnutí</h2>
          <ul>
            <li>
              <strong>Smazání.</strong> Rodinu i účet smažete v nastavení. S rodinou zmizí i nahrané
              soubory a zruší se předplatné. Zálohy se přepíšou nejpozději do 30 dnů.
            </li>
            <li>
              <strong>Kopie údajů.</strong> Výpis zpráv a souhrn péče a nákladů si stáhnete v
              aplikaci. Kompletní kopii všeho vám na požádání pošleme e-mailem.
            </li>
            <li>
              <strong>Odvolání souhlasu.</strong> Měření na webu vypnete kdykoli v{" "}
              <Link href="/zasady-ochrany-osobnich-udaju">zásadách ochrany údajů</Link>.
            </li>
          </ul>

          <h2>Co zatím nemáme</h2>
          <p>Raději to řekneme sami:</p>
          <ul>
            <li>
              <strong>Dvoufázové ověření</strong> (kód z aplikace při přihlášení). Do té doby
              doporučujeme přihlášení přes Google nebo Apple, které ho umí, nebo dlouhé heslo, které
              nepoužíváte jinde.
            </li>
            <li>
              <strong>Stažení všech dat jedním klepnutím.</strong> Zatím na požádání e-mailem.
            </li>
            <li>
              <strong>Nezávislý bezpečnostní audit.</strong> Zatím jsme ho nedělali.
            </li>
          </ul>

          <h2>Našli jste chybu v zabezpečení?</h2>
          <p>
            Napište na <a href={`mailto:${PROVOZOVATEL.email}`}>{PROVOZOVATEL.email}</a> s předmětem
            „Bezpečnost". Ozveme se do dvou pracovních dnů a o opravě vás budeme informovat.
            Prosíme, nezkoušejte to na datech jiných rodin.
          </p>
        </article>

        <DalsiCteni
          odkazy={[
            {
              href: "/zasady-ochrany-osobnich-udaju",
              nazev: "Zásady ochrany osobních údajů",
              popis: "Jaké údaje zpracováváme, proč a jak dlouho.",
            },
            {
              href: "/obchodni-podminky",
              nazev: "Obchodní podmínky",
              popis: "Co je v ceně, jak se předplatné ruší.",
            },
          ]}
        />
      </Sloupec>

      <div className="h-16" />
    </>
  );
}

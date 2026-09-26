import type { Metadata } from "next";
import Link from "next/link";
import { Nadtitulek, Sloupec } from "@/components/web/prvky";
import { VstupniRozvrh } from "@/components/web/vstupni-rozvrh";
import { ZNACKA } from "@/lib/brand";
import { CENIK, ZKUSEBNI_SLIB, korun } from "@/lib/tarify";

const TITULEK = "Rozvrh střídavé péče na měsíc dopředu";
const POPISEK =
  "Klepněte, jak se střídáte, a uvidíte, u koho budou děti každý den příštího měsíce. " +
  "Pak si rozpis uložte do Klidoo a uvidí ho i druhý rodič. 30 dní zdarma, bez karty.";

export const metadata: Metadata = {
  title: TITULEK,
  description: POPISEK,
  // Stránka pro placenou návštěvu. Ve vyhledávání tuhle práci dělá
  // `/kalkulacka` a dvě podobné stránky by si konkurovaly.
  robots: { index: false, follow: true },
  alternates: { canonical: "/vyzkouset" },
  openGraph: { title: `${TITULEK} | ${ZNACKA}`, description: POPISEK, type: "website" },
};

const CO_PRIBUDE = [
  {
    nazev: "Výjimky, prázdniny a svátky",
    popis: "Vánoce, jarní prázdniny, výměna víkendu. Kalendář se přepočítá sám a vidí to oba.",
    barva: "bg-parent-a",
  },
  {
    nazev: "Výdaje a vyrovnání",
    popis: "Kdo co za děti zaplatil, i s účtenkou. Klidoo spočítá, kdo komu kolik dluží.",
    barva: "bg-parent-b",
  },
  {
    nazev: "Kroužky a odvozy",
    popis: "Kdo veze na trénink a kdo vyzvedává. U každého termínu jménem.",
    barva: "bg-parent-a",
  },
];

const OTAZKY = [
  {
    otazka: "Co když se druhý rodič nepřidá?",
    odpoved:
      "Klidoo funguje i pro jednoho. Rozvrh, výdaje i doklady si vedete sami a druhého rodiče můžete pozvat kdykoli později — nebo taky nikdy.",
  },
  {
    otazka: "Střídáme se jinak, než je tu na výběr.",
    odpoved:
      "Po uložení si v aplikaci nastavíte rozpis po dnech, i dvoutýdenní, a k tomu výjimky a prázdniny. Nahoře stačí vybrat to nejbližší.",
  },
  {
    otazka: "Co se stane po 30 dnech?",
    odpoved: ZKUSEBNI_SLIB.body[3],
  },
  {
    otazka: "Kdo uvidí naše data?",
    odpoved:
      "Jen lidé, které do své rodiny v Klidoo pozvete. Rodiny jsou od sebe oddělené přímo v databázi, ne jen v aplikaci.",
  },
];

/**
 * Vstupní stránka pro placenou návštěvu z Googlu i z Facebooku.
 *
 * Jeden úkol: naklikat si svůj rozpis a uložit ho do aplikace. Proto bez
 * menu (viz rozvržení skupiny), nástroj hned pod nadpisem a zbytek stránky
 * jen pro toho, kdo potřebuje vědět víc, než uloží.
 */
export default function VyzkousetStranka() {
  return (
    <Sloupec>
      <div className="pb-4 pt-4 sm:pb-8 sm:pt-12">
        <Nadtitulek>Pro rodiče, kteří se o děti střídají</Nadtitulek>
        <h1 className="mt-3 font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
          U koho jsou děti příští týden?
        </h1>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
          Klepněte, jak se střídáte, a uvidíte celý měsíc dopředu.
        </p>
      </div>

      <VstupniRozvrh>
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            V {ZNACKA} k rozpisu přibude
          </h2>
          <ul className="mt-4 space-y-4">
            {CO_PRIBUDE.map(({ nazev, popis, barva }) => (
              <li key={nazev} className="flex items-start gap-3">
                <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${barva}`} aria-hidden />
                <span>
                  <span className="block font-semibold text-ink">{nazev}</span>
                  <span className="block text-[0.95rem] leading-relaxed text-ink-muted">{popis}</span>
                </span>
              </li>
            ))}
            <li className="flex items-start gap-3">
              <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-parent-b" aria-hidden />
              <span>
                <span className="block font-semibold text-ink">Druhý rodič vidí totéž</span>
                <span className="block text-[0.95rem] leading-relaxed text-ink-muted">
                  Pozvete ho odkazem a nic neplatí. Konec dohadování, co bylo domluvené.
                </span>
              </span>
            </li>
          </ul>
        </section>

        <section className="mt-10 rounded-2xl bg-surface-2 px-5 py-4">
          <h2 className="font-semibold text-ink">Kolik to stojí</h2>
          <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-muted">
            {ZKUSEBNI_SLIB.dni} dní zdarma se všemi funkcemi, bez zadávání karty. Potom{" "}
            {korun(CENIK[0].cena)} měsíčně, nebo {korun(CENIK[1].cena)} ročně — za celou rodinu,
            ne za každého zvlášť.{" "}
            <Link href="/cenik" className="font-medium text-brand underline underline-offset-4">
              Ceník
            </Link>
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Časté otázky</h2>
          <div className="mt-4 space-y-2">
            {OTAZKY.map(({ otazka, odpoved }) => (
              <details key={otazka} className="rounded-2xl border border-line bg-surface px-4 py-3.5">
                <summary className="cursor-pointer font-medium text-ink">{otazka}</summary>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted">{odpoved}</p>
              </details>
            ))}
          </div>
        </section>
      </VstupniRozvrh>

      <div className="h-12" />
    </Sloupec>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BellRing,
  CalendarDays,
  Car,
  FileText,
  GraduationCap,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Sloupec, Nadtitulek, DalsiCteni } from "@/components/web/prvky";
import { LeadForm } from "@/components/web/lead-form";
import { UkazkyAplikace } from "@/components/web/ukazky";
import { POPIS, ZNACKA } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    absolute: `${ZNACKA} — kalendář a výdaje pro střídavou péči`,
  },
  description: POPIS,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${ZNACKA} — kalendář a výdaje pro střídavou péči`,
    description: POPIS,
    type: "website",
  },
};

/** Ukázkový týden do hlavičky — stejné barvy, jaké má kalendář v aplikaci. */
const UKAZKOVY_TYDEN: { den: string; strana: "a" | "b"; poznamka?: string }[] = [
  { den: "Po", strana: "a" },
  { den: "Út", strana: "a", poznamka: "Plavání" },
  { den: "St", strana: "a" },
  { den: "Čt", strana: "b", poznamka: "Předávka 18:00" },
  { den: "Pá", strana: "b" },
  { den: "So", strana: "b", poznamka: "Zubař" },
  { den: "Ne", strana: "b" },
];

const FUNKCE = [
  {
    ikona: CalendarDays,
    nazev: "Kalendář péče",
    popis:
      "Sudé a liché týdny, střídání po týdnu, schéma 2-2-3 nebo vlastní rozpis po dnech. " +
      "Prázdniny a státní svátky se doplní samy podle okresu.",
  },
  {
    ikona: Car,
    nazev: "Kroužky a doprava",
    popis:
      "U každé aktivity je napsané, kdo veze a kdo vyzvedává. Konec zpráv „vyzvedneš ji dneska ty?“ ve tři odpoledne.",
  },
  {
    ikona: Receipt,
    nazev: "Výdaje s účtenkami",
    popis:
      "Vyfotíš účtenku, zadáš částku a klíč rozdělení. Klidoo dopočítá, kdo komu kolik dluží. Import z Excelu umí taky.",
  },
  {
    ikona: GraduationCap,
    nazev: "Škola a rozvrh",
    popis:
      "Rozvrh každého dítěte, školní termíny a zprávy z EduPage. Oba rodiče vidí totéž ve stejnou chvíli.",
  },
  {
    ikona: BellRing,
    nazev: "Připomínky",
    popis:
      "Notifikace před předávkou, kroužkem i doktorem. Do Telegramu nebo do prohlížeče, ne jen do aplikace, kterou zrovna nemáš otevřenou.",
  },
  {
    ikona: FileText,
    nazev: "Doklady dětí",
    popis:
      "Kartička pojištěnce, občanka, potvrzení ze školy. Nafocené na jednom místě, dostupné z obou domácností.",
  },
];

const OTAZKY = [
  {
    otazka: "Musí Klidoo používat oba rodiče?",
    odpoved:
      "Nemusí. Spousta lidí si ho pořizuje proto, že v tom chce mít sám pořádek — kalendář, " +
      "výdaje a školní termíny dávají smysl i bez druhé strany. Když se druhý rodič přidá, " +
      "ušetří to zprávy oběma. Jeho přístup je zdarma, platí jedna domácnost.",
  },
  {
    otazka: "Vidí druhý rodič všechno, co si zapíšu?",
    odpoved:
      "Vidí to, co je společné: kalendář péče, kroužky, události a výdaje, které do rodiny " +
      "zadáš. Nastavení, propojení s Googlem nebo EduPage a tvoje notifikace jsou tvoje.",
  },
  {
    otazka: "Umí to sudé a liché týdny?",
    odpoved:
      "Ano, a taky střídání po týdnu, čtrnáctidenní cyklus, schéma 2-2-3 nebo vlastní rozpis, " +
      "kde si naklikáš konkrétní dny. Rozpis může být jednotýdenní i dvoutýdenní.",
  },
  {
    otazka: "Propojím to s kalendářem v telefonu?",
    odpoved:
      "Ano, přes Google Kalendář. Péče, kroužky i události se ti pak zobrazí vedle pracovních " +
      "schůzek, takže si na týden u dětí nenaplánuješ služebku.",
  },
  {
    otazka: "Kde jsou data uložená?",
    odpoved:
      "Na evropských serverech. Fotky účtenek a dokladů leží v úložišti, ke kterému se " +
      "dostane jen tvoje rodina — přístup hlídá databáze, ne jen aplikace.",
  },
];

export default async function Domu() {
  const supabase = await createClient();

  // Kdo je přihlášený, chce aplikaci, ne prodejní stránku.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/prehled");
  } catch {
    // Supabase nedostupná — ukážeme veřejnou stránku, ta ji nepotřebuje.
  }

  return (
    <>
      {/* ── Hlavička ─────────────────────────────────────────────── */}
      <section className="pb-10 pt-12 sm:pb-16 sm:pt-20">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <Nadtitulek>Pro rodiny se dvěma domovy</Nadtitulek>
            <h1 className="mt-3 font-display text-[2.25rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[3.25rem]">
              Kdo, kdy, kam.
              <br />
              Bez dohadování.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-muted">
              Klidoo je kalendář, kroužky a výdaje pro děti, které mají dva domovy. Jeden
              rozvrh, do kterého vidí oba rodiče — takže se není o čem přít.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/registrace"
                className="inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
              >
                Vyzkoušet zdarma
              </Link>
              <Link
                href="/kalkulacka"
                className="inline-flex h-12 items-center rounded-xl border border-line-strong bg-surface px-6 font-medium text-ink transition-colors hover:bg-surface-2"
              >
                Spočítat noci u rodičů
              </Link>
            </div>

            <p className="mt-4 flex items-center gap-2 text-sm text-ink-subtle">
              <Users size={16} aria-hidden />
              Druhý rodič má přístup vždycky zdarma. Platí jedna domácnost.
            </p>
          </div>

          {/* Ukázka týdne. Tohle je celý produkt v jednom obrázku:
              každý den má barvu podle toho, u koho dítě spí. */}
          <div className="card p-5 sm:p-6">
            <div className="flex items-baseline justify-between">
              <span className="font-display font-semibold text-ink">Tento týden</span>
              <span className="text-xs font-medium uppercase tracking-wider text-ink-subtle">
                14. týden
              </span>
            </div>

            <div className="mt-4 space-y-1.5">
              {UKAZKOVY_TYDEN.map(({ den, strana, poznamka }) => (
                <div
                  key={den}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{
                    backgroundColor:
                      strana === "a" ? "var(--parent-a-bg)" : "var(--parent-b-bg)",
                  }}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: strana === "a" ? "var(--parent-a)" : "var(--parent-b)",
                    }}
                    aria-hidden
                  />
                  <span
                    className="w-8 text-sm font-semibold"
                    style={{
                      color: strana === "a" ? "var(--parent-a-text)" : "var(--parent-b-text)",
                    }}
                  >
                    {den}
                  </span>
                  <span className="truncate text-sm text-ink-muted">
                    {poznamka ?? (strana === "a" ? "U tebe" : "U druhého rodiče")}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-xs text-ink-subtle">
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: "var(--parent-a)" }}
                  aria-hidden
                />
                U tebe · 16 nocí
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: "var(--parent-b)" }}
                  aria-hidden
                />
                U druhého · 15 nocí
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Co se doopravdy děje ─────────────────────────────────── */}
      <section className="border-y border-line bg-surface py-14 sm:py-16">
        <Sloupec siroky>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Právní část se vyřeší jednou. Provoz každý týden.
          </h2>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-muted">
            Rozsudek nebo dohoda je hotová za pár měsíců. To, co rodiče vyčerpá, přijde potom —
            a nikdo o tom předem nemluví.
          </p>

          <div className="mt-9 grid gap-6 sm:grid-cols-3">
            {[
              {
                nazev: "Informace se ztrácejí",
                popis:
                  "Škola napíše jednomu, druhý o tom neví. Zubař, plavky, výlet, souhlas s focením.",
              },
              {
                nazev: "Peníze se nepočítají",
                popis:
                  "Kdo zaplatil lyžák, kdo brusle, kdo tábor. Za rok si to nikdo nepamatuje a zůstane pocit křivdy.",
              },
              {
                nazev: "Domlouvání bere energii",
                popis:
                  "Deset zpráv o tom, kdo vyzvedne dítě ve čtvrtek, je deset příležitostí k hádce.",
              },
            ].map(({ nazev, popis }) => (
              <div key={nazev} className="border-l-2 border-line-strong pl-4">
                <h3 className="font-display font-semibold text-ink">{nazev}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-muted">{popis}</p>
              </div>
            ))}
          </div>
        </Sloupec>
      </section>

      {/* ── Jak to vypadá uvnitř ─────────────────────────────────── */}
      {/* Rodič, který se rozhoduje, chce vidět aplikaci dřív, než dá
          e-mail. Popis funkcí to nenahradí. */}
      <section className="py-14 sm:py-20">
        <Sloupec siroky>
          <Nadtitulek>Jak to vypadá uvnitř</Nadtitulek>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Podívej se, do čeho jdeš
          </h2>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-muted">
            Čtyři obrazovky, ve kterých rodiče tráví skoro všechen čas.
          </p>

          <div className="mt-10">
            <UkazkyAplikace />
          </div>
        </Sloupec>
      </section>

      {/* ── Funkce ───────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <Sloupec siroky>
          <Nadtitulek>Co Klidoo umí</Nadtitulek>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Všechno kolem dětí na jednom místě
          </h2>

          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FUNKCE.map(({ ikona: Ikona, nazev, popis }) => (
              <div key={nazev}>
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"
                  aria-hidden
                >
                  <Ikona size={20} />
                </span>
                <h3 className="mt-3.5 font-display text-base font-semibold text-ink">
                  {nazev}
                </h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-muted">{popis}</p>
              </div>
            ))}
          </div>
        </Sloupec>
      </section>

      {/* ── Sám, nebo spolu ──────────────────────────────────────── */}
      <section className="border-y border-line bg-surface py-14 sm:py-16">
        <Sloupec siroky>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Funguje i tehdy, když ho používáš sám
              </h2>
              <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-muted">
                Nemusíš druhého rodiče nikam přemlouvat. Kalendář, výdaje a školní termíny
                dávají smysl už proto, že v tom chceš mít konečně pořádek ty. Když se druhý
                rodič později přidá, uvidí stejný týden — a psaní ubude oběma.
              </p>
            </div>
            <div className="card p-6">
              <h3 className="font-display text-lg font-semibold text-ink">
                Když se přidá i druhá strana
              </h3>
              <ul className="mt-4 space-y-3">
                {[
                  "Předávky, kroužky a doktoři jsou v jednom rozpisu, ne ve dvou hlavách.",
                  "Výdaje se dělí podle klíče, na kterém jste se domluvili, ne podle paměti.",
                  "Změnu vidí druhý rodič hned, bez zprávy „prosím tě, ještě…“.",
                  "Přístup druhého rodiče je zdarma.",
                ].map((veta) => (
                  <li key={veta} className="flex gap-3 text-[0.95rem] text-ink-muted">
                    <ShieldCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-brand"
                      aria-hidden
                    />
                    {veta}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Sloupec>
      </section>

      {/* ── Rozcestník na obsah ──────────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <Sloupec siroky>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Než se do toho pustíte
          </h2>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-muted">
            Tři věci, které řeší skoro každý, kdo o střídavé péči uvažuje. Zdarma a bez
            registrace.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                href: "/jak-funguje-stridava-pece",
                nazev: "Jak funguje střídavá péče",
                popis: "Podmínky, rytmy střídání, výživné a trvalé bydliště. Bez právničiny.",
              },
              {
                href: "/vzor-dohody-o-stridave-peci",
                nazev: "Vzor dohody",
                popis: "Co musí obsahovat, aby ji soud schválil, a na co se zapomíná.",
              },
              {
                href: "/kalkulacka-vyzivneho",
                nazev: "Kalkulačka výživného",
                popis:
                  "Podle tabulky ministerstva. Počítá s příjmy obou rodičů i s rozsahem péče.",
              },
            ].map(({ href, nazev, popis }) => (
              <Link
                key={href}
                href={href}
                className="card block p-5 transition-colors hover:border-brand"
              >
                <span className="font-display font-semibold text-ink">{nazev}</span>
                <span className="mt-1.5 block text-sm leading-relaxed text-ink-muted">
                  {popis}
                </span>
              </Link>
            ))}
          </div>
        </Sloupec>
      </section>

      {/* ── Otázky ───────────────────────────────────────────────── */}
      <section className="border-t border-line bg-surface py-14 sm:py-16">
        <Sloupec siroky>
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
              Časté otázky
            </h2>
            <div className="mt-6 space-y-3">
              {OTAZKY.map(({ otazka, odpoved }) => (
                <details
                  key={otazka}
                  className="rounded-2xl border border-line bg-canvas px-4 py-3.5"
                >
                  <summary className="cursor-pointer font-medium text-ink">{otazka}</summary>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted">
                    {odpoved}
                  </p>
                </details>
              ))}
            </div>

            <LeadForm
              magnet="newsletter"
              nadpis="Chceš vědět, co přibude?"
              popis="Píšeme jen tehdy, když je co říct — nová funkce, mobilní aplikace, změna v pravidlech střídavé péče. Pár e-mailů za rok."
              tlacitko="Odebírat"
              hotovo="Díky. Ozveme se, až bude co říct."
            />

            <Link
              href="/registrace"
              className="inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
            >
              Založit rodinu zdarma
            </Link>
          </div>

          <DalsiCteni
            odkazy={[
              {
                href: "/pro-advokaty",
                nazev: "Pro advokáty",
                popis: "Klienti odcházejí s režimem, který funguje i po rozsudku.",
              },
              {
                href: "/pro-mediatory",
                nazev: "Pro mediátory",
                popis: "Provize za doporučení a nástroj, který dohodu udrží naživu.",
              },
            ]}
          />
        </Sloupec>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: ZNACKA,
              applicationCategory: "LifestyleApplication",
              operatingSystem: "Web",
              inLanguage: "cs",
              description: POPIS,
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: OTAZKY.map(({ otazka, odpoved }) => ({
                "@type": "Question",
                name: otazka,
                acceptedAnswer: { "@type": "Answer", text: odpoved },
              })),
            },
          ]),
        }}
      />
    </>
  );
}

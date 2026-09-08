import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
import { Sloupec, Nadtitulek, DalsiCteni, FotoPas } from "@/components/web/prvky";
import { LeadForm } from "@/components/web/lead-form";
import { UkazkyAplikace } from "@/components/web/ukazky";
import { POPIS, ZNACKA } from "@/lib/brand";
import { CENIK, ZKUSEBNI_SLIB, korun } from "@/lib/tarify";

export const metadata: Metadata = {
  title: {
    absolute: `${ZNACKA} — kalendář a výdaje pro střídavou péči`,
  },
  description: POPIS,
  alternates: { canonical: "/" },
  openGraph: {
    // Ve vyhledávači vyhrává titulek s klíčovým slovem, na Facebooku
    // ten, u kterého člověk zpomalí. Proto se tyhle dva liší.
    title: `${ZNACKA} — konec dohadování, kdo, kdy a za kolik`,
    description: POPIS,
    type: "website",
    url: "/",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: ZNACKA }],
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
      "Sudé a liché týdny, 2-2-3 nebo vlastní rozpis po dnech. Prázdniny a svátky " +
      "se doplní samy podle okresu. Nikdo už nepočítá na prstech, čí je příští víkend.",
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
      "Vyfotíš účtenku, zadáš částku a klíč rozdělení. Na konci měsíce je vidět jedno " +
      "číslo místo dvou různých vzpomínek. Import z Excelu umí taky.",
  },
  {
    ikona: GraduationCap,
    nazev: "Škola a rozvrh",
    popis:
      "Rozvrh každého dítěte, školní termíny a zprávy z EduPage. Konec vět „mně škola " +
      "nic neposlala“ — oba rodiče vidí totéž ve stejnou chvíli.",
  },
  {
    ikona: BellRing,
    nazev: "Připomínky",
    popis:
      "Upozornění před předávkou, kroužkem i doktorem přijde do telefonu samo. " +
      "Zapomenout jde jen na to, co ti nikdo nepřipomene.",
  },
  {
    ikona: FileText,
    nazev: "Doklady dětí",
    popis:
      "Kartička pojištěnce, občanka, potvrzení ze školy. Vyfocené jednou a po ruce " +
      "i v čekárně u lékaře, ať máš dítě zrovna ty, nebo ne.",
  },
];

const OTAZKY = [
  {
    otazka: "Kolik to stojí?",
    odpoved:
      "Prvních 30 dní zdarma se všemi funkcemi a bez zadání karty. Potom 199 Kč měsíčně nebo " +
      "1 990 Kč ročně za celou rodinu — ne za člověka. Druhý rodič, prarodiče, nový partner, teta i chůva jsou v ceně.",
  },
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
            <Nadtitulek>Pro rodiče, kteří spolu už nebydlí</Nadtitulek>
            {/* Nadpis pojmenovává nepřítele, ne produkt. „Kalendář pro
                střídavou péči" je popis kategorie — takových vět čte
                člověk ve výsledcích hledání deset a nezastaví se u žádné.
                U koho jsou tenhle týden a kdo platil obědy pozná jako
                svoje. */}
            <h1 className="mt-3 font-display text-[2.25rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[3.25rem]">
              Konec dohadování,
              <br />
              kdo, kdy a za kolik.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-muted">
              U koho jsou tenhle týden. Kdo je veze z fotbalu. Kdo zaplatil obědy a jestli
              se to někdy vyrovná. V Klidoo je to napsané jednou, na jednom místě — a vidí
              to oba.
            </p>
            <p className="mt-4 max-w-lg font-display text-xl font-semibold leading-snug text-ink">
              Klidoo je od toho, abyste byli v klidu.
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

            {/* Věta musí zůstat jedním odstavcem: `flex` by z každého kusu
                textu udělal vlastní sloupec a odkaz by se zalomil doprostřed. */}
            <p className="mt-4 flex items-start gap-2 text-sm text-ink-subtle">
              <Users size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                {ZKUSEBNI_SLIB.dni} dní zdarma se vším všudy, bez karty. Potom{" "}
                <Link href="/cenik" className="underline underline-offset-4 hover:text-ink">
                  {korun(CENIK[0].cena)} měsíčně
                </Link>{" "}
                za celou rodinu — druhý rodič neplatí nic.
              </span>
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

      {/* ── Pás s fotkou ─────────────────────────────────────────── */}
      {/* Nad ním jsou samá čísla a rozpisy. Tohle je jediné místo, kde
          návštěvník uvidí, o koho vlastně jde, ještě než začne číst
          o problémech.

          Je tu schválně otec. Appky pro rodiny se vizuálně dělají pro
          matky a otec ve střídavé péči si zvykl, že na obrázcích není —
          na nejvýš položené fotce celého webu to má vidět jinak. */}
      <FotoPas
        src="/foto/cesta-ze-skoly.jpg"
        alt="Otec jde s dcerou a synem ze školy podzimní ulicí, kluk mu něco vypráví."
        prioritni
      />

      {/* ── Kdo za tím stojí ─────────────────────────────────────── */}
      {/* Tady je jediná věc, kterou konkurence nemůže zkopírovat. Funkce
          se dají dodělat za měsíc, „psal to někdo, kdo tím prošel“ ne.
          Proto je to hned pod první fotkou, ne schované v patičce. */}
      <section className="border-y border-line bg-surface py-14 sm:py-16">
        <Sloupec siroky>
          <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-14">
            <div>
              <Nadtitulek>Kdo za tím stojí</Nadtitulek>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Klidoo píše rodič, který tím sám prochází
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-muted">
                Tohle není appka od někoho, kdo si střídavou péči nastudoval z průzkumu
                trhu. Vznikla proto, že ten samý kolotoč — předávky, kroužky, účtenky,
                zprávy o tom, kdo koho kdy vyzvedne — potřeboval někdo dostat z hlavy ven.
              </p>
              <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-muted">
                Každá funkce je tu proto, že něco konkrétního nefungovalo. Nic tu není
                „protože to mají ostatní“. Když ti něco chybí nebo se ti něco nelíbí,
                napiš na{" "}
                <a
                  href="mailto:info@klidoo.cz"
                  className="font-medium text-brand underline underline-offset-4"
                >
                  info@klidoo.cz
                </a>
                . Čte to člověk, který aplikaci píše, ne oddělení podpory.
              </p>
            </div>

            <div className="card p-6 sm:p-7">
              <h3 className="font-display text-lg font-semibold text-ink">
                Postavené na české střídavé péči
              </h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted">
                Zahraniční aplikace jsou hezké, ale nevědí, co je okres ani tabulka
                ministerstva. Tohle jsou věci, které bez toho nejdou:
              </p>
              <ul className="mt-4 space-y-3.5">
                {[
                  {
                    nazev: "Počítá noci, ne dny",
                    popis:
                      "Den předání patří půl na půl. Soud i výživné se baví o nocích — a ty v Klidoo sedí na jednu.",
                  },
                  {
                    nazev: "Zná český školní rok",
                    popis:
                      "Jarní prázdniny má každý okres jindy. Doplní se samy i se svátky, takže se o ně v lednu nikdo nepřetahuje.",
                  },
                  {
                    nazev: "Výživné podle tabulky ministerstva",
                    popis:
                      "Doporučená rozmezí podle věku dítěte, příjmů obou rodičů a rozsahu péče.",
                  },
                  {
                    nazev: "Druhý rodič neplatí nic",
                    popis:
                      "A ani nikdo další. Prarodiče, nový partner, teta, chůva — přidej každého, kdo vozí, hlídá nebo vyzvedává. Platí jedna domácnost za celou rodinu.",
                  },
                ].map(({ nazev, popis }) => (
                  <li key={nazev} className="flex gap-3">
                    <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                    <span>
                      <span className="block font-medium text-ink">{nazev}</span>
                      <span className="mt-0.5 block text-[0.9rem] leading-relaxed text-ink-muted">
                        {popis}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Sloupec>
      </section>

      {/* ── Co se doopravdy děje ─────────────────────────────────── */}
      <section className="border-y border-line bg-surface py-14 sm:py-16">
        <Sloupec siroky>
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_0.85fr] lg:gap-12">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Právní část se vyřeší jednou. Provoz každý týden.
              </h2>
              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-muted">
                Rozsudek nebo dohoda je hotová za pár měsíců. Co rodiče doopravdy vyčerpá,
                začne až potom a trvá dalších deset let — a nikdo o tom předem nemluví.
              </p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/foto/vecer-doma.jpg"
                alt="Matka telefonuje u kuchyňské linky, dcera za ní u stolu píše úkoly."
                fill
                sizes="(min-width: 1024px) 28rem, 100vw"
                className="object-cover"
              />
            </div>
          </div>

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
            Šest obrazovek, ve kterých rodiče tráví skoro všechen čas. Žádné obrázky
            z fotobanky — je to ta samá aplikace, jen s vymyšlenou rodinou.
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
            Šest věcí, které přestanete řešit po telefonu
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
              {/* Fotka je tu schválně jednoho rodiče s dítětem: sekce slibuje,
                  že appka dává smysl i bez druhé strany, a obrázek celé rodiny
                  by tvrdil pravý opak. */}
              <div className="relative mb-6 aspect-[4/3] overflow-hidden rounded-2xl">
                <Image
                  src="/foto/tata-a-dcera.jpg"
                  alt="Otec sedí večer u stolu vedle dcery, která kreslí."
                  fill
                  sizes="(min-width: 1024px) 32rem, 100vw"
                  className="object-cover"
                />
              </div>
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

            {/* Poslední věta stránky. Kdo dočetl až sem, už ví, co Klidoo
                umí — potřebuje důvod začít dnes, ne další výčet funkcí. */}
            <h2 className="mt-14 font-display text-3xl font-semibold tracking-tight text-ink">
              Příští týden se to bude řešit znovu
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-ink-muted">
              Kroužky, předávky a účtenky nepočkají, až na to bude klid. Založení rodiny
              trvá dvě minuty a prvních {ZKUSEBNI_SLIB.dni} dní nic neplatíš — ani kartu
              nezadáváš.
            </p>

            <Link
              href="/registrace"
              className="mt-6 inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
            >
              Založit rodinu zdarma
            </Link>
            <p className="mt-3 text-sm text-ink-subtle">
              {ZKUSEBNI_SLIB.vetaKratka} Potom {korun(CENIK[0].cena)} měsíčně za celou rodinu —{" "}
              <Link href="/cenik" className="underline underline-offset-4 hover:text-ink">
                ceník
              </Link>
              .
            </p>
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
              "@type": "Organization",
              name: ZNACKA,
              url: "https://klidoo.cz",
              logo: "https://klidoo.cz/icons/icon-512.png",
              email: "info@klidoo.cz",
              // Pomáhá Googlu spojit doménu se jménem značky — přesně to,
              // co chybí, když hledání „klidoo“ nenajde vůbec nic. Až
              // budou sociální sítě, jejich odkazy patří do `sameAs`.
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: ZNACKA,
              url: "https://klidoo.cz",
              inLanguage: "cs",
            },
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: ZNACKA,
              applicationCategory: "LifestyleApplication",
              operatingSystem: "Web",
              inLanguage: "cs",
              description: POPIS,
              offers: CENIK.map((tarif) => ({
                "@type": "Offer",
                name: tarif.nazev,
                price: tarif.cena,
                priceCurrency: "CZK",
                url: "https://klidoo.cz/cenik",
              })),
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

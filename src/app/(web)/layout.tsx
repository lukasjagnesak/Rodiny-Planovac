import Link from "next/link";
import { Logo, Znak } from "@/components/ui/logo";
import { SledovaniPuvodu } from "@/components/web/puvod";
import { MobilniMenu } from "@/components/web/mobilni-menu";
import { ZNACKA } from "@/lib/brand";

/**
 * Veřejná část webu — bez přihlášení a bez aplikační navigace.
 *
 * Sem chodí lidé z vyhledávače a z odkazů, které jim někdo poslal. Většinou
 * v nejhorším týdnu svého života, často na mobilu, často v noci. Proto je
 * hlavička krátká a jediné výrazné tlačítko vede do aplikace.
 */

const NAVIGACE = [
  { href: "/jak-funguje-stridava-pece", popisek: "Průvodce" },
  { href: "/kalkulacka-vyzivneho", popisek: "Výživné" },
  { href: "/kalkulacka", popisek: "Kalkulačka péče" },
  { href: "/vzor-dohody-o-stridave-peci", popisek: "Vzor dohody" },
  { href: "/cenik", popisek: "Ceník" },
];

const PATICKA = [
  {
    nadpis: "Pro rodiče",
    odkazy: [
      { href: "/jak-funguje-stridava-pece", popisek: "Jak funguje střídavá péče" },
      { href: "/vzor-dohody-o-stridave-peci", popisek: "Vzor dohody o střídavé péči" },
      { href: "/checklist-prvnich-30-dni", popisek: "Checklist prvních 30 dní" },
    ],
  },
  {
    nadpis: "Nástroje",
    odkazy: [
      { href: "/kalkulacka-vyzivneho", popisek: "Kalkulačka výživného" },
      { href: "/kalkulacka", popisek: "Kalkulačka střídavé péče" },
      { href: "/cenik", popisek: "Ceník" },
    ],
  },
  {
    nadpis: "Spolupráce",
    odkazy: [
      { href: "/pro-advokaty", popisek: "Pro advokáty" },
      { href: "/pro-mediatory", popisek: "Pro mediátory" },
    ],
  },
];

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SledovaniPuvodu />

      <header className="safe-top sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-4 px-5 sm:px-6">
          <Link href="/" aria-label={`${ZNACKA} — úvodní stránka`}>
            <Logo size={32} />
          </Link>

          <nav className="ml-4 hidden items-center gap-5 lg:flex">
            {NAVIGACE.map(({ href, popisek }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {popisek}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {/* Obě cesty do aplikace musí být vidět i na telefonu — kdo už
                účet má, hledá přihlášení, a nechceme ho nutit do menu. */}
            <Link
              href="/prihlaseni"
              className="px-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Přihlásit se
            </Link>
            <Link
              href="/registrace"
              className="inline-flex h-10 items-center rounded-xl bg-brand px-3 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-hover sm:px-4"
            >
              Vyzkoušet<span className="hidden xs:inline">&nbsp;zdarma</span>
            </Link>
            <MobilniMenu odkazy={NAVIGACE} />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo size={30} />
              <p className="mt-3 max-w-[22rem] text-sm leading-relaxed text-ink-muted">
                Kalendář, kroužky a výdaje pro rodiny, které žijí ve dvou domácnostech.
              </p>
            </div>

            {PATICKA.map(({ nadpis, odkazy }) => (
              <div key={nadpis}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  {nadpis}
                </h2>
                <ul className="mt-3 space-y-2">
                  {odkazy.map(({ href, popisek }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm text-ink-muted transition-colors hover:text-ink"
                      >
                        {popisek}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-6 text-sm text-ink-subtle">
            <span className="flex items-center gap-2">
              <Znak size={18} />© {new Date().getFullYear()} {ZNACKA}
            </span>
            <Link href="/zasady-ochrany-osobnich-udaju" className="hover:text-ink">
              Zásady ochrany osobních údajů
            </Link>
            <Link href="/prihlaseni" className="hover:text-ink">
              Přihlášení
            </Link>
            <span className="basis-full text-xs leading-relaxed">
              Obsah na tomto webu je informativní a nenahrazuje právní poradenství.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

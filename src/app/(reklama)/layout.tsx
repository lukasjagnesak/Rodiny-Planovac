import Link from "next/link";
import { Logo, Znak } from "@/components/ui/logo";
import { SledovaniPuvodu } from "@/components/web/puvod";
import { SouhlasLista } from "@/components/web/souhlas-lista";
import { ZNACKA } from "@/lib/brand";

/**
 * Rozvržení vstupních stránek z placené reklamy.
 *
 * Bez menu a bez velké patičky schválně. Za každou návštěvu tu platíme
 * a stránka má jeden úkol; každý odkaz navíc je cesta pryč od něj. Zůstává
 * logo (lidé ho čekají a vede na úvod), přihlášení pro ty, kdo už účet
 * mají, a právní odkazy, které tu být musí.
 *
 * Měření původu a lišta souhlasu jsou tu stejně jako na zbytku webu —
 * bez nich by se nedalo říct, kolik lidí přivedla která reklama.
 */
export default function ReklamaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SledovaniPuvodu />
      <SouhlasLista />

      <header className="safe-top border-b border-line bg-canvas">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-5 sm:px-6">
          <Link href="/" aria-label={`${ZNACKA} — úvodní stránka`}>
            <Logo size={30} />
          </Link>
          <Link
            href="/prihlaseni"
            className="px-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Přihlásit se
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-6 text-sm text-ink-muted sm:px-6">
          <span className="flex items-center gap-2">
            <Znak size={18} />© {new Date().getFullYear()} {ZNACKA}
          </span>
          <Link href="/zasady-ochrany-osobnich-udaju" className="hover:text-ink">
            Zásady ochrany osobních údajů
          </Link>
          <Link href="/obchodni-podminky" className="hover:text-ink">
            Obchodní podmínky
          </Link>
        </div>
      </footer>
    </div>
  );
}

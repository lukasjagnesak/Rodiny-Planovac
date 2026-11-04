import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { SouhlasLista } from "@/components/web/souhlas-lista";
import { SledovaniPuvodu } from "@/components/web/puvod";

/**
 * Rozvržení registrace — vstupní stránky z reklam a Instagramu.
 *
 * Vlastní, ne sdílené s přihlášením: přihlášení je jeden úzký formulář,
 * registrace potřebuje na počítači dva sloupce (přínosy vlevo, formulář
 * vpravo). Hlavička je jen jeden řádek, aby byl formulář na telefonu co
 * nejvýš — a přesto z ní vede cesta na web i k přihlášení.
 */
export default function RegistraceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" aria-label="Klidoo — hlavní stránka" className="rounded-xl">
          <Logo size={32} />
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          {/* I na telefonu: kdo přišel z reklamy a chce se nejdřív
              podívat, nesmí skončit ve slepé uličce. */}
          <Link
            href="/"
            className="rounded-pill px-2.5 py-2 text-ink-muted transition-colors hover:bg-surface hover:text-ink sm:px-3"
          >
            <span className="sm:hidden">Co umí</span>
            <span className="hidden sm:inline">Co Klidoo umí</span>
          </Link>
          <Link
            href="/prihlaseni"
            className="rounded-pill px-2.5 py-2 text-ink-muted transition-colors hover:bg-surface hover:text-ink sm:px-3"
          >
            Přihlásit se
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">{children}</main>

      {/* Registrace je konverze, kterou reklamní systémy potřebují vidět. */}
      <SledovaniPuvodu />
      <SouhlasLista />
    </div>
  );
}

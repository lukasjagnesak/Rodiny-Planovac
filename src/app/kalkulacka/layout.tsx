import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ZNACKA } from "@/lib/brand";

/**
 * Veřejná část webu — bez přihlášení a bez aplikační navigace.
 * Sem chodí lidé z vyhledávače, takže hlavička je jen značka a jedno tlačítko.
 */
export default function VerejnyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-2">
      <header className="safe-top border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/kalkulacka">
            <Logo size={34} />
          </Link>

          <Link
            href="/prihlaseni"
            className="ml-auto text-sm font-medium text-ink-muted hover:text-ink"
          >
            Přihlásit se
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-6 text-sm text-ink-subtle sm:px-6">
          <span>© {new Date().getFullYear()} {ZNACKA}</span>
          <Link href="/prihlaseni" className="hover:text-ink">
            Přihlášení
          </Link>
          <Link href="/registrace" className="hover:text-ink">
            Založit účet
          </Link>
        </div>
      </footer>
    </div>
  );
}

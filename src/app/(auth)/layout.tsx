import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { SouhlasLista } from "@/components/web/souhlas-lista";
import { SledovaniPuvodu } from "@/components/web/puvod";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 pb-10 pt-16">
      {/* Jemné barevné pozadí — modrá a růžová jako obě strany kalendáře */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--parent-a), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--parent-b), transparent 70%)" }}
      />

      {/* Cesta zpět na web. Lidé z reklam a Instagramu přicházejí rovnou
          sem — kdo se chce nejdřív podívat, co Klidoo umí, nesmí skončit
          ve slepé uličce, ze které vede jen zpět v prohlížeči. */}
      <Link
        href="/"
        className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-pill px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Co Klidoo umí
      </Link>

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Link href="/" aria-label="Klidoo — hlavní stránka" className="rounded-xl">
            <Logo size={44} />
          </Link>
          <p className="max-w-xs text-sm text-ink-muted">
            Kalendář střídavé péče, kroužky, výdaje a školní termíny — přehledně
            pro obě domácnosti.
          </p>
        </div>
        {children}
      </div>

      {/* Registrace je konverze, kterou reklamní systémy potřebují vidět. */}
      <SledovaniPuvodu />
      <SouhlasLista />
    </div>
  );
}

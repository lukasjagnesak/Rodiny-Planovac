import { Logo } from "@/components/ui/logo";
import { MereniSkripty } from "@/components/web/mereni-skripty";
import { SouhlasLista } from "@/components/web/souhlas-lista";
import { SledovaniPuvodu } from "@/components/web/puvod";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
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

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo size={44} />
          <p className="max-w-xs text-sm text-ink-muted">
            Kalendář střídavé péče, kroužky, výdaje a školní termíny — přehledně
            pro obě domácnosti.
          </p>
        </div>
        {children}
      </div>

      {/* Registrace je konverze, kterou reklamní systémy potřebují vidět. */}
      <SledovaniPuvodu />
      <MereniSkripty />
      <SouhlasLista />
    </div>
  );
}

import { CalendarHeart } from "lucide-react";

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
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-ink shadow-sm">
            <CalendarHeart className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Rodinný plánovač</h1>
          <p className="max-w-xs text-sm text-ink-muted">
            Kalendář střídavé péče, kroužky, výdaje a události — přehledně pro celou rodinu.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

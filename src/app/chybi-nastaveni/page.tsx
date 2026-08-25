import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "Chybí nastavení" };

/**
 * Záchranná stránka. Zobrazí se místo bílé chyby 500 ve chvíli, kdy
 * aplikace běží, ale nemá vyplněné přístupy k Supabase.
 */
export default function MissingConfigPage() {
  const vars = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
    { key: "SUPABASE_SERVICE_ROLE_KEY", ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { key: "TOKEN_ENCRYPTION_KEY", ok: Boolean(process.env.TOKEN_ENCRYPTION_KEY) },
  ];

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="card w-full max-w-lg p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning-soft text-warning">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">
          Aplikace běží, ale chybí jí přístup k databázi
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Ve složce projektu musí být soubor <code className="rounded bg-surface-2 px-1">.env.local</code>{" "}
          s klíči ze Supabase. Najdeš je v <strong className="text-ink">Project Settings → API</strong>.
        </p>

        <ul className="mt-5 space-y-1.5">
          {vars.map((item) => (
            <li key={item.key} className="flex items-center gap-2.5 text-sm">
              <span
                aria-hidden
                className={`h-2 w-2 shrink-0 rounded-full ${item.ok ? "bg-success" : "bg-danger"}`}
              />
              <code className="min-w-0 truncate text-ink-muted">{item.key}</code>
              <span className={`ml-auto shrink-0 text-xs ${item.ok ? "text-success" : "text-danger"}`}>
                {item.ok ? "vyplněno" : "chybí"}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-xl bg-surface-2 p-3.5 text-sm text-ink-muted">
          <p className="font-medium text-ink">Postup</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4">
            <li>
              <code className="rounded bg-surface px-1">cp .env.example .env.local</code>
            </li>
            <li>Doplň klíče ze Supabase.</li>
            <li>
              Zastav server (<code className="rounded bg-surface px-1">Ctrl+C</code>) a spusť znovu{" "}
              <code className="rounded bg-surface px-1">npm run dev</code>.
            </li>
          </ol>
        </div>

        <p className="mt-4 text-xs text-ink-subtle">
          Soubor začíná tečkou, takže je ve Finderu skrytý — zobrazíš ho zkratkou Cmd+Shift+tečka.
        </p>
      </div>
    </div>
  );
}

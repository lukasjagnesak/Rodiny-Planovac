"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/misc";
import { Nebo, PrihlaseniGoogle } from "@/components/ui/google-button";

/** Důvody, se kterými sem posílá `/auth/callback` neúspěšný odkaz z e-mailu. */
const HLASKY: Record<string, string> = {
  "odkaz-vyprsel":
    "Odkaz už neplatí — platí 60 minut a použít se dá jen jednou. Nech si poslat nový.",
  "odkaz-neplatny": "Odkaz se nepodařilo ověřit. Nech si poslat nový.",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("dal") || "/prehled";
  const duvod = params.get("chyba");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  // Kdo přišel s rozbitým odkazem, chce nový odkaz, ne kolonku na heslo.
  const [mode, setMode] = React.useState<"password" | "magic">(
    duvod ? "magic" : "password",
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [zFragmentu, setZFragmentu] = React.useState<string | null>(null);
  const [duvodSkryt, setDuvodSkryt] = React.useState(false);

  // Supabase posílá důvod dvakrát: v parametrech a ve fragmentu za `#`.
  // Fragment se na server nikdy nedostane, ale přesměrování ho zachová —
  // takže když parametr chybí, přečteme ho tady.
  React.useEffect(() => {
    if (duvod) return;
    const kod = new URLSearchParams(window.location.hash.slice(1)).get("error_code");
    if (kod) setZFragmentu(kod === "otp_expired" ? "odkaz-vyprsel" : "odkaz-neplatny");
  }, [duvod]);

  const hlaska = error ?? (duvodSkryt ? null : HLASKY[duvod ?? zFragmentu ?? ""]) ?? null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDuvodSkryt(true);

    const supabase = createClient();

    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?dal=${encodeURIComponent(next)}`,
        },
      });
      setBusy(false);
      if (error) setError(prettyError(error.message));
      else setSent(true);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(prettyError(error.message));
      return;
    }
    router.push(next);
    router.refresh();
  }

  if (sent) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Mail className="h-6 w-6" />
        </div>
        <h2 className="mt-3 font-semibold text-ink">Zkontroluj e-mail</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Poslali jsme přihlašovací odkaz na <strong className="text-ink">{email}</strong>. Platí 60
          minut.
        </p>
        <Button variant="ghost" className="mt-4" onClick={() => setSent(false)}>
          Zpět na přihlášení
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5 sm:p-6">
      {/* Nahoře schválně: je to nejrychlejší cesta dovnitř a většina lidí
          si stejně nepamatuje, jestli si zakládala heslo. */}
      <PrihlaseniGoogle popisek="Přihlásit se přes Google" dal={next} />
      <Nebo />

      <Field label="E-mail">
        <Input
          type="email"
          autoComplete="email"
          required
          placeholder="jan@example.cz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      {mode === "password" ? (
        <Field label="Heslo">
          <Input
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      ) : null}

      {hlaska ? <Alert tone="danger">{hlaska}</Alert> : null}

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? <Spinner /> : mode === "password" ? "Přihlásit se" : "Poslat odkaz e-mailem"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === "password" ? "magic" : "password"));
          setError(null);
          setDuvodSkryt(true);
        }}
        className="w-full text-center text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
      >
        {mode === "password" ? "Přihlásit se odkazem v e-mailu" : "Přihlásit se heslem"}
      </button>

      <div className="border-t border-line pt-4 text-center text-sm text-ink-muted">
        Nemáš účet?{" "}
        <Link href="/registrace" className="font-medium text-brand hover:underline">
          Zaregistruj se
        </Link>
      </div>
    </form>
  );
}

/** Supabase vrací hlášky anglicky — přeložíme ty nejčastější. */
export function prettyError(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "Nesprávný e-mail nebo heslo.",
    "Email not confirmed": "E-mail zatím není potvrzený. Zkontroluj schránku.",
    "User already registered": "Uživatel s tímto e-mailem už existuje.",
    "Password should be at least 6 characters":
      "Heslo musí mít alespoň 6 znaků.",
    "Signups not allowed for this instance": "Registrace jsou vypnuté.",
  };
  return map[message] ?? message;
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/misc";
import { prettyError } from "../prihlaseni/login-form";

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Pozvánka: /registrace?pozvanka=<token>
  const inviteToken = params.get("pozvanka");

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState(params.get("email") ?? "");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Zvol heslo alespoň o 8 znacích.");
      return;
    }

    setBusy(true);
    setError(null);

    const supabase = createClient();
    const redirectTarget = inviteToken ? `/pozvanka/${inviteToken}` : "/vitejte";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback?dal=${encodeURIComponent(redirectTarget)}`,
      },
    });

    setBusy(false);

    if (error) {
      setError(prettyError(error.message));
      return;
    }

    // Když je v Supabase zapnuté potvrzení e-mailu, session zatím není.
    if (!data.session) {
      setNeedsConfirm(true);
      return;
    }

    router.push(redirectTarget);
    router.refresh();
  }

  if (needsConfirm) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success-soft text-success">
          <MailCheck className="h-6 w-6" />
        </div>
        <h2 className="mt-3 font-semibold text-ink">Ještě potvrzení e-mailu</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Poslali jsme potvrzovací odkaz na <strong className="text-ink">{email}</strong>. Po
          kliknutí tě rovnou pustíme dovnitř.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5 sm:p-6">
      {inviteToken ? (
        <Alert tone="info">
          Registruješ se na základě pozvánky. Po dokončení tě rovnou přidáme do rodiny.
        </Alert>
      ) : null}

      <Field label="Jméno" hint="uvidí ho ostatní členové">
        <Input
          required
          placeholder="Jan Novák"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="E-mail">
        <Input
          type="email"
          required
          autoComplete="email"
          placeholder="jan@example.cz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field label="Heslo" hint="alespoň 8 znaků">
        <Input
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? <Spinner /> : "Vytvořit účet"}
      </Button>

      <div className="border-t border-line pt-4 text-center text-sm text-ink-muted">
        Už máš účet?{" "}
        <Link href="/prihlaseni" className="font-medium text-brand hover:underline">
          Přihlas se
        </Link>
      </div>
    </form>
  );
}

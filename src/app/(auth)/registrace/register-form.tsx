"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/misc";
import { SocialniPrihlaseni } from "@/components/ui/socialni-prihlaseni";
import { CENIK, ZKUSEBNI_SLIB, korun } from "@/lib/tarify";
import { ZNACKA } from "@/lib/brand";
import { prettyError } from "../prihlaseni/login-form";
import { zmer } from "@/lib/mereni";
import { zapisRegistraci } from "@/lib/registrace-mereni";
import { bezpecnyCil } from "@/lib/navrat";

/**
 * Co si člověk vlastně zakládá.
 *
 * Lidé registraci nedokončovali ze strachu, že to bude něco stát. Jediná
 * věta o tom, že je to zdarma, byla drobným šedým písmem pod tlačítkem —
 * a končila cenou. Poslední, co člověk před kliknutím četl, bylo
 * „199 Kč měsíčně". Teď je nahoře, velkým písmem a jako první: kolik to
 * stojí (nic), co po něm chceme (žádnou kartu) a co se stane po 30 dnech
 * (nic, dokud sám nechce). Cena zůstává — schovat ji by byl podvod — ale
 * až jako odpověď na otázku „a kdybych chtěl pokračovat".
 */
const JISTOTY = [
  { co: "Žádná platební karta", proc: "Nic nezadáváte, nic se nestrhne." },
  {
    co: `${ZKUSEBNI_SLIB.dni} dní zdarma, všechny funkce`,
    proc: "Žádná ořezaná verze na zkoušku.",
  },
  {
    co: "Po zkušební době se rozhodnete sami",
    proc: "Bez placení se nic nesmaže — jen se zamkne zapisování.",
  },
  {
    co: "Druhý rodič je zdarma",
    proc: "Platí se jen za jednu domácnost, a jen když se rozhodnete pokračovat.",
  },
];

/**
 * Věta nad formulářem podle toho, odkud člověk přišel. Kdo si právě
 * naklikal rozpis nebo spočítal výživné, má vidět, že se mu to neztratí —
 * registrace je pak „uložit si to", ne „založit si něco neznámého".
 */
function coCeka(dal: string, pozvanka: boolean): string | null {
  if (pozvanka) return "Registrujete se na základě pozvánky. Po dokončení vás rovnou přidáme do rodiny.";
  if (dal.includes("/vitejte?plan=")) return "Váš rozpis je uložený. Po registraci ho najdete v kalendáři.";
  if (dal.startsWith("/prevzit/vyzivne")) {
    return "Váš výpočet je uložený. Po registraci se přenese do aplikace i s výživným.";
  }
  return null;
}

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Pozvánka: /registrace?pozvanka=<token>
  const inviteToken = params.get("pozvanka");
  // Kam po registraci. Chodí sem člověk z veřejné kalkulačky, který má
  // odložený výpočet — bez tohohle by mu po založení účtu spadl pod stůl
  // a průvodce by začal na prázdno.
  const dal = bezpecnyCil(params.get("dal"), "/vitejte");

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState(params.get("email") ?? "");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = React.useState(false);

  // Kde lidé odpadají: jen se podívají, začnou vyplňovat a nedokončí,
  // nebo odejdou přes Google? Bez toho se „nedokončují registraci" nedá
  // rozlišit od „ani ji nezačnou".
  const zacal = React.useRef(false);
  const hlasZacatek = () => {
    if (zacal.current) return;
    zacal.current = true;
    zmer("registrace-zacal");
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Zvolte prosím heslo alespoň o osmi znacích.");
      return;
    }

    setBusy(true);
    setError(null);

    const supabase = createClient();
    const redirectTarget = inviteToken ? `/pozvanka/${inviteToken}` : dal;

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

    // Registrace se počítá i tehdy, když ještě chybí potvrzení e-mailu —
    // jinak by trychtýř tvrdil, že se nikdo neregistroval.
    //
    // Značka se zapisuje tady i na `/vitejte`, kam se vracejí registrace
    // přes Google. Tahle podmínka je to jediné, co drží obě cesty od
    // dvojího započítání téhož člověka.
    if (zapisRegistraci(data.user?.id ?? null)) zmer("registrace");

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
          kliknutí vás rovnou pustíme dovnitř.
        </p>
      </div>
    );
  }

  const kontext = coCeka(dal, Boolean(inviteToken));

  return (
    <form onSubmit={onSubmit} onFocusCapture={hlasZacatek} className="card space-y-5 p-5 sm:p-6">
      {kontext ? <Alert tone="info">{kontext}</Alert> : null}

      {inviteToken ? (
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Připojte se k rodině
          </h1>
          <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-muted">
            Pro vás je {ZNACKA} zdarma — platí jen jedna domácnost, ne vy. Kartu po vás
            nechceme.
          </p>
        </div>
      ) : (
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Vyzkoušejte {ZNACKA} zdarma
          </h1>
          <ul className="mt-3 space-y-2.5">
            {JISTOTY.map(({ co, proc }) => (
              <li key={co} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Check size={13} strokeWidth={3} aria-hidden />
                </span>
                <span className="text-[0.95rem] leading-snug">
                  <strong className="font-semibold text-ink">{co}.</strong>{" "}
                  <span className="text-ink-muted">{proc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Přes Google odpadá heslo i potvrzovací e-mail — u pozvánky, kde
          druhý rodič často nechce nic vyplňovat, je to zásadní rozdíl. */}
      <div
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("button, a")) zmer("registrace-cizi");
        }}
      >
        <SocialniPrihlaseni
          popisekGoogle="Pokračovat přes Google"
          popisekApple="Pokračovat přes Apple"
          dal={inviteToken ? `/pozvanka/${inviteToken}` : dal}
        />
      </div>

      <div className="space-y-4">
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
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="space-y-2.5">
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Spinner /> : inviteToken ? "Připojit se zdarma" : "Vytvořit účet zdarma"}
        </Button>
        <p className="text-center text-sm font-medium text-ink">
          Bez karty. Nic se samo nestrhne.
        </p>
      </div>

      {/* Cena patří sem, ne až za paywall. Kdo ji uvidí až po měsíci
          práce s kalendářem, právem se cítí podvedený. Jen je napsaná
          jako to, čím je: volba na potom, ne podmínka teď. */}
      {inviteToken ? null : (
        <p className="text-center text-[0.8125rem] leading-relaxed text-ink-muted">
          Když budete po {ZKUSEBNI_SLIB.dni} dnech chtít pokračovat, stojí {ZNACKA}{" "}
          {korun(CENIK[0].cena)} měsíčně za celou rodinu.{" "}
          <Link href="/cenik" className="underline underline-offset-4 hover:text-ink">
            Ceník
          </Link>
        </p>
      )}

      <div className="border-t border-line pt-4 text-center text-sm text-ink-muted">
        Už máte účet?{" "}
        <Link
          href={`/prihlaseni?dal=${encodeURIComponent(dal)}`}
          className="font-medium text-brand hover:underline"
        >
          Přihlaste se
        </Link>
      </div>
    </form>
  );
}

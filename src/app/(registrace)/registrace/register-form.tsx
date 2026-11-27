"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Eye, EyeOff, MailCheck, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/misc";
import { Nebo, PrihlaseniGoogle } from "@/components/ui/google-button";
import { PrihlaseniApple } from "@/components/ui/apple-button";
import { PrihlaseniFacebook } from "@/components/ui/facebook-button";
import { APPLE_ZAPNUTY, FACEBOOK_ZAPNUTY, GOOGLE_ZAPNUTY } from "@/lib/zpusoby-prihlaseni";
import { CENIK, ZAKLADAJICI, ZKUSEBNI_SLIB, korun } from "@/lib/tarify";
import { useZakladajiciVolno } from "@/components/web/zakladajici";
import { ZNACKA } from "@/lib/brand";
import { cn } from "@/lib/format";
import { UCET_EXISTUJE, prettyError } from "../../(auth)/prihlaseni/login-form";
import { Ikona } from "@/components/ui/ikona";
import { KartaSoukromi } from "@/components/web/karta-soukromi";
import { zmer } from "@/lib/mereni";
import { zapisRegistraci } from "@/lib/registrace-mereni";
import { bezpecnyCil } from "@/lib/navrat";
import { navrhOpravy } from "@/lib/preklep-emailu";
import { useVAplikaci } from "@/lib/nativni-hook";
import { PravniPoucka } from "@/components/web/pravni-poucka";

/**
 * Věta nad formulářem podle toho, odkud člověk přišel. Kdo si právě
 * naklikal rozpis nebo spočítal výživné, má vidět, že se mu to neztratí —
 * registrace je pak „uložit si to", ne „založit si něco neznámého".
 */
function coCeka(dal: string, pozvanka: boolean): string | null {
  if (pozvanka)
    return "Registrujete se na základě pozvánky. Po dokončení vás rovnou přidáme do rodiny.";
  if (dal.includes("/vitejte?plan="))
    return "Váš rozpis je uložený. Po registraci ho najdete v kalendáři.";
  if (dal.startsWith("/prevzit/vyzivne")) {
    return "Váš výpočet je uložený. Po registraci se přenese do aplikace i s výživným.";
  }
  return null;
}

type Pole = "email" | "heslo";

/** Kontrola jednoho pole. Hláška říká, co udělat, ne co je špatně. */
function chybaPole(pole: Pole, hodnota: string): string | null {
  const v = hodnota.trim();
  if (pole === "email") {
    if (!v) return "Napište e-mail, na který se budete přihlašovat.";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Zkontrolujte e-mail, chybí v něm část.";
  }
  return hodnota.length >= 8 ? null : "Heslo musí mít alespoň 8 znaků.";
}

const CONTROL =
  "h-12 w-full rounded-xl border bg-surface px-3.5 text-base text-ink transition-colors " +
  "placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand/25 " +
  "disabled:opacity-60";

/**
 * Registrační formulář.
 *
 * Co hlídá:
 * - dvojí odeslání (ref, ne jen vypnuté tlačítko — Enter dvakrát rychle
 *   za sebou by jinak prošel dřív, než se tlačítko překreslí),
 * - chyby u konkrétního pole po opuštění pole i po odeslání, se
 *   `aria-invalid` a `aria-describedby`, aby je přečetla i čtečka,
 * - měření kroků trychtýře, každý nejvýš jednou (registrace navíc
 *   vázaná na ID účtu, viz `registrace-mereni`). Reklamním systémům jde
 *   jen název kroku, nikdy obsah formuláře.
 */
export function RegisterForm() {
  const params = useSearchParams();
  // Pozvánka: /registrace?pozvanka=<token>
  const inviteToken = params.get("pozvanka");
  // Kam po registraci. Chodí sem člověk z veřejné kalkulačky, který má
  // odložený výpočet — bez tohohle by mu po založení účtu spadl pod stůl
  // a průvodce by začal na prázdno.
  const dal = bezpecnyCil(params.get("dal"), "/vitejte");

  const [hodnoty, setHodnoty] = React.useState<Record<Pole, string>>({
    email: params.get("email") ?? "",
    heslo: "",
  });
  const [dotceno, setDotceno] = React.useState<Record<Pole, boolean>>({
    email: false,
    heslo: false,
  });
  const [ukazHeslo, setUkazHeslo] = React.useState(false);
  // Aplikace z App Store / Google Play: bez ceny a odkazů na ceník
  // (lib/nativni.ts), potvrzení e-mailu se vrací do aplikace.
  const aplikace = useVAplikaci();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = React.useState(false);
  const odesila = React.useRef(false);

  const prvni = React.useRef<Record<Pole, HTMLInputElement | null>>({
    email: null,
    heslo: null,
  });

  // Rok zdarma jen dokud jsou místa. Než se počet načte, platí rok —
  // tak to stojí i na stránce, ze které člověk přišel. Hook musí běžet
  // před každým `return` níž, jinak React při potvrzení e-mailu spadne.
  const volno = useZakladajiciVolno();
  const rok = ZAKLADAJICI.aktivni && volno !== 0;

  // landing_view — jednou za načtení stránky (StrictMode volá efekt dvakrát).
  const zobrazeno = React.useRef(false);
  React.useEffect(() => {
    if (zobrazeno.current) return;
    zobrazeno.current = true;
    zmer("registrace-zobrazeni");
  }, []);

  // Kde lidé odpadají: jen se podívají, začnou vyplňovat a nedokončí,
  // nebo odejdou přes Google? Bez toho se „nedokončují registraci" nedá
  // rozlišit od „ani ji nezačnou".
  const zacal = React.useRef(false);
  const hlasZacatek = () => {
    if (zacal.current) return;
    zacal.current = true;
    zmer("registrace-zacal");
  };

  const chyby: Record<Pole, string | null> = {
    email: chybaPole("email", hodnoty.email),
    heslo: chybaPole("heslo", hodnoty.heslo),
  };
  const zobrazenaChyba = (pole: Pole) => (dotceno[pole] ? chyby[pole] : null);
  // „gmai.com“ apod. Bez potvrzovacího e-mailu by se na překlep nepřišlo.
  const navrh = dotceno.email && !chyby.email ? navrhOpravy(hodnoty.email) : null;

  const zmenPole = (pole: Pole) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setHodnoty((h) => ({ ...h, [pole]: e.target.value }));
  const opustil = (pole: Pole) => () => setDotceno((d) => ({ ...d, [pole]: true }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (odesila.current) return;

    setDotceno({ email: true, heslo: true });
    const prvniChybne = (["email", "heslo"] as Pole[]).find((p) => chyby[p]);
    if (prvniChybne) {
      prvni.current[prvniChybne]?.focus();
      return;
    }

    odesila.current = true;
    setBusy(true);
    setError(null);
    zmer("registrace-odeslano");

    const supabase = createClient();
    const redirectTarget = inviteToken ? `/pozvanka/${inviteToken}` : dal;

    const { data, error } = await supabase.auth.signUp({
      email: hodnoty.email.trim(),
      password: hodnoty.heslo,
      // Jméno se tu neptáme — zadá se v průvodci, až je člověk uvnitř.
      // Registrace má být co nejkratší cesta do aplikace.
      options: {
        // Platí jen tehdy, když je v Supabase ještě zapnuté potvrzení
        // e-mailu. Bez něj se session vrací hned a odkaz se nepoužije.
        // V aplikaci se odkaz z e-mailu otevře v prohlížeči; `/auth/aplikace`
        // ho vrátí do aplikace, kde leží PKCE ověřovač z této registrace.
        emailRedirectTo: `${window.location.origin}/auth/${aplikace ? "aplikace" : "callback"}?dal=${encodeURIComponent(redirectTarget)}`,
      },
    });

    if (error) {
      odesila.current = false;
      setBusy(false);
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
      setBusy(false);
      setNeedsConfirm(true);
      return;
    }

    // Plné načtení, ne `router.push`: na téhle stránce mohou běžet měřicí
    // skripty a do aplikace se nesmí přenést (viz `lib/mereni-hranice`).
    // `odesila` zůstává zapnuté — odchází se ze stránky.
    window.location.assign(redirectTarget);
  }

  if (needsConfirm) {
    return (
      <div className="card p-6 text-center" role="status">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success-soft text-success">
          <MailCheck className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="mt-3 font-semibold text-ink">Ještě potvrzení e-mailu</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Poslali jsme potvrzovací odkaz na{" "}
          <strong className="text-ink">{hodnoty.email.trim()}</strong>. Po kliknutí vás rovnou
          pustíme dovnitř.
        </p>
      </div>
    );
  }

  const kontext = coCeka(dal, Boolean(inviteToken));
  const ciziPrihlaseni = GOOGLE_ZAPNUTY || APPLE_ZAPNUTY || FACEBOOK_ZAPNUTY;
  const cil = inviteToken ? `/pozvanka/${inviteToken}` : dal;
  const tlacitko = inviteToken
    ? "Připojit se zdarma"
    : rok
      ? `Získat ${ZNACKA} na rok zdarma`
      : "Vytvořit účet zdarma";

  return (
    <div className="space-y-4">
      <form
        onSubmit={onSubmit}
        onFocusCapture={hlasZacatek}
        noValidate
        aria-label={inviteToken ? "Připojení k rodině" : "Registrace"}
        className="card space-y-3.5 p-4 sm:space-y-4 sm:p-6"
      >
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
        ) : null}

        {/* Google a Apple nahoře: jedno klepnutí a člověk je uvnitř. */}
        {ciziPrihlaseni ? (
          <div
            className="space-y-2.5"
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest("button, a")) zmer("registrace-cizi");
            }}
          >
            {GOOGLE_ZAPNUTY ? (
              <PrihlaseniGoogle popisek="Pokračovat přes Google" dal={cil} />
            ) : null}
            {APPLE_ZAPNUTY ? <PrihlaseniApple popisek="Pokračovat přes Apple" dal={cil} /> : null}
            {FACEBOOK_ZAPNUTY ? (
              <PrihlaseniFacebook popisek="Pokračovat přes Facebook" dal={cil} />
            ) : null}
            <Nebo />
          </div>
        ) : null}

        <PoleFormulare
          id="reg-email"
          label="E-mail"
          chyba={zobrazenaChyba("email")}
          input={{
            ref: (el) => {
              prvni.current.email = el;
            },
            type: "email",
            inputMode: "email",
            autoComplete: "email",
            autoCapitalize: "none",
            spellCheck: false,
            placeholder: "jan@example.cz",
            value: hodnoty.email,
            onChange: zmenPole("email"),
            onBlur: opustil("email"),
          }}
        />
        {navrh ? (
          <p className="-mt-1.5 text-sm text-ink-muted" role="status">
            Nemyslíte{" "}
            <button
              type="button"
              onClick={() => setHodnoty((h) => ({ ...h, email: navrh }))}
              className="font-semibold text-brand underline underline-offset-4"
            >
              {navrh}
            </button>
            ?
          </p>
        ) : null}

        <PoleFormulare
          id="reg-heslo"
          label="Heslo"
          napoveda="alespoň 8 znaků"
          chyba={zobrazenaChyba("heslo")}
          input={{
            ref: (el) => {
              prvni.current.heslo = el;
            },
            type: ukazHeslo ? "text" : "password",
            autoComplete: "new-password",
            value: hodnoty.heslo,
            onChange: zmenPole("heslo"),
            onBlur: opustil("heslo"),
            className: "pr-12",
          }}
          doplnek={
            <button
              type="button"
              onClick={() => setUkazHeslo((v) => !v)}
              aria-label={ukazHeslo ? "Skrýt heslo" : "Zobrazit heslo"}
              aria-pressed={ukazHeslo}
              aria-controls="reg-heslo"
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-ink-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              {ukazHeslo ? (
                <EyeOff className="h-5 w-5" aria-hidden />
              ) : (
                <Eye className="h-5 w-5" aria-hidden />
              )}
            </button>
          }
        />

        {error ? (
          <Alert tone="danger" className="text-[0.95rem]">
            <span role="alert">
              {error}
              {error === UCET_EXISTUJE ? (
                <>
                  {" "}
                  <Link
                    href={`/prihlaseni?dal=${encodeURIComponent(dal)}`}
                    className="font-semibold underline underline-offset-4"
                  >
                    Přejít na přihlášení
                  </Link>
                </>
              ) : null}
            </span>
          </Alert>
        ) : null}

        <div className="space-y-2.5 pt-1">
          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={busy}>
            {busy ? (
              <>
                <Spinner /> <span>Zakládáme účet…</span>
              </>
            ) : (
              tlacitko
            )}
          </Button>
          <PravniPoucka druh="registrace" className="text-center" />
          <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-ink">
            <ShieldCheck className="h-4 w-4 text-brand" aria-hidden />
            Bez karty. Bez automatické platby.
          </p>
          {inviteToken ? null : (
            <p className="text-center text-[0.8125rem] text-ink-subtle">
              {rok
                ? "Rok zdarma začne běžet ve chvíli, kdy založíte rodinu."
                : `Zkušební doba ${ZKUSEBNI_SLIB.dni} dní začne běžet ve chvíli, kdy založíte rodinu.`}
            </p>
          )}
        </div>

        {inviteToken ? null : (
          <p className="flex items-start gap-2 border-t border-line pt-4 text-sm text-ink-muted">
            <span className="mt-0.5 shrink-0 text-brand">
              <Ikona nazev="rodina" size={16} />
            </span>
            Druhý rodič nemá samostatný poplatek, platí se za celou rodinu.
          </p>
        )}

        {/* Cena patří sem, ne až za paywall. Kdo ji uvidí až po měsíci
            práce s kalendářem, právem se cítí podvedený. V aplikaci
            z obchodu ale být nesmí (výzva k nákupu mimo App Store). */}
        {inviteToken || aplikace ? null : (
          <p className="text-center text-[0.8125rem] leading-relaxed text-ink-muted">
            Po {rok ? "roce" : `${ZKUSEBNI_SLIB.dni} dnech`} {korun(CENIK[0].cena)}/měsíc nebo{" "}
            {korun(CENIK[1].cena)}/rok za celou rodinu, jen pokud se rozhodnete pokračovat.
            Platba se sama nikdy nespustí.
          </p>
        )}
      </form>

      <nav
        aria-label="Další informace"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm"
      >
        <Link
          href={`/prihlaseni?dal=${encodeURIComponent(dal)}`}
          className="text-ink-muted hover:text-ink"
        >
          Už máte účet? <span className="font-medium text-brand">Přihlaste se</span>
        </Link>
      </nav>

      {inviteToken ? null : (
        <>
          {aplikace ? null : (
          <Link
            href="/"
            className="flex items-center justify-between gap-3 rounded-2xl border-2 border-brand/40 bg-brand-soft px-4 py-3.5 transition-colors hover:border-brand"
          >
            <span className="min-w-0">
              <span className="block font-display text-base font-semibold text-ink">
                Chcete vědět víc o {ZNACKA}?
              </span>
              <span className="block text-sm text-ink-muted">
                Prohlédněte si aplikaci a co umí.
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-brand" aria-hidden />
          </Link>
          )}
          {/* Karta soukromí patří až pod kartu „Chcete vědět víc“. */}
          <KartaSoukromi />
          <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[0.8125rem] text-ink-subtle">
            {aplikace ? null : (
              <Link href="/cenik" className="underline-offset-4 hover:text-ink hover:underline">
                Ceník
              </Link>
            )}
            <Link
              href="/obchodni-podminky#zakladajici"
              className="underline-offset-4 hover:text-ink hover:underline"
            >
              Podmínky nabídky
            </Link>
            <Link
              href="/zasady-ochrany-osobnich-udaju"
              className="underline-offset-4 hover:text-ink hover:underline"
            >
              Ochrana osobních údajů
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

/** Pole s trvalým popiskem nad sebou a chybou pod sebou, propojené přes id. */
function PoleFormulare({
  id,
  label,
  napoveda,
  chyba,
  input,
  doplnek,
}: {
  id: string;
  label: string;
  napoveda?: string;
  chyba: string | null;
  input: React.InputHTMLAttributes<HTMLInputElement> & {
    ref?: React.Ref<HTMLInputElement>;
  };
  doplnek?: React.ReactNode;
}) {
  const { className, ref, ...zbytek } = input;
  const chybaId = `${id}-chyba`;
  const napovedaId = `${id}-napoveda`;
  const popsano = [napoveda ? napovedaId : null, chyba ? chybaId : null].filter(Boolean).join(" ");
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {napoveda ? (
          <span id={napovedaId} className="ml-2 font-normal text-ink-subtle">
            {napoveda}
          </span>
        ) : null}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={ref}
          required
          aria-invalid={chyba ? true : undefined}
          aria-describedby={popsano || undefined}
          className={cn(
            CONTROL,
            chyba ? "border-danger focus:border-danger" : "border-line-strong focus:border-brand",
            className,
          )}
          {...zbytek}
        />
        {doplnek}
      </div>
      {chyba ? (
        <p id={chybaId} className="text-sm text-danger">
          {chyba}
        </p>
      ) : null}
    </div>
  );
}

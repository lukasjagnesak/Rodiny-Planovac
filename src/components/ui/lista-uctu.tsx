"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/logo";
import { Spinner } from "@/components/ui/misc";

/**
 * Hlavička pro stránky, které jsou za přihlášením, ale mimo aplikaci.
 *
 * Vzniklo z pasti: kdo se zaregistroval a nedokončil průvodce, měl účet
 * bez rodiny. Odtud ho `requireSession()` posílal do průvodce, a protože
 * přihlášeného vrací proxy z přihlášení i registrace zpátky do aplikace,
 * vedla každá cesta — „Přihlásit se" i „Vyzkoušet zdarma" — do téhož
 * nedokončeného průvodce. Ven se nedalo nijak, protože průvodce nemá
 * menu ani odhlášení.
 *
 * Proto je tu vidět i adresa účtu. Člověk, který se chtěl přihlásit
 * pod jiným e-mailem, jinak nemá jak zjistit, proč se mu pořád otevírá
 * cizí rozdělaná registrace.
 */
export function ListaUctu({ email }: { email: string | null }) {
  const router = useRouter();
  const [odhlasuje, setOdhlasuje] = React.useState(false);

  async function odhlas() {
    setOdhlasuje(true);
    await createClient().auth.signOut();
    // `refresh()` je tu nutný: bez něj by serverové komponenty zůstaly
    // vykreslené s původní session a člověk by viděl tutéž stránku.
    router.replace("/prihlaseni");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-4 pt-6">
      <Logo />
      <div className="flex min-w-0 items-center gap-2">
        {email ? (
          <span className="hidden min-w-0 truncate text-sm text-ink-subtle sm:block">
            {email}
          </span>
        ) : null}
        <button
          type="button"
          onClick={odhlas}
          disabled={odhlasuje}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60"
        >
          {odhlasuje ? <Spinner /> : <LogOut className="h-4 w-4" />}
          Odhlásit se
        </button>
      </div>
    </div>
  );
}

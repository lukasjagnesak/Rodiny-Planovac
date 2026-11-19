"use client";

import { Nebo, PrihlaseniGoogle } from "@/components/ui/google-button";
import { PrihlaseniApple } from "@/components/ui/apple-button";
import { APPLE_ZAPNUTY, GOOGLE_ZAPNUTY, jsouCiziPrihlaseni } from "@/lib/zpusoby-prihlaseni";

/**
 * Blok cizích přihlášení nad formulářem, i s dělicí čarou pod ním.
 *
 * Čára je součástí bloku schválně: „nebo“ nad prázdným místem je horší
 * než žádné „nebo“, a když se vypne poslední poskytovatel, nemá se na
 * stránce po ničem zůstat.
 *
 * Apple je pod Googlem, ale stejně velké a stejně vysoko. Pravidla App
 * Storu nedovolují nabídnout cizí přihlášení nápadněji než to jejich.
 */
export function SocialniPrihlaseni({
  popisekGoogle,
  popisekApple,
  dal,
}: {
  popisekGoogle: string;
  popisekApple: string;
  dal: string;
}) {
  if (!jsouCiziPrihlaseni()) return null;

  return (
    <>
      <div className="space-y-2.5">
        {GOOGLE_ZAPNUTY ? <PrihlaseniGoogle popisek={popisekGoogle} dal={dal} /> : null}
        {APPLE_ZAPNUTY ? <PrihlaseniApple popisek={popisekApple} dal={dal} /> : null}
      </div>
      <Nebo />
    </>
  );
}

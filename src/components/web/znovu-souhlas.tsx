"use client";

import { zapomenSouhlas } from "@/lib/souhlas";

/**
 * Odvolání souhlasu ze zásad ochrany údajů.
 *
 * Odvolat souhlas musí být stejně snadné jako ho dát — proto odkaz
 * přímo v textu, ne návod „smažte si cookies v prohlížeči".
 */
export function ZnovuNastavitSouhlas() {
  return (
    <button
      type="button"
      onClick={zapomenSouhlas}
      className="underline underline-offset-4 hover:text-ink"
    >
      otevřít nastavení souhlasu
    </button>
  );
}

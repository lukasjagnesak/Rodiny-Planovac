/**
 * Pravidla předplatného — bez databáze, bez `server-only`.
 *
 * Platí rodina, ne uživatel — druhý rodič má přístup zdarma a je to hlavní
 * slib produktu. Po vypršení se nezamyká celá aplikace, jen zápis: kalendář,
 * výdaje i doklady zůstávají vidět. Rodič, který ze dne na den přijde
 * o kalendář dětí, se nevrátí a ještě o tom napíše.
 *
 * Odděleno od `predplatne.ts` schválně: na tomhle rozhodnutí stojí, jestli
 * lidé smí zapisovat, takže to musí jít otestovat bez Supabase i bez Nextu.
 */

export type StavPredplatneho =
  | "zkusebni"
  | "aktivni"
  | "po_splatnosti"
  | "zruseno"
  | "vyprsel";

export interface Predplatne {
  family_id: string;
  stav: StavPredplatneho;
  plati_do: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  tarif: string | null;
}

export interface StavPristupu {
  predplatne: Predplatne | null;
  /** Smí se zapisovat? */
  muzeZapisovat: boolean;
  /** Běží zkušební období? */
  jeZkusebni: boolean;
  /** Kolik dní zbývá. Záporné číslo znamená, že už vypršelo. */
  dniDoKonce: number;
  /** Text pro pruh nad aplikací. `null` = nic neukazovat. */
  upozorneni: string | null;
}

/** Kolik dní před koncem začneme upozorňovat. */
const UPOZORNIT_OD_DNI = 7;

function dniDo(datum: string): number {
  const konec = new Date(datum).getTime();
  return Math.ceil((konec - Date.now()) / (24 * 60 * 60 * 1000));
}

function pluralDni(pocet: number): string {
  if (pocet === 1) return "1 den";
  if (pocet >= 2 && pocet <= 4) return `${pocet} dny`;
  return `${pocet} dní`;
}

/** Ze záznamu udělá rozhodnutí. */
export function vyhodnot(predplatne: Predplatne | null): StavPristupu {
  // Rodina bez záznamu je starší než tahle funkce. Nezamykat.
  if (!predplatne) {
    return {
      predplatne: null,
      muzeZapisovat: true,
      jeZkusebni: false,
      dniDoKonce: 0,
      upozorneni: null,
    };
  }

  const dni = dniDo(predplatne.plati_do);
  const jeZkusebni = predplatne.stav === "zkusebni";
  const platnost = dni > 0;

  // Po splatnosti se ještě zapisovat smí — Stripe platbu několikrát
  // opakuje a většina těch karet jenom expirovala.
  const muzeZapisovat =
    predplatne.stav === "aktivni"
      ? true
      : predplatne.stav === "po_splatnosti"
        ? true
        : platnost;

  let upozorneni: string | null = null;

  if (!muzeZapisovat) {
    upozorneni = jeZkusebni
      ? "Zkušební období skončilo. Zapisovat můžeš po předplacení, číst zůstává."
      : "Předplatné skončilo. Zapisovat můžeš po obnovení, číst zůstává.";
  } else if (predplatne.stav === "po_splatnosti") {
    upozorneni = "Platba neprošla. Zkusíme to znovu — zkontroluj prosím kartu.";
  } else if (jeZkusebni && dni <= UPOZORNIT_OD_DNI) {
    upozorneni =
      dni <= 1
        ? "Zkušební období končí dnes."
        : `Zkušební období končí za ${pluralDni(dni)}.`;
  }

  return { predplatne, muzeZapisovat, jeZkusebni, dniDoKonce: dni, upozorneni };
}

import "server-only";

import Stripe from "stripe";
import type { Tarif } from "./tarify";

/**
 * Stripe. Klíče se čtou až při volání, ne při importu — jinak by
 * `next build` spadl všude, kde Stripe nakonfigurovaný není.
 */

let klient: Stripe | null = null;

export function stripe(): Stripe {
  if (!klient) {
    const klic = process.env.STRIPE_SECRET_KEY;
    if (!klic) throw new Error("Chybí STRIPE_SECRET_KEY v prostředí.");
    klient = new Stripe(klic);
  }
  return klient;
}

/** Je platební brána vůbec zapojená? Podle toho se ukazuje tlačítko. */
export function stripeJeNastaveny(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && cenaId("mesicni") && cenaId("rocni"));
}

export function cenaId(tarif: Tarif): string | undefined {
  return tarif === "rocni"
    ? process.env.STRIPE_PRICE_ROCNI
    : process.env.STRIPE_PRICE_MESICNI;
}

/** Z ceny ve Stripe zpátky na náš tarif — webhook jiné vodítko nemá. */
export function tarifZCeny(priceId: string | null | undefined): Tarif | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ROCNI) return "rocni";
  if (priceId === process.env.STRIPE_PRICE_MESICNI) return "mesicni";
  return null;
}

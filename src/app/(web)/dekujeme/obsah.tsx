"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { zmer } from "@/lib/mereni";
import { tarifPodleId } from "@/lib/tarify";

/** Po nahlášení konverze pošle člověka do aplikace. */
export function DekujemeObsah({ tarif }: { tarif: string | null }) {
  const router = useRouter();
  const nahlaseno = React.useRef(false);

  React.useEffect(() => {
    // Ref, ne stav: ve vývoji se efekt pouští dvakrát a nákup by se
    // nahlásil dvakrát taky.
    if (nahlaseno.current) return;
    nahlaseno.current = true;

    const cenik = tarifPodleId(tarif);
    zmer("predplatne", "/dekujeme", {
      value: cenik?.cena ?? 0,
      currency: "CZK",
      items: cenik ? [{ item_name: `Klidoo ${cenik.nazev.toLowerCase()}` }] : undefined,
    });

    const casovac = setTimeout(() => router.push("/predplatne?stav=hotovo"), 4000);
    return () => clearTimeout(casovac);
  }, [tarif, router]);

  return (
    <div className="text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
        <Check className="h-7 w-7" />
      </span>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink">
        Děkujeme, je zaplaceno
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-ink-muted">
        Za chvilku tě přesměrujeme zpátky do aplikace. Doklad ti přijde e-mailem ze Stripu.
      </p>
      <Link
        href="/predplatne?stav=hotovo"
        className="mt-6 inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
      >
        Pokračovat do aplikace
      </Link>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Pruh nad aplikací: konec zkušebního období, neprošlá platba, zámek.
 *
 * Upozornění jde zavřít a do konce dne se neukáže — připomínat každé
 * kliknutí je otravné. Zámek zavřít nejde: bez něj by rodič jen nechápal,
 * proč mu nejde uložit výdaj.
 */
export function PruhPredplatneho({
  text,
  zamceno,
}: {
  text: string;
  zamceno: boolean;
}) {
  const klic = "klidoo_pruh_predplatne";
  const [skryty, setSkryty] = React.useState(true);

  React.useEffect(() => {
    if (zamceno) {
      setSkryty(false);
      return;
    }
    try {
      setSkryty(window.localStorage.getItem(klic) === dnes());
    } catch {
      setSkryty(false);
    }
  }, [zamceno]);

  if (skryty) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-4 py-2 text-sm sm:px-6",
        zamceno ? "bg-danger/10 text-danger" : "bg-brand-soft text-brand",
      )}
      role="status"
    >
      {zamceno ? (
        <Lock className="h-4 w-4 shrink-0" />
      ) : (
        <Sparkles className="h-4 w-4 shrink-0" />
      )}
      <p className="min-w-0 flex-1">{text}</p>
      <Link
        href="/nastaveni/predplatne"
        className="shrink-0 font-semibold underline underline-offset-4"
      >
        {zamceno ? "Odemknout" : "Předplatit"}
      </Link>
      {zamceno ? null : (
        <button
          type="button"
          aria-label="Skrýt upozornění"
          onClick={() => {
            try {
              window.localStorage.setItem(klic, dnes());
            } catch {
              /* soukromé okno — nevadí, ukáže se zítra znovu */
            }
            setSkryty(true);
          }}
          className="shrink-0 rounded-lg p-1 hover:bg-black/5"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function dnes(): string {
  return new Date().toISOString().slice(0, 10);
}

"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Navigace webu na mobilu.
 *
 * Odkazy v hlavičce se pod 1024 px schovávaly úplně, takže se z telefonu
 * nedalo dostat na kalkulačky ani na průvodce — a to je většina návštěv.
 */
export function MobilniMenu({ odkazy }: { odkazy: { href: string; popisek: string }[] }) {
  const [open, setOpen] = React.useState(false);
  // Panel se vykresluje portálem do <body>. Hlavička má `backdrop-blur`,
  // a ten z ní udělá vztažný rámec pro `position: fixed` — panel uvnitř
  // by se scvrkl na výšku hlavičky a nebyl by vidět vůbec.
  const [pripojeno, setPripojeno] = React.useState(false);
  React.useEffect(() => setPripojeno(true), []);

  // Otevřené menu nesmí nechat rolovat stránku pod sebou.
  React.useEffect(() => {
    if (!open) return;
    const puvodni = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const naEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", naEsc);
    return () => {
      document.body.style.overflow = puvodni;
      document.removeEventListener("keydown", naEsc);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Zavřít menu" : "Otevřít menu"}
        className="-mr-1 flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink lg:hidden"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && pripojeno
        ? createPortal(
            <div
              className={cn(
                "fixed inset-x-0 bottom-0 top-16 z-40 animate-fade-in overflow-y-auto",
                "border-t border-line bg-canvas px-5 py-6 lg:hidden",
              )}
            >
              <nav className="flex flex-col">
                {odkazy.map(({ href, popisek }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="border-b border-line py-4 font-display text-lg font-semibold text-ink"
                  >
                    {popisek}
                  </Link>
                ))}
              </nav>

              <div className="mt-7 flex flex-col gap-3">
                <Link
                  href="/registrace"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 font-semibold text-brand-ink"
                >
                  Vyzkoušet zdarma
                </Link>
                <Link
                  href="/prihlaseni"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-line-strong bg-surface px-6 font-medium text-ink"
                >
                  Přihlásit se
                </Link>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

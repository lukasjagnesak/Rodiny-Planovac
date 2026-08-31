import * as React from "react";
import { Check, Minus } from "lucide-react";
import { SROVNANI, ZKUSEBNI_DNI } from "@/lib/tarify";
import { cn } from "@/lib/format";

/**
 * Co se změní, když se nezaplatí.
 *
 * Serverová komponenta — je to statická tabulka, na klientu nemá co dělat.
 * Sloupec „bez předplatného" schválně není prázdný: většina řádků v něm má
 * fajfku a přesně to je ta zpráva, kterou má rodič dostat. Nic se nemaže.
 */
export function SrovnaniTarifu({
  varianta = "web",
  className,
}: {
  /** V aplikaci je člověk uvnitř, na webu se teprve rozhoduje. */
  varianta?: "web" | "aplikace";
  className?: string;
}) {
  const nadpisBez =
    varianta === "aplikace" ? "Po zkušebním období" : `Po ${ZKUSEBNI_DNI} dnech zdarma`;

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className="py-2.5 pr-3 font-medium text-ink-muted">Co s tím jde dělat</th>
            <th className="w-32 px-2 py-2.5 text-center font-medium text-ink-muted">
              {nadpisBez}
            </th>
            <th className="w-32 px-2 py-2.5 text-center font-semibold text-brand">
              S předplatným
            </th>
          </tr>
        </thead>
        <tbody>
          {SROVNANI.map((radek) => (
            <tr key={radek.co} className="border-b border-line last:border-0">
              <td className="py-2.5 pr-3 text-ink">
                {radek.co}
                {radek.pozn ? (
                  <span className="block text-xs text-ink-subtle">{radek.pozn}</span>
                ) : null}
              </td>
              <td className="px-2 py-2.5 text-center">
                <Znacka ano={radek.bez} />
              </td>
              <td className="bg-brand-soft/40 px-2 py-2.5 text-center">
                <Znacka ano={radek.s} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-xs text-ink-subtle">
        Nic se nemaže ani neschovává. Po zkušebním období se zamkne zápis, všechno napsané
        zůstává čitelné a po zaplacení se pokračuje tam, kde jsi skončil.
      </p>
    </div>
  );
}

function Znacka({ ano }: { ano: boolean }) {
  return ano ? (
    <Check className="mx-auto h-4 w-4 text-success" aria-label="ano" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-ink-subtle" aria-label="ne" />
  );
}

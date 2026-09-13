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
    <div className={cn(className)}>
      {/* Tabulka měla pevnou nejmenší šířku 30rem, takže se na telefon
          nevešla a sloupec „s předplatným" — tedy ten, kvůli kterému to
          celé je — zůstal za okrajem. Kdo neuhodl, že se má obsahem
          posunout do strany, viděl jenom to, co nedostane.

          Sloupce jsou teď na mobilu úzké a název funkce se zalomí. Je to
          hustší, ale celé srovnání je vidět naráz. */}
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line align-bottom">
            <th className="py-2.5 pr-2 text-xs font-medium text-ink-muted sm:text-sm">
              Co s tím jde dělat
            </th>
            <th className="w-[4.5rem] px-1 py-2.5 text-center text-xs font-medium leading-tight text-ink-muted sm:w-32 sm:px-2 sm:text-sm">
              {nadpisBez}
            </th>
            <th className="w-[4.5rem] px-1 py-2.5 text-center text-xs font-semibold leading-tight text-brand sm:w-32 sm:px-2 sm:text-sm">
              S předplatným
            </th>
          </tr>
        </thead>
        <tbody>
          {SROVNANI.map((radek) => (
            <tr key={radek.co} className="border-b border-line last:border-0">
              <td className="py-2.5 pr-2 text-ink">
                {radek.co}
                {radek.pozn ? (
                  <span className="block text-xs text-ink-subtle">{radek.pozn}</span>
                ) : null}
              </td>
              <td className="px-1 py-2.5 text-center sm:px-2">
                <Znacka ano={radek.bez} />
              </td>
              <td className="bg-brand-soft/40 px-1 py-2.5 text-center sm:px-2">
                <Znacka ano={radek.s} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-xs text-ink-subtle">
        Nic se nemaže ani neschovává. Po zkušebním období se zamkne zapisování a vytváření
        dokumentů; všechno napsané zůstává čitelné a po zaplacení se pokračuje tam, kde jsi
        skončil.
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

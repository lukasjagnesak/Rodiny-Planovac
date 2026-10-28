import { OdkazMereny } from "@/components/web/odkaz-mereny";
import { Znak } from "@/components/ui/logo";
import { ZNACKA } from "@/lib/brand";

/**
 * Čí ta kalkulačka vlastně je.
 *
 * Kdo přijde z reklamy, vidí nástroj a nikde ani slovo o tom, že za ním
 * stojí aplikace, kterou si může rovnou zkusit. Nabídka pod výsledkem
 * pak přijde jako z čistého nebe — „Klidoo" je do té chvíle jen slovo
 * v patičce.
 *
 * Jedna věta s odkazem, ne karta s tlačítkem. Karta s tlačítkem tu byla
 * a na telefonu odsunula kalkulačku pod první obrazovku: člověk, který si
 * přišel něco spočítat, viděl nadpis, úvod, reklamu na aplikaci — a pole
 * k vyplnění až po rolování.
 */
export function PruhKlidoo({ co }: { co: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-2.5">
      <Znak size={26} className="mt-0.5" />
      <p className="min-w-0 text-[0.8125rem] leading-relaxed text-ink-muted">
        {co} od <strong className="font-semibold text-ink">{ZNACKA}</strong> — aplikace pro
        rodiče, kteří se o děti střídají.{" "}
        <OdkazMereny
          href="/registrace"
          udalost="vyzivne-pruh"
          className="whitespace-nowrap font-semibold text-brand underline-offset-4 hover:underline"
        >
          Vyzkoušet zdarma
        </OdkazMereny>
      </p>
    </div>
  );
}

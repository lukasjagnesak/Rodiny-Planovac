import Link from "next/link";
import { Download, History } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { OBLASTI, casZaznamu, poDnech } from "@/lib/historie";
import { cn } from "@/lib/format";
import type { ZaznamHistorie } from "@/lib/types";

/** Kolik záznamů se ukáže. Celou historii obsahuje výpis ke stažení. */
export const NA_STRANCE = 300;

/** Obrazovka historie změn. Data dodá stránka (nebo ukázka na webu). */
export function HistorieScreen({
  zaznamy,
  filtr,
  muzeStahnout,
}: {
  zaznamy: ZaznamHistorie[];
  filtr: ZaznamHistorie["oblast"] | null;
  muzeStahnout: boolean;
}) {
  const dny = poDnech(zaznamy);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Historie změn
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Kdo, kdy a co změnil. Zapisuje se samo a nikdo z rodičů to nemůže upravit ani smazat.
          </p>
        </div>
        {zaznamy.length > 0 && muzeStahnout ? (
          <ButtonLink href="/api/historie/vypis" variant="secondary" size="sm" prefetch={false}>
            <Download className="h-4 w-4" />
            Výpis s ověřením
          </ButtonLink>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {[null, ...Object.keys(OBLASTI)].map((o) => (
          <Link
            key={o ?? "vse"}
            href={o ? `/historie?oblast=${o}` : "/historie"}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium",
              filtr === o
                ? "border-brand bg-brand-soft text-brand"
                : "border-line-strong text-ink-muted hover:text-ink",
            )}
          >
            {o ? OBLASTI[o as ZaznamHistorie["oblast"]] : "Vše"}
          </Link>
        ))}
      </div>

      {dny.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<History className="h-6 w-6" />}
              title="Zatím žádné změny"
              description="Jakmile někdo změní rozvrh, výdaj nebo událost, objeví se to tady."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-5">
          {dny.map(({ den, zaznamy: denni }) => (
            <section key={den}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                {den}
              </h2>
              <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface">
                {denni.map((z) => (
                  <li key={z.id} className="flex gap-3 px-4 py-3 text-sm">
                    <span className="tnum w-11 shrink-0 text-ink-subtle">{casZaznamu(z.kdy)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="text-ink">{z.popis}</span>
                      <span className="mt-0.5 block text-xs text-ink-muted">
                        {z.kdo_jmeno} · {OBLASTI[z.oblast]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {zaznamy.length === NA_STRANCE ? (
            <p className="text-center text-xs text-ink-subtle">
              Zobrazeno posledních {NA_STRANCE} záznamů. Celou historii obsahuje výpis.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

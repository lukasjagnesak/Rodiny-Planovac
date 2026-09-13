"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarHeart,
  Car,
  ChevronRight,
  Mail,
  Table2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { formatDateTime, formatDayShort, relativeDayLabel } from "@/lib/dates";
import { cn } from "@/lib/format";
import type { Oznameni, OznameniDruh } from "@/lib/oznameni";
import type { SessionContext } from "@/lib/types";

const DRUH: Record<
  OznameniDruh,
  { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  zprava: { label: "Zpráva", color: "#4a7c6f", Icon: Mail },
  ukol: { label: "Úkol", color: "#5f7a8c", Icon: BookOpen },
  udalost: { label: "Událost", color: "#8a6f9e", Icon: CalendarHeart },
  doprava: { label: "Doprava", color: "#b58a3c", Icon: Car },
  rozvrh: { label: "Rozvrh", color: "#a8443a", Icon: Table2 },
};

export function OznameniScreen({
  session,
  oznameni,
  videnoDo,
}: {
  session: SessionContext;
  oznameni: Oznameni[];
  videnoDo: string | null;
}) {
  const novych = videnoDo ? oznameni.filter((o) => o.kdy > videnoDo).length : oznameni.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Co je nového
        </h1>
        <p className="text-sm text-ink-muted">
          {novych > 0
            ? `${novych} ${novych === 1 ? "nová položka" : novych < 5 ? "nové položky" : "nových položek"} od minule`
            : "Nic nového od minule"}
        </p>
      </div>

      {oznameni.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="Zatím je klid"
            description="Až přijde zpráva ze školy, blížit se bude událost nebo tě čeká odvoz, najdeš to tady."
          />
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {oznameni.map((o) => {
            const meta = DRUH[o.druh];
            const dite = session.children.find((c) => c.id === o.childId);
            const nove = videnoDo === null || o.kdy > videnoDo;

            return (
              <li key={o.id}>
                <Link href={o.odkaz} className="block">
                  <Card
                    className={cn(
                      "p-4 transition-colors hover:bg-surface-2",
                      nove && "ring-1 ring-brand/40",
                    )}
                    style={{ borderLeft: `3px solid ${meta.color}` }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
                      >
                        <meta.Icon className="h-4 w-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge color={meta.color}>{meta.label}</Badge>
                          {dite ? <Badge color={dite.color}>{dite.name}</Badge> : null}
                          {nove ? <Badge color="var(--brand)">nové</Badge> : null}
                        </div>

                        <p className="mt-1.5 text-sm text-ink">{o.titulek}</p>

                        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-subtle">
                          <span className="tnum">
                            {o.druh === "zprava"
                              ? formatDateTime(o.kdy)
                              : `${formatDayShort(o.kdy)} · ${relativeDayLabel(o.kdy)}`}
                          </span>
                          {o.popis ? <span>· {o.popis}</span> : null}
                        </p>
                      </div>

                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-subtle" />
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

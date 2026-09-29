import * as React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { CENIK, korun } from "@/lib/tarify";

/**
 * Co se ukáže místo dokumentu, když rodina nemá předplatné.
 *
 * Rozlišení, které se táhne celým paywallem: data, která si rodina
 * zapsala, zůstávají čitelná napořád — to je slib z webu i z e-mailů
 * a u lidí, kteří mají důvod nedůvěřovat, je to kotva, kterou se
 * nevyplatí utrhnout. Zamykají se jen listiny, které z těch dat vyrábí
 * aplikace. Čísla vidíš, dokument z nich ne.
 *
 * Cena je tu uvedená měsíční schválně, i když roční vychází líp.
 * Kdo potřebuje podklad k soudu, řeší tenhle týden, ne příští rok —
 * a 199 Kč za listinu, kterou potřebuje, je odpověď, kterou pochopí
 * bez počítání.
 */
export function ZamcenyDokument({
  nadpis,
  popis,
}: {
  nadpis: string;
  popis: string;
}) {
  const mesicni = CENIK.find((t) => t.id === "mesicni") ?? CENIK[0];

  return (
    <Card>
      <CardBody className="py-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-subtle">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="mt-3 font-display text-lg font-semibold text-ink">{nadpis}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{popis}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
          Zapsaná data zůstávají čitelná i bez předplatného — zamčené je jen vytvoření
          dokumentu.
        </p>

        <Link
          href="/predplatne"
          className="mt-5 inline-flex h-11 items-center rounded-xl bg-brand px-5 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
        >
          Obnovit předplatné
        </Link>
        <p className="mt-3 text-xs text-ink-subtle">
          Měsíc stojí {korun(mesicni.cena)} a jde kdykoli zrušit.
        </p>
      </CardBody>
    </Card>
  );
}

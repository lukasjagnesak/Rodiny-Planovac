"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy, Lock } from "lucide-react";
import { Card, CardBody, CardHeader, StatTile } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { Logo } from "@/components/ui/logo";
import { formatMoney } from "@/lib/format";
import type { PrehledPartnera } from "@/lib/partneri";

/**
 * Partnerský přehled.
 *
 * Odkaz je nahoře a je největší. Je to jediná věc, kterou partner
 * potřebuje pokaždé; čísla si přijde zkontrolovat jednou za čtvrt roku,
 * ale odkaz kopíruje do e-mailu klientovi každý týden.
 */
export function PartnerObsah({
  jmeno,
  organizace,
  kod,
  odkaz,
  procento,
  aktivni,
  prehled,
  minimalniVyplata,
  platnostDni,
  vyplataObdobi,
  kontakt,
}: {
  jmeno: string;
  organizace: string | null;
  kod: string;
  odkaz: string;
  procento: number;
  aktivni: boolean;
  prehled: PrehledPartnera;
  minimalniVyplata: number;
  platnostDni: number;
  vyplataObdobi: string;
  kontakt: string;
}) {
  const [zkopirovano, setZkopirovano] = React.useState(false);

  async function kopiruj() {
    try {
      await navigator.clipboard.writeText(odkaz);
      setZkopirovano(true);
      setTimeout(() => setZkopirovano(false), 2000);
    } catch {
      // Zamítnutá schránka — odkaz je vidět celý, dá se označit ručně.
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Logo />
        <Link href="/prehled" className="text-sm text-ink-muted hover:text-ink">
          Do aplikace
        </Link>
      </div>

      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Partnerský přehled
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {jmeno}
          {organizace ? ` · ${organizace}` : ""}
        </p>
      </div>

      {!aktivni ? (
        <Alert tone="warning">
          Účet je pozastavený, doporučení se zatím nezapočítávají. Napiš na {kontakt}.
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Váš odkaz"
          description="Tenhle odkaz dejte klientům. Doporučení se počítá i tehdy, když se zaregistrují až za pár týdnů."
        />
        <CardBody className="space-y-3 pt-3">
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
            <p className="min-w-0 flex-1 break-all text-sm text-ink">{odkaz}</p>
            <button
              type="button"
              onClick={kopiruj}
              aria-label="Zkopírovat odkaz"
              className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface hover:text-ink"
            >
              {zkopirovano ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-ink-subtle">
            Kód <strong className="text-ink-muted">{kod}</strong> · doporučení platí{" "}
            {platnostDni} dní od chvíle, kdy klient odkaz otevře.
          </p>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Rodin celkem" value={String(prehled.rodinCelkem)} />
        <StatTile label="Ve zkušebním" value={String(prehled.veZkusebnim)} />
        <StatTile label="Platících" value={String(prehled.platicich)} accent="var(--success)" />
        <StatTile label="Zrušených" value={String(prehled.zrusenych)} />
      </div>

      <Card>
        <CardHeader
          title="Provize"
          description={`${procento} % z toho, co doporučené rodiny skutečně zaplatily.`}
        />
        <CardBody className="space-y-3 pt-3 text-sm">
          <div className="flex items-baseline justify-between border-b border-line pb-2">
            <span className="text-ink-muted">Rodiny zaplatily</span>
            <span className="tnum font-medium text-ink">
              {formatMoney(prehled.zaklad, "CZK")}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-ink-muted">Vaše provize</span>
            <span className="tnum text-lg font-semibold text-ink">
              {formatMoney(prehled.provize, "CZK")}
            </span>
          </div>

          {prehled.doVyplaty > 0 ? (
            <p className="text-xs text-ink-subtle">
              Vyplácí se {vyplataObdobi} od {formatMoney(minimalniVyplata, "CZK")}. Do
              nejbližší výplaty zbývá {formatMoney(prehled.doVyplaty, "CZK")}.
            </p>
          ) : (
            <p className="text-xs text-ink-subtle">
              Vyplácí se {vyplataObdobi}. Částka je nad hranicí {formatMoney(minimalniVyplata, "CZK")},
              takže půjde v nejbližším termínu.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Tuhle kartu čekají mediátoři nejvíc a je důležité, aby ji našli
          dřív, než se zeptají. Nedůvěra ke sdílení klientských dat je
          u nich profesní povinnost, ne opatrnost. */}
      <Card>
        <CardHeader title="Co tady nikdy neuvidíte" />
        <CardBody className="space-y-2.5 pt-3 text-sm text-ink-muted">
          <p className="flex items-start gap-2.5">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
            <span>
              Jména rodin, jejich kalendáře, výdaje ani cokoli o dětech. Vidíte počty
              a částky, které jsou vaše obchodní údaje — ne údaje klientů.
            </span>
          </p>
          <p className="flex items-start gap-2.5">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
            <span>
              Když si klient přeje, aby vám ukázal, jak péče probíhá, vygeneruje si
              v aplikaci souhrn a pošle vám ho sám. Rozhoduje o tom on, ne my.
            </span>
          </p>
        </CardBody>
      </Card>

      <p className="pb-6 text-center text-sm text-ink-subtle">
        Cokoli k programu:{" "}
        <a href={`mailto:${kontakt}`} className="text-brand underline underline-offset-4">
          {kontakt}
        </a>
      </p>
    </main>
  );
}

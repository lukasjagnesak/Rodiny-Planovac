"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Eye, Link2, Mail, Send, Trash2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Sheet, ConfirmSheet } from "@/components/ui/sheet";
import { Alert, Spinner } from "@/components/ui/misc";
import { formatDay, toDateKey } from "@/lib/dates";
import { hlaskaChyby } from "@/lib/format";
import { memberName } from "@/lib/members";
import {
  PLATNOSTI,
  PROFESE,
  VYCHOZI_PLATNOST,
  nazevProfese,
  pristupDo,
  pristupPlati,
  zbyvaDni,
} from "@/lib/profesionalove";
import { posliPozvanku } from "./posli-pozvanku";
import type { FamilyInvite, MemberView, Profese, SessionContext } from "@/lib/types";

/**
 * Přístup pro profesionály — advokát, mediátor, OSPOD, soud.
 *
 * Udělit ho smí kterýkoli rodič a kterýkoli ho smí odebrat, i když ho
 * neuděloval. Druhý rodič se o pozvání dozví ve Zprávách. Pravidla drží
 * databáze (migrace 0035), tady je jen obrazovka.
 */
export function PristupProfesionalu({
  session,
  invites,
}: {
  session: SessionContext;
  invites: FamilyInvite[];
}) {
  const [pozvat, setPozvat] = React.useState(false);
  const [odebrat, setOdebrat] = React.useState<MemberView | null>(null);
  const dnes = toDateKey(new Date());
  const profesionalove = session.members.filter((m) => m.profese);

  return (
    <Card>
      <CardHeader
        title="Přístup pro profesionály"
        description="Advokát, mediátor, OSPOD nebo soud — jen ke čtení"
        action={
          <Button size="sm" onClick={() => setPozvat(true)}>
            <UserPlus className="h-4 w-4" /> Pozvat
          </Button>
        }
      />

      {profesionalove.length === 0 && invites.length === 0 ? (
        <CardBody>
          <p className="text-sm text-ink-muted">
            Místo přeposílání výpisů můžete dát advokátovi, mediátorovi nebo OSPOD přístup přímo.
            Vidí kalendář, zprávy, výdaje a doklady, nic nemůže změnit ani smazat. Druhý rodič
            se o tom dozví a přístup může kdykoli odebrat.
          </p>
        </CardBody>
      ) : null}

      {profesionalove.length > 0 ? (
        <ul className="mt-2 divide-y divide-line">
          {profesionalove.map((m) => {
            const plati = pristupPlati(m.pristupDo, dnes);
            const zbyva = zbyvaDni(m.pristupDo, dnes);
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar name={m.name} color={m.color} src={m.avatarUrl} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-ink">{m.name}</span>
                    <Badge>{nazevProfese(m.profese)}</Badge>
                    {!plati ? <Badge color="var(--danger)">přístup skončil</Badge> : null}
                  </div>
                  <p className="truncate text-sm text-ink-muted">
                    {m.pristupDo
                      ? plati
                        ? `do ${formatDay(m.pristupDo)}${zbyva !== null && zbyva <= 14 ? ` · zbývá ${zbyva} ${dniSlovo(zbyva)}` : ""}`
                        : `skončil ${formatDay(m.pristupDo)}`
                      : "bez data konce"}
                    {m.udelil ? ` · udělil: ${memberName(session.members, m.udelil)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Odebrat přístup: ${m.name}`}
                  title="Odebrat přístup"
                  onClick={() => setOdebrat(m)}
                  className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {invites.length > 0 ? (
        <CardBody className="border-t border-line pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Čekající pozvánky
          </p>
          <ul className="space-y-2">
            {invites.map((inv) => (
              <PozvankaRadek key={inv.id} invite={inv} />
            ))}
          </ul>
        </CardBody>
      ) : null}

      <PozvatProfesionala open={pozvat} onClose={() => setPozvat(false)} session={session} />

      {odebrat ? <OdebratPristup clen={odebrat} onClose={() => setOdebrat(null)} /> : null}
    </Card>
  );
}

function dniSlovo(n: number): string {
  if (n === 1) return "den";
  if (n >= 2 && n <= 4) return "dny";
  return "dní";
}

function PozvankaRadek({ invite }: { invite: FamilyInvite }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [znovu, setZnovu] = React.useState<"cekam" | "poslano" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function zrusit() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("zrus_pozvanku", { pozvanka: invite.id });
    setBusy(false);
    if (error) {
      setError(hlaskaChyby(error));
      return;
    }
    router.refresh();
  }

  return (
    <li className="rounded-xl bg-surface-2 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 shrink-0 text-ink-subtle" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{invite.email}</p>
          <p className="text-xs text-ink-subtle">
            {nazevProfese(invite.profese)} ·{" "}
            {invite.pristup_do ? `přístup do ${formatDay(invite.pristup_do)}` : "bez data konce"} ·
            pozvánka platí do {formatDay(invite.expires_at.slice(0, 10))}
          </p>
        </div>
        <button
          type="button"
          aria-label="Poslat pozvánku znovu e-mailem"
          title="Poslat znovu e-mailem"
          disabled={znovu === "cekam"}
          onClick={async () => {
            setZnovu("cekam");
            const poslano = await posliPozvanku(invite.token);
            setZnovu(poslano ? "poslano" : null);
            setTimeout(() => setZnovu(null), 3000);
          }}
          className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface hover:text-ink disabled:opacity-50"
        >
          {znovu === "poslano" ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={zrusit}
          disabled={busy}
          aria-label="Zrušit pozvánku"
          title="Zrušit pozvánku"
          className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface hover:text-danger disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {error ? (
        <Alert tone="danger" className="mt-2">
          {error}
        </Alert>
      ) : null}
    </li>
  );
}

function PozvatProfesionala({
  open,
  onClose,
  session,
}: {
  open: boolean;
  onClose: () => void;
  session: SessionContext;
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [profese, setProfese] = React.useState<Profese>("advokat");
  const [mesicu, setMesicu] = React.useState(VYCHOZI_PLATNOST);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [link, setLink] = React.useState<string | null>(null);
  const [emailem, setEmailem] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setEmail("");
      setProfese("advokat");
      setMesicu(VYCHOZI_PLATNOST);
      setLink(null);
      setEmailem(false);
      setError(null);
    }
  }, [open]);

  const konec = pristupDo(mesicu, toDateKey(new Date()));

  async function vytvorit() {
    if (!email.includes("@")) {
      setError("Zadejte platný e-mail.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: token, error } = await supabase.rpc("pozvi_profesionala", {
      target_family: session.family.id,
      email: email.trim(),
      profese,
      pristup_do: konec,
    });
    if (error || typeof token !== "string") {
      setBusy(false);
      setError(error ? hlaskaChyby(error) : "Pozvánku se nepodařilo vytvořit.");
      return;
    }
    const poslano = await posliPozvanku(token);
    setBusy(false);
    setEmailem(poslano);
    setLink(`${window.location.origin}/pozvanka/${token}`);
    router.refresh();
  }

  async function kopirovat() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Přístup pro profesionála"
      description="Jen ke čtení. Pozvánku jde přijmout jen z e-mailu, na který ji pošlete."
      footer={
        link ? (
          <Button className="flex-1" onClick={onClose}>
            Hotovo
          </Button>
        ) : (
          <>
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Zrušit
            </Button>
            <Button className="flex-1" onClick={vytvorit} disabled={busy}>
              {busy ? <Spinner /> : "Pozvat"}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        {link ? (
          <>
            <Alert tone="success">
              {emailem
                ? "Pozvánku jsme poslali e-mailem. Druhému rodiči jsme to napsali do Zpráv."
                : "Pozvánka je vytvořená. Druhému rodiči jsme to napsali do Zpráv."}
            </Alert>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-3">
              <Link2 className="h-4 w-4 shrink-0 text-ink-subtle" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">{link}</span>
              <Button size="sm" variant="secondary" onClick={kopirovat}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Zkopírováno" : "Kopírovat"}
              </Button>
            </div>
            <p className="text-xs text-ink-subtle">
              Odkaz funguje jen po přihlášení e-mailem {email.trim().toLowerCase()}. Kdyby ho
              někdo přeposlal, nikdo jiný se s ním nepřipojí.
            </p>
          </>
        ) : (
          <>
            <Field label="Kdo to je">
              <Select value={profese} onChange={(e) => setProfese(e.target.value as Profese)}>
                {PROFESE.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nazev}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="E-mail" required hint="Pracovní e-mail, kterým se přihlásí.">
              <Input
                type="email"
                placeholder="kancelar@advokat.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field
              label="Jak dlouho"
              hint={konec ? `Přístup skončí sám ${formatDay(konec)}.` : "Dokud ho někdo z rodičů neodebere."}
            >
              <Select value={mesicu} onChange={(e) => setMesicu(Number(e.target.value))}>
                {PLATNOSTI.map((p) => (
                  <option key={p.mesicu} value={p.mesicu}>
                    {p.nazev}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="flex gap-2.5 rounded-xl bg-surface-2 p-3 text-sm text-ink-muted">
              <Eye className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
              <p>
                Uvidí kalendář, zprávy, výdaje, doklady a historii změn. Nemůže nic zapsat, změnit
                ani smazat. Druhý rodič dostane zprávu a přístup může kdykoli odebrat.
              </p>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

function OdebratPristup({ clen, onClose }: { clen: MemberView; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function odebrat() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("odeber_pristup", { clen: clen.id });
    setBusy(false);
    if (error) {
      setError(hlaskaChyby(error));
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <ConfirmSheet
      open
      onClose={onClose}
      onConfirm={odebrat}
      busy={busy}
      confirmLabel="Odebrat"
      title="Odebrat přístup?"
      message={
        error ??
        `${clen.name} (${nazevProfese(clen.profese)}) přestane do rodiny vidět hned. Druhému rodiči to napíšeme do Zpráv.`
      }
    />
  );
}

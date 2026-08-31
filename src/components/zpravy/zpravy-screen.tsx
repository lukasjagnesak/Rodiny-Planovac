"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, Download, Lock, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { Alert, EmptyState, Spinner } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/badge";
import { formatDayLong } from "@/lib/dates";
import { cn, hlaskaChyby } from "@/lib/format";
import { memberName } from "@/lib/members";
import { poDnech, prectenaDruhym, type Zprava } from "@/lib/zpravy";
import type { SessionContext } from "@/lib/types";

/**
 * Komunikace mezi rodiči.
 *
 * Vědomě to není chat: nejsou tu smajlíci, mazání ani „píše…". Cenu má
 * jedině to, co WhatsApp neumí — zpráva, kterou nikdo nepřepíše, s razítkem
 * přečtení a s možností poslat celý průběh advokátovi.
 *
 * Že se zpráva nedá vzít zpět, musí být vidět dřív, než ji člověk odešle.
 * Vzkaz napsaný ve vzteku je tady navždycky, a rodič to má vědět předem.
 */
export function ZpravyScreen({
  session,
  zpravy,
  muzePsat,
}: {
  session: SessionContext;
  zpravy: Zprava[];
  muzePsat: boolean;
}) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [den, setDen] = React.useState("");
  const [dite, setDite] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [chyba, setChyba] = React.useState<string | null>(null);
  const konec = React.useRef<HTMLDivElement>(null);

  const dny = React.useMemo(() => poDnech(zpravy), [zpravy]);

  // Označení přečtení: co vidím a není moje, si zapíšu. Razítko drží
  // první pohled, opakované otevření ho nepřepíše.
  React.useEffect(() => {
    const neprectene = zpravy.filter(
      (z) => z.autor !== session.userId && !(z.precteni ?? []).some((p) => p.user_id === session.userId),
    );
    if (neprectene.length === 0) return;

    void createClient()
      .from("zpravy_precteni")
      .insert(neprectene.map((z) => ({ zprava_id: z.id, user_id: session.userId })))
      .then(() => router.refresh());
  }, [zpravy, session.userId, router]);

  React.useEffect(() => {
    konec.current?.scrollIntoView({ block: "end" });
  }, [dny.length]);

  async function odeslat() {
    const cisty = text.trim();
    if (!cisty) return;

    setBusy(true);
    setChyba(null);

    const supabase = createClient();
    const { error } = await supabase.from("zpravy").insert({
      family_id: session.family.id,
      autor: session.userId,
      autor_jmeno: session.profile.full_name || "Rodič",
      text: cisty,
      den: den || null,
      child_id: dite || null,
    });

    if (error) {
      setBusy(false);
      setChyba(hlaskaChyby(error));
      return;
    }

    // Upozornění druhé straně. Když se nepovede, zpráva tu je pořád —
    // proto se na výsledek nečeká a nic se kvůli němu neruší.
    const ostatni = session.members.filter(
      (m) => m.userId !== session.userId && m.role !== "viewer",
    );
    if (ostatni.length > 0) {
      void supabase.from("notifications").insert(
        ostatni.map((m) => ({
          family_id: session.family.id,
          user_id: m.userId,
          channel: "telegram",
          title: `Nová zpráva od ${session.profile.full_name || "druhého rodiče"}`,
          body: cisty.slice(0, 300),
        })),
      );
    }

    setText("");
    setDen("");
    setDite("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Zprávy</h1>
          <p className="text-sm text-ink-muted">
            Domluva, která zůstane zapsaná. Zprávy nejdou upravit ani smazat.
          </p>
        </div>
        {zpravy.length > 0 ? (
          <ButtonLink href="/api/zpravy/vypis" variant="secondary" size="sm" prefetch={false}>
            <Download className="h-4 w-4" />
            Výpis pro advokáta
          </ButtonLink>
        ) : null}
      </div>

      {dny.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Send className="h-6 w-6" />}
              title="Zatím tu nic není"
              description="Co si tady napíšete, zůstane zapsané s časem odeslání i přečtení. Hodí se to na domluvy o předání, penězích a lékařích — tedy přesně na to, co se za půl roku nikdo nepamatuje stejně."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-5">
          {dny.map(({ den: denZprav, zpravy: denni }) => (
            <div key={denZprav}>
              <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-ink-subtle">
                {formatDayLong(denZprav)}
              </p>
              <div className="space-y-2">
                {denni.map((z) => (
                  <Bublina key={z.id} zprava={z} session={session} />
                ))}
              </div>
            </div>
          ))}
          <div ref={konec} />
        </div>
      )}

      {/* ── Psaní ────────────────────────────────────────────────── */}
      {muzePsat ? (
        <Card>
          <CardHeader
            title="Napsat"
            description="Než odešleš: zpráva se nedá vzít zpět ani upravit."
          />
          <CardBody className="space-y-3 pt-3">
            <Textarea
              rows={3}
              placeholder="Ve čtvrtek vyzvednu Kubu až v 17:00, mám poradu."
              value={text}
              maxLength={4000}
              onChange={(e) => setText(e.target.value)}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={dite} onChange={(e) => setDite(e.target.value)}>
                <option value="">Celá rodina</option>
                {session.children.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
              <input
                type="date"
                value={den}
                onChange={(e) => setDen(e.target.value)}
                aria-label="Ke kterému dni se zpráva vztahuje"
                className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm text-ink"
              />
            </div>

            {chyba ? <Alert tone="danger">{chyba}</Alert> : null}

            <Button className="w-full" onClick={odeslat} disabled={busy || !text.trim()}>
              {busy ? <Spinner /> : <Send className="h-4 w-4" />}
              Odeslat
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Alert tone="warning">
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0" />
            Psát nové zprávy jde po obnovení předplatného. Ty starší zůstávají čitelné.
          </span>
        </Alert>
      )}
    </div>
  );
}

function Bublina({ zprava, session }: { zprava: Zprava; session: SessionContext }) {
  const moje = zprava.autor === session.userId;
  const clen = session.members.find((m) => m.userId === zprava.autor);
  const precteno = prectenaDruhym(zprava);
  const dite = session.children.find((d) => d.id === zprava.child_id);

  const cas = new Date(zprava.created_at).toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex gap-2.5", moje && "flex-row-reverse")}>
      <Avatar
        name={clen?.name ?? zprava.autor_jmeno}
        color={clen?.color}
        src={clen?.avatarUrl}
        size={32}
      />

      <div className={cn("min-w-0 max-w-[min(34rem,80%)]", moje && "text-right")}>
        <div
          className={cn(
            "inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-left text-sm",
            moje ? "bg-brand-soft text-ink" : "border border-line bg-surface text-ink",
          )}
        >
          {zprava.text}
        </div>

        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-subtle">
          <span>
            {memberName(session.members, zprava.autor) || zprava.autor_jmeno} · {cas}
          </span>
          {dite ? <span>· {dite.name}</span> : null}
          {zprava.den ? <span>· k {formatDayLong(zprava.den)}</span> : null}
          {moje ? (
            precteno ? (
              <CheckCheck className="h-3 w-3 text-brand" aria-label="přečteno" />
            ) : (
              <Check className="h-3 w-3" aria-label="odesláno" />
            )
          ) : null}
        </p>
      </div>
    </div>
  );
}

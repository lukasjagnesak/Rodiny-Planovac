"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Baby,
  Check,
  Copy,
  Link2,
  Mail,
  Pencil,
  Plus,
  Send,
  Trash2,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Sheet, ConfirmSheet } from "@/components/ui/sheet";
import { Alert, ColorPicker, EmptyState, Spinner } from "@/components/ui/misc";
import { ChildForm } from "./child-form";
import { COLOR_PALETTE, ROLE_HINTS, ROLE_LABELS } from "@/lib/constants";
import { formatDay } from "@/lib/dates";
import { sideLabel } from "@/lib/members";
import { hlaskaChyby } from "@/lib/format";
import type {
  Child,
  CustodySide,
  FamilyInvite,
  MemberRole,
  MemberView,
  SessionContext,
} from "@/lib/types";

export function FamilyScreen({
  session,
  allChildren,
  invites,
}: {
  session: SessionContext;
  allChildren: Child[];
  invites: FamilyInvite[];
}) {
  const [childOpen, setChildOpen] = React.useState(false);
  const [editingChild, setEditingChild] = React.useState<Child | null>(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<MemberView | null>(null);

  const isOwner = session.myMembership.role === "owner";
  const canEdit = session.myMembership.role !== "viewer";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Děti a rodina
        </h1>
        <p className="text-sm text-ink-muted">
          Kdo do rodiny patří a s kým se data sdílí
        </p>
      </div>

      {/* ── Děti ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Děti"
          description={`${allChildren.filter((c) => !c.archived).length} aktivních`}
          action={
            canEdit ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditingChild(null);
                  setChildOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Přidat
              </Button>
            ) : null
          }
        />

        {allChildren.length === 0 ? (
          <EmptyState
            icon={<Baby className="h-6 w-6" />}
            title="Zatím žádné děti"
            description="Přidej dítě — teprve pak dávají kalendář a výdaje smysl."
          />
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {allChildren.map((child) => (
              <li key={child.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar
                  name={child.name}
                  color={child.color}
                  src={child.avatar_url}
                  size={42}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-ink">{child.name}</span>
                    {child.archived ? <Badge>archivováno</Badge> : null}
                  </div>
                  <p className="truncate text-sm text-ink-muted">
                    {[
                      child.birth_date ? `nar. ${formatDay(child.birth_date)}` : null,
                      child.school,
                      child.class_name,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Bez dalších údajů"}
                  </p>
                </div>
                {canEdit ? (
                  <button
                    type="button"
                    aria-label={`Upravit ${child.name}`}
                    onClick={() => {
                      setEditingChild(child);
                      setChildOpen(true);
                    }}
                    className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-ink"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── Členové ────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Členové rodiny"
          description="Každý vidí stejná data podle své role"
          action={
            isOwner ? (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4" /> Pozvat
              </Button>
            ) : null
          }
        />

        <ul className="mt-2 divide-y divide-line">
          {session.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Avatar name={m.name} color={m.color} src={m.avatarUrl} size={42} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-ink">{m.name}</span>
                  {m.userId === session.userId ? <Badge color="var(--brand)">to jsi ty</Badge> : null}
                  {m.side ? (
                    <Badge color={m.color}>
                      <Dot color={m.color} /> strana {m.side.toUpperCase()}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-sm text-ink-muted">
                  {ROLE_LABELS[m.role]}
                  {m.email ? ` · ${m.email}` : ""}
                </p>
              </div>

              {isOwner || m.userId === session.userId ? (
                <button
                  type="button"
                  aria-label={`Upravit ${m.name}`}
                  onClick={() => setEditingMember(m)}
                  className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-ink"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {invites.length > 0 ? (
          <CardBody className="border-t border-line pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              Čekající pozvánky
            </p>
            <ul className="space-y-2">
              {invites.map((inv) => (
                <InviteRow key={inv.id} invite={inv} canManage={isOwner} />
              ))}
            </ul>
          </CardBody>
        ) : null}
      </Card>

      <ChildForm
        open={childOpen}
        onClose={() => setChildOpen(false)}
        session={session}
        child={editingChild}
      />

      <InviteSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        session={session}
      />

      {editingMember ? (
        <MemberSheet
          member={editingMember}
          session={session}
          onClose={() => setEditingMember(null)}
        />
      ) : null}
    </div>
  );
}

/** Řádek s odkazem na pozvánku — odkaz se kopíruje do schránky. */
function InviteRow({ invite, canManage }: { invite: FamilyInvite; canManage: boolean }) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [znovu, setZnovu] = React.useState<"cekam" | "poslano" | null>(null);

  const url =
    typeof window !== "undefined" ? `${window.location.origin}/pozvanka/${invite.token}` : "";

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function revoke() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("family_invites").delete().eq("id", invite.id);
    setBusy(false);
    router.refresh();
  }

  return (
    <li className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
      <Mail className="h-4 w-4 shrink-0 text-ink-subtle" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{invite.email}</p>
        <p className="text-xs text-ink-subtle">
          {ROLE_LABELS[invite.role]} · platí do {formatDay(invite.expires_at.slice(0, 10))}
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
        onClick={copy}
        aria-label="Zkopírovat odkaz"
        className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface hover:text-ink"
      >
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </button>
      {canManage ? (
        <button
          type="button"
          onClick={revoke}
          disabled={busy}
          aria-label="Zrušit pozvánku"
          className="shrink-0 rounded-lg p-2 text-ink-subtle hover:bg-surface hover:text-danger disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </li>
  );
}

function InviteSheet({
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
  const [role, setRole] = React.useState<MemberRole>("parent");
  const [side, setSide] = React.useState<"" | CustodySide>("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [link, setLink] = React.useState<string | null>(null);
  const [emailem, setEmailem] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setEmail("");
      setRole("parent");
      setSide("");
      setLink(null);
      setEmailem(false);
      setError(null);
    }
  }, [open]);

  async function create() {
    if (!email.includes("@")) {
      setError("Zadej platný e-mail.");
      return;
    }
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("family_invites")
      .insert({
        family_id: session.family.id,
        email: email.trim().toLowerCase(),
        role,
        custody_side: side || null,
        invited_by: session.userId,
      })
      .select("token")
      .single();

    if (error) {
      setBusy(false);
      setError(hlaskaChyby(error));
      return;
    }

    // E-mail je jen pohodlí navíc — odkaz se dá poslat i ručně,
    // takže se kvůli mlčícímu SMTP pozvánka neruší.
    const poslano = await posliPozvanku(data.token);

    setBusy(false);
    setEmailem(poslano);
    setLink(`${window.location.origin}/pozvanka/${data.token}`);
    router.refresh();
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Pozvat do rodiny"
      description="Vytvoříme odkaz, který pošleš, jak chceš — SMS, e-mailem, přes Messenger."
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
            <Button className="flex-1" onClick={create} disabled={busy}>
              {busy ? <Spinner /> : "Vytvořit odkaz"}
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
                ? "Pozvánku jsme poslali e-mailem. Odkaz platí 30 dní — pro jistotu ho můžeš poslat i sám."
                : "Pozvánka vytvořena. Odkaz platí 30 dní."}
            </Alert>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-3">
              <Link2 className="h-4 w-4 shrink-0 text-ink-subtle" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">{link}</span>
              <Button size="sm" variant="secondary" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Zkopírováno" : "Kopírovat"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Field label="E-mail" required>
              <Input
                type="email"
                placeholder="petra@example.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="Role" hint={ROLE_HINTS[role]}>
              <Select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
                {(Object.keys(ROLE_LABELS) as MemberRole[])
                  .filter((r) => r !== "owner")
                  .map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field
              label="Strana v kalendáři péče"
              hint="nech prázdné u prarodičů a partnerů"
            >
              <Select
                value={side}
                onChange={(e) => setSide(e.target.value as "" | CustodySide)}
              >
                <option value="">Neúčastní se střídání</option>
                <option value="a">Strana A — {sideLabel(session.members, "a")}</option>
                <option value="b">Strana B — {sideLabel(session.members, "b")}</option>
              </Select>
            </Field>
          </>
        )}
      </div>
    </Sheet>
  );
}

function MemberSheet({
  member,
  session,
  onClose,
}: {
  member: MemberView;
  session: SessionContext;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(member.name);
  const [color, setColor] = React.useState(member.color);
  const [side, setSide] = React.useState<"" | CustodySide>(member.side ?? "");
  const [role, setRole] = React.useState<MemberRole>(member.role);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = React.useState(false);

  const isOwner = session.myMembership.role === "owner";
  const isSelf = member.userId === session.userId;
  const canRemove = isOwner && !isSelf;

  async function save() {
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase
      .from("family_members")
      .update({
        display_name: name.trim() || null,
        color,
        custody_side: side || null,
        ...(isOwner && !isSelf ? { role } : {}),
      })
      .eq("id", member.id);

    setBusy(false);
    if (error) {
      setError(hlaskaChyby(error));
      return;
    }
    onClose();
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("family_members").delete().eq("id", member.id);
    setBusy(false);
    if (error) {
      setError(hlaskaChyby(error));
      setConfirmRemove(false);
      return;
    }
    setConfirmRemove(false);
    onClose();
    router.refresh();
  }

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={member.name}
        description="Jak se člen zobrazuje v kalendáři"
        footer={
          <>
            {canRemove ? (
              <Button variant="ghost" className="text-danger" onClick={() => setConfirmRemove(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Zrušit
            </Button>
            <Button className="flex-1" onClick={save} disabled={busy}>
              {busy ? <Spinner /> : "Uložit"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Field label="Zobrazované jméno" hint="např. Táta, Máma, Babička">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <Field label="Barva">
            <ColorPicker value={color} palette={COLOR_PALETTE} onChange={setColor} />
          </Field>

          <Field label="Strana v kalendáři péče">
            <Select value={side} onChange={(e) => setSide(e.target.value as "" | CustodySide)}>
              <option value="">Neúčastní se střídání</option>
              <option value="a">Strana A</option>
              <option value="b">Strana B</option>
            </Select>
          </Field>

          {isOwner && !isSelf ? (
            <Field label="Role" hint={ROLE_HINTS[role]}>
              <Select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
                {(Object.keys(ROLE_LABELS) as MemberRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={remove}
        busy={busy}
        confirmLabel="Odebrat"
        title="Odebrat z rodiny?"
        message={`${member.name} ztratí přístup ke kalendáři i výdajům. Vytvořené záznamy zůstanou.`}
      />
    </>
  );
}


/**
 * Pošle pozvánku e-mailem. Vrací jen ano/ne — když SMTP mlčí, uživateli
 * zůstává odkaz ke zkopírování a hláška o chybějícím nastavení by mu
 * nic neřekla.
 */
async function posliPozvanku(token: string): Promise<boolean> {
  try {
    const odpoved = await fetch("/api/pozvanka/odeslat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = (await odpoved.json()) as { poslano?: boolean };
    return Boolean(data.poslano);
  } catch {
    return false;
  }
}

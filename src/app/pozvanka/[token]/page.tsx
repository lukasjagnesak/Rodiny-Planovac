import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ButtonLink } from "@/components/ui/button";
import { AcceptInviteButton } from "./accept";

export const metadata: Metadata = { title: "Pozvánka do rodiny" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Pozvánku je potřeba přečíst i pro nepřihlášeného návštěvníka,
  // proto service-role klient (RLS by ji jinak skryla).
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("family_invites")
    .select("id, email, role, accepted_at, expires_at, family:families(name)")
    .eq("token", token)
    .maybeSingle();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!invite) {
    return <InviteMessage title="Pozvánka neexistuje" text="Odkaz je nejspíš špatně zkopírovaný." />;
  }

  if (invite.accepted_at) {
    if (user) redirect("/prehled");
    return (
      <InviteMessage
        title="Pozvánka už byla použita"
        text="Přihlas se svým účtem a rodinu uvidíš v seznamu."
        action={<ButtonLink href="/prihlaseni">Přihlásit se</ButtonLink>}
      />
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <InviteMessage
        title="Pozvánka vypršela"
        text="Požádej správce rodiny, ať ti pošle novou."
      />
    );
  }

  const familyName = (invite.family as unknown as { name: string } | null)?.name ?? "rodiny";

  if (!user) {
    return (
      <InviteMessage
        title={`Pozvánka do rodiny ${familyName}`}
        text="Nejdřív se přihlas nebo si vytvoř účet — pozvánku pak přijmeš jedním klikem."
        action={
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <ButtonLink
              href={`/registrace?pozvanka=${token}&email=${encodeURIComponent(invite.email)}`}
              className="flex-1"
              size="lg"
            >
              Vytvořit účet
            </ButtonLink>
            <ButtonLink
              href={`/prihlaseni?dal=${encodeURIComponent(`/pozvanka/${token}`)}`}
              variant="secondary"
              className="flex-1"
              size="lg"
            >
              Mám účet
            </ButtonLink>
          </div>
        }
      />
    );
  }

  return (
    <InviteMessage
      title={`Připojit se k rodině ${familyName}`}
      text={`Přihlášen jako ${user.email}. Po potvrzení uvidíš kalendář, kroužky i výdaje.`}
      action={<AcceptInviteButton token={token} />}
    />
  );
}

function InviteMessage({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <UserPlus className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-lg font-semibold text-ink">{title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{text}</p>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
        <Link
          href="/prehled"
          className="mt-4 block text-sm text-ink-subtle underline-offset-4 hover:underline"
        >
          Zpět do aplikace
        </Link>
      </div>
    </div>
  );
}

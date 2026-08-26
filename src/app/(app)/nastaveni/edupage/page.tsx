import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { edupageConfigured } from "@/lib/edupage";
import { EdupageSettings } from "@/components/settings/edupage-settings";
import type { EdupageDite } from "@/lib/types";

export const metadata: Metadata = { title: "EduPage" };

export default async function EdupageSettingsPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [{ data }, { data: deti }] = await Promise.all([
    supabase
      .from("edupage_accounts")
      .select("email, subdomena, je_rodic, last_sync_at, last_sync_error")
      .eq("user_id", session.userId)
      .maybeSingle(),
    supabase
      .from("edupage_deti")
      .select("id, user_id, edupage_id, child_id, jmeno")
      .eq("user_id", session.userId)
      .order("edupage_id"),
  ]);

  return (
    <div className="space-y-4">
      <Link
        href="/nastaveni"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> Nastavení
      </Link>

      <EdupageSettings
        account={data ?? null}
        edupageDeti={(deti ?? []) as EdupageDite[]}
        deti={session.children.filter((c) => !c.archived)}
        configured={edupageConfigured()}
      />
    </div>
  );
}

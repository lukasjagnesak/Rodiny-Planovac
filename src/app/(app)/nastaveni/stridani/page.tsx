import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { CustodySettings } from "@/components/settings/custody-settings";
import type { CustodyOverride, CustodyPattern } from "@/lib/types";

export const metadata: Metadata = { title: "Střídání péče" };

export default async function CustodySettingsPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [patterns, overrides] = await Promise.all([
    supabase
      .from("custody_patterns")
      .select("*")
      .eq("family_id", session.family.id)
      .order("starts_on", { ascending: false }),
    supabase
      .from("custody_overrides")
      .select("*")
      .eq("family_id", session.family.id)
      .gte("day", new Date().toISOString().slice(0, 10))
      .order("day"),
  ]);

  return (
    <div className="space-y-4">
      <Link
        href="/nastaveni"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> Nastavení
      </Link>

      <CustodySettings
        session={session}
        patterns={(patterns.data ?? []) as CustodyPattern[]}
        overrides={(overrides.data ?? []) as CustodyOverride[]}
      />
    </div>
  );
}

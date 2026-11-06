import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { MarketingSouhlas } from "@/components/settings/marketing-souhlas";

export const metadata: Metadata = { title: "E-maily" };

export default async function EmailyPage() {
  const session = await requireSession();
  const supabase = await createClient();

  // RLS pustí jen vlastní řádek.
  const { data } = await supabase
    .from("marketing_kontakty")
    .select("souhlas, souhlas_at, mc_status")
    .eq("user_id", session.userId)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <Link
        href="/nastaveni"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> Nastavení
      </Link>

      <MarketingSouhlas
        vychozi={Boolean(data?.souhlas)}
        souhlasOd={data?.souhlas ? (data.souhlas_at as string | null) : null}
        ceka={data?.souhlas === true && data?.mc_status === "pending"}
      />
    </div>
  );
}

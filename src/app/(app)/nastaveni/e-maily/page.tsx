import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/session";
import { stavMarketingu } from "@/lib/marketing-stav";
import { MarketingSouhlas } from "@/components/settings/marketing-souhlas";

export const metadata: Metadata = { title: "E-maily" };

export default async function EmailyPage() {
  const session = await requireSession();
  const stav = await stavMarketingu(session.profile.email);

  return (
    <div className="space-y-4">
      <Link
        href="/nastaveni"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> Nastavení
      </Link>

      <MarketingSouhlas stav={stav} />
    </div>
  );
}

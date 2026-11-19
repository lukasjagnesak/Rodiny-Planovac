import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/session";
import { PrehledSettings } from "@/components/settings/prehled-settings";

export const metadata: Metadata = { title: "Přehled" };

export default async function PrehledNastaveniPage() {
  const session = await requireSession();

  return (
    <div className="space-y-4">
      <Link
        href="/nastaveni"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> Nastavení
      </Link>

      <PrehledSettings session={session} />
    </div>
  );
}

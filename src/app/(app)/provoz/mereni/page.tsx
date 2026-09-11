import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/session";
import { jeSpravce } from "@/lib/provoz";
import { KontrolaMereni } from "@/components/provoz/kontrola-mereni";

export const metadata: Metadata = { title: "Kontrola měření" };
export const dynamic = "force-dynamic";

export default async function MereniPage() {
  const session = await requireSession();
  if (!jeSpravce(session.profile.email)) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/provoz"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Provoz
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Kontrola měření
        </h1>
        <p className="text-sm text-ink-muted">
          Jestli se konverze do Google Ads opravdu odesílají — bez vývojářských nástrojů.
        </p>
      </div>

      <KontrolaMereni />
    </div>
  );
}

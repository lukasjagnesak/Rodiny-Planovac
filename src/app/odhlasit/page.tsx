import type { Metadata } from "next";
import Link from "next/link";
import { Check, MailX } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizuj, podpisSedi } from "@/lib/odhlaseni";
import { ZNACKA } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Odhlášení z e-mailů",
  robots: { index: false, follow: false },
};

/**
 * Odhlášení z e-mailů jedním kliknutím.
 *
 * Bez přihlášení a bez potvrzovacího tlačítka. Kdo klikne na „odhlásit",
 * rozhodl se — nabídnout mu ještě jednu obrazovku s dotazem, jestli to
 * myslí vážně, je přesně ta neochota, kvůli které lidé místo odhlášení
 * mačkají „nahlásit spam". A nahlášený spam poškodí doručitelnost všech
 * ostatních zpráv, včetně pozvánek druhému rodiči.
 *
 * Provozní zprávy — pozvánka, platba, konec zkušebního období — chodí
 * dál. Ty nejsou obchodní sdělení, ale součást služby, kterou si člověk
 * objednal.
 */
export default async function OdhlaseniPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; t?: string }>;
}) {
  const { e, t } = await searchParams;
  const email = e ? normalizuj(e) : "";
  const platny = Boolean(email && t && podpisSedi(email, t));

  if (platny) {
    const admin = createAdminClient();
    // Opakované kliknutí na tentýž odkaz nemá skončit chybou — druhé
    // odhlášení jen potvrdí to první.
    await admin.from("mail_odhlaseni").upsert({ email }, { onConflict: "email" });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-16">
      <div className="card p-6 text-center sm:p-8">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
            platny ? "bg-success/10 text-success" : "bg-surface-2 text-ink-subtle"
          }`}
        >
          {platny ? <Check className="h-6 w-6" /> : <MailX className="h-6 w-6" />}
        </div>

        {platny ? (
          <>
            <h1 className="mt-3 font-display text-xl font-semibold text-ink">Odhlášeno</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Na <strong className="text-ink">{email}</strong> už od nás nepřijde žádná
              nabídka ani tip. Zprávy k účtu — pozvánka do rodiny nebo platba — chodí dál.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-display text-xl font-semibold text-ink">
              Odkaz nejde ověřit
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Nejspíš se cestou zkrátil — někteří poštovní klienti dlouhé odkazy lámou.
              Zkuste ho otevřít celý, nebo nám napište na{" "}
              <a href="mailto:info@klidoo.cz" className="text-brand underline underline-offset-4">
                info@klidoo.cz
              </a>{" "}
              a odhlásíme vás ručně.
            </p>
          </>
        )}

        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-line-strong bg-surface px-5 text-sm font-medium text-ink hover:bg-surface-2"
        >
          Zpět na {ZNACKA}
        </Link>
      </div>
    </main>
  );
}

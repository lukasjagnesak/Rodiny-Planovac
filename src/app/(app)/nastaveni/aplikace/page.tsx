import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Smartphone } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TlacitkoInstalace, StavInstalace } from "@/components/ui/instalace";

export const metadata: Metadata = { title: "Aplikace na ploše" };

export default function AplikacePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link
          href="/nastaveni"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Nastavení
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">Aplikace na ploše</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Klidoo si můžeš přidat mezi ostatní aplikace v telefonu.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Přidat Klidoo na plochu"
          description="Otevře se jedním ťuknutím, na celou obrazovku a bez adresního řádku."
        />
        <CardBody className="space-y-4 pt-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Smartphone className="h-5 w-5" />
            </span>
            <div className="text-sm text-ink-muted">
              <p>
                Nic se nestahuje z obchodu a nic nezabírá místo — je to ta samá aplikace,
                jen se ikona objeví mezi ostatními. Přihlášení zůstane, takže odpadá
                hledání v prohlížeči.
              </p>
              {/* Bez tohohle si lidé myslí, že notifikace bez „opravdové"
                  aplikace nejdou, a čekají na appku z obchodu. */}
              <p className="mt-2">
                Na ploše fungují i připomínky, které si zapneš v Notifikacích.
              </p>
            </div>
          </div>

          <StavInstalace />
          <TlacitkoInstalace />
        </CardBody>
      </Card>
    </div>
  );
}

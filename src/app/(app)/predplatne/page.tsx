import type { Metadata } from "next";
import { Check } from "lucide-react";
import { requireSession } from "@/lib/session";
import { nactiPredplatne } from "@/lib/predplatne";
import { stripeJeNastaveny } from "@/lib/stripe";
import { CO_JE_V_CENE, tarifPodleId, ZKUSEBNI_DNI } from "@/lib/tarify";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { SpravaPredplatneho, VolbaTarifu } from "@/components/predplatne/volba-tarifu";

export const metadata: Metadata = { title: "Předplatné" };

export default async function PredplatnePage({
  searchParams,
}: {
  searchParams: Promise<{ stav?: string }>;
}) {
  const session = await requireSession();
  const { stav } = await searchParams;
  const pristup = await nactiPredplatne(session.family.id);
  const predplatne = pristup.predplatne;
  const tarif = tarifPodleId(predplatne?.tarif);
  const plati = predplatne ? new Date(predplatne.plati_do).toLocaleDateString("cs-CZ") : null;
  const jeZaplaceno = predplatne?.stav === "aktivni" || predplatne?.stav === "po_splatnosti";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Předplatné</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Jedno předplatné pro celou rodinu. Druhý rodič nic neplatí.
        </p>
      </div>

      {stav === "hotovo" ? (
        <Alert tone="success">
          Děkujeme! Platba proběhla. Než se potvrzení propíše ze Stripe, může to být pár vteřin.
        </Alert>
      ) : null}
      {stav === "zruseno" ? (
        <Alert tone="info">Platba nebyla dokončena. Nic se nestalo, můžeš ji spustit znovu.</Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Stav rodiny"
          description={session.family.name}
          action={<Odznak pristup={pristup} />}
        />
        <CardBody className="pt-3 text-sm text-ink-muted">
          {predplatne === null ? (
            <p>Tvoje rodina má přístup bez omezení.</p>
          ) : predplatne.stav === "zkusebni" && pristup.muzeZapisovat ? (
            <p>
              Zkušební období běží do <strong className="text-ink">{plati}</strong>. Karta k němu
              potřeba není a nic se samo nestrhne.
            </p>
          ) : predplatne.stav === "zruseno" && pristup.muzeZapisovat ? (
            <p>
              Předplatné je zrušené, ale zaplacené období běží do{" "}
              <strong className="text-ink">{plati}</strong>. Do té doby se nic nemění.
            </p>
          ) : !pristup.muzeZapisovat ? (
            <p>
              Zápis je zamčený. Kalendář, výdaje i doklady zůstávají čitelné — nic ti nemažeme.
            </p>
          ) : predplatne.stav === "po_splatnosti" ? (
            <p>
              Poslední platba neprošla. Stripe ji ještě několikrát zkusí, aplikace mezitím běží dál.
              Nejrychlejší je zkontrolovat kartu ve správě plateb.
            </p>
          ) : (
            <p>
              Předplaceno{tarif ? ` (${tarif.nazev.toLowerCase()})` : ""} do{" "}
              <strong className="text-ink">{plati}</strong>. Obnoví se samo.
            </p>
          )}
        </CardBody>
      </Card>

      {jeZaplaceno ? (
        <Card>
          <CardHeader title="Platba a faktury" description="Karta, faktury i zrušení jsou ve Stripe." />
          <CardBody className="pt-3">
            <SpravaPredplatneho familyId={session.family.id} />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title={pristup.muzeZapisovat ? "Pokračovat po zkušebním období" : "Odemknout zápis"}
            description={
              pristup.jeZkusebni && pristup.dniDoKonce > 2
                ? `Zaplatit můžeš hned. Karta se strhne až ${plati}, zbylých ${pristup.dniDoKonce} dní zkušebního období o nic nepřijdeš.`
                : `Zkušební období je ${ZKUSEBNI_DNI} dní a kartu k němu nepotřebuješ.`
            }
          />
          <CardBody className="pt-3">
            <VolbaTarifu familyId={session.family.id} brana={stripeJeNastaveny()} />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Co je v ceně" />
        <CardBody className="space-y-2.5 pt-3">
          {CO_JE_V_CENE.map(({ nazev, popis }) => (
            <div key={nazev} className="flex items-start gap-2.5 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>
                <span className="font-medium text-ink">{nazev}</span>{" "}
                <span className="text-ink-muted">— {popis}</span>
              </span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function Odznak({ pristup }: { pristup: Awaited<ReturnType<typeof nactiPredplatne>> }) {
  const { predplatne, muzeZapisovat, jeZkusebni, dniDoKonce } = pristup;

  const [text, styl] = !predplatne
    ? ["Bez omezení", "bg-surface-2 text-ink-muted"]
    : !muzeZapisovat
      ? ["Jen ke čtení", "bg-danger/10 text-danger"]
      : predplatne.stav === "po_splatnosti"
        ? ["Platba vázne", "bg-warning/15 text-warning"]
        : jeZkusebni
          ? [`Zkušební · ${dniDoKonce} dní`, "bg-brand-soft text-brand"]
          : ["Aktivní", "bg-success/10 text-success"];

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styl}`}>{text}</span>
  );
}

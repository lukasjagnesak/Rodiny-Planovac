import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { nactiOznameni } from "@/lib/oznameni-server";
import { nactiPredplatne } from "@/lib/predplatne";
import { PruhPredplatneho } from "@/components/predplatne/pruh";
import { jeSpravce } from "@/lib/provoz";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const [{ novych }, pristup] = await Promise.all([
    nactiOznameni(session),
    nactiPredplatne(session.family.id),
  ]);

  return (
    <AppShell
      session={session}
      novychOznameni={novych}
      spravce={jeSpravce(session.profile.email)}
      pruh={
        pristup.upozorneni ? (
          <PruhPredplatneho text={pristup.upozorneni} zamceno={!pristup.muzeZapisovat} />
        ) : null
      }
    >
      {children}
    </AppShell>
  );
}

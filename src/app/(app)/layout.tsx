import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { nactiOznameni } from "@/lib/oznameni-server";
import { nactiPredplatne } from "@/lib/predplatne";
import { PruhPredplatneho } from "@/components/predplatne/pruh";
import { jeSpravce } from "@/lib/provoz";
import { createClient } from "@/lib/supabase/server";
import { vAplikaci } from "@/lib/nativni-server";
import { pocetNeprectenych, type Zprava } from "@/lib/zpravy";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const supabase = await createClient();

  const [{ novych }, pristup, { data: zpravy }] = await Promise.all([
    nactiOznameni(session),
    nactiPredplatne(session.family.id),
    // Jen to, z čeho se počítá odznak — text zpráv sem nepatří.
    supabase
      .from("zpravy")
      .select("id, autor, precteni:zpravy_precteni(user_id, precteno_at)")
      .eq("family_id", session.family.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  // V aplikaci z obchodu bez výzev k placení (viz lib/nativni.ts):
  // jen zámek a neprošlá platba, neutrálně a bez odkazu na nákup.
  const aplikace = await vAplikaci();
  const textPruhu = !aplikace
    ? pristup.upozorneni
    : !pristup.muzeZapisovat
      ? "Předplatné rodiny není aktivní. Vše zapsané si můžete dál prohlížet."
      : pristup.predplatne?.stav === "po_splatnosti"
        ? "Poslední platba předplatného neprošla."
        : null;

  return (
    <AppShell
      session={session}
      novychOznameni={novych}
      neprectenychZprav={pocetNeprectenych((zpravy ?? []) as Zprava[], session.userId)}
      spravce={jeSpravce(session.profile.email)}
      pruh={
        textPruhu ? (
          <PruhPredplatneho
            text={textPruhu}
            zamceno={!pristup.muzeZapisovat}
            bezOdkazu={aplikace}
          />
        ) : null
      }
    >
      {children}
    </AppShell>
  );
}

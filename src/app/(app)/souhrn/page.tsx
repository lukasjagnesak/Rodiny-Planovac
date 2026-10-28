import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { nactiPredplatne } from "@/lib/predplatne";
import { ZamcenyDokument } from "@/components/ui/zamceno";
import { createClient } from "@/lib/supabase/server";
import { nactiSouhrn } from "@/lib/souhrn-nacteni";
import { toDateKey } from "@/lib/dates";
import { VolbaObdobi } from "@/components/souhrn/volba-obdobi";
import { urciObdobi } from "@/lib/obdobi";
import { SouhrnDokument } from "@/components/souhrn/dokument";

export const metadata: Metadata = { title: "Souhrn pro soud a advokáta" };

/**
 * Souhrn péče a nákladů za období.
 *
 * Vzniklo to jako odpověď na otázku, která u střídavé péče přijde vždycky:
 * kolik nocí děti u koho byly a kdo co platil. Rodiče na to dosud
 * odpovídali z paměti — každý jinak — a advokát z toho skládal podání.
 *
 * Dokument si vygeneruje rodina sama a dá ho, komu chce. Klidoo nikam nic
 * neposílá; komu se ukáže, rozhoduje ta rodina, a to i proto, že jde
 * o údaje o dětech a o penězích obou rodičů.
 *
 * Do PDF se to dostane přes tisk prohlížeče. Zní to jako ústupek, ale
 * je to lepší než knihovna na PDF: sazbu vidí člověk dřív, než ji uloží,
 * dokument se dá zvětšit i přečíst odečítačem obrazovky a nemusí se
 * udržovat druhá verze rozvržení, která by se s tou na obrazovce
 * dřív nebo později rozešla.
 */
export default async function SouhrnPage({
  searchParams,
}: {
  searchParams: Promise<{ od?: string; do?: string; kod?: string }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const parametry = await searchParams;

  // Listina je produkt, ne zapsaná data. Čísla, ze kterých vzniká,
  // zůstávají v aplikaci čitelná i bez předplatného; složit z nich
  // dokument pro soud je to, za co se platí — a je to zároveň chvíle,
  // kdy má rodina k předplatnému nejblíž.
  const pristup = await nactiPredplatne(session.family.id);
  if (!pristup.muzeZapisovat) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Souhrn pro soud a advokáta
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Kolik nocí děti u koho byly, co se za ně utratilo a kdo vozil.
          </p>
        </div>
        <ZamcenyDokument
          nadpis="Souhrn se vytváří s předplatným"
          popis="Podklad pro soud, advokáta nebo mediátora složí Klidoo z toho, co máte zapsané — noci u rodičů, náklady i odvozy za zvolené období."
        />
      </div>
    );
  }

  const { od, do: doData, klic } = urciObdobi(parametry.od, parametry.do);
  const odKlic = toDateKey(od);
  const doKlic = toDateKey(doData);

  const souhrn = await nactiSouhrn(supabase, session, od, doData);

  // Kód ověřitelného výpisu, pokud právě vznikl (tlačítko Tisk). Platí
  // jen kód této rodiny a přesně tohoto období — jinak by šlo k jinému
  // souhrnu přidat kód, který ověřuje jiná čísla.
  let kod: string | null = null;
  if (parametry.kod) {
    const { data: vypis } = await supabase
      .from("vypisy")
      .select("kod")
      .eq("family_id", session.family.id)
      .eq("druh", "souhrn")
      .eq("kod", parametry.kod)
      .eq("obdobi_od", odKlic)
      .eq("obdobi_do", doKlic)
      .maybeSingle();
    kod = vypis?.kod ?? null;
  }

  return (
    <div className="space-y-5">
      <VolbaObdobi aktivni={klic} od={odKlic} do={doKlic} />
      <SouhrnDokument souhrn={souhrn} session={session} kod={kod} />
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { subDays } from "date-fns";
import { requireSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { jeSpravce } from "@/lib/provoz";
import { kanal, poDnech, trychtyr, zebricek, type Udalost } from "@/lib/provoz-souhrn";
import { toDateKey } from "@/lib/dates";
import { ProvozScreen } from "@/components/provoz/provoz-screen";

export const metadata: Metadata = { title: "Provoz" };
export const dynamic = "force-dynamic";

/**
 * Interní přehled návštěvnosti a trychtýře.
 *
 * Neexistuje pro nikoho kromě provozovatele: kdo není v ADMIN_EMAILS,
 * dostane 404, ne „nemáte oprávnění". Stránka, o které se ostatní nedozví,
 * že existuje, je o starost míň.
 */
export default async function ProvozPage({
  searchParams,
}: {
  searchParams: Promise<{ dny?: string }>;
}) {
  const session = await requireSession();
  if (!jeSpravce(session.profile.email)) notFound();

  const { dny } = await searchParams;
  const obdobi = [7, 30, 90].includes(Number(dny)) ? Number(dny) : 30;

  const do_ = new Date();
  const od = subDays(do_, obdobi - 1);

  const admin = createAdminClient();
  const [{ data: udalostiRaw }, rodiny, predplatna, leady] = await Promise.all([
    admin
      .from("provoz_udalosti")
      .select("druh, cesta, zdroj, utm_source, utm_medium, utm_campaign, ref, zarizeni, navstevnik, created_at")
      .gte("created_at", od.toISOString())
      .order("created_at"),
    admin.from("families").select("id", { count: "exact", head: true }),
    admin.from("predplatna").select("stav"),
    admin.from("leady").select("id", { count: "exact", head: true }),
  ]);

  const udalosti = (udalostiRaw ?? []) as Udalost[];

  const stavy = (predplatna.data ?? []) as { stav: string }[];
  const zaklad = {
    rodin: rodiny.count ?? 0,
    platicich: stavy.filter((s) => s.stav === "aktivni").length,
    vezkusebnim: stavy.filter((s) => s.stav === "zkusebni").length,
    leadu: leady.count ?? 0,
  };

  return (
    <ProvozScreen
      obdobi={obdobi}
      dny={poDnech(udalosti, toDateKey(od), toDateKey(do_))}
      trychtyr={trychtyr(udalosti)}
      kanaly={zebricek(udalosti, kanal)}
      stranky={zebricek(udalosti, (u) => u.cesta, "/")}
      zarizeni={zebricek(udalosti, (u) => u.zarizeni, "neznámé", 3)}
      zaklad={zaklad}
    />
  );
}

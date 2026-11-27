import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { nactiPredplatne } from "@/lib/predplatne";
import { nactiSouhrn } from "@/lib/souhrn-nacteni";
import { urciObdobi } from "@/lib/obdobi";
import { toDateKey } from "@/lib/dates";
import { novyKod, zaregistrujVypis } from "@/lib/vypisy";

/**
 * Ověřovací kód pro souhrn, který se právě tiskne.
 *
 * Souhrn se tiskne z prohlížeče, takže otisk souboru udělat nejde.
 * Ověřuje se proto podle čísel — a ta spočítá server sám, ze stejných
 * dat jako stránka. Kdyby je posílal prohlížeč, šlo by si k podvrženým
 * číslům vyrobit platný kód.
 */
export async function POST(request: NextRequest) {
  const session = await requireSession();
  const pristup = await nactiPredplatne(session.family.id);
  if (!pristup.muzeZapisovat) {
    return NextResponse.json({ chyba: "Souhrn se vytváří s předplatným." }, { status: 402 });
  }

  const telo = await request.json().catch(() => null);
  const { od, do: doData } = urciObdobi(
    typeof telo?.od === "string" ? telo.od : undefined,
    typeof telo?.do === "string" ? telo.do : undefined,
  );

  const supabase = await createClient();
  const souhrn = await nactiSouhrn(supabase, session, od, doData);
  const kod = novyKod();

  await zaregistrujVypis({
    session,
    kod,
    druh: "souhrn",
    od: toDateKey(od),
    do: toDateKey(doData),
    shrnuti: {
      noci: {
        a: souhrn.noci.a,
        b: souhrn.noci.b,
        celkem: souhrn.noci.celkem,
        jmenoA: session.members.find((m) => m.side === "a" && m.role !== "viewer")?.name ?? "Rodič A",
        jmenoB: session.members.find((m) => m.side === "b" && m.role !== "viewer")?.name ?? "Rodič B",
      },
      vydajeCelkem: souhrn.vydajeCelkem,
      podleRodice: souhrn.podleRodice.map((r) => ({ jmeno: r.jmeno, zaplatil: r.zaplatil })),
      dopravaCelkem: souhrn.dopravaCelkem,
    },
  });

  return NextResponse.json({ kod, od: toDateKey(od), do: toDateKey(doData) });
}

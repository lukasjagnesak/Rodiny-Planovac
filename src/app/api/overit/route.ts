import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { HODINA, klicVolajiciho, Limit } from "@/lib/limit";
import { normalizujKod } from "@/lib/kod-vypisu";

/**
 * Ověření výpisu podle kódu (veřejné, bez přihlášení).
 *
 * Soubor sem nechodí — prohlížeč spočítá jeho otisk sám a pošle jen ten.
 * Výpis je plný osobních údajů a na ověření stačí 64 znaků.
 *
 * Vrací jen to, co je ve výpisu tak jako tak napsané: druh, období,
 * kdo a kdy ho vytvořil a souhrnná čísla. Nic dalšího o rodině.
 * Limit pokusů brání tomu, aby se kódy zkoušely naslepo.
 */
const LIMIT = new Limit(30, HODINA);

export async function POST(request: NextRequest) {
  if (LIMIT.prekrocen(klicVolajiciho(request.headers) ?? "neznámá")) {
    return NextResponse.json({ chyba: "Příliš mnoho pokusů. Zkuste to za hodinu." }, { status: 429 });
  }

  const telo = await request.json().catch(() => null);
  const kod = normalizujKod(typeof telo?.kod === "string" ? telo.kod : "");
  const otisk =
    typeof telo?.otisk === "string" && /^[0-9a-f]{64}$/.test(telo.otisk) ? telo.otisk : null;
  if (!kod) return NextResponse.json({ stav: "neplatny" });

  const { data } = await createAdminClient()
    .from("vypisy")
    .select("druh, vytvoril_jmeno, vytvoreno, obdobi_od, obdobi_do, otisk, shrnuti")
    .eq("kod", kod)
    .maybeSingle();

  if (!data) return NextResponse.json({ stav: "nenalezeno", kod });

  return NextResponse.json({
    stav: "nalezeno",
    kod,
    druh: data.druh,
    vytvoril: data.vytvoril_jmeno,
    vytvoreno: data.vytvoreno,
    od: data.obdobi_od,
    do: data.obdobi_do,
    shrnuti: data.shrnuti,
    // null = soubor se neposílal, nebo jde o tištěný souhrn bez otisku
    souborSedi: otisk && data.otisk ? otisk === data.otisk : null,
    maOtisk: Boolean(data.otisk),
  });
}

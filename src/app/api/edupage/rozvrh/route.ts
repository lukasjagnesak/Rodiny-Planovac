import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { credentialsFromRow, fetchEdupageRozvrh } from "@/lib/edupage";
import { slozRozvrh } from "@/lib/rozvrh";

export const maxDuration = 300;

/**
 * Stáhne rozvrh z EduPage a nahradí jím dřív stažené hodiny.
 *
 * Ručně zapsané hodiny zůstávají — když si rodič něco doplnil sám,
 * stažení mu to nepřepíše.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const { childId } = (await request.json()) as { childId?: string };
  if (!childId) {
    return NextResponse.json({ error: "Chybí dítě, ke kterému rozvrh patří." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: account } = await admin
    .from("edupage_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "EduPage není propojené." }, { status: 400 });
  }

  // Dítě musí patřit do rodiny, ve které smí uživatel upravovat.
  const { data: dite } = await admin
    .from("children")
    .select("id, family_id")
    .eq("id", childId)
    .maybeSingle();

  if (!dite) return NextResponse.json({ error: "Dítě nenalezeno." }, { status: 404 });

  const { data: clenstvi } = await admin
    .from("family_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("family_id", dite.family_id)
    .maybeSingle();

  if (!clenstvi || clenstvi.role === "viewer") {
    return NextResponse.json({ error: "Na tohle nemáš oprávnění." }, { status: 403 });
  }

  try {
    const { hodiny, dnu, chyby } = await fetchEdupageRozvrh(credentialsFromRow(account), 14);
    const slozene = slozRozvrh(hodiny);

    // Ručně zapsané hodiny mají přednost — na jejich místo se nesahá.
    const { data: rucni } = await admin
      .from("rozvrh_hodiny")
      .select("den, poradi, parita")
      .eq("child_id", childId)
      .eq("ze_edupage", false);

    const obsazeno = new Set(
      (rucni ?? []).map((h) => `${h.den}|${h.poradi}|${h.parita}`),
    );

    await admin
      .from("rozvrh_hodiny")
      .delete()
      .eq("child_id", childId)
      .eq("ze_edupage", true);

    const kZapisu = slozene
      .filter((h) => !obsazeno.has(`${h.den}|${h.poradi}|${h.parita}`))
      .map((h) => ({
        family_id: dite.family_id,
        child_id: childId,
        den: h.den,
        poradi: h.poradi,
        predmet: h.predmet,
        ucebna: h.ucebna,
        ucitel: h.ucitel,
        zacatek: h.zacatek,
        konec: h.konec,
        parita: h.parita,
        ze_edupage: true,
      }));

    if (kZapisu.length > 0) {
      const { error } = await admin.from("rozvrh_hodiny").insert(kZapisu);
      if (error) throw error;
    }

    await admin
      .from("edupage_accounts")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_error: null,
        rozvrh_child_id: childId,
      })
      .eq("user_id", user.id);

    return NextResponse.json({
      ok: true,
      pocet: kZapisu.length,
      dnu,
      preskoceno: slozene.length - kZapisu.length,
      chyby,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stažení rozvrhu selhalo.";
    await admin
      .from("edupage_accounts")
      .update({ last_sync_error: message.slice(0, 400) })
      .eq("user_id", user.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchEdupageItems } from "@/lib/edupage";
import { nactiEdupageKontext, zapisVysledek } from "@/lib/edupage-sync";
import { ACTIVE_FAMILY_COOKIE } from "@/lib/members";
import { cookies } from "next/headers";

export const maxDuration = 300;

/** Stáhne úkoly, písemky a zprávy z EduPage a uloží je pro celou rodinu. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const { kontext, chyba } = await nactiEdupageKontext(user.id);
  if (!kontext) return NextResponse.json({ error: chyba }, { status: 400 });

  const admin = createAdminClient();

  // Kam se uloží položky, které nepatří konkrétnímu dítěti — do právě
  // otevřené rodiny.
  const { data: memberships } = await admin
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id);

  const familyIds = (memberships ?? []).map((m) => m.family_id);
  if (familyIds.length === 0) {
    return NextResponse.json({ error: "Nejsi v žádné rodině." }, { status: 400 });
  }

  const preferred = (await cookies()).get(ACTIVE_FAMILY_COOKIE)?.value;
  const vychoziFamilyId = familyIds.includes(preferred ?? "") ? preferred! : familyIds[0];

  // ID dítěte v EduPage → dítě v plánovači.
  const podleEdupageId = new Map(kontext.parovani.map((p) => [p.edupage_id, p]));

  try {
    const { polozky, chyby } = await fetchEdupageItems(kontext.creds, 45);

    const radky = polozky.map((item) => {
      const dite = item.diteId != null ? podleEdupageId.get(item.diteId) : undefined;
      return {
        family_id: dite?.family_id ?? vychoziFamilyId,
        child_id: dite?.child_id ?? null,
        external_id: item.id,
        druh: item.druh,
        typ: item.typ,
        text: item.text,
        predmet: item.predmet,
        termin: item.termin,
        zadano: item.zadano,
        hotovo: item.hotovo,
        autor: item.autor,
        navrh_kalendare: item.navrhKalendare,
        fetched_at: new Date().toISOString(),
      };
    });

    if (radky.length > 0) {
      const { error } = await admin
        .from("edupage_items")
        .upsert(radky, { onConflict: "family_id,external_id" });
      if (error) throw error;
    }

    await zapisVysledek(user.id, chyby.length > 0 ? chyby.join("; ") : null);

    return NextResponse.json({
      ok: true,
      pocet: radky.length,
      zprav: radky.filter((r) => r.druh === "zprava").length,
      deti: kontext.parovani.length,
      chyby,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stažení selhalo.";
    await zapisVysledek(user.id, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

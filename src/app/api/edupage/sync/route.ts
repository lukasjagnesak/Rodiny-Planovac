import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { credentialsFromRow, fetchEdupageItems } from "@/lib/edupage";
import { ACTIVE_FAMILY_COOKIE } from "@/lib/members";
import { cookies } from "next/headers";

export const maxDuration = 120;

/** Stáhne úkoly z EduPage a uloží je pro celou rodinu. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const admin = createAdminClient();

  const { data: account } = await admin
    .from("edupage_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "EduPage není propojené." }, { status: 400 });
  }

  // Do které rodiny se úkoly uloží — bere se právě otevřená rodina.
  const { data: memberships } = await admin
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id);

  const familyIds = (memberships ?? []).map((m) => m.family_id);
  if (familyIds.length === 0) {
    return NextResponse.json({ error: "Nejsi v žádné rodině." }, { status: 400 });
  }

  const preferred = (await cookies()).get(ACTIVE_FAMILY_COOKIE)?.value;
  const familyId = familyIds.includes(preferred ?? "") ? preferred! : familyIds[0];

  try {
    const items = await fetchEdupageItems(credentialsFromRow(account), 45);

    if (items.length > 0) {
      const { error } = await admin.from("edupage_items").upsert(
        items.map((item) => ({
          family_id: familyId,
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
        })),
        { onConflict: "family_id,external_id" },
      );
      if (error) throw error;
    }

    await admin
      .from("edupage_accounts")
      .update({ last_sync_at: new Date().toISOString(), last_sync_error: null })
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true, pocet: items.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stažení selhalo.";
    await admin
      .from("edupage_accounts")
      .update({ last_sync_error: message.slice(0, 400) })
      .eq("user_id", user.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

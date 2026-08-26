import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { credentialsFromRow, fetchEdupageDeti } from "@/lib/edupage";

export const maxDuration = 120;

async function prihlaseny() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Zjistí, jaké děti účet v EduPage vidí, a uloží je jako nabídku k
 * spárování. Už spárované děti zůstanou spárované.
 */
export async function POST() {
  const user = await prihlaseny();
  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const admin = createAdminClient();
  const { data: ucet } = await admin
    .from("edupage_accounts")
    .select("email, heslo_enc, subdomena")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ucet) return NextResponse.json({ error: "EduPage není propojené." }, { status: 400 });

  try {
    const { jeRodic, deti, klice, potize } = await fetchEdupageDeti(
      credentialsFromRow(ucet),
    );

    // Zapisují se jen nové děti — párování na dítě v plánovači i jméno,
    // které si rodič případně opravil, se přepsat nesmí.
    const { data: znama } = await admin
      .from("edupage_deti")
      .select("edupage_id")
      .eq("user_id", user.id);

    const uzMame = new Set((znama ?? []).map((r) => r.edupage_id as number));
    const nove = deti.filter((d) => !uzMame.has(d.edupageId));

    if (nove.length > 0) {
      const { error } = await admin.from("edupage_deti").insert(
        nove.map((d) => ({
          user_id: user.id,
          edupage_id: d.edupageId,
          jmeno: d.jmeno,
        })),
      );
      if (error) throw error;
    }

    await admin.from("edupage_accounts").update({ je_rodic: jeRodic }).eq("user_id", user.id);

    return NextResponse.json({
      ok: true,
      jeRodic,
      nalezeno: deti.length,
      pridano: nove.length,
      klice,
      potize,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Hledání dětí selhalo.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** Uloží párování dítěte v EduPage na dítě v plánovači. */
export async function PUT(request: NextRequest) {
  const user = await prihlaseny();
  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const edupageId = Number(body?.edupageId);
  const childIdRaw = body?.childId;
  const childId = typeof childIdRaw === "string" && childIdRaw ? childIdRaw : null;
  const jmeno = typeof body?.jmeno === "string" && body.jmeno ? body.jmeno : null;

  if (!Number.isInteger(edupageId) || edupageId <= 0) {
    return NextResponse.json({ error: "ID dítěte musí být celé číslo." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Dítě musí být z rodiny, ve které uživatel opravdu je.
  if (childId) {
    const { data: dite } = await admin
      .from("children")
      .select("id, family_id")
      .eq("id", childId)
      .maybeSingle();

    if (!dite) {
      return NextResponse.json({ error: "Dítě nenalezeno." }, { status: 404 });
    }

    const { data: clenstvi } = await admin
      .from("family_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("family_id", dite.family_id)
      .maybeSingle();

    if (!clenstvi || clenstvi.role === "viewer") {
      return NextResponse.json({ error: "K tomuhle dítěti nemáš přístup." }, { status: 403 });
    }
  }

  const { error } = await admin.from("edupage_deti").upsert(
    { user_id: user.id, edupage_id: edupageId, child_id: childId, jmeno },
    { onConflict: "user_id,edupage_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

/** Odebere dítě z nabídky. */
export async function DELETE(request: NextRequest) {
  const user = await prihlaseny();
  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const edupageId = Number(new URL(request.url).searchParams.get("edupageId"));
  if (!Number.isInteger(edupageId)) {
    return NextResponse.json({ error: "Chybí ID dítěte." }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from("edupage_deti")
    .delete()
    .eq("user_id", user.id)
    .eq("edupage_id", edupageId);

  return NextResponse.json({ ok: true });
}

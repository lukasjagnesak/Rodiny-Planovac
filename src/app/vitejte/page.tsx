import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeJeNastaveny } from "@/lib/stripe";
import { OnboardingWizard, type PredvyplnenoZKalkulacky } from "./wizard";
import { ListaUctu } from "@/components/ui/lista-uctu";
import { ZmerRegistraci } from "./zmer-registraci";
import type { PatternKind } from "@/lib/types";
import { rozvrhZPece } from "@/lib/vyzivne-plan";
import { toDateKey, WEEK_OPTS } from "@/lib/dates";
import { startOfWeek } from "date-fns";

export const metadata: Metadata = { title: "Vítejte" };

/**
 * Vyzvedne rozpis z veřejné kalkulačky a připíše ho uživateli.
 *
 * Tohle je celý smysl toho funnelu: člověk si rozpis naklikal ještě před
 * registrací, takže po přihlášení nemá začínat s prázdným kalendářem.
 */
async function prevezmiPlan(
  token: string,
  userId: string,
): Promise<PredvyplnenoZKalkulacky | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("kalkulacka_plany")
    .select("id, kind, anchor_date, anchor_side, weekly_map, pocet_deti, claimed_by")
    .eq("token", token)
    .maybeSingle();

  if (!data) return null;

  // Cizí rozpis si nikdo nepřipíše, ale klidně podle něj může začít —
  // odkaz se sdílí právě proto, aby si podle něj druhý rodič založil svůj.
  if (!data.claimed_by) {
    await admin
      .from("kalkulacka_plany")
      .update({ claimed_by: userId, claimed_at: new Date().toISOString() })
      .eq("id", data.id);
  }

  return {
    kind: data.kind as PatternKind,
    anchorDate: data.anchor_date as string,
    anchorSide: data.anchor_side as "a" | "b",
    weeklyMap: (data.weekly_map as string | null) ?? "aabbaab",
    pocetDeti: (data.pocet_deti as number) ?? 1,
  };
}

/**
 * Totéž pro kalkulačku výživného.
 *
 * Přenáší se počet dětí a jejich etapy, rozvrh odvozený z podílu péče
 * a částka. Příjmy v tabulce nejsou — viz migrace 0028.
 *
 * Rozvrh se neodvozuje vždycky: u podílu mezi rovnoměrnou a téměř
 * výhradní péčí (třeba 60/40) žádný vzor v aplikaci neodpovídá a
 * vybrat nejbližší by znamenalo vydat odhad za zadání rodiče.
 */
async function prevezmiVyzivne(
  token: string,
  userId: string,
): Promise<PredvyplnenoZKalkulacky | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("vyzivne_plany")
    .select("id, etapy, pece_a, plati, castka, claimed_by")
    .eq("token", token)
    .maybeSingle();

  if (!data) return null;

  if (!data.claimed_by) {
    await admin
      .from("vyzivne_plany")
      .update({ claimed_by: userId, claimed_at: new Date().toISOString() })
      .eq("id", data.id);
  }

  const etapy = (data.etapy as string[] | null) ?? [];
  const peceA = Number(data.pece_a);
  const rozvrh = rozvrhZPece(peceA);
  const castka = Number(data.castka);
  const plati = data.plati as "a" | "b" | null;

  return {
    kind: rozvrh?.kind ?? "iso_week_parity",
    anchorDate: toDateKey(startOfWeek(new Date(), WEEK_OPTS)),
    anchorSide: rozvrh?.anchorSide ?? "a",
    weeklyMap: "aabbaab",
    pocetDeti: Math.max(etapy.length, 1),
    etapy,
    rozvrhOdvozen: rozvrh !== null,
    vyzivne: plati && castka > 0 ? { castka, plati } : null,
  };
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; vyzivne?: string }>;
}) {
  const { plan, vyzivne } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prihlaseni");

  const { data: memberships } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .limit(1);

  if (memberships && memberships.length > 0) {
    // Kdo rodinu má, sem nepatří — ale nese-li s sebou výpočet
    // z kalkulačky, patří na převzetí, ne na přehled. Tohle je přesně
    // to místo, kde se odložený výpočet ztrácel.
    redirect(
      vyzivne ? `/prevzit/vyzivne?token=${encodeURIComponent(vyzivne)}` : "/prehled",
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const predvyplneno = plan
    ? await prevezmiPlan(plan, user.id)
    : vyzivne
      ? await prevezmiVyzivne(vyzivne, user.id)
      : null;

  // Čerstvě založený účet. Okno je široké schválně — dvojímu započítání
  // brání značka u uživatele, tohle jen drží stranou ty, kdo tu mají účet
  // od loňska a rodinu si nikdy nezaložili.
  const novyUcet =
    Date.now() - Date.parse(user.created_at) < 24 * 60 * 60 * 1000;

  return (
    <>
      <ZmerRegistraci userId={user.id} novy={novyUcet} />
      {/* Bez tohohle je průvodce slepá ulička: kdo má účet a nemá rodinu,
          se sem vrací ze všech cest do aplikace i z přihlášení. */}
      <ListaUctu email={user.email ?? null} />
      <OnboardingWizard
        defaultName={profile?.full_name ?? ""}
        predvyplneno={predvyplneno}
        branaJede={stripeJeNastaveny()}
      />
    </>
  );
}

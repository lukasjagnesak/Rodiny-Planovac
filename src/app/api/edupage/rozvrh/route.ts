import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchEdupageRozvrh, type EdupageLesson } from "@/lib/edupage";
import { nactiEdupageKontext, zapisVysledek } from "@/lib/edupage-sync";
import { slozRozvrh, zmenyZPozorovani, type PozorovanaHodina } from "@/lib/rozvrh";

export const maxDuration = 300;

/**
 * Stáhne rozvrh z EduPage pro všechny spárované děti.
 *
 * Ručně zapsané hodiny zůstávají — když si rodič něco doplnil sám,
 * stažení mu to nepřepíše. Nahrazují se jen řádky z minulého stažení.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Nepřihlášeno" }, { status: 401 });

  const { kontext, chyba } = await nactiEdupageKontext(user.id);
  if (!kontext) return NextResponse.json({ error: chyba }, { status: 400 });

  const admin = createAdminClient();

  try {
    const { hodiny, dnu, chyby, nedokonceno } = await fetchEdupageRozvrh(kontext.creds, 14);

    // Žákovský účet nic nepřepíná, takže hodiny přijdou bez ID dítěte —
    // patří tomu jedinému spárovanému.
    const jedineDite = kontext.parovani.length === 1 ? kontext.parovani[0] : null;
    const podleEdupageId = new Map(kontext.parovani.map((p) => [p.edupage_id, p]));

    const podleDitete = new Map<string, { hodiny: EdupageLesson[]; family_id: string }>();
    let bezDitete = 0;

    for (const h of hodiny) {
      const dite = h.diteId != null ? podleEdupageId.get(h.diteId) : jedineDite;
      if (!dite) {
        bezDitete += 1;
        continue;
      }
      const zaznam = podleDitete.get(dite.child_id);
      if (zaznam) zaznam.hodiny.push(h);
      else podleDitete.set(dite.child_id, { hodiny: [h], family_id: dite.family_id });
    }

    let zapsano = 0;
    let preskoceno = 0;
    let zmenCelkem = 0;

    for (const [childId, { hodiny: moje, family_id }] of podleDitete) {
      const pozorovani: PozorovanaHodina[] = moje;
      const slozene = slozRozvrh(pozorovani);
      const zmeny = zmenyZPozorovani(pozorovani);

      // Ručně zapsané hodiny mají přednost — na jejich místo se nesahá.
      const { data: rucni } = await admin
        .from("rozvrh_hodiny")
        .select("den, poradi, parita")
        .eq("child_id", childId)
        .eq("ze_edupage", false);

      const obsazeno = new Set((rucni ?? []).map((h) => `${h.den}|${h.poradi}|${h.parita}`));

      await admin
        .from("rozvrh_hodiny")
        .delete()
        .eq("child_id", childId)
        .eq("ze_edupage", true);

      const kZapisu = slozene
        .filter((h) => !obsazeno.has(`${h.den}|${h.poradi}|${h.parita}`))
        .map((h) => ({
          family_id,
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

      zapsano += kZapisu.length;
      preskoceno += slozene.length - kZapisu.length;

      // Změny platí na konkrétní den — starší už nikoho nezajímají.
      await admin.from("rozvrh_zmeny").delete().eq("child_id", childId);

      if (zmeny.length > 0) {
        const { error } = await admin.from("rozvrh_zmeny").insert(
          zmeny.map((z) => ({
            family_id,
            child_id: childId,
            den: z.den,
            poradi: z.poradi,
            druh: z.druh,
            predmet: z.predmet,
            ucebna: z.ucebna,
            zacatek: z.zacatek,
            konec: z.konec,
          })),
        );
        if (error) throw error;
      }
      zmenCelkem += zmeny.length;
    }

    const potize = [...chyby];
    if (bezDitete > 0) {
      potize.push(
        `${bezDitete} hodin nešlo přiřadit k dítěti — zkontroluj párování v nastavení.`,
      );
    }

    await zapisVysledek(user.id, potize.length > 0 ? potize.join("; ") : null);

    return NextResponse.json({
      ok: true,
      pocet: zapsano,
      dnu,
      deti: podleDitete.size,
      nedokonceno: nedokonceno.length,
      zmeny: zmenCelkem,
      preskoceno,
      chyby: potize,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stažení rozvrhu selhalo.";
    await zapisVysledek(user.id, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { zkontrolujVstup, type PlanVstup } from "@/lib/kalkulacka";
import type { CustodySide, PatternKind } from "@/lib/types";

const KINDS: PatternKind[] = [
  "iso_week_parity",
  "alternating_weeks",
  "week_2_2_3",
  "custom_weekly",
  "fixed_parent",
];

/**
 * Hrubá pojistka proti zaplavení tabulky. Drží se v paměti procesu, takže
 * po restartu se zapomene a při víc instancích platí na každou zvlášť —
 * na veřejnou kalkulačku to stačí, není za čím se schovat.
 */
const POKUSY = new Map<string, { pocet: number; od: number }>();
const OKNO_MS = 60 * 60 * 1000;
const MAX_ZA_HODINU = 20;

function prekrocilLimit(ip: string): boolean {
  const ted = Date.now();
  const zaznam = POKUSY.get(ip);

  if (!zaznam || ted - zaznam.od > OKNO_MS) {
    POKUSY.set(ip, { pocet: 1, od: ted });
    return false;
  }

  zaznam.pocet += 1;

  // Ať mapa neroste donekonečna, občas se probere.
  if (POKUSY.size > 5000) {
    for (const [klic, hodnota] of POKUSY) {
      if (ted - hodnota.od > OKNO_MS) POKUSY.delete(klic);
    }
  }

  return zaznam.pocet > MAX_ZA_HODINU;
}

function text(hodnota: unknown, maxDelka: number): string | null {
  if (typeof hodnota !== "string") return null;
  const orezano = hodnota.trim().slice(0, maxDelka);
  return orezano || null;
}

/** Uloží rozpis z veřejné kalkulačky a vrátí odkaz na něj. */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "neznámá";

  if (prekrocilLimit(ip)) {
    return NextResponse.json(
      { error: "Zkoušíš to moc často. Dej tomu chvilku." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const vstup = body?.vstup as PlanVstup | undefined;

  if (!vstup || !KINDS.includes(vstup.kind)) {
    return NextResponse.json({ error: "Chybí nebo nesedí vzor střídání." }, { status: 400 });
  }
  if (vstup.anchorSide !== "a" && vstup.anchorSide !== "b") {
    return NextResponse.json({ error: "Nesedí strana." }, { status: 400 });
  }

  const potiz = zkontrolujVstup(vstup);
  if (potiz) return NextResponse.json({ error: potiz }, { status: 400 });

  const email = text(body?.email, 200);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail nevypadá platně." }, { status: 400 });
  }

  const admin = createAdminClient();
  const token = randomBytes(12).toString("base64url");

  const { error } = await admin.from("kalkulacka_plany").insert({
    token,
    kind: vstup.kind,
    anchor_date: vstup.anchorDate,
    anchor_side: vstup.anchorSide as CustodySide,
    weekly_map: vstup.kind === "custom_weekly" ? vstup.weeklyMap : null,
    pocet_deti: Math.min(Math.max(Number(vstup.pocetDeti) || 1, 1), 6),
    jmeno_a: text(vstup.jmenoA, 40),
    jmeno_b: text(vstup.jmenoB, 40),
    email,
    souhlas_marketing: Boolean(body?.souhlasMarketing) && Boolean(email),
    zdroj: text(body?.zdroj, 100),
  });

  if (error) {
    return NextResponse.json({ error: "Uložení se nepovedlo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, token });
}

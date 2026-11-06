import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { HODINA, klicVolajiciho, Limit } from "@/lib/limit";
import { ETAPY, MAX_DETI, MAX_DALSICH_DETI, spocitejVyzivne } from "@/lib/vyzivne";

/**
 * Odložení výpočtu výživného, než si člověk založí účet.
 *
 * Bez tohohle kroku by se po registraci musel proklikat kalkulačkou
 * znovu — a to nikdo neudělá. Ukládá se jen to, co se dá přenést do
 * aplikace: etapy dětí, podíl péče a spočítaná částka.
 *
 * Příjmy se neukládají. V zadání sem přijdou, protože bez nich nejde
 * částku spočítat, ale do databáze nejdou a nikde se nelogují.
 *
 * Částka se počítá TADY, stejně jako u PDF. Číslo z prohlížeče by šlo
 * podvrhnout a my bychom pak člověku založili opakovaný výdaj na
 * částku, kterou jsme nespočítali.
 */
const LIMIT = new Limit(20, HODINA);

const Vstup = z.object({
  vypocet: z.object({
    deti: z
      .array(z.object({ etapa: z.enum(ETAPY.map((e) => e.id) as [string, ...string[]]) }))
      .min(1)
      .max(MAX_DETI),
    prijemA: z.number().finite().min(0).max(10_000_000),
    prijemB: z.number().finite().min(0).max(10_000_000),
    peceA: z.number().finite().min(0).max(100),
    dalsiDetiA: z.number().int().min(0).max(MAX_DALSICH_DETI),
    dalsiDetiB: z.number().int().min(0).max(MAX_DALSICH_DETI),
  }),
  zdroj: z.string().max(80).nullish(),
});

export async function POST(request: NextRequest) {
  if (LIMIT.prekrocen(klicVolajiciho(request.headers) ?? "neznámá")) {
    return NextResponse.json(
      { error: "Zkoušíte to moc často. Dejte tomu chvilku." },
      { status: 429 },
    );
  }

  const telo = await request.json().catch(() => null);
  const rozbor = Vstup.safeParse(telo);
  if (!rozbor.success) {
    return NextResponse.json({ error: "Zadání nesedí." }, { status: 400 });
  }

  const { vypocet, zdroj } = rozbor.data;
  const vysledek = spocitejVyzivne(vypocet);

  const admin = createAdminClient();
  const token = randomBytes(12).toString("base64url");

  const { error } = await admin.from("vyzivne_plany").insert({
    token,
    etapy: vypocet.deti.map((d) => d.etapa),
    pece_a: Math.round(vypocet.peceA),
    plati: vysledek.bezVyzivneho ? null : vysledek.platce,
    castka: vysledek.bezVyzivneho ? 0 : vysledek.castka,
    zdroj: zdroj ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "Uložení se nepovedlo." }, { status: 500 });
  }

  return NextResponse.json({ token });
}

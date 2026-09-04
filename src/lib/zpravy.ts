/**
 * Komunikace mezi rodiči.
 *
 * Bez databáze, aby se dalo otestovat sestavení výpisu — ten je celý smysl
 * téhle části. Rodič ho posílá advokátovi a když v něm bude chybět jediná
 * zpráva nebo špatné datum, je to horší než kdyby neexistoval.
 */

export interface Zprava {
  id: string;
  autor: string | null;
  autor_jmeno: string;
  text: string;
  den: string | null;
  child_id: string | null;
  expense_id: string | null;
  event_id: string | null;
  created_at: string;
  /** Kdo a kdy zprávu poprvé otevřel. */
  precteni?: { user_id: string; precteno_at: string }[];
}

export interface DenZprav {
  den: string;
  zpravy: Zprava[];
}

/** Seskupí zprávy po dnech odeslání, od nejstarší. */
export function poDnech(zpravy: Zprava[]): DenZprav[] {
  const mapa = new Map<string, Zprava[]>();

  for (const z of [...zpravy].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const den = z.created_at.slice(0, 10);
    const seznam = mapa.get(den);
    if (seznam) seznam.push(z);
    else mapa.set(den, [z]);
  }

  return [...mapa.entries()].map(([den, seznam]) => ({ den, zpravy: seznam }));
}

/**
 * Kolik zpráv jsem ještě neviděl.
 *
 * Vlastní zprávy se nepočítají — nepřečtená vlastní zpráva by byla nesmysl
 * a hlavně by odznak svítil hned po odeslání.
 */
export function pocetNeprectenych(zpravy: Zprava[], mujId: string): number {
  return zpravy.filter(
    (z) => z.autor !== mujId && !(z.precteni ?? []).some((p) => p.user_id === mujId),
  ).length;
}

/** Přečetl si ji už někdo jiný než autor? */
export function prectenaDruhym(zprava: Zprava): string | null {
  const cizi = (zprava.precteni ?? []).filter((p) => p.user_id !== zprava.autor);
  if (cizi.length === 0) return null;
  return cizi.map((p) => p.precteno_at).sort()[0];
}

function cas(iso: string): string {
  return new Date(iso).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

function datum(iso: string): string {
  return new Date(iso).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export interface Kontext {
  /** Jména dětí podle id — do výpisu patří jméno, ne identifikátor. */
  deti: Record<string, string>;
  /** Popisky výdajů a událostí, na které zprávy odkazují. */
  vydaje: Record<string, string>;
  udalosti: Record<string, string>;
}

/**
 * Sestaví výpis komunikace.
 *
 * Vrací odstavce pro `vytvorDocx`. Word schválně místo PDF: české znaky
 * v ručně skládaném PDF vyžadují vložený font a jedno chybějící „ř" udělá
 * z výpisu nedůvěryhodný dokument. Advokáti navíc s Wordem pracují a chtějí
 * si do něj psát.
 */
export function vypisKomunikace(
  zpravy: Zprava[],
  rodina: string,
  kontext: Kontext = { deti: {}, vydaje: {}, udalosti: {} },
): { druh: "nadpis1" | "nadpis2" | "text" | "drobne"; text: string }[] {
  const dny = poDnech(zpravy);

  const odstavce: { druh: "nadpis1" | "nadpis2" | "text" | "drobne"; text: string }[] = [
    { druh: "nadpis1", text: `Komunikace — ${rodina}` },
  ];

  if (zpravy.length === 0) {
    odstavce.push({ druh: "text", text: "V tomto období nebyla odeslána žádná zpráva." });
    return odstavce;
  }

  const prvni = dny[0].den;
  const posledni = dny[dny.length - 1].den;

  odstavce.push({
    druh: "drobne",
    text:
      `Období ${datum(prvni)} až ${datum(posledni)} · ${zpravy.length} zpráv. ` +
      "Zprávy nelze v aplikaci upravit ani smazat; výpis odpovídá tomu, co bylo odesláno.",
  });

  for (const { den, zpravy: denni } of dny) {
    odstavce.push({ druh: "nadpis2", text: datum(den) });

    for (const z of denni) {
      const kontextovy: string[] = [];
      if (z.den) kontextovy.push(`k ${datum(z.den)}`);
      if (z.child_id && kontext.deti[z.child_id]) kontextovy.push(kontext.deti[z.child_id]);
      if (z.expense_id && kontext.vydaje[z.expense_id]) {
        kontextovy.push(`výdaj: ${kontext.vydaje[z.expense_id]}`);
      }
      if (z.event_id && kontext.udalosti[z.event_id]) {
        kontextovy.push(`událost: ${kontext.udalosti[z.event_id]}`);
      }

      const hlavicka =
        `${cas(z.created_at)} — ${z.autor_jmeno}` +
        (kontextovy.length > 0 ? ` (${kontextovy.join(", ")})` : "");

      odstavce.push({ druh: "text", text: hlavicka });
      odstavce.push({ druh: "text", text: z.text });

      const precteno = prectenaDruhym(z);
      odstavce.push({
        druh: "drobne",
        text: precteno
          ? `přečteno ${datum(precteno)} v ${cas(precteno)}`
          : "zatím nepřečteno",
      });
    }
  }

  return odstavce;
}

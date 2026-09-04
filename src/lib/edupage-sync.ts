import "server-only";

import { createAdminClient } from "./supabase/admin";
import { smiZapisovatUzivatel } from "./predplatne";
import { credentialsFromRow, fetchEdupageItems, type PoDetech } from "./edupage";
import { varovaniZeSouhrnu, type SouhrnDitete } from "./edupage-souhrn";

export interface EdupageParovani {
  edupage_id: number;
  child_id: string;
  family_id: string;
  jmeno: string | null;
}

export interface EdupageKontext {
  ucet: { email: string; heslo_enc: string; subdomena: string | null; je_rodic: boolean };
  parovani: EdupageParovani[];
  /** Přihlašovací údaje včetně dětí, na které se má účet přepínat. */
  creds: ReturnType<typeof credentialsFromRow>;
}

/**
 * Načte propojený účet i to, která dětí se z něj mají stahovat.
 *
 * Bez spárovaného dítěte se nestahuje nic — nemělo by se to kam uložit
 * a hlavně by se pak nedalo poznat, komu úkol patří.
 */
export async function nactiEdupageKontext(
  userId: string,
): Promise<{ kontext: EdupageKontext | null; chyba: string | null }> {
  const admin = createAdminClient();

  const { data: ucet } = await admin
    .from("edupage_accounts")
    .select("email, heslo_enc, subdomena, je_rodic")
    .eq("user_id", userId)
    .maybeSingle();

  if (!ucet) return { kontext: null, chyba: "EduPage není propojené." };

  const { data: radky } = await admin
    .from("edupage_deti")
    .select("edupage_id, child_id, jmeno, children (id, family_id)")
    .eq("user_id", userId)
    .not("child_id", "is", null);

  const parovani: EdupageParovani[] = (radky ?? [])
    .map((r) => {
      const dite = r.children as unknown as { id: string; family_id: string } | null;
      if (!dite) return null;
      return {
        edupage_id: r.edupage_id as number,
        child_id: dite.id,
        family_id: dite.family_id,
        jmeno: (r.jmeno as string | null) ?? null,
      };
    })
    .filter((r): r is EdupageParovani => r !== null);

  // Žákovský účet žádné přepínání nepotřebuje — stahuje sám sebe.
  if (ucet.je_rodic && parovani.length === 0) {
    return {
      kontext: null,
      chyba: "Nemáš spárované žádné dítě. Nastav to v Nastavení → EduPage.",
    };
  }

  return {
    kontext: {
      ucet,
      parovani,
      creds: credentialsFromRow(
        ucet,
        parovani.map((p) => p.edupage_id),
      ),
    },
    chyba: null,
  };
}

/** Zapíše výsledek stahování k účtu, ať je v nastavení vidět, jak dopadlo. */
export async function zapisVysledek(userId: string, chyba: string | null): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("edupage_accounts")
    .update(
      chyba === null
        ? { last_sync_at: new Date().toISOString(), last_sync_error: null }
        : { last_sync_error: chyba.slice(0, 400) },
    )
    .eq("user_id", userId);
}

/** Kolik hodin uplyne mezi automatickými stahováními. */
export const INTERVAL_HODIN = 3;

/** Nejvíc účtů na jedno spuštění cronu — ať se vejdeme do limitu běhu. */
const MAX_UCTU_ZA_BEH = 20;

export interface VysledekStahovani {
  ulozeno: number;
  zprav: number;
  deti: number;
  /** Rozpad po dětech — bez něj vypadá mlčící dítě jako povedené stažení. */
  souhrn: SouhrnDitete[];
  chyby: string[];
}

/**
 * Stáhne položky z EduPage a uloží je rodině.
 *
 * Sdílí to ruční tlačítko v nastavení i cron. Kdyby to byly dvě cesty,
 * lišily by se — a rozdíl by se poznal až tím, že automatické stahování
 * ukládá jinam než to ruční.
 */
export async function stahniProUzivatele(
  userId: string,
  /** Kam uložit položky, které nepatří konkrétnímu dítěti. */
  preferovanaRodina?: string | null,
): Promise<VysledekStahovani> {
  const { kontext, chyba } = await nactiEdupageKontext(userId);
  if (!kontext) throw new Error(chyba ?? "EduPage není propojené.");

  const admin = createAdminClient();

  const { data: memberships } = await admin
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId);

  const familyIds = (memberships ?? []).map((m) => m.family_id);
  if (familyIds.length === 0) throw new Error("Nejsi v žádné rodině.");

  const vychoziFamilyId = familyIds.includes(preferovanaRodina ?? "")
    ? preferovanaRodina!
    : familyIds[0];

  const podleEdupageId = new Map(kontext.parovani.map((p) => [p.edupage_id, p]));

  const { polozky, poDetech, chyby } = await fetchEdupageItems(kontext.creds, 45);

  /**
   * Rodičovský účet vidí u každého dítěte tutéž timeline, takže zprávy
   * pro rodiče přijdou tolikrát, kolik je dětí. Co se objeví u víc dětí,
   * patří celé rodině — jinak by to skončilo u toho, kdo přišel poslední,
   * a vypadalo by to jako zpráva o jednom dítěti.
   */
  const uKolikaDeti = new Map<string, Set<number>>();
  for (const item of polozky) {
    if (item.diteId == null) continue;
    const kde = uKolikaDeti.get(item.udalostId) ?? new Set<number>();
    kde.add(item.diteId);
    uKolikaDeti.set(item.udalostId, kde);
  }

  const spolecne = (item: (typeof polozky)[number]) =>
    (uKolikaDeti.get(item.udalostId)?.size ?? 0) > 1;

  // Společné položky se ukládají jednou, pod holým ID události.
  const videno = new Set<string>();

  const radky = polozky.flatMap((item) => {
    const jeSpolecna = spolecne(item);
    const externalId = jeSpolecna ? item.udalostId : item.id;

    if (videno.has(externalId)) return [];
    videno.add(externalId);

    const dite =
      !jeSpolecna && item.diteId != null ? podleEdupageId.get(item.diteId) : undefined;

    return [
      {
        family_id: dite?.family_id ?? vychoziFamilyId,
        child_id: dite?.child_id ?? null,
        external_id: externalId,
        druh: item.druh,
        typ: item.typ,
        text: item.text,
        predmet: item.predmet,
        termin: item.termin,
        zadano: item.zadano,
        hotovo: item.hotovo,
        autor: item.autor,
        odkaz: item.odkaz,
        navrh_kalendare: item.navrhKalendare,
        fetched_at: new Date().toISOString(),
      },
    ];
  });

  if (radky.length > 0) {
    const { error } = await admin
      .from("edupage_items")
      .upsert(radky, { onConflict: "family_id,external_id" });
    if (error) throw error;
  }

  const souhrn = souhrnPoDetech(kontext.parovani, poDetech, radky);
  const vsechnyChyby = [...chyby, ...varovaniZeSouhrnu(souhrn)];

  await zapisVysledek(userId, vsechnyChyby.length > 0 ? vsechnyChyby.join("; ") : null);

  return {
    ulozeno: radky.length,
    zprav: radky.filter((r) => r.druh === "zprava").length,
    deti: kontext.parovani.length,
    souhrn,
    chyby: vsechnyChyby,
  };
}

/** Spojí počty ze služby s párováním, ať se dá mluvit jmény dětí. */
function souhrnPoDetech(
  parovani: EdupageParovani[],
  poDetech: PoDetech,
  radky: { child_id: string | null }[],
): SouhrnDitete[] {
  return parovani.map((p) => {
    const ze_sluzby = poDetech[String(p.edupage_id)];
    return {
      jmeno: p.jmeno ?? `dítě ${p.edupage_id}`,
      udalosti: ze_sluzby?.udalosti ?? 0,
      ulozeno: radky.filter((r) => r.child_id === p.child_id).length,
      ...(ze_sluzby?.chyba ? { chyba: ze_sluzby.chyba } : {}),
    };
  });
}

export interface VysledekDavky {
  ucty: number;
  ulozeno: number;
  chyby: string[];
}

/**
 * Projde propojené účty, kterým vypršel interval, a stáhne jim novinky.
 *
 * Kdy naposledy se stahovalo, se pozná z `last_sync_at` u účtu — proto
 * přežije restart i to, že cron chodí jinak často, než je interval.
 * Bere se od nejstaršího, takže při přetečení limitu se na nikoho
 * dlouhodobě nezapomene.
 */
export async function stahniZmeskane(): Promise<VysledekDavky> {
  const admin = createAdminClient();
  const hranice = Date.now() - INTERVAL_HODIN * 60 * 60 * 1000;

  // Filtr na interval schválně až v kódu: `or` s ISO časem se v PostgREST
  // parsuje po tečkách a dvojtečkách a je to zbytečně tenký led. Řazení
  // od nejstaršího stačí — jakmile narazíme na účet, kterému interval
  // ještě neuplynul, platí to i pro všechny za ním.
  const { data: ucty } = await admin
    .from("edupage_accounts")
    .select("user_id, last_sync_at")
    .order("last_sync_at", { ascending: true, nullsFirst: true })
    .limit(MAX_UCTU_ZA_BEH);

  const vysledek: VysledekDavky = { ucty: 0, ulozeno: 0, chyby: [] };

  for (const ucet of ucty ?? []) {
    // Porovnáváme čas, ne řetězce: Supabase vrací `+00:00`, kdežto
    // toISOString() končí na `Z`, a lexikograficky se to na hraně rozchází.
    const naposledy = ucet.last_sync_at as string | null;
    if (naposledy && new Date(naposledy).getTime() >= hranice) break;

    // Rodině v režimu čtení nic nepřibývá — ani od cronu.
    if (!(await smiZapisovatUzivatel(ucet.user_id as string))) continue;

    try {
      const r = await stahniProUzivatele(ucet.user_id as string);
      vysledek.ucty += 1;
      vysledek.ulozeno += r.ulozeno;
      if (r.chyby.length > 0) vysledek.chyby.push(...r.chyby);
    } catch (e) {
      // Jeden rozbitý účet nesmí zastavit ostatní — třeba jen změnil heslo.
      const zprava = e instanceof Error ? e.message : String(e);
      vysledek.chyby.push(zprava);
      await zapisVysledek(ucet.user_id as string, zprava);
    }
  }

  return vysledek;
}

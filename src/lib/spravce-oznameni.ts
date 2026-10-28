import "server-only";

import { createAdminClient } from "./supabase/admin";
import { posliPush, pushJeNastaveny } from "./push";
import { posliMail, mailJeNastaveny } from "./mail";
import { siteUrl } from "./google";
import { ZNACKA } from "./brand";
import { escapeHtml } from "./mail-sablony";

/**
 * Zprávy, které mají zajímat správce, ne uživatele.
 *
 * Když někdo zaplatí nebo nechá kontakt, dozvěděl se to dosud jen ten,
 * kdo se šel podívat do Stripu nebo do databáze. U provozu, kde jde
 * o jednotky lidí denně, je přitom rozdíl mezi odpovědí za deset minut
 * a za dva dny obrovský — hlavně u mediátora, kterému stránka slibuje
 * odpověď do dvou pracovních dnů.
 *
 * Posílá se dvěma cestami zároveň, každá kryje slabinu té druhé.
 * Notifikace do telefonu dorazí hned, ale jen na zařízení, kde je
 * zapnutá, a dá se odklepnout a zapomenout. E-mail dojde vždycky
 * a zůstane, ale všimne si ho člověk až u schránky.
 *
 * Nic z toho nesmí shodit akci, která to vyvolala. Neodeslané oznámení
 * o platbě je nepříjemné; neproběhlá platba kvůli neodeslanému
 * oznámení je katastrofa.
 */

function spravci(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export interface OznameniSpravci {
  titulek: string;
  telo: string;
  /** Kam vede kliknutí v notifikaci. Relativní cesta. */
  odkaz: string;
}

/**
 * Pošle oznámení všem správcům.
 *
 * `tag` je odvozený od cesty, takže se pět oznámení stejného druhu na
 * zamčené obrazovce nakupí, místo aby se přepsala na jedno. U platby
 * i u nového kontaktu je počet ta informace, ne poslední kus.
 */
export async function ohlasSpravci(oznameni: OznameniSpravci): Promise<void> {
  const komu = spravci();
  if (komu.length === 0) return;

  try {
    await Promise.all([posliPushSpravcum(komu, oznameni), posliMailSpravcum(komu, oznameni)]);
  } catch (chyba) {
    console.error("[spravce] oznámení se nepodařilo odeslat", chyba);
  }
}

async function posliPushSpravcum(komu: string[], oznameni: OznameniSpravci): Promise<void> {
  if (!pushJeNastaveny()) return;

  const admin = createAdminClient();

  // Správce se pozná podle e-mailu v profilu — je to ten samý seznam,
  // podle kterého se pouští interní přehled provozu.
  const { data: profily } = await admin.from("profiles").select("id, email");
  const idSpravcu = (profily ?? [])
    .filter((p) => p.email && komu.includes(String(p.email).toLowerCase()))
    .map((p) => String(p.id));

  if (idSpravcu.length === 0) return;

  const { data: odbery } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", idSpravcu);

  for (const odber of odbery ?? []) {
    const vysledek = await posliPush(
      {
        endpoint: String(odber.endpoint),
        p256dh: String(odber.p256dh),
        auth: String(odber.auth),
      },
      {
        titulek: oznameni.titulek,
        telo: oznameni.telo,
        odkaz: oznameni.odkaz,
        tag: `spravce-${oznameni.odkaz}`,
      },
    );

    // Odběr, který prohlížeč zahodil, jen sbírá chyby při každém dalším
    // pokusu. Stejně se to řeší u rodinných připomínek.
    if (vysledek.gone) {
      await admin.from("push_subscriptions").delete().eq("id", odber.id);
    }
  }
}

async function posliMailSpravcum(komu: string[], oznameni: OznameniSpravci): Promise<void> {
  if (!mailJeNastaveny()) return;

  const odkaz = `${siteUrl()}${oznameni.odkaz}`;
  const text = `${oznameni.telo}\n\n${odkaz}`;

  await posliMail(komu.join(", "), {
    predmet: `${ZNACKA}: ${oznameni.titulek}`,
    text,
    html:
      `<p style="font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">` +
      `${escapeHtml(oznameni.telo)}<br><br>` +
      `<a href="${escapeHtml(odkaz)}">${escapeHtml(odkaz)}</a></p>`,
  });
}

/** Rodina poprvé zaplatila. */
export async function ohlasPrvniPlatbu(vstup: {
  rodina: string;
  castka: number;
  mena: string;
  tarif: string | null;
}): Promise<void> {
  const castka = new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: vstup.mena || "CZK",
    maximumFractionDigits: 0,
  }).format(vstup.castka);

  await ohlasSpravci({
    titulek: "Nová platba",
    telo: `${vstup.rodina} zaplatila ${castka}${vstup.tarif ? ` (${vstup.tarif})` : ""}.`,
    odkaz: "/provoz",
  });
}

/** Někdo nechal kontakt na webu. */
export async function ohlasNovyKontakt(vstup: {
  email: string;
  magnet: string;
  jmeno: string | null;
  organizace: string | null;
}): Promise<void> {
  const kdo = [vstup.jmeno, vstup.organizace].filter(Boolean).join(", ");

  await ohlasSpravci({
    titulek: "Nový kontakt z webu",
    // E-mail je v těle schválně: u partnerských formulářů se odpovídá
    // ručně a bez adresy by oznámení znamenalo „jdi se někam podívat".
    telo: `${vstup.magnet}: ${vstup.email}${kdo ? ` — ${kdo}` : ""}`,
    odkaz: "/provoz",
  });
}

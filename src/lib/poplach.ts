import "server-only";

import { posliMail } from "./mail";
import { ZNACKA } from "./brand";

/**
 * Hlášení chyb z ostrého provozu.
 *
 * Doteď chyby končily v `console.error`, tedy v logu kontejneru, kam se
 * nikdo nedívá — dokud se někdo neozve, že mu něco nejde. Zdravotní
 * kontrola v Compose na to nestačí: hlídá jen to, jestli aplikace
 * odpovídá na přihlašovací stránce, takže platba může padat celý den
 * a kontejner je pořád „zdravý".
 *
 * Záměrně tu není Sentry ani nic dalšího. Na jednu aplikaci s jedním
 * správcem stačí e-mail — přijde tam, kam se stejně dívá, a nepřidává
 * službu, účet ani další věc, která může vypadnout.
 *
 * Poplach nikdy nesmí shodit to, co ho vyvolalo. Když se odeslání
 * nepovede, zůstane po něm řádek v logu a jede se dál.
 */

/** Kam poplach chodí. Prázdné = nikam, jen do logu. */
function prijemci(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Kolik nejvýš stejných hlášek za hodinu. Když se rozbije platební
 * brána, spadne každý pokus o platbu — a schránka plná stovky totožných
 * e-mailů je stejně nepoužitelná jako log, do kterého se nikdo nedívá.
 */
const MAX_STEJNYCH_ZA_HODINU = 3;
const OKNO_MS = 60 * 60 * 1000;

const odeslane = new Map<string, { pocet: number; od: number }>();

function uzToStacilo(klic: string): boolean {
  const ted = Date.now();
  const zaznam = odeslane.get(klic);

  if (!zaznam || ted - zaznam.od > OKNO_MS) {
    odeslane.set(klic, { pocet: 1, od: ted });
    return false;
  }

  zaznam.pocet += 1;
  return zaznam.pocet > MAX_STEJNYCH_ZA_HODINU;
}

function popisChyby(chyba: unknown): string {
  if (chyba instanceof Error) {
    return chyba.stack ? `${chyba.message}\n\n${chyba.stack}` : chyba.message;
  }
  try {
    return typeof chyba === "string" ? chyba : JSON.stringify(chyba);
  } catch {
    return String(chyba);
  }
}

export interface Souvislosti {
  /** Kde se to stalo — „stripe/webhook", „edupage/sync". */
  kde: string;
  /** Cokoli, co pomůže při hledání. Nikdy sem nepatří hesla ani klíče. */
  detaily?: Record<string, unknown>;
}

/**
 * Ohlásí chybu, kterou má správce vidět.
 *
 * Volá se u věcí, které tiše selžou a uživatel si toho nemusí všimnout:
 * platby, odchozí e-maily, cron, synchronizace. U běžné chyby ve
 * formuláři to smysl nemá — tu vidí ten, kdo ji způsobil.
 */
export async function ohlas(chyba: unknown, souvislosti: Souvislosti): Promise<void> {
  const popis = popisChyby(chyba);
  const prvniRadek = popis.split("\n")[0].slice(0, 200);

  // Do logu vždycky, i když e-mail nikam nejde.
  console.error(`[poplach] ${souvislosti.kde}: ${popis}`, souvislosti.detaily ?? {});

  const komu = prijemci();
  if (komu.length === 0) return;

  // Klíč je místo plus první řádek — táž chyba na témže místě se
  // po třetím e-mailu odmlčí, jiná chyba se ozve hned.
  if (uzToStacilo(`${souvislosti.kde}|${prvniRadek}`)) return;

  const kdy = new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Prague",
  }).format(new Date());

  const detaily = souvislosti.detaily
    ? "\n\nPodrobnosti:\n" + JSON.stringify(souvislosti.detaily, null, 2)
    : "";

  const text = `Kde: ${souvislosti.kde}\nKdy: ${kdy}\n\n${popis}${detaily}`;

  try {
    await posliMail(komu.join(", "), {
      predmet: `${ZNACKA} — chyba v ${souvislosti.kde}`,
      text,
      html: `<pre style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.5;white-space:pre-wrap">${
        text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      }</pre>`,
    });
  } catch (potiz) {
    // Poplach o poplachu už neposíláme — jen ať je po tom stopa.
    console.error("[poplach] nepovedlo se odeslat hlášení", potiz);
  }
}

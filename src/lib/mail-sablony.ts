/**
 * Texty a HTML odchozích e-mailů.
 *
 * Bez `server-only` a bez závislosti na odesílání, aby se daly otestovat
 * — u e-mailu se chyba pozná až u příjemce, kde už se nedá nic vzít zpět.
 *
 * Tři pravidla, která tady drží tvar:
 *  1. Každý e-mail má i textovou verzi. Bez ní roste šance na spam
 *     a část lidí čte poštu v klientu bez HTML.
 *  2. Žádné externí obrázky ani skripty — logo je text, ne trackovací
 *     pixel. Rozvod je citlivé téma a sledovat, kdo si co otevřel,
 *     nepotřebujeme.
 *  3. Vše, co přijde od uživatele (jména, názvy rodin), se escapuje.
 */

import { ZNACKA } from "./brand";
import { PROVOZOVATEL } from "./provozovatel";

export interface Zprava {
  predmet: string;
  html: string;
  text: string;
}

/** Escapování do HTML — jméno rodiny může obsahovat cokoli. */
export function escapeHtml(vstup: string): string {
  return vstup
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BARVA_ZNACKY = "#2f8f7a";
const BARVA_TEXTU = "#2a2724";
const BARVA_TLUMENA = "#6f6a64";
const BARVA_PODKLADU = "#faf7f2";

/**
 * Obálka e-mailu. Tabulkové rozvržení a inline styly schválně —
 * Outlook ani Gmail si s ničím modernějším neporadí.
 */
function obalka(nadpis: string, telo: string, patickaNavic?: string): string {
  return `<!doctype html>
<html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(nadpis)}</title></head>
<body style="margin:0;padding:0;background:${BARVA_PODKLADU};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BARVA_PODKLADU};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #ece7df;">
        <tr><td style="padding:24px 24px 8px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
          <p style="margin:0;font-size:18px;font-weight:700;color:${BARVA_ZNACKY};">${ZNACKA}</p>
        </td></tr>
        <tr><td style="padding:0 24px 24px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${BARVA_TEXTU};font-size:15px;line-height:1.6;">
${telo}
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding:16px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${BARVA_TLUMENA};font-size:12px;line-height:1.5;">
          ${patickaNavic ? `${patickaNavic}<br><br>` : ""}
          ${ZNACKA} — ${escapeHtml(PROVOZOVATEL.nazev || "klid do rodiny, která žije ve dvou domovech")}<br>
          Napiš nám na <a href="mailto:${PROVOZOVATEL.email}" style="color:${BARVA_TLUMENA};">${PROVOZOVATEL.email}</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function tlacitko(odkaz: string, popisek: string): string {
  return `<p style="margin:20px 0;"><a href="${escapeHtml(odkaz)}" style="display:inline-block;background:${BARVA_ZNACKY};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:12px;">${escapeHtml(popisek)}</a></p>
<p style="margin:0 0 4px 0;font-size:12px;color:${BARVA_TLUMENA};">Kdyby tlačítko nefungovalo, otevři tenhle odkaz:</p>
<p style="margin:0;font-size:12px;word-break:break-all;"><a href="${escapeHtml(odkaz)}" style="color:${BARVA_ZNACKY};">${escapeHtml(odkaz)}</a></p>`;
}

/**
 * Pozvánka druhého rodiče.
 *
 * Nejdůležitější e-mail, který aplikace posílá: dokud ho někdo nepřijme,
 * je Klidoo zápisník jednoho člověka. Proto říká, co druhá strana uvidí,
 * a hlavně že nic neplatí.
 */
export function pozvankaZprava(vstup: {
  odesilatel: string;
  rodina: string;
  odkaz: string;
  role?: "rodic" | "jiny";
}): Zprava {
  const kdo = vstup.odesilatel.trim() || "Druhý rodič";
  const rodina = vstup.rodina.trim() || "rodinný kalendář";
  const jeRodic = (vstup.role ?? "rodic") === "rodic";

  const predmet = `${kdo} tě zve do sdíleného kalendáře dětí`;

  const telo = `
<h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.3;">${escapeHtml(kdo)} tě zve do ${ZNACKA}</h1>
<p style="margin:0 0 12px 0;">
  Jde o sdílený kalendář rodiny <strong>${escapeHtml(rodina)}</strong> — kdo má děti které dny,
  kdy jsou kroužky, kdo veze tam a kdo zpátky, a kdo co zaplatil.
</p>
<p style="margin:0 0 12px 0;">
  ${jeRodic
    ? "Uvidíš to samé co druhý rodič a můžeš zapisovat. Nic neplatíš — předplatné je jedno na celou rodinu."
    : "Uvidíš, co se kolem dětí děje. Nic neplatíš."}
</p>
${tlacitko(vstup.odkaz, "Přijmout pozvánku")}
<p style="margin:16px 0 0 0;font-size:13px;color:${BARVA_TLUMENA};">Odkaz platí 30 dní.</p>`;

  const text = `${kdo} tě zve do ${ZNACKA} — sdíleného kalendáře rodiny ${rodina}.

Uvidíš, kdo má děti které dny, kroužky a odvozy i to, kdo co zaplatil.${
    jeRodic ? " Nic neplatíš, předplatné je jedno na celou rodinu." : ""
  }

Pozvánku přijmeš tady (platí 30 dní):
${vstup.odkaz}
`;

  return {
    predmet,
    html: obalka(predmet, telo, "Tenhle e-mail ti přišel, protože tě někdo pozval do své rodiny."),
    text,
  };
}

/** Zkušební období se chýlí ke konci. */
export function konecZkusebnihoZprava(vstup: {
  jmeno: string;
  dni: number;
  odkaz: string;
}): Zprava {
  const dni = Math.max(vstup.dni, 0);
  const kdy = dni <= 1 ? "dnes" : `za ${dni} ${dni <= 4 ? "dny" : "dní"}`;
  const predmet = `Zkušební období ${ZNACKA} končí ${kdy}`;

  const telo = `
<h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.3;">Zkušební období končí ${kdy}</h1>
<p style="margin:0 0 12px 0;">
  ${vstup.jmeno.trim() ? `${escapeHtml(vstup.jmeno.trim())}, ` : ""}nic se ti nesmaže.
  Po skončení zůstane kalendář, výdaje i doklady čitelné — zamkne se jen zapisování.
</p>
<p style="margin:0 0 12px 0;">
  Předplatné platí celá rodina dohromady, druhý rodič nic navíc neplatí.
</p>
${tlacitko(vstup.odkaz, "Pokračovat v předplatném")}`;

  const text = `Zkušební období ${ZNACKA} končí ${kdy}.

Nic se nesmaže — po skončení zůstane všechno čitelné, zamkne se jen zapisování.
Předplatné platí celá rodina dohromady.

${vstup.odkaz}
`;

  return { predmet, html: obalka(predmet, telo), text };
}

/**
 * Za tři dny odejde první platba.
 *
 * Kdo zadal kartu na začátku zkušebního období, na to za měsíc nemusí
 * myslet — a nečekané stržení je nejrychlejší cesta ke sporu s bankou.
 * Radši připomenout a dát šanci zrušit, než řešit chargeback.
 */
export function prvniPlatbaZprava(vstup: {
  dni: number;
  castka: string;
  odkaz: string;
}): Zprava {
  const dni = Math.max(vstup.dni, 1);
  const kdy = dni === 1 ? "zítra" : `za ${dni} ${dni <= 4 ? "dny" : "dní"}`;
  const predmet = `${ZNACKA}: první platba ${kdy}`;

  const telo = `
<h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.3;">Zkušební období končí ${kdy}</h1>
<p style="margin:0 0 12px 0;">
  Potom ti z uložené karty strhneme <strong>${escapeHtml(vstup.castka)}</strong> a předplatné
  začne běžet. Nemusíš dělat nic.
</p>
<p style="margin:0 0 12px 0;">
  Pokud pokračovat nechceš, zruš předplatné do té doby — nic se nestrhne a data ti zůstanou
  ke čtení.
</p>
${tlacitko(vstup.odkaz, "Spravovat předplatné")}`;

  const text = `Zkušební období ${ZNACKA} končí ${kdy}.

Potom ti z uložené karty strhneme ${vstup.castka} a předplatné začne běžet.
Nemusíš dělat nic. Pokud pokračovat nechceš, zruš ho do té doby — nic se
nestrhne a data ti zůstanou ke čtení.

${vstup.odkaz}
`;

  return { predmet, html: obalka(predmet, telo), text };
}

/** Platba neprošla — Stripe to ještě zkusí, ale karta bývá jen expirovaná. */
export function platbaSelhalaZprava(vstup: { odkaz: string }): Zprava {
  const predmet = `Platba za ${ZNACKA} neprošla`;

  const telo = `
<h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.3;">Platba neprošla</h1>
<p style="margin:0 0 12px 0;">
  Zkusíme ji ještě několikrát, takže aplikace zatím běží dál. Nejčastěji jde
  o kartu, které skončila platnost.
</p>
${tlacitko(vstup.odkaz, "Zkontrolovat platbu")}`;

  const text = `Platba za ${ZNACKA} neprošla.

Zkusíme ji ještě několikrát a aplikace zatím běží dál. Nejčastěji jde o kartu,
které skončila platnost.

${vstup.odkaz}
`;

  return { predmet, html: obalka(predmet, telo), text };
}

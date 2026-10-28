import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Google refresh tokeny se do databáze ukládají zašifrované.
 * I kdyby někdo získal dump tabulky, bez TOKEN_ENCRYPTION_KEY je nepoužije.
 */

const ALGORITHM = "aes-256-gcm";

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("Chybí TOKEN_ENCRYPTION_KEY (openssl rand -base64 32).");

  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY musí být 32 bajtů v base64.");
  }
  return buf;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

/** Hláška, kterou pozná i člověk, co k tomu má sáhnout. */
export const CHYBA_KLICE =
  "Uložené přihlašovací údaje nejde rozšifrovat — od jejich uložení se " +
  "změnil šifrovací klíč serveru. Propoj účet prosím znovu, heslo se uloží " +
  "nanovo.";

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error(CHYBA_KLICE);

  try {
    const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch (chyba) {
    // Node hlásí „Unsupported state or unable to authenticate data", což
    // rodiči v nastavení nic neřekne — a hlavně to svádí hledat chybu
    // u EduPage nebo Googlu, kde žádná není. Jediná příčina je jiný
    // TOKEN_ENCRYPTION_KEY, než jakým se šifrovalo.
    if (chyba instanceof Error && /authenticate|decrypt|bad decrypt/i.test(chyba.message)) {
      throw new Error(CHYBA_KLICE);
    }
    throw chyba;
  }
}

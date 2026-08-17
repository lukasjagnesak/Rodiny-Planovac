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

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Poškozený zašifrovaný token.");

  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Krátký lidsky opsatelný kód pro spárování Telegramu. */
export function shortCode(length = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

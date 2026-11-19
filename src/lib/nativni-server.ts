import "server-only";

import { headers } from "next/headers";
import { jeAplikace } from "./nativni";

/** Na serveru: přišel požadavek z aplikace z obchodu? Viz `lib/nativni.ts`. */
export async function vAplikaci(): Promise<boolean> {
  return jeAplikace((await headers()).get("user-agent"));
}

import { createClient } from "@supabase/supabase-js";

/**
 * Klient se service-role klíčem — obchází RLS.
 * Používej VÝHRADNĚ na serveru (cron, Google sync, Telegram webhook),
 * nikdy ne v komponentě označené "use client".
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Chybí SUPABASE_SERVICE_ROLE_KEY v prostředí.");
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

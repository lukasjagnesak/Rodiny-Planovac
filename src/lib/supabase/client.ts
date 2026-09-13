"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Supabase klient pro prohlížeč — používá anon klíč a RLS. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

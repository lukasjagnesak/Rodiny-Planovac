import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Kořen webu. Přihlášeného pustíme rovnou do aplikace, ostatní na
 * kalkulačku — ta je zároveň vstupní stránkou z vyhledávače.
 */
export default async function Home() {
  const supabase = await createClient();

  let prihlasen = false;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    prihlasen = Boolean(user);
  } catch {
    prihlasen = false;
  }

  redirect(prihlasen ? "/prehled" : "/kalkulacka");
}

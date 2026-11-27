import type { SupabaseClient } from "@supabase/supabase-js";
import { jeNativni, plugin } from "./nativni-most";

/**
 * Přihlášení přes Google nebo Apple — na webu i v aplikaci z obchodu.
 *
 * Google přihlášení uvnitř webview odmítá („disallowed_useragent“).
 * V aplikaci se proto přihlašovací stránka otevře v systémovém prohlížeči
 * (SFSafariViewController, Chrome Custom Tabs) a po přihlášení se vrátí
 * přes `/auth/aplikace` odkazem `cz.klidoo.app://auth?code=…`. Kód pak
 * vymění webview na `/auth/callback` — tam, kde leží PKCE ověřovač
 * z tohoto volání, takže kód nikdo jiný nepoužije.
 */
export async function prihlasPres(
  supabase: SupabaseClient,
  provider: "google" | "apple" | "facebook",
  dal: string,
  queryParams?: Record<string, string>,
): Promise<{ message: string } | null> {
  const nativni = jeNativni();
  const prohlizec = plugin<{ open: (o: { url: string }) => Promise<void> }>("Browser");
  const vProhlizeci = nativni && prohlizec !== null;

  const cil = vProhlizeci ? "/auth/aplikace" : "/auth/callback";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}${cil}?dal=${encodeURIComponent(dal)}`,
      queryParams,
      skipBrowserRedirect: vProhlizeci,
    },
  });
  if (error) return error;
  if (vProhlizeci && data?.url) await prohlizec!.open({ url: data.url });
  return null;
}

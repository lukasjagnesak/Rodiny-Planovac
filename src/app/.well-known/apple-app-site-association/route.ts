/**
 * Ověření pro Universal Links na iPhonu: odkazy https://klidoo.cz/pozvanka/…
 * smí otevírat aplikace cz.klidoo.app. Apple soubor stahuje přes svou
 * CDN, musí být JSON bez přesměrování.
 *
 * Team ID (10 znaků) je v Apple Developer → Membership. Bez něj vrací
 * prázdná pravidla a odkazy se otevřou v Safari.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const team = (process.env.APPLE_TEAM_ID ?? "").trim();
  const appIds = /^[A-Z0-9]{10}$/.test(team) ? [`${team}.cz.klidoo.app`] : [];
  return Response.json(
    {
      applinks: {
        details: appIds.length ? [{ appIDs: appIds, components: [{ "/": "/pozvanka/*" }] }] : [],
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}

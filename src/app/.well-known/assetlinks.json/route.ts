/**
 * Ověření pro Android App Links: odkazy https://klidoo.cz/pozvanka/…
 * smí otevírat aplikace cz.klidoo.app (viz AndroidManifest).
 *
 * Otisk podpisového certifikátu (SHA-256) se bere z `.env`, protože ho
 * vydá až Google Play (Nastavení → Integrita aplikace → Podepisování).
 * Bez něj vrací prázdný seznam a odkazy se otevřou v prohlížeči.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const otisky = (process.env.ANDROID_SHA256_OTISKY ?? "")
    .split(",")
    .map((o) => o.trim().toUpperCase())
    .filter((o) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(o));

  const telo = otisky.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: { namespace: "android_app", package_name: "cz.klidoo.app", sha256_cert_fingerprints: otisky },
        },
      ]
    : [];
  return Response.json(telo, { headers: { "Cache-Control": "public, max-age=3600" } });
}

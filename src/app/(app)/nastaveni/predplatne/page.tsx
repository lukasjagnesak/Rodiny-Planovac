import { redirect } from "next/navigation";

/**
 * Předplatné se vrátilo z nastavení do vlastní sekce.
 *
 * Schované mezi notifikacemi a propojeními ho nikdo nenašel — kdo chtěl
 * zaplatit, musel uhodnout, že platba bydlí tam, kde se přepínají
 * upozornění. Tahle adresa zůstává kvůli odkazům, které už jsou
 * v rozeslaných e-mailech.
 *
 * Parametry se přenášejí: Stripe se vrací s `?stav=`, a kdyby se cestou
 * ztratil, člověk po zaplacení uvidí obyčejnou stránku bez poděkování.
 */
export default async function StaraAdresa({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametry = await searchParams;
  const dotaz = new URLSearchParams(
    Object.entries(parametry).flatMap(([klic, hodnota]) =>
      typeof hodnota === "string" ? ([[klic, hodnota]] as [string, string][]) : [],
    ),
  ).toString();

  redirect(`/predplatne${dotaz ? `?${dotaz}` : ""}`);
}

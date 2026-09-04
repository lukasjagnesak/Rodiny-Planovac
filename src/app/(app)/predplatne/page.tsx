import { redirect } from "next/navigation";

/**
 * Předplatné se přestěhovalo pod nastavení.
 *
 * Tahle adresa zůstává, protože je v už odeslaných e-mailech a v odkazech,
 * které si lidé mohli uložit. Rozbít je kvůli přeuspořádání menu by bylo
 * zbytečné.
 */
export default async function StarePredplatne({
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

  redirect(`/nastaveni/predplatne${dotaz ? `?${dotaz}` : ""}`);
}

/**
 * Kam push notifikace zavede po kliknutí.
 *
 * `dedupe_key` v tabulce `notifications` už nese typ události v prefixu
 * (`event:…`, `ride:…`) — díky tomu se pro odkaz nemusí přidávat další
 * sloupec, stačí prefix rozpoznat.
 */
export function odkazPodleDeduplikace(dedupeKey: string | null | undefined): string {
  const druh = dedupeKey?.split(":")[0];
  const mapa: Record<string, string> = {
    event: "/udalosti",
    ride: "/krouzky",
    "ride-missing": "/krouzky",
    handover: "/kalendar",
  };
  return (druh && mapa[druh]) || "/oznameni";
}

/**
 * Ikona notifikace z vlastní sady (lib/ikony) podle druhu. U připomínky
 * události rozhoduje typ události — lékař, narozeniny, výlet.
 *
 * Ikona se zobrazí na Androidu a v počítači. iPhone u webových
 * notifikací vlastní ikonu nepodporuje a ukáže vždy ikonu aplikace.
 */
export function ikonaPodleDeduplikace(
  dedupeKey: string | null | undefined,
  ikonaUdalosti?: string | null,
): string {
  const druh = dedupeKey?.split(":")[0];
  if (druh === "event") return ikonaUdalosti ?? "zvonek";
  const mapa: Record<string, string> = {
    ride: "auto",
    "ride-missing": "otaznik",
    handover: "predani",
  };
  return (druh && mapa[druh]) || "zvonek";
}

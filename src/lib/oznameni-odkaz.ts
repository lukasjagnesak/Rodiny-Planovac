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

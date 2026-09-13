import type { MetadataRoute } from "next";

/** Adresa webu bez lomítka na konci. */
function zaklad(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Mapa veřejné části webu. Aplikace za přihlášením do mapy nepatří —
 * vyhledávač se tam stejně nedostane a jen by mu to zabralo rozpočet.
 */
const STRANKY: { cesta: string; priorita: number; frekvence: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { cesta: "/", priorita: 1, frekvence: "weekly" },
  { cesta: "/jak-funguje-stridava-pece", priorita: 0.9, frekvence: "monthly" },
  { cesta: "/vzor-dohody-o-stridave-peci", priorita: 0.9, frekvence: "monthly" },
  { cesta: "/vzor-dohody-o-stridave-peci/text", priorita: 0.6, frekvence: "monthly" },
  { cesta: "/kalkulacka-vyzivneho", priorita: 0.9, frekvence: "monthly" },
  { cesta: "/kalkulacka", priorita: 0.8, frekvence: "monthly" },
  { cesta: "/cenik", priorita: 0.8, frekvence: "monthly" },
  { cesta: "/checklist-prvnich-30-dni", priorita: 0.6, frekvence: "yearly" },
  { cesta: "/pro-advokaty", priorita: 0.5, frekvence: "yearly" },
  { cesta: "/pro-mediatory", priorita: 0.5, frekvence: "yearly" },
  { cesta: "/zasady-ochrany-osobnich-udaju", priorita: 0.2, frekvence: "yearly" },
  { cesta: "/obchodni-podminky", priorita: 0.2, frekvence: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const url = zaklad();
  const ted = new Date();

  return STRANKY.map(({ cesta, priorita, frekvence }) => ({
    url: `${url}${cesta}`,
    lastModified: ted,
    changeFrequency: frekvence,
    priority: priorita,
  }));
}

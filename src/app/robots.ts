import type { MetadataRoute } from "next";

/**
 * Roboti mají číst veřejný web, ne aplikaci. Uložené rozpisy z kalkulačky
 * chrání jen náhodný token — kdyby se dostaly do indexu, byl by k ničemu.
 */
export default function robots(): MetadataRoute.Robots {
  const url = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/prehled",
        "/kalendar",
        "/krouzky",
        "/vydaje",
        "/udalosti",
        "/deti",
        "/rozvrh",
        "/ukoly",
        "/kontakty",
        "/doklady",
        "/oznameni",
        "/nastaveni",
        "/pozvanka",
        "/vitejte",
        "/kalkulacka/",
      ],
    },
    sitemap: `${url}/sitemap.xml`,
  };
}

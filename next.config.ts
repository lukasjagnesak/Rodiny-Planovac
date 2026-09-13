import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone build = malý Docker image pro Hetzner.
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    // Kolik vteřin smí prohlížeč použít už stažené obrazovky.
    //
    // Výchozí nula znamená, že i krok zpět nebo návrat na přehled po
    // třiceti vteřinách stahuje všechno znovu ze serveru. Na mobilu je
    // to pokaždé několik vteřin čekání nad obrazovkou, která se mezitím
    // nezměnila.
    //
    // Třicet vteřin je kompromis: dva rodiče, kteří si píšou přes
    // Klidoo, se tak dlouhého zpoždění nedočkají, protože po každém
    // zápisu se stránka obnoví sama. Zastaralé může být jen to, co
    // mezitím změnil ten druhý — a i to jen po dobu jednoho půlminutí.
    staleTimes: { dynamic: 30, static: 180 },
  },
  images: {
    remotePatterns: [
      // Fotky účtenek a avatary ze Supabase Storage.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/**" },
    ],
  },
};

export default nextConfig;

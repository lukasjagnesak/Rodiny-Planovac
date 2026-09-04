import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone build = malý Docker image pro Hetzner.
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Fotky účtenek a avatary ze Supabase Storage.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/**" },
    ],
  },
};

export default nextConfig;

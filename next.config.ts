import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Forcer le rendu dynamique pour éviter les erreurs de pré-rendu avec Clerk
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
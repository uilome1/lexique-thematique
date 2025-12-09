/** @type {import('next').NextConfig} */ 
const nextConfig = {
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

// Utiliser l'exportation CommonJS standard ou ES Modules (comme vous l'aviez)
export default nextConfig;
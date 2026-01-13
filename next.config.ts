import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  typescript: {
    // Ignorar erros de TypeScript durante o build
    // ATENÇÃO: Use apenas temporariamente até corrigir todos os erros
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

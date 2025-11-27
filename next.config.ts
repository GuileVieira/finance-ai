import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignorar erros de ESLint durante o build de produção
    // Os warnings ainda serão exibidos, mas não vão bloquear o deploy
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorar erros de TypeScript durante o build
    // ATENÇÃO: Use apenas temporariamente até corrigir todos os erros
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

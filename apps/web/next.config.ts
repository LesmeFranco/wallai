import { config } from 'dotenv';
import type { NextConfig } from 'next';

/**
 * Next.js por defecto solo lee `.env*` de este mismo directorio (apps/web).
 * El `.env` real vive en la raiz del monorepo (ver drizzle.config.ts, mismo
 * criterio): una sola base de datos y una sola configuracion para todo el
 * proyecto. Esto lo carga en `process.env` antes de que Next arranque el
 * servidor, que es lo que necesita `packages/api` para verificar el JWT.
 */
config({ path: '../../.env', quiet: true });

const nextConfig: NextConfig = {
  /**
   * Los paquetes internos del monorepo se publican como TypeScript sin compilar
   * (mirar el campo "exports" de packages/validators/package.json, que apunta
   * directo a src/index.ts). Eso evita tener que compilar cada paquete antes de
   * usarlo, pero exige que Next los transpile junto con la app.
   */
  transpilePackages: ['@wallai/validators', '@wallai/db', '@wallai/api'],

  /**
   * Next.js 16 genera solo un AGENTS.md y un CLAUDE.md dentro de apps/web al
   * arrancar. Se desactiva porque este proyecto tiene una sola fuente de
   * instrucciones, el CLAUDE.md de la raiz: archivos generados en
   * subdirectorios se leen como instrucciones adicionales y pueden contradecir
   * lo que dice el de arriba, ademas de reaparecer en cada `pnpm dev`.
   */
  agentRules: false,
};

export default nextConfig;

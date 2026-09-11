import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// El .env vive en la raiz del monorepo, no dentro de este paquete:
// hay una sola base de datos y una sola configuracion para todo el proyecto.
config({ path: '../../.env' });

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migraciones',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  // Escribimos los campos en camelCase en TypeScript y Drizzle los traduce a
  // snake_case en SQL, que es la convencion de PostgreSQL. Asi cada lenguaje
  // usa su propio estilo sin que tengamos que repetir el nombre dos veces.
  casing: 'snake_case',
  verbose: true,
  strict: true,
});

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Crea el cliente de base de datos.
 *
 * Sobre `prepare: false`: Supabase ofrece dos formas de conectarse. La directa
 * (puerto 5432) y el "pooler" (puerto 6543), que reparte muchas conexiones de
 * la app entre pocas conexiones reales a PostgreSQL. El pooler en modo
 * transaccion no soporta sentencias preparadas, porque una sentencia preparada
 * vive en una conexion concreta y el pooler no garantiza que la proxima consulta
 * caiga en la misma. Desactivarlas es lo que permite usar el pooler sin errores
 * intermitentes y dificiles de reproducir.
 *
 * Para las migraciones se usa la conexion directa, no el pooler.
 */
export function crearClienteDb(url: string) {
  const conexion = postgres(url, {
    prepare: false,
    max: 5,
  });

  return drizzle(conexion, { schema, casing: 'snake_case' });
}

export type ClienteDb = ReturnType<typeof crearClienteDb>;

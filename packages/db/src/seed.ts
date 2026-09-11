/**
 * Siembra las categorias globales del sistema.
 *
 * Es idempotente: correrlo dos veces no duplica nada, porque el ON CONFLICT
 * DO NOTHING que genera Drizzle hace que PostgreSQL ignore las filas que ya
 * existen en vez de fallar. Eso permite volver a correrlo despues de agregar
 * una categoria nueva a la lista, sin tener que borrar la tabla.
 *
 * Uso:  pnpm --filter @wallai/db db:seed
 */
import { config } from 'dotenv';
import { crearClienteDb } from './cliente';
import { CATEGORIAS_GLOBALES } from './categoriasGlobales';
import { categorias } from './schema';

config({ path: '../../.env' });

async function sembrar(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Falta DATABASE_URL. Copiá .env.example a .env y completalo.');
  }

  const db = crearClienteDb(url);

  const insertadas = await db
    .insert(categorias)
    .values(
      CATEGORIAS_GLOBALES.map((categoria) => ({
        clave: categoria.clave,
        nombre: categoria.nombre,
        hogarId: null,
      })),
    )
    .onConflictDoNothing()
    .returning({ nombre: categorias.nombre });

  if (insertadas.length === 0) {
    console.log('Las categorías globales ya estaban cargadas. No se insertó nada.');
  } else {
    console.log(`Categorías insertadas (${insertadas.length}):`);
    for (const categoria of insertadas) {
      console.log(`  - ${categoria.nombre}`);
    }
  }

  process.exit(0);
}

sembrar().catch((error: unknown) => {
  console.error('Falló el seed:', error);
  process.exit(1);
});

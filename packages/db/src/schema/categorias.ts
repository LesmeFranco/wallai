import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { hogares } from './hogares';

/**
 * Categorias de gasto.
 *
 * Hay dos clases, distinguidas por `hogarId`:
 *  - hogarId NULL  -> categoria global del sistema, la misma para todos.
 *  - hogarId con valor -> categoria propia de ese hogar.
 *
 * Esta es la forma que pide el documento y es la correcta: las globales dan al
 * motor de tageo algo contra que clasificar desde el primer gasto (el problema
 * del "arranque en frio" que el documento marca como riesgo), y las del hogar
 * permiten que cada familia agregue lo suyo sin ensuciar el catalogo de todos.
 */
export const categorias = pgTable(
  'categorias',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    nombre: text('nombre').notNull(),

    /**
     * Identificador estable para referirse a una categoria global desde el
     * codigo, por ejemplo la categoria de descarte 'otros'.
     *
     * Existe porque el codigo no deberia depender de un nombre que se muestra
     * en pantalla: si manana "Comida" pasa a llamarse "Alimentacion", nada
     * tiene que romperse. Es NULL en las categorias creadas por un hogar,
     * que no se referencian desde el codigo.
     */
    clave: text('clave'),

    /** NULL = categoria global del sistema. */
    hogarId: uuid('hogar_id').references(() => hogares.id, { onDelete: 'cascade' }),

    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    /**
     * Por que hacen falta DOS indices unicos y no uno solo sobre
     * (hogar_id, nombre):
     *
     * En SQL, NULL no es igual a NULL: significa "desconocido", y dos valores
     * desconocidos no se consideran iguales. Un indice unico sobre
     * (hogar_id, nombre) por lo tanto NO impediria tener dos categorias
     * globales llamadas "Comida", porque sus hogar_id son ambos NULL y
     * PostgreSQL los trata como distintos.
     *
     * La solucion son dos indices parciales: uno para las globales (filtrando
     * hogar_id IS NULL, donde la unicidad va solo por nombre) y otro para las
     * de hogar.
     */
    uniqueIndex('categorias_global_nombre_unico')
      .on(tabla.nombre)
      .where(sql`${tabla.hogarId} is null`),

    uniqueIndex('categorias_hogar_nombre_unico')
      .on(tabla.hogarId, tabla.nombre)
      .where(sql`${tabla.hogarId} is not null`),

    uniqueIndex('categorias_clave_unica')
      .on(tabla.clave)
      .where(sql`${tabla.clave} is not null`),

    // El listado de categorias disponibles para un hogar es
    // "las globales mas las propias", y se pide en cada pantalla de carga.
    index('categorias_por_hogar').on(tabla.hogarId),
  ],
);

export type Categoria = typeof categorias.$inferSelect;
export type CategoriaNueva = typeof categorias.$inferInsert;

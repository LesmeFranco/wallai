import { sql } from 'drizzle-orm';
import { bigint, boolean, check, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { categorias } from './categorias';
import { periodoObjetivoEnum } from './enums';
import { hogares } from './hogares';
import { usuarios } from './usuarios';

/**
 * Objetivos de gasto: un limite que la persona o el hogar se fija, con aviso
 * al superarlo.
 *
 * El objetivo guarda el limite, no el gasto acumulado. Lo gastado se calcula
 * sumando la tabla de gastos cada vez que hace falta.
 *
 * Por que no guardar un contador acumulado: seria un dato duplicado que hay
 * que mantener sincronizado con cada alta, edicion y borrado de gasto. Basta
 * con que una sola de esas operaciones falle a mitad de camino para que el
 * contador quede mintiendo, y nada avisa. Calcular la suma sobre el indice
 * (hogar_id, fecha) es rapido y siempre es correcto por definicion.
 */
export const objetivos = pgTable(
  'objetivos',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Exactamente uno de los dos: el objetivo es de una persona o del hogar. */
    usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }),
    hogarId: uuid('hogar_id').references(() => hogares.id, { onDelete: 'cascade' }),

    /** NULL = objetivo sobre el gasto total, sin discriminar categoria. */
    categoriaId: uuid('categoria_id').references(() => categorias.id, { onDelete: 'cascade' }),

    /** El limite, en centavos enteros, igual que los montos de los gastos. */
    montoLimiteCentavos: bigint('monto_limite_centavos', { mode: 'number' }).notNull(),

    periodo: periodoObjetivoEnum('periodo').notNull(),

    /**
     * Permite apagar un objetivo sin borrarlo, para no perder el historial de
     * que la familia se habia propuesto en meses anteriores.
     */
    activo: boolean('activo').notNull().default(true),

    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check('objetivos_un_solo_duenio', sql`num_nonnulls(${tabla.usuarioId}, ${tabla.hogarId}) = 1`),
    check('objetivos_monto_valido', sql`${tabla.montoLimiteCentavos} > 0`),

    /**
     * Evita objetivos duplicados: un mismo duenio no puede tener dos objetivos
     * activos para la misma categoria y el mismo periodo. Hacen falta cuatro
     * indices parciales porque tanto el duenio como la categoria pueden ser
     * nulos, y en SQL dos nulos no se consideran iguales, asi que un indice
     * unico comun no los detectaria como repetidos.
     */
    uniqueIndex('objetivos_unico_usuario_categoria')
      .on(tabla.usuarioId, tabla.categoriaId, tabla.periodo)
      .where(sql`${tabla.usuarioId} is not null and ${tabla.categoriaId} is not null and ${tabla.activo}`),
    uniqueIndex('objetivos_unico_usuario_total')
      .on(tabla.usuarioId, tabla.periodo)
      .where(sql`${tabla.usuarioId} is not null and ${tabla.categoriaId} is null and ${tabla.activo}`),
    uniqueIndex('objetivos_unico_hogar_categoria')
      .on(tabla.hogarId, tabla.categoriaId, tabla.periodo)
      .where(sql`${tabla.hogarId} is not null and ${tabla.categoriaId} is not null and ${tabla.activo}`),
    uniqueIndex('objetivos_unico_hogar_total')
      .on(tabla.hogarId, tabla.periodo)
      .where(sql`${tabla.hogarId} is not null and ${tabla.categoriaId} is null and ${tabla.activo}`),
  ],
);

export type Objetivo = typeof objetivos.$inferSelect;
export type ObjetivoNuevo = typeof objetivos.$inferInsert;

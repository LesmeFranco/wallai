import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { categorias } from './categorias';
import { hogares } from './hogares';
import { usuarios } from './usuarios';

/**
 * La memoria del motor de tageo. Esta es la tabla que hace que la app
 * "aprenda", y es el corazon del diferencial del producto.
 *
 * Como funciona, desde la raiz:
 *
 * El motor no entrena ningun modelo. Cuando el usuario corrige la categoria de
 * un gasto, se guarda aca una fila que dice "el texto X corresponde a la
 * categoria Y". Ante un gasto nuevo, el motor busca en esta tabla el patron
 * mas parecido al texto que se acaba de escribir y propone su categoria.
 *
 * Por eso la promesa del documento -"corregir una sola vez y que no se vuelva
 * a equivocar con descripciones parecidas"- se cumple sin inteligencia
 * artificial: es busqueda por similitud sobre las correcciones propias.
 */
export const reglasTageo = pgTable(
  'reglas_tageo',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * A quien pertenece la regla. Exactamente uno de los dos tiene valor:
     *  - hogarId  -> la regla es del hogar y beneficia a todos sus miembros.
     *  - usuarioId -> la regla es de un usuario sin hogar.
     *
     * Que las reglas sean del hogar y no de la persona es una decision de
     * producto explicita del documento: si uno ensena que "medialunas" es
     * comida, los demas miembros se benefician de esa correccion. Es lo que
     * hace que el motor mejore mas rapido en una familia que en una app
     * individual.
     */
    hogarId: uuid('hogar_id').references(() => hogares.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }),

    /** El texto tal como lo escribio la persona, para poder mostrarlo. */
    patron: text('patron').notNull(),

    /**
     * El mismo texto normalizado: minusculas, sin acentos, sin puntuacion y
     * con los espacios colapsados.
     *
     * Por que se guarda por separado en vez de normalizar al momento de
     * comparar: la comparacion por similitud tiene que hacerse entre textos
     * tratados igual. "Panaderia", "panaderia" y "PANADERIA" son la misma
     * palabra para una persona, pero tres cadenas distintas para una
     * computadora. Normalizando de antemano, la comparacion es justa y ademas
     * no hay que reprocesar cada fila en cada busqueda.
     *
     * La funcion que normaliza es `normalizarTexto`, en
     * packages/validators/src/texto.ts. Tiene que ser la MISMA al guardar una
     * regla y al buscarla: si no, una regla guardada no haria match nunca.
     */
    patronNormalizado: text('patron_normalizado').notNull(),

    categoriaId: uuid('categoria_id')
      .notNull()
      .references(() => categorias.id, { onDelete: 'cascade' }),

    /**
     * Cuantas veces se confirmo esta relacion texto-categoria.
     *
     * Sirve para desempatar: si dos patrones se parecen igual de bien al texto
     * nuevo, gana el que la familia confirmo mas veces. Tambien permite
     * distinguir una correccion aislada de un habito establecido.
     */
    vecesConfirmada: integer('veces_confirmada').notNull().default(1),

    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (tabla) => [
    /**
     * num_nonnulls cuenta cuantos de sus argumentos NO son nulos. Exigir que
     * de exactamente 1 garantiza que toda regla tenga un duenio y solo uno.
     * Sin esta restriccion se podrian crear reglas huerfanas (las dos columnas
     * nulas) o ambiguas (las dos con valor), y ninguna de las dos situaciones
     * tiene sentido.
     */
    check(
      'reglas_tageo_un_solo_duenio',
      sql`num_nonnulls(${tabla.hogarId}, ${tabla.usuarioId}) = 1`,
    ),

    // Un mismo patron no puede estar dos veces para el mismo duenio: si vuelve
    // a confirmarse, se incrementa vecesConfirmada en vez de insertar otra fila.
    uniqueIndex('reglas_tageo_patron_por_hogar')
      .on(tabla.hogarId, tabla.patronNormalizado)
      .where(sql`${tabla.hogarId} is not null`),
    uniqueIndex('reglas_tageo_patron_por_usuario')
      .on(tabla.usuarioId, tabla.patronNormalizado)
      .where(sql`${tabla.usuarioId} is not null`),

    // El motor levanta todas las reglas de un hogar para compararlas contra el
    // texto nuevo. Este indice hace que esa lectura no recorra la tabla entera.
    index('reglas_tageo_por_hogar').on(tabla.hogarId),
    index('reglas_tageo_por_usuario').on(tabla.usuarioId),
  ],
);

export type ReglaTageo = typeof reglasTageo.$inferSelect;
export type ReglaTageoNueva = typeof reglasTageo.$inferInsert;

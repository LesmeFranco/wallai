import { sql } from 'drizzle-orm';
import { check, index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tipoHogarEnum } from './enums';
import { usuarios } from './usuarios';

/**
 * Un hogar es la unidad de agregacion del producto: el conjunto de personas
 * cuyos gastos se suman para responder "cuanto gastamos este mes".
 *
 * No es un sistema de deudas. No hay saldos entre miembros ni liquidaciones:
 * eso es explicitamente lo que el documento decide NO construir.
 *
 * Una persona puede pertenecer a varios a la vez (la casa y un grupo de
 * amigos, por ejemplo). Cada gasto suma a UNO solo de ellos, o a ninguno si es
 * privado: quien lo carga elige el destino en el momento. Ver el comentario de
 * `gastos.hogar_id`.
 */
export const hogares = pgTable(
  'hogares',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    nombre: text('nombre').notNull(),

    /**
     * Casa o grupo. Solo cambia como se lo nombra en pantalla.
     *
     * El default es 'casa' porque es lo que eran todos los hogares que ya
     * existian cuando se agrego la columna: en una migracion, el default tiene
     * que ser el valor que deja los datos viejos diciendo la verdad.
     */
    tipo: tipoHogarEnum('tipo').notNull().default('casa'),

    /**
     * Codigo que un miembro le pasa a otro para que se sume al hogar.
     *
     * Se genera en codigo de la app, no en la base, porque necesitamos
     * controlar el alfabeto: son 6 caracteres en mayuscula sin las letras y
     * numeros que se confunden al leerlos o dictarlos por telefono (0 con O,
     * 1 con I y con L). El documento pide "un codigo simple, sin friccion", y
     * la friccion aca aparece cuando alguien tipea mal el codigo tres veces.
     */
    codigoInvitacion: text('codigo_invitacion').notNull().unique(),

    fechaCreacion: timestamp('fecha_creacion', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check('hogares_codigo_formato', sql`${tabla.codigoInvitacion} ~ '^[A-Z2-9]{6}$'`),
  ],
);

export type Hogar = typeof hogares.$inferSelect;
export type HogarNuevo = typeof hogares.$inferInsert;

/**
 * Relacion muchos a muchos entre usuarios y hogares.
 *
 * El documento la pide asi. Durante las fases 1 a 3 el MVP asumia un solo
 * hogar activo por usuario (decision D4), pero la tabla se modelo igual como
 * muchos a muchos para no tener que migrar datos el dia que hiciera falta
 * soportar mas de uno. Ese dia llego: hoy una persona puede estar en varios
 * grupos a la vez y esta tabla no necesito ningun cambio.
 *
 * La clave primaria es la combinacion de las dos columnas: eso hace
 * imposible por construccion que un usuario quede cargado dos veces en el
 * mismo hogar, sin necesidad de validarlo en el codigo.
 */
export const usuarioHogar = pgTable(
  'usuario_hogar',
  {
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    hogarId: uuid('hogar_id')
      .notNull()
      .references(() => hogares.id, { onDelete: 'cascade' }),

    unidoEn: timestamp('unido_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    primaryKey({ columns: [tabla.usuarioId, tabla.hogarId] }),
    // La clave primaria ya indexa (usuario_id, hogar_id) en ese orden, lo que
    // sirve para "a que hogares pertenece este usuario". Este indice cubre la
    // pregunta inversa, "quienes son los miembros de este hogar", que es la que
    // usa el dashboard en cada carga.
    index('usuario_hogar_por_hogar').on(tabla.hogarId),
  ],
);

export type MiembroDeHogar = typeof usuarioHogar.$inferSelect;

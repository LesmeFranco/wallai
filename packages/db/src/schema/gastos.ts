import { sql } from 'drizzle-orm';
import { bigint, check, date, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { categorias } from './categorias';
import { medioDePagoEnum, origenCategoriaEnum } from './enums';
import { hogares } from './hogares';
import { usuarios } from './usuarios';

/**
 * La tabla central del producto.
 *
 * Cada fila es un gasto que alguien cargo escribiendo una frase.
 */
export const gastos = pgTable(
  'gastos',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Quien cargo el gasto. Nunca es nulo: todo gasto tiene un autor. */
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    /**
     * A que hogar suma este gasto, o NULL si es privado de quien lo cargo.
     *
     * Esto es la revision de la decision D1. Antes el servidor lo deducia solo
     * (una persona tenia un solo hogar y todos sus gastos iban ahi), y el
     * cliente no podia mandarlo. Ahora una persona puede estar en varios grupos
     * y necesita decidir gasto por gasto: este va a la casa, este al grupo de
     * amigos, este es mio y no lo ve nadie.
     *
     * Lo que NO cambio es la garantia de seguridad que motivaba D1: el cliente
     * propone el destino, pero el servidor verifica que quien carga sea
     * miembro de ese hogar antes de guardar. Sin esa verificacion, cualquiera
     * podria cargar gastos en un hogar ajeno con solo mandar su id.
     *
     * NULL significa privado: no lo ve nadie mas, ni siquiera los miembros de
     * los grupos a los que la persona pertenece. Es el mismo valor que tenian
     * los gastos de alguien sin hogar, y sigue queriendo decir lo mismo
     * ("no suma a ningun grupo"), asi que los datos viejos siguen siendo
     * correctos sin tocarlos.
     *
     * Se copia en el gasto en vez de deducirlo por join con usuario_hogar
     * porque el hogar al que pertenecio un gasto es un hecho historico: si
     * manana alguien se va del hogar, los gastos que ya hizo tienen que seguir
     * contando en los totales de los meses en que los hizo.
     */
    hogarId: uuid('hogar_id').references(() => hogares.id, { onDelete: 'set null' }),

    /**
     * El monto, siempre en centavos enteros (decision D5).
     * 30000 pesos se guardan como 3000000.
     *
     * Es bigint y no integer porque integer llega hasta 2.147.483.647, que en
     * centavos son unos 21 millones de pesos. Con la inflacion argentina, un
     * gasto grande (un auto, una reforma) puede pasar ese techo, y un
     * desbordamiento de entero es de los errores mas dificiles de rastrear.
     */
    montoCentavos: bigint('monto_centavos', { mode: 'number' }).notNull(),

    /**
     * La frase tal cual la escribio el usuario: "30000 pesos hamburguesa en
     * Guido". Se guarda sin tocar y no se sobrescribe nunca.
     *
     * Es la materia prima del motor de tageo: cuando el usuario corrige una
     * categoria, lo que se aprende es la relacion entre este texto y la
     * categoria correcta. Si guardaramos solo el resultado procesado,
     * perderiamos la posibilidad de reprocesar el historial cuando el motor
     * mejore (por ejemplo al pasar a embeddings en la Fase 2).
     */
    textoOriginal: text('texto_original').notNull(),

    categoriaId: uuid('categoria_id')
      .notNull()
      .references(() => categorias.id, { onDelete: 'restrict' }),

    /** Si la categoria la puso el motor o la corrigio una persona. */
    origenCategoria: origenCategoriaEnum('origen_categoria').notNull().default('automatico'),

    /**
     * El dia del gasto, sin hora.
     *
     * Por que `date` y no `timestamp`: un timestamp arrastra zona horaria. Un
     * gasto cargado a las 22:30 en Buenos Aires es, en UTC, la 01:30 del dia
     * siguiente. Si guardaramos timestamps, un gasto del 31 de agosto a la
     * noche caeria en septiembre al agrupar por mes, y el cierre mensual del
     * hogar daria mal. Como para este producto la hora no aporta nada, el tipo
     * `date` elimina el problema de raiz.
     *
     * Sobre el valor por defecto: `now()` en PostgreSQL devuelve la hora del
     * servidor, que en Supabase corre en UTC. Convertir eso a fecha
     * directamente reintroduciria el mismo error que queremos evitar: un gasto
     * cargado a las 22:00 en Buenos Aires quedaria fechado al dia siguiente.
     * Por eso el default convierte primero a la zona horaria argentina.
     *
     * De todos modos el default es solo una red de seguridad: el cliente manda
     * su propia fecha local, que es la unica correcta si la persona esta de
     * viaje en otro huso horario.
     */
    fecha: date('fecha')
      .notNull()
      .default(sql`(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`),

    /** Opcional segun el documento. */
    medioDePago: medioDePagoEnum('medio_de_pago'),

    /** Auditoria. Aca si va timestamp con zona: es un instante real. */
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    /**
     * PostgreSQL no actualiza esta columna solo. `$onUpdate` hace que Drizzle
     * la complete en cada UPDATE, lo que evita tener que mantener un trigger
     * en la base para algo que el ORM ya resuelve.
     */
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (tabla) => [
    /**
     * El monto tiene que ser positivo y estar dentro de un rango razonable.
     * El tope es 10.000 millones de pesos expresados en centavos. No esta para
     * limitar al usuario sino para atajar errores de tipeo antes de que
     * contaminen los totales del hogar. El mismo tope esta en el esquema Zod
     * de packages/validators: se valida en los dos lados a proposito, porque
     * un cliente se puede modificar y la base es la ultima linea de defensa.
     */
    check(
      'gastos_monto_valido',
      sql`${tabla.montoCentavos} > 0 and ${tabla.montoCentavos} <= 1000000000000`,
    ),
    check('gastos_texto_no_vacio', sql`length(trim(${tabla.textoOriginal})) > 0`),

    /**
     * Indices pensados para las dos consultas que la app hace todo el tiempo.
     *
     * Un indice es una estructura ordenada que evita que PostgreSQL tenga que
     * leer la tabla entera para encontrar filas. El orden de las columnas
     * importa: primero la que se filtra por igualdad (el hogar), despues la
     * que se filtra por rango (la fecha).
     */
    // "Cuanto gasto la casa entre estas dos fechas" -> dashboard del hogar.
    index('gastos_por_hogar_y_fecha').on(tabla.hogarId, tabla.fecha),
    // "Cuanto gaste yo entre estas dos fechas" -> dashboard individual.
    index('gastos_por_usuario_y_fecha').on(tabla.usuarioId, tabla.fecha),
    // Desglose por categoria dentro de un periodo.
    index('gastos_por_categoria').on(tabla.categoriaId),
  ],
);

export type Gasto = typeof gastos.$inferSelect;
export type GastoNuevo = typeof gastos.$inferInsert;

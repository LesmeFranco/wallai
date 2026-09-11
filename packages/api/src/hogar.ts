import { and, asc, eq } from 'drizzle-orm';
import { usuarioHogar } from '@wallai/db';
import type { Contexto } from './context';

/**
 * Los grupos a los que pertenece el usuario, del mas viejo al mas nuevo.
 *
 * El orden por fecha de union no es decorativo: define cual es el grupo por
 * defecto cuando alguien carga un gasto sin elegir destino (el primero de esta
 * lista). Ordenar por algo estable es lo que hace que ese default no cambie
 * solo de un dia para el otro; sin `orderBy`, PostgreSQL puede devolver las
 * filas en cualquier orden y el destino por defecto seria impredecible.
 */
export async function obtenerHogaresIds(
  db: Contexto['db'],
  usuarioId: string,
): Promise<string[]> {
  const filas = await db
    .select({ hogarId: usuarioHogar.hogarId })
    .from(usuarioHogar)
    .where(eq(usuarioHogar.usuarioId, usuarioId))
    .orderBy(asc(usuarioHogar.unidoEn), asc(usuarioHogar.hogarId));
  return filas.map((fila) => fila.hogarId);
}

/**
 * El grupo al que van los gastos de esta persona si no elige otro, o null si
 * no esta en ninguno. Es el primero al que se unio (ver `obtenerHogaresIds`).
 *
 * Reemplaza a `obtenerHogarId`, que devolvia "el hogar" de alguien cuando
 * todavia se asumia que habia uno solo. El nombre cambio a proposito: ahora
 * que puede haber varios, decir "el hogar del usuario" seria mentira, y un
 * nombre que miente es peor que uno largo.
 */
export async function obtenerHogarPorDefectoId(
  db: Contexto['db'],
  usuarioId: string,
): Promise<string | null> {
  const hogares = await obtenerHogaresIds(db, usuarioId);
  return hogares[0] ?? null;
}

/**
 * true si el usuario pertenece a ese grupo.
 *
 * Es la verificacion que sostiene lo que antes garantizaba la decision D1: el
 * cliente ahora propone a que grupo va un gasto, asi que sin este chequeo
 * cualquiera podria cargar gastos en un grupo ajeno (o leer los suyos) con
 * solo mandar un id que no le corresponde.
 */
export async function esMiembro(
  db: Contexto['db'],
  usuarioId: string,
  hogarId: string,
): Promise<boolean> {
  const [fila] = await db
    .select({ hogarId: usuarioHogar.hogarId })
    .from(usuarioHogar)
    .where(and(eq(usuarioHogar.usuarioId, usuarioId), eq(usuarioHogar.hogarId, hogarId)))
    .limit(1);
  return fila !== undefined;
}

/**
 * true si un error de Postgres, envuelto por Drizzle en un DrizzleQueryError,
 * es una violación de unicidad (código 23505). Drizzle guarda el error
 * original de `postgres` en `.cause`, así que hay que mirar ahí y no en el
 * propio error.
 */
export function esViolacionDeUnicidad(error: unknown): boolean {
  return (
    error instanceof Error &&
    'cause' in error &&
    error.cause instanceof Error &&
    'code' in error.cause &&
    error.cause.code === '23505'
  );
}

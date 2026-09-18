import { TRPCError } from '@trpc/server';
import { and, eq, isNull, type SQL } from 'drizzle-orm';
import { objetivos } from '@wallai/db';
import { PERIODO_OBJETIVO, type Alcance, type DestinoGasto } from '@wallai/validators';
import { esMiembro } from './hogar';
import type { Contexto } from './context';

/**
 * De quien es un objetivo: de una persona o de un grupo, nunca de los dos.
 *
 * La base ya garantiza eso con el CHECK `objetivos_un_solo_duenio`
 * (`num_nonnulls(usuario_id, hogar_id) = 1`); este tipo lo hace imposible
 * tambien en TypeScript, para que el error salte al compilar y no en un insert.
 */
export type DuenioObjetivo = { usuarioId: string } | { hogarId: string };

/**
 * Traduce el destino que mando el cliente al duenio del objetivo, verificando
 * que tenga derecho a tocarlo.
 *
 * Es la misma regla que sostiene la carga de gastos y esta en la seccion de
 * restricciones duras del proyecto: el cliente PROPONE (solo el sabe si esta
 * fijando su objetivo personal o el de la casa) y el servidor AUTORIZA. Sin
 * este chequeo, cualquiera podria cambiarle el objetivo a un grupo del que no
 * forma parte con solo mandar su id. Nunca sacarlo.
 */
export async function resolverDuenioObjetivo(
  db: Contexto['db'],
  usuarioId: string,
  destino: DestinoGasto,
): Promise<DuenioObjetivo> {
  if (destino.tipo === 'personal') return { usuarioId };

  if (!(await esMiembro(db, usuarioId, destino.hogarId))) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No pertenecés a ese grupo.' });
  }
  return { hogarId: destino.hogarId };
}

/**
 * La condicion que identifica al unico objetivo vigente de un duenio.
 *
 * Los tres filtros de mas (categoria nula, periodo mensual, activo) no son
 * decoracion: son exactamente las columnas del indice unico parcial
 * `objetivos_unico_usuario_total` / `objetivos_unico_hogar_total`. O sea que
 * esta condicion devuelve como mucho una fila, y eso lo garantiza la base y no
 * una suposicion del codigo.
 *
 * `isNull(categoriaId)` y no `eq(categoriaId, null)` porque en SQL nada es
 * igual a NULL, ni siquiera NULL (el mismo motivo por el que la tabla necesita
 * cuatro indices parciales y no uno solo).
 */
export function condicionDelVigente(duenio: DuenioObjetivo): SQL {
  const deQuien =
    'usuarioId' in duenio
      ? and(eq(objetivos.usuarioId, duenio.usuarioId), isNull(objetivos.hogarId))
      : and(eq(objetivos.hogarId, duenio.hogarId), isNull(objetivos.usuarioId));

  return and(
    deQuien,
    isNull(objetivos.categoriaId),
    eq(objetivos.periodo, PERIODO_OBJETIVO),
    eq(objetivos.activo, true),
  )!;
}

/** El objetivo vigente de un duenio, o null si no fijo ninguno. */
export async function buscarObjetivoDe(db: Contexto['db'], duenio: DuenioObjetivo) {
  const [objetivo] = await db.select().from(objetivos).where(condicionDelVigente(duenio)).limit(1);
  return objetivo ?? null;
}

/**
 * El objetivo que corresponde a lo que la persona esta mirando.
 *
 * Hay un objetivo por vista, asi que el alcance elegido es lo que decide cual
 * traer: en "Mis gastos" el personal, dentro de un grupo el de ese grupo. Es la
 * misma traduccion que hace `construirFiltroDeVisibilidad` con los gastos, y
 * por eso vive al lado: el limite y lo gastado tienen que salir del mismo
 * criterio, o la barra del dashboard mostraria un porcentaje sobre un total que
 * no le corresponde.
 *
 * El alcance `todo` (el de la app 1.0.0, ver `alcanceSchema`) no tiene
 * objetivo: mezcla lo propio con lo de todos los grupos, asi que no hay un
 * limite que le corresponda. Devolver null ahi no rompe nada en esos telefonos,
 * simplemente no ven la barra.
 */
export async function obtenerObjetivoDelAlcance(
  db: Contexto['db'],
  usuarioId: string,
  alcance: Alcance,
) {
  if (alcance.tipo === 'mio') {
    return buscarObjetivoDe(db, { usuarioId });
  }
  if (alcance.tipo === 'hogar') {
    // El alcance ya paso por `construirFiltroDeVisibilidad`, que rechaza un
    // grupo ajeno; se verifica igual porque este helper tiene que ser correcto
    // por si solo y no por el orden en que lo llamen.
    if (!(await esMiembro(db, usuarioId, alcance.hogarId))) return null;
    return buscarObjetivoDe(db, { hogarId: alcance.hogarId });
  }
  return null;
}

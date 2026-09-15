import { TRPCError } from '@trpc/server';
import { eq, inArray, or, type SQL } from 'drizzle-orm';
import { gastos } from '@wallai/db';
import { ALCANCE_POR_DEFECTO, type Alcance } from '@wallai/validators';
import { obtenerHogaresIds } from './hogar';
import type { Contexto } from './context';

/**
 * Traduce un alcance a la condicion SQL que filtra los gastos visibles.
 *
 * Vive en un archivo aparte porque `gastos.listar` y `hogares.resumen` tienen
 * que aplicar exactamente el mismo criterio. Si cada uno lo armara por su
 * cuenta, el dia que uno cambie el historial y el dashboard empezarian a
 * mostrar conjuntos distintos de gastos, y ese es el tipo de diferencia que
 * nadie nota hasta que los numeros no cierran.
 *
 * Las variantes, y por que cada una filtra como filtra:
 *
 *  - `mio`: `usuario_id = yo`, sin ninguna condicion sobre el grupo. Es el
 *    alcance por defecto y la vista personal de la app. "Lo que gaste yo"
 *    quiere decir eso literalmente: todo, en cualquier grupo, en cualquier
 *    momento, incluidos los grupos de los que despues se fue y los privados.
 *
 *  - `hogar`: todos los gastos de ese grupo, de todos sus miembros (D2), previa
 *    verificacion de que quien pregunta sea miembro. Es el unico lugar donde
 *    aparece lo que cargaron los demas, que es justamente el punto: se ve
 *    donde se comparte.
 *
 *  - `todo`: lo mio mas lo de todos mis grupos, mezclado. Ya no se ofrece en la
 *    app (ver el comentario de `alcanceSchema`); se sigue atendiendo porque la
 *    version 1.0.0 instalada lo manda.
 *
 * Todas las ramas estan ancladas a `yo` o a grupos de los que `yo` es miembro,
 * asi que ningun alcance puede devolver gastos de gente con la que no se
 * comparte nada.
 */
export async function construirFiltroDeVisibilidad(
  db: Contexto['db'],
  usuarioId: string,
  alcance: Alcance = ALCANCE_POR_DEFECTO,
): Promise<SQL> {
  if (alcance.tipo === 'mio') {
    return eq(gastos.usuarioId, usuarioId);
  }

  if (alcance.tipo === 'hogar') {
    const misHogares = await obtenerHogaresIds(db, usuarioId);
    if (!misHogares.includes(alcance.hogarId)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No pertenecés a ese grupo.',
      });
    }
    return eq(gastos.hogarId, alcance.hogarId);
  }

  const misHogares = await obtenerHogaresIds(db, usuarioId);
  if (misHogares.length === 0) return eq(gastos.usuarioId, usuarioId);
  return or(eq(gastos.usuarioId, usuarioId), inArray(gastos.hogarId, misHogares))!;
}

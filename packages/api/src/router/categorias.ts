import { asc, sql } from 'drizzle-orm';
import { categorias } from '@wallai/db';
import { obtenerHogaresIds } from '../hogar';
import { filtroDeCategoriasVisibles } from '../tageo';
import { protectedProcedure, router } from '../trpc';

export const categoriasRouter = router({
  /**
   * Las categorías que el usuario puede elegir: las globales del sistema más
   * las propias de todos los grupos a los que pertenece.
   *
   * Hace falta para la pantalla de corrección: cuando el motor se equivoca, la
   * persona elige la correcta de esta lista, y esa corrección es lo que
   * alimenta el aprendizaje (ver `gastos.corregirCategoria`).
   *
   * Las globales van primero porque son las que se usan casi siempre: son las
   * once con las que arranca cualquier hogar, y las propias son el agregado
   * excepcional.
   */
  listar: protectedProcedure.query(async ({ ctx }) => {
    const hogaresIds = await obtenerHogaresIds(ctx.db, ctx.usuario.id);
    const filtro = filtroDeCategoriasVisibles(hogaresIds);

    return ctx.db
      .select({
        id: categorias.id,
        nombre: categorias.nombre,
        clave: categorias.clave,
        hogarId: categorias.hogarId,
      })
      .from(categorias)
      .where(filtro)
      // Ordenar por `hogarId` directamente no sirve: en PostgreSQL los NULL
      // van al final en orden ascendente, y las globales son justamente las
      // que tienen `hogar_id` NULL. Ordenar por "tiene hogar o no" las pone
      // primero (false antes que true) sin depender de donde caen los NULL.
      .orderBy(sql`${categorias.hogarId} is not null`, asc(categorias.nombre));
  }),
});

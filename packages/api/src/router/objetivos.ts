import { objetivos } from '@wallai/db';
import {
  PERIODO_OBJETIVO,
  fijarObjetivoSchema,
  quitarObjetivoSchema,
} from '@wallai/validators';
import { buscarObjetivoDe, condicionDelVigente, resolverDuenioObjetivo } from '../objetivo';
import { esViolacionDeUnicidad } from '../hogar';
import { protectedProcedure, router } from '../trpc';

/**
 * El objetivo de gasto de una vista: cuanto se propuso gastar como maximo este
 * mes quien mira la pantalla.
 *
 * Solo dos operaciones, y es a proposito: un objetivo por vista significa que
 * no hay lista que administrar, asi que "crear" y "editar" son la misma cosa
 * (fijar un numero) y no hacen falta dos endpoints ni un id en la mano del
 * cliente. El alcance completo y por que quedo asi esta explicado en
 * `packages/validators/src/objetivo.ts`.
 */
export const objetivosRouter = router({
  /**
   * Fija el objetivo de una vista, o cambia el que ya estaba.
   *
   * El upsert es manual (buscar y despues actualizar o insertar) y no un
   * `ON CONFLICT`: la unicidad la da un indice UNICO PARCIAL (solo sobre las
   * filas activas y sin categoria), y para que Postgres lo use como destino de
   * un ON CONFLICT hay que repetirle la condicion del indice entera. Es el
   * mismo criterio que ya usa `gastos.corregirCategoria`, que tiene el mismo
   * problema con su propio indice parcial.
   */
  fijar: protectedProcedure.input(fijarObjetivoSchema).mutation(async ({ ctx, input }) => {
    const duenio = await resolverDuenioObjetivo(ctx.db, ctx.usuario.id, input.destino);

    const vigente = await buscarObjetivoDe(ctx.db, duenio);
    if (vigente) {
      const [actualizado] = await ctx.db
        .update(objetivos)
        .set({ montoLimiteCentavos: input.montoLimiteCentavos })
        .where(condicionDelVigente(duenio))
        .returning();
      return actualizado!;
    }

    try {
      const [creado] = await ctx.db
        .insert(objetivos)
        .values({
          ...duenio,
          montoLimiteCentavos: input.montoLimiteCentavos,
          periodo: PERIODO_OBJETIVO,
        })
        .returning();
      return creado!;
    } catch (error) {
      /**
       * Dos personas del mismo grupo fijando el objetivo al mismo tiempo: las
       * dos ven que no hay ninguno y las dos insertan, pero el indice unico
       * deja pasar una sola. La que perdio actualiza la fila que acaba de
       * crear la otra, que es lo mismo que habria hecho medio segundo mas
       * tarde. Sin esto, a esa persona le aparecia un error de base sin
       * sentido para ella.
       */
      if (!esViolacionDeUnicidad(error)) throw error;
      const [actualizado] = await ctx.db
        .update(objetivos)
        .set({ montoLimiteCentavos: input.montoLimiteCentavos })
        .where(condicionDelVigente(duenio))
        .returning();
      return actualizado!;
    }
  }),

  /**
   * Saca el objetivo de una vista.
   *
   * No borra la fila: la marca `activo: false`. Es lo que la columna existe
   * para permitir (ver el comentario de `objetivos.activo` en el schema), y lo
   * que deja poder contestar mas adelante "que se habia propuesto la familia en
   * julio". El indice unico parcial solo mira las filas activas, asi que una
   * apagada no molesta para fijar una nueva.
   *
   * Es idempotente: quitar un objetivo que no existe no es un error, porque el
   * estado final es el que la persona pidio.
   */
  quitar: protectedProcedure.input(quitarObjetivoSchema).mutation(async ({ ctx, input }) => {
    const duenio = await resolverDuenioObjetivo(ctx.db, ctx.usuario.id, input.destino);

    await ctx.db
      .update(objetivos)
      .set({ activo: false })
      .where(condicionDelVigente(duenio));

    return { quitado: true };
  }),
});

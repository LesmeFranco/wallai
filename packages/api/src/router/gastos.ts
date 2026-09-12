import { TRPCError } from '@trpc/server';
import { and, desc, eq, gte, ilike, lt, lte, or, sql } from 'drizzle-orm';
import { gastos } from '@wallai/db';
import {
  corregirCategoriaSchema,
  crearGastoSchema,
  editarGastoSchema,
  eliminarGastoSchema,
  listarGastosSchema,
  normalizarTexto,
  parsearTexto,
  type DestinoGasto,
} from '@wallai/validators';
import { esMiembro, obtenerHogarPorDefectoId } from '../hogar';
import { propietarioDeReglas, propietariosDeReglas, sugerirCategoria } from '../tageo';
import { construirFiltroDeVisibilidad } from '../visibilidad';
import { protectedProcedure, router } from '../trpc';
import type { Contexto } from '../context';

/**
 * A qué grupo suma un gasto que se está cargando, o null si es privado.
 *
 * Acá es donde se sostiene la garantía que antes daba la decisión D1. El
 * cliente ahora propone el destino (porque puede pertenecer a varios grupos y
 * solo él sabe a cuál va este gasto), pero antes de guardar se verifica que
 * sea miembro de ese grupo. Sin esta verificación, mandar un id cualquiera
 * alcanzaría para meter gastos en la casa de otra persona.
 */
async function resolverHogarDelGasto(
  db: Contexto['db'],
  usuarioId: string,
  destino: DestinoGasto | undefined,
): Promise<string | null> {
  // Sin destino explícito, el gasto va al primer grupo al que se unió la
  // persona, o queda privado si no está en ninguno. Ver el comentario de
  // `destino` en crearGastoSchema para por qué ese default y no "privado".
  if (!destino) return obtenerHogarPorDefectoId(db, usuarioId);

  if (destino.tipo === 'personal') return null;

  if (!(await esMiembro(db, usuarioId, destino.hogarId))) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'No pertenecés a ese grupo, así que no podés cargarle gastos.',
    });
  }
  return destino.hogarId;
}

export const gastosRouter = router({
  /**
   * Crea un gasto a partir de una frase en lenguaje natural.
   *
   * El flujo, de punta a punta: `parsearTexto` separa el monto y la fecha de
   * la frase (si no vinieron ya como override); el texto que queda
   * ("hamburguesa en Guido", sin el monto en el medio) es lo que el motor de
   * tageo compara contra las reglas aprendidas del hogar para sugerir una
   * categoría, salvo que el cliente ya haya elegido una a mano.
   *
   * `textoOriginal` siempre guarda la frase completa tal cual la escribió el
   * usuario, nunca la versión recortada: es la materia prima del motor (ver
   * el comentario en schema/gastos.ts) y hace falta completa para poder
   * reprocesar el historial si el parser o el motor mejoran más adelante.
   */
  crear: protectedProcedure.input(crearGastoSchema).mutation(async ({ ctx, input }) => {
    const analisis = parsearTexto(input.texto);

    const montoCentavos = input.montoCentavos ?? analisis.montoCentavos;
    if (montoCentavos === null) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No encontré ningún monto en el texto. Probá algo como "500 pesos" o "$500".',
      });
    }

    const hogarId = await resolverHogarDelGasto(ctx.db, ctx.usuario.id, input.destino);
    const fecha = input.fecha ?? analisis.fecha ?? undefined;

    let categoriaId: string;
    let origenCategoria: 'manual' | 'automatico';
    if (input.categoriaId) {
      categoriaId = input.categoriaId;
      origenCategoria = 'manual';
    } else {
      const textoParaClasificar = analisis.textoRestante || input.texto;
      const sugerencia = await sugerirCategoria(
        ctx.db,
        propietariosDeReglas(hogarId, ctx.usuario.id),
        textoParaClasificar,
      );
      categoriaId = sugerencia.categoriaId;
      // 'automatico' incluye el caso en que el motor no encontró ninguna
      // regla parecida y cayó en "Otros" a propósito: esa también es una
      // decisión del motor, no una elegida por una persona.
      origenCategoria = 'automatico';
    }

    const [gasto] = await ctx.db
      .insert(gastos)
      .values({
        usuarioId: ctx.usuario.id,
        hogarId,
        montoCentavos,
        textoOriginal: input.texto,
        categoriaId,
        origenCategoria,
        ...(fecha ? { fecha } : {}),
      })
      .returning();

    return gasto!;
  }),

  /**
   * Lista los gastos visibles para el usuario autenticado, más recientes
   * primero, con paginado por cursor.
   *
   * Qué se ve lo decide el `alcance` (ver `visibilidad.ts`): todo lo visible,
   * solo lo propio, solo lo privado, o un grupo puntual. Dentro de un grupo
   * sigue valiendo la decisión D2: se ve el detalle de los gastos de TODOS sus
   * miembros, no solo los propios.
   *
   * `usuarioId` es un filtro aparte que se aplica encima del alcance, para
   * mirar a un miembro puntual dentro de lo que ya es visible. No sirve para
   * ampliar lo que se ve: pedir el id de alguien con quien no se comparte
   * ningún grupo devuelve cero filas.
   */
  listar: protectedProcedure.input(listarGastosSchema).query(async ({ ctx, input }) => {
    const filtroVisibilidad = await construirFiltroDeVisibilidad(
      ctx.db,
      ctx.usuario.id,
      input.alcance,
    );

    const condiciones = [filtroVisibilidad];
    if (input.desde) condiciones.push(gte(gastos.fecha, input.desde));
    if (input.hasta) condiciones.push(lte(gastos.fecha, input.hasta));
    if (input.categoriaId) condiciones.push(eq(gastos.categoriaId, input.categoriaId));
    if (input.usuarioId) condiciones.push(eq(gastos.usuarioId, input.usuarioId));
    if (input.busqueda) condiciones.push(ilike(gastos.textoOriginal, `%${input.busqueda}%`));

    // Paginado por cursor (keyset): en vez de "página 3", pedimos "lo que
    // sigue después de este gasto puntual". Es estable aunque se carguen
    // gastos nuevos entre una página y la siguiente, a diferencia de OFFSET,
    // que se desincroniza y puede repetir o saltear filas.
    if (input.cursor) {
      const [gastoCursor] = await ctx.db
        .select({ fecha: gastos.fecha, id: gastos.id })
        .from(gastos)
        .where(eq(gastos.id, input.cursor));

      if (gastoCursor) {
        condiciones.push(
          or(
            lt(gastos.fecha, gastoCursor.fecha),
            and(eq(gastos.fecha, gastoCursor.fecha), lt(gastos.id, gastoCursor.id)),
          )!,
        );
      }
    }

    const filas = await ctx.db
      .select()
      .from(gastos)
      .where(and(...condiciones))
      .orderBy(desc(gastos.fecha), desc(gastos.id))
      .limit(input.limite);

    return {
      gastos: filas,
      // Si vinieron menos filas que el límite pedido, no hay página siguiente.
      cursorSiguiente: filas.length === input.limite ? filas[filas.length - 1]!.id : null,
    };
  }),

  /**
   * Corrige la categoría de un gasto y hace que el hogar aprenda de eso.
   *
   * Es el único lugar que escribe en `reglas_tageo`. La regla queda a nombre
   * del dueño del GASTO (su hogar si tenía uno al cargarse, o el usuario si
   * no), no de quien corrige: así, si un integrante corrige un gasto que cargó
   * otro, la regla sigue siendo del hogar y beneficia a los dos (decisión del
   * documento sobre aprendizaje compartido).
   *
   * El patrón que se guarda es el texto SIN el monto ni la fecha, recalculado
   * con el mismo parser que usa `gastos.crear`. Tiene que ser el mismo cálculo
   * en los dos lugares: si no, una regla guardada acá nunca haría match contra
   * el texto que arma `crear` al buscar una sugerencia.
   */
  corregirCategoria: protectedProcedure.input(corregirCategoriaSchema).mutation(async ({ ctx, input }) => {
    const [gasto] = await ctx.db.select().from(gastos).where(eq(gastos.id, input.gastoId));
    if (!gasto) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Ese gasto no existe.' });
    }

    // Un gasto de grupo lo puede corregir cualquier miembro (el aprendizaje es
    // compartido); uno privado, solo su autor.
    const puedeVerlo = gasto.hogarId
      ? await esMiembro(ctx.db, ctx.usuario.id, gasto.hogarId)
      : gasto.usuarioId === ctx.usuario.id;
    if (!puedeVerlo) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Ese gasto no es tuyo ni de un grupo tuyo.' });
    }

    const [gastoActualizado] = await ctx.db
      .update(gastos)
      .set({ categoriaId: input.categoriaId, origenCategoria: 'manual' })
      .where(eq(gastos.id, input.gastoId))
      .returning();

    const { textoRestante } = parsearTexto(gasto.textoOriginal);
    const patron = textoRestante || gasto.textoOriginal;
    const patronNormalizado = normalizarTexto(patron);
    const propietario = propietarioDeReglas(gasto.hogarId, gasto.usuarioId);

    // Upsert manual (no con el query builder de Drizzle) porque el índice
    // único que hay que respetar es parcial (solo para hogar_id o solo para
    // usuario_id, ver 0000_inicial.sql / schema/reglasTageo.ts), y el target
    // de un ON CONFLICT tiene que repetir la condición WHERE del índice tal
    // cual para que Postgres lo reconozca.
    if ('hogarId' in propietario) {
      await ctx.db.execute(sql`
        insert into reglas_tageo (hogar_id, patron, patron_normalizado, categoria_id)
        values (${propietario.hogarId}, ${patron}, ${patronNormalizado}, ${input.categoriaId})
        on conflict (hogar_id, patron_normalizado) where hogar_id is not null
        do update set
          categoria_id = excluded.categoria_id,
          veces_confirmada = case
            when reglas_tageo.categoria_id = excluded.categoria_id
            then reglas_tageo.veces_confirmada + 1
            else 1
          end,
          actualizado_en = now()
      `);
    } else {
      await ctx.db.execute(sql`
        insert into reglas_tageo (usuario_id, patron, patron_normalizado, categoria_id)
        values (${propietario.usuarioId}, ${patron}, ${patronNormalizado}, ${input.categoriaId})
        on conflict (usuario_id, patron_normalizado) where usuario_id is not null
        do update set
          categoria_id = excluded.categoria_id,
          veces_confirmada = case
            when reglas_tageo.categoria_id = excluded.categoria_id
            then reglas_tageo.veces_confirmada + 1
            else 1
          end,
          actualizado_en = now()
      `);
    }

    return gastoActualizado!;
  }),

  /**
   * Corrige el monto, la fecha o la categoría de un gasto ya cargado.
   *
   * Decisión de permisos: solo el autor puede editar su gasto, aunque la
   * decisión D2 deje que todo el hogar lo VEA. Ver y modificar no son lo mismo:
   * si el monto que cargó alguien se le puede cambiar a cualquiera, el total del
   * mes deja de ser confiable y no queda registro de quién lo cambió. Es el
   * criterio conservador para una operación que no se puede deshacer, y es
   * fácil de relajar más adelante si en la práctica molesta.
   *
   * A diferencia de `corregirCategoria`, esto NO enseña nada al motor: cambiar
   * un monto mal tipeado no dice nada sobre cómo categorizar un texto. Si acá
   * se cambia la categoría, se cambia solo en este gasto. Para enseñarle al
   * hogar, el camino sigue siendo `corregirCategoria`.
   */
  editar: protectedProcedure.input(editarGastoSchema).mutation(async ({ ctx, input }) => {
    const [gasto] = await ctx.db.select().from(gastos).where(eq(gastos.id, input.gastoId));
    if (!gasto) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Ese gasto no existe.' });
    }
    if (gasto.usuarioId !== ctx.usuario.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Solo quien cargó el gasto puede modificarlo.',
      });
    }

    const [actualizado] = await ctx.db
      .update(gastos)
      .set({
        ...(input.montoCentavos !== undefined ? { montoCentavos: input.montoCentavos } : {}),
        ...(input.fecha !== undefined ? { fecha: input.fecha } : {}),
        // Si se elige la categoría a mano, deja de ser decisión del motor.
        ...(input.categoriaId !== undefined
          ? { categoriaId: input.categoriaId, origenCategoria: 'manual' as const }
          : {}),
      })
      .where(eq(gastos.id, input.gastoId))
      .returning();

    return actualizado!;
  }),

  /**
   * Borra un gasto.
   *
   * Mismo criterio de permisos que `editar`: solo el autor. Y por el mismo
   * motivo, con más razón: borrar no se puede deshacer.
   *
   * No toca `reglas_tageo`. Si la persona había corregido la categoría de este
   * gasto, lo que el hogar aprendió de esa corrección queda: el aprendizaje es
   * sobre el texto ("medialunas es comida"), no sobre este gasto puntual, y
   * sigue siendo verdad aunque el gasto ya no exista.
   */
  eliminar: protectedProcedure.input(eliminarGastoSchema).mutation(async ({ ctx, input }) => {
    const [gasto] = await ctx.db.select().from(gastos).where(eq(gastos.id, input.gastoId));
    if (!gasto) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Ese gasto no existe.' });
    }
    if (gasto.usuarioId !== ctx.usuario.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Solo quien cargó el gasto puede borrarlo.',
      });
    }

    await ctx.db.delete(gastos).where(eq(gastos.id, input.gastoId));
    return { id: input.gastoId };
  }),
});

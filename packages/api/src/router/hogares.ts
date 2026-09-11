import { TRPCError } from '@trpc/server';
import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { categorias, gastos, hogares, usuarioHogar, usuarios } from '@wallai/db';
import {
  crearHogarSchema,
  generarCodigoInvitacion,
  rangoMesActual,
  resumenHogarSchema,
  salirHogarSchema,
  unirseHogarSchema,
} from '@wallai/validators';
import { esMiembro, esViolacionDeUnicidad, obtenerHogaresIds } from '../hogar';
import { construirFiltroDeVisibilidad } from '../visibilidad';
import { protectedProcedure, router } from '../trpc';

/** Cuántas veces reintentar si el código generado choca con uno existente. */
const INTENTOS_CODIGO = 5;

export const hogaresRouter = router({
  /**
   * Crea un grupo nuevo y suma como primer miembro a quien lo crea.
   *
   * Ya no rechaza a quien pertenece a otro grupo. Eso era la decisión D4 (un
   * hogar activo por persona), que se levantó a pedido: alguien puede querer
   * llevar los gastos de su casa y los de un grupo de amigos en paralelo, y
   * son dos preguntas distintas ("cuánto gastó la casa", "cuánto gastamos en
   * el viaje") que no tiene sentido mezclar en un solo total.
   */
  crear: protectedProcedure.input(crearHogarSchema).mutation(async ({ ctx, input }) => {
    // El código se genera al azar (ver generarCodigoInvitacion) y es
    // extremadamente improbable que choque con uno existente (31^6 ≈ 887
    // millones de combinaciones), pero como es una clave única de la base,
    // reintentar con uno nuevo es más simple y más correcto que fallar.
    for (let intento = 1; intento <= INTENTOS_CODIGO; intento++) {
      try {
        const [hogar] = await ctx.db
          .insert(hogares)
          .values({
            nombre: input.nombre,
            tipo: input.tipo,
            codigoInvitacion: generarCodigoInvitacion(),
          })
          .returning();
        await ctx.db.insert(usuarioHogar).values({ usuarioId: ctx.usuario.id, hogarId: hogar!.id });
        return hogar!;
      } catch (error) {
        if (!esViolacionDeUnicidad(error) || intento === INTENTOS_CODIGO) throw error;
      }
    }
    // Inalcanzable: el for siempre retorna o relanza en la última vuelta.
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No se pudo crear el grupo.' });
  }),

  /**
   * Se suma a un grupo existente con el código que le pasó otro miembro.
   *
   * El único caso que se rechaza es estar ya en ESE grupo. Antes se rechazaba
   * estar en cualquiera; ahora pertenecer a varios es justamente lo que se
   * quiere permitir. El chequeo explícito igual hace falta para dar un mensaje
   * claro: sin él, la clave primaria de `usuario_hogar` rebotaría el insert con
   * un error de base que no le dice nada a la persona.
   */
  unirse: protectedProcedure.input(unirseHogarSchema).mutation(async ({ ctx, input }) => {
    const [hogar] = await ctx.db.select().from(hogares).where(eq(hogares.codigoInvitacion, input.codigo));
    if (!hogar) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Ese código no corresponde a ningún grupo.' });
    }

    if (await esMiembro(ctx.db, ctx.usuario.id, hogar.id)) {
      throw new TRPCError({ code: 'CONFLICT', message: `Ya formás parte de ${hogar.nombre}.` });
    }

    await ctx.db.insert(usuarioHogar).values({ usuarioId: ctx.usuario.id, hogarId: hogar.id });
    return hogar;
  }),

  /**
   * Saca al usuario autenticado de un grupo puntual.
   *
   * Si quedan otros miembros, no se toca nada más: los gastos que cargó siguen
   * siendo del grupo porque el grupo de un gasto es un hecho histórico (ver el
   * invariante de `gastos.hogar_id`). Si se los llevara, los totales de los
   * meses en que esa persona estuvo ahí cambiarían para todos los demás y un
   * cierre de mes ya dado por cerrado dejaría de cuadrar. Las reglas de tageo
   * también quedan: son el aprendizaje compartido del grupo, no algo que uno
   * se lleve al irse.
   *
   * Nota sobre lo que la persona sigue viendo: deja de ver los gastos que
   * cargaron los demás, pero los suyos los sigue viendo en el alcance "solo
   * yo", porque ese alcance filtra por autor y no por grupo. Antes de que
   * existieran los alcances, salir del hogar equivalía a perder de vista todo
   * lo que uno había cargado ahí.
   */
  salir: protectedProcedure.input(salirHogarSchema).mutation(async ({ ctx, input }) => {
    if (!(await esMiembro(ctx.db, ctx.usuario.id, input.hogarId))) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No pertenecés a ese grupo.' });
    }

    await ctx.db
      .delete(usuarioHogar)
      .where(and(eq(usuarioHogar.usuarioId, ctx.usuario.id), eq(usuarioHogar.hogarId, input.hogarId)));

    /**
     * Si era el último, el grupo queda sin nadie adentro y se borra.
     *
     * Sin esto quedarían grupos huérfanos: invisibles para todos, pero con su
     * código de invitación todavía válido, así que alguien podría "sumarse" a
     * un grupo vacío y ver los gastos de gente que ya no está. Dejarlos sería
     * peor que borrarlos.
     *
     * Qué pasa con lo que colgaba de ese grupo, según lo que ya define el
     * schema: los gastos NO se borran (`gastos.hogar_id` es `set null`), así que
     * vuelven a ser privados de quien los cargó, que es lo más cercano a la
     * verdad cuando el grupo dejó de existir. Las reglas de tageo y los
     * objetivos sí se borran (`cascade`): eran del grupo, y no queda nadie a
     * quien le sirvan.
     *
     * Esto es la única excepción al "hecho histórico" del párrafo anterior, y
     * se acepta porque la alternativa (un grupo vacío con código válido) es un
     * agujero de privacidad.
     */
    const [quedan] = await ctx.db
      .select({ cantidad: sql<number>`count(*)::int` })
      .from(usuarioHogar)
      .where(eq(usuarioHogar.hogarId, input.hogarId));

    if (Number(quedan?.cantidad ?? 0) === 0) {
      await ctx.db.delete(hogares).where(eq(hogares.id, input.hogarId));
      return { hogarBorrado: true };
    }

    return { hogarBorrado: false };
  }),

  /**
   * Todos los grupos del usuario con sus miembros, del más viejo al más nuevo.
   *
   * Reemplaza a `miHogar`, que devolvía uno solo (o null). El cambio de nombre
   * es a propósito: una función que se llama `miHogar` y devuelve una lista
   * miente sobre lo que hace, y además así el compilador marca todos los
   * lugares del cliente que había que actualizar en vez de dejar alguno
   * leyendo el primer elemento por casualidad.
   *
   * El orden es el mismo que usa `obtenerHogaresIds`, así que el primero de
   * esta lista es también el destino por defecto de un gasto nuevo. Que la
   * pantalla muestre en ese orden y el servidor elija con ese orden no es
   * casualidad: es lo que hace que el default sea predecible.
   */
  mios: protectedProcedure.query(async ({ ctx }) => {
    const hogaresIds = await obtenerHogaresIds(ctx.db, ctx.usuario.id);
    if (hogaresIds.length === 0) return [];

    const filas = await ctx.db.select().from(hogares).where(inArray(hogares.id, hogaresIds));

    const miembros = await ctx.db
      .select({
        hogarId: usuarioHogar.hogarId,
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
      })
      .from(usuarioHogar)
      .innerJoin(usuarios, eq(usuarios.id, usuarioHogar.usuarioId))
      .where(inArray(usuarioHogar.hogarId, hogaresIds))
      .orderBy(asc(usuarioHogar.unidoEn));

    const porHogar = new Map(filas.map((hogar) => [hogar.id, hogar]));

    // Se recorre `hogaresIds` y no `filas` para conservar el orden por fecha
    // de unión: un `select ... where in (...)` no garantiza ningún orden.
    return hogaresIds.flatMap((hogarId) => {
      const hogar = porHogar.get(hogarId);
      if (!hogar) return [];
      return [
        {
          ...hogar,
          miembros: miembros
            .filter((miembro) => miembro.hogarId === hogarId)
            .map(({ hogarId: _, ...miembro }) => miembro),
        },
      ];
    });
  }),

  /**
   * El resumen del dashboard: "¿cuánto gastó la casa este mes?" (la pregunta
   * central del producto, ver sección 1 de CLAUDE.md), con desglose por
   * persona y por categoría.
   *
   * Es agregación calculada en el momento contra la base, no un valor
   * guardado: cada consulta refleja el estado actual de los gastos, así que
   * cargar un gasto nuevo se ve reflejado en el próximo pedido del resumen
   * sin ningún paso intermedio. (Distinto de "tiempo real" en el sentido de
   * empujar la actualización al cliente sin que la pida: eso son canales de
   * Supabase Realtime, una decisión de cliente/mobile aparte que todavía no
   * se tomó — ver la nota en la sección de estado de CLAUDE.md.)
   *
   * Qué resume lo decide el `alcance`, con el mismo criterio exacto que usa
   * `gastos.listar` (los dos llaman a `construirFiltroDeVisibilidad`), para que
   * el total del dashboard y la suma de lo que se ve en el historial no puedan
   * discrepar.
   */
  resumen: protectedProcedure.input(resumenHogarSchema).query(async ({ ctx, input }) => {
    const rangoPorDefecto = rangoMesActual();
    const desde = input.desde ?? rangoPorDefecto.desde;
    const hasta = input.hasta ?? rangoPorDefecto.hasta;

    const filtroVisibilidad = await construirFiltroDeVisibilidad(
      ctx.db,
      ctx.usuario.id,
      input.alcance,
    );
    const filtroPeriodo = and(
      filtroVisibilidad,
      gte(gastos.fecha, desde),
      lte(gastos.fecha, hasta),
      ...(input.usuarioId ? [eq(gastos.usuarioId, input.usuarioId)] : []),
    )!;

    const [total] = await ctx.db
      .select({ totalCentavos: sql<number>`coalesce(sum(${gastos.montoCentavos}), 0)::bigint` })
      .from(gastos)
      .where(filtroPeriodo);

    const porPersona = await ctx.db
      .select({
        usuarioId: usuarios.id,
        nombre: usuarios.nombre,
        totalCentavos: sql<number>`sum(${gastos.montoCentavos})::bigint`,
      })
      .from(gastos)
      .innerJoin(usuarios, eq(usuarios.id, gastos.usuarioId))
      .where(filtroPeriodo)
      .groupBy(usuarios.id, usuarios.nombre)
      .orderBy(sql`sum(${gastos.montoCentavos}) desc`);

    const porCategoria = await ctx.db
      .select({
        categoriaId: categorias.id,
        nombre: categorias.nombre,
        totalCentavos: sql<number>`sum(${gastos.montoCentavos})::bigint`,
      })
      .from(gastos)
      .innerJoin(categorias, eq(categorias.id, gastos.categoriaId))
      .where(filtroPeriodo)
      .groupBy(categorias.id, categorias.nombre)
      .orderBy(sql`sum(${gastos.montoCentavos}) desc`);

    return {
      desde,
      hasta,
      totalCentavos: Number(total!.totalCentavos),
      porPersona: porPersona.map((fila) => ({ ...fila, totalCentavos: Number(fila.totalCentavos) })),
      porCategoria: porCategoria.map((fila) => ({ ...fila, totalCentavos: Number(fila.totalCentavos) })),
    };
  }),
});

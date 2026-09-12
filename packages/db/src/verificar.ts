/**
 * Prueba de humo del modelo de datos.
 *
 * Crea un hogar de mentira con dos miembros y unos gastos, corre las consultas
 * que va a usar el dashboard, y verifica que las restricciones de la base
 * rechacen los datos invalidos.
 *
 * TODO queda dentro de una transaccion que al final se revierte, asi que no
 * deja nada en la base: se puede correr contra la base real sin ensuciarla.
 *
 * Uso:  pnpm --filter @wallai/db db:verificar
 */
import { config } from 'dotenv';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { formatearPesos, generarCodigoInvitacion, pesosACentavos } from '@wallai/validators';
import { crearClienteDb } from './cliente';
import { categorias, gastos, hogares, objetivos, reglasTageo, usuarios, usuarioHogar } from './schema';

config({ path: '../../.env' });

const ID_ANA = '11111111-1111-4111-8111-111111111111';
const ID_BETO = '22222222-2222-4222-8222-222222222222';

let fallos = 0;

function ok(mensaje: string): void {
  console.log(`  ok   ${mensaje}`);
}

function mal(mensaje: string): void {
  fallos++;
  console.log(`  FALLA ${mensaje}`);
}

/** Verifica que una operacion invalida sea rechazada por la base. */
async function debeRechazar(
  tx: { transaction: <T>(cb: (tx2: never) => Promise<T>) => Promise<T> },
  descripcion: string,
  operacion: (tx2: never) => Promise<unknown>,
): Promise<void> {
  try {
    // Cada intento va en una subtransaccion (SAVEPOINT en PostgreSQL) porque
    // un error aborta la transaccion que lo contiene. El savepoint acota el
    // dano a este intento y deja seguir con los siguientes.
    await tx.transaction(async (tx2) => {
      await operacion(tx2);
    });
    mal(`${descripcion} — la base lo aceptó y no debería`);
  } catch {
    ok(`${descripcion} — rechazado correctamente`);
  }
}

async function verificar(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL en el .env de la raíz.');

  const db = crearClienteDb(url);

  try {
    await db.transaction(async (tx) => {
      console.log('\n1. Categorías globales');
      const globales = await tx.select().from(categorias).where(sql`${categorias.hogarId} is null`);
      if (globales.length >= 11) ok(`${globales.length} categorías globales cargadas`);
      else mal(`solo ${globales.length} categorías globales; ¿corriste el seed?`);

      const porClave = new Map(globales.map((c) => [c.clave, c.id]));
      const idComida = porClave.get('comida')!;
      const idTransporte = porClave.get('transporte')!;
      const idSuper = porClave.get('supermercado')!;
      const idOtros = porClave.get('otros')!;

      console.log('\n2. Alta de un hogar con dos miembros');
      await tx.insert(usuarios).values([
        { id: ID_ANA, nombre: 'Ana', email: 'ana@ejemplo.test' },
        { id: ID_BETO, nombre: 'Beto', email: 'beto@ejemplo.test' },
      ]);
      const codigo = generarCodigoInvitacion();
      const [hogar] = await tx
        .insert(hogares)
        .values({ nombre: 'Casa de prueba', codigoInvitacion: codigo })
        .returning();
      await tx.insert(usuarioHogar).values([
        { usuarioId: ID_ANA, hogarId: hogar!.id },
        { usuarioId: ID_BETO, hogarId: hogar!.id },
      ]);
      ok(`hogar creado con código ${codigo}`);

      console.log('\n3. Carga de gastos');
      await tx.insert(gastos).values([
        {
          usuarioId: ID_ANA,
          hogarId: hogar!.id,
          montoCentavos: pesosACentavos(30000),
          textoOriginal: '30000 pesos hamburguesa en Guido',
          categoriaId: idComida,
          fecha: '2026-09-03',
          medioDePago: 'efectivo',
        },
        {
          usuarioId: ID_ANA,
          hogarId: hogar!.id,
          montoCentavos: pesosACentavos(1250.5),
          textoOriginal: 'subte',
          categoriaId: idTransporte,
          fecha: '2026-09-04',
        },
        {
          usuarioId: ID_BETO,
          hogarId: hogar!.id,
          montoCentavos: pesosACentavos(84300.75),
          textoOriginal: 'super del mes',
          categoriaId: idSuper,
          fecha: '2026-09-05',
          medioDePago: 'debito',
        },
        {
          usuarioId: ID_BETO,
          hogarId: hogar!.id,
          montoCentavos: pesosACentavos(500000),
          textoOriginal: 'expensas agosto',
          categoriaId: idOtros,
          fecha: '2026-08-30', // mes anterior: no debe entrar en el total de septiembre
        },
      ]);
      ok('4 gastos cargados (uno del mes anterior, a propósito)');

      console.log('\n4. Consulta del dashboard: total del hogar en septiembre');
      const desde = '2026-09-01';
      const hasta = '2026-09-30';
      const filtroMes = and(
        eq(gastos.hogarId, hogar!.id),
        gte(gastos.fecha, desde),
        lte(gastos.fecha, hasta),
      );

      const [total] = await tx
        .select({ totalCentavos: sql<number>`coalesce(sum(${gastos.montoCentavos}), 0)::bigint` })
        .from(gastos)
        .where(filtroMes);
      const totalEsperado = pesosACentavos(30000 + 1250.5 + 84300.75);
      if (Number(total!.totalCentavos) === totalEsperado) {
        ok(`total del hogar: ${formatearPesos(Number(total!.totalCentavos))} (excluye agosto)`);
      } else {
        mal(`total ${total!.totalCentavos}, se esperaba ${totalEsperado}`);
      }

      console.log('\n5. Desglose por persona');
      const porPersona = await tx
        .select({
          nombre: usuarios.nombre,
          totalCentavos: sql<number>`sum(${gastos.montoCentavos})::bigint`,
        })
        .from(gastos)
        .innerJoin(usuarios, eq(usuarios.id, gastos.usuarioId))
        .where(filtroMes)
        .groupBy(usuarios.nombre)
        .orderBy(sql`sum(${gastos.montoCentavos}) desc`);
      for (const fila of porPersona) {
        console.log(`       ${fila.nombre}: ${formatearPesos(Number(fila.totalCentavos))}`);
      }
      if (porPersona.length === 2) ok('desglose por persona correcto');
      else mal(`se esperaban 2 personas, vinieron ${porPersona.length}`);

      console.log('\n6. Desglose por categoría');
      const porCategoria = await tx
        .select({
          categoria: categorias.nombre,
          totalCentavos: sql<number>`sum(${gastos.montoCentavos})::bigint`,
        })
        .from(gastos)
        .innerJoin(categorias, eq(categorias.id, gastos.categoriaId))
        .where(filtroMes)
        .groupBy(categorias.nombre)
        .orderBy(sql`sum(${gastos.montoCentavos}) desc`);
      for (const fila of porCategoria) {
        console.log(`       ${fila.categoria}: ${formatearPesos(Number(fila.totalCentavos))}`);
      }
      if (porCategoria.length === 3) ok('desglose por categoría correcto');
      else mal(`se esperaban 3 categorías, vinieron ${porCategoria.length}`);

      console.log('\n7. Aprendizaje compartido del hogar');
      await tx.insert(reglasTageo).values({
        hogarId: hogar!.id,
        patron: 'medialunas',
        patronNormalizado: 'medialunas',
        categoriaId: idComida,
      });
      const reglas = await tx.select().from(reglasTageo).where(eq(reglasTageo.hogarId, hogar!.id));
      if (reglas.length === 1) ok('la regla quedó asociada al hogar, no a la persona');
      else mal('la regla no se guardó');

      console.log('\n8. Objetivo de gasto del hogar');
      await tx.insert(objetivos).values({
        hogarId: hogar!.id,
        categoriaId: null,
        montoLimiteCentavos: pesosACentavos(100000),
        periodo: 'mensual',
      });
      const gastado = Number(total!.totalCentavos);
      const limite = pesosACentavos(100000);
      ok(
        `gastado ${formatearPesos(gastado)} sobre un límite de ${formatearPesos(limite)} — ` +
          (gastado > limite ? 'objetivo superado, correspondería avisar' : 'dentro del objetivo'),
      );

      console.log('\n9. Restricciones de la base');
      const t = tx as never as Parameters<typeof debeRechazar>[0];

      await debeRechazar(t, 'monto en cero', (tx2) =>
        (tx2 as typeof tx).insert(gastos).values({
          usuarioId: ID_ANA,
          hogarId: hogar!.id,
          montoCentavos: 0,
          textoOriginal: 'gratis',
          categoriaId: idOtros,
        }),
      );

      await debeRechazar(t, 'monto negativo', (tx2) =>
        (tx2 as typeof tx).insert(gastos).values({
          usuarioId: ID_ANA,
          hogarId: hogar!.id,
          montoCentavos: -100,
          textoOriginal: 'devolución',
          categoriaId: idOtros,
        }),
      );

      await debeRechazar(t, 'texto vacío', (tx2) =>
        (tx2 as typeof tx).insert(gastos).values({
          usuarioId: ID_ANA,
          hogarId: hogar!.id,
          montoCentavos: 100,
          textoOriginal: '   ',
          categoriaId: idOtros,
        }),
      );

      await debeRechazar(t, 'categoría global duplicada', (tx2) =>
        (tx2 as typeof tx).insert(categorias).values({ nombre: 'Comida', hogarId: null }),
      );

      await debeRechazar(t, 'código de invitación con formato inválido', (tx2) =>
        (tx2 as typeof tx)
          .insert(hogares)
          .values({ nombre: 'Trucho', codigoInvitacion: 'abc' }),
      );

      await debeRechazar(t, 'regla de tageo sin dueño', (tx2) =>
        (tx2 as typeof tx).insert(reglasTageo).values({
          hogarId: null,
          usuarioId: null,
          patron: 'x',
          patronNormalizado: 'x',
          categoriaId: idOtros,
        }),
      );

      await debeRechazar(t, 'regla de tageo con dos dueños', (tx2) =>
        (tx2 as typeof tx).insert(reglasTageo).values({
          hogarId: hogar!.id,
          usuarioId: ID_ANA,
          patron: 'y',
          patronNormalizado: 'y',
          categoriaId: idOtros,
        }),
      );

      await debeRechazar(t, 'mismo usuario dos veces en el mismo hogar', (tx2) =>
        (tx2 as typeof tx)
          .insert(usuarioHogar)
          .values({ usuarioId: ID_ANA, hogarId: hogar!.id }),
      );

      await debeRechazar(t, 'dos objetivos totales mensuales para el mismo hogar', (tx2) =>
        (tx2 as typeof tx).insert(objetivos).values({
          hogarId: hogar!.id,
          categoriaId: null,
          montoLimiteCentavos: pesosACentavos(50000),
          periodo: 'mensual',
        }),
      );

      console.log('\n10. Uso de índices en la consulta del dashboard');
      const plan = await tx.execute(
        sql`explain (format text) select sum(monto_centavos) from gastos
            where hogar_id = ${hogar!.id} and fecha between ${desde} and ${hasta}`,
      );
      const planTexto = JSON.stringify(plan);
      if (planTexto.includes('gastos_por_hogar_y_fecha')) {
        ok('PostgreSQL usa el índice gastos_por_hogar_y_fecha');
      } else {
        console.log(
          '  nota  con 4 filas PostgreSQL prefiere leer la tabla entera; el índice recién\n' +
            '        se nota con volumen. No es un error.',
        );
      }

      console.log('\n11. Varios grupos, gastos privados y el alcance "solo yo"');

      // Ana se suma a un segundo grupo, que antes la app no permitía.
      const [grupoAmigos] = await tx
        .insert(hogares)
        .values({
          nombre: 'Amigos',
          tipo: 'grupo',
          codigoInvitacion: generarCodigoInvitacion(),
        })
        .returning();
      await tx.insert(usuarioHogar).values({ usuarioId: ID_ANA, hogarId: grupoAmigos!.id });

      const gruposDeAna = await tx
        .select({ hogarId: usuarioHogar.hogarId })
        .from(usuarioHogar)
        .where(eq(usuarioHogar.usuarioId, ID_ANA));
      if (gruposDeAna.length === 2) ok('una persona puede pertenecer a dos grupos a la vez');
      else mal(`Ana quedó en ${gruposDeAna.length} grupos, se esperaban 2`);

      if (grupoAmigos!.tipo === 'grupo' && hogar!.tipo === 'casa') {
        ok('el tipo distingue una casa de un grupo (el hogar viejo quedó en "casa")');
      } else {
        mal(`tipos inesperados: hogar=${hogar!.tipo}, amigos=${grupoAmigos!.tipo}`);
      }

      await tx.insert(gastos).values([
        {
          usuarioId: ID_ANA,
          hogarId: grupoAmigos!.id,
          montoCentavos: pesosACentavos(12000),
          textoOriginal: 'birra con los pibes',
          categoriaId: idOtros,
          fecha: '2026-09-10',
        },
        {
          // hogarId en NULL = privado: no suma a ningún grupo.
          usuarioId: ID_ANA,
          hogarId: null,
          montoCentavos: pesosACentavos(7000),
          textoOriginal: 'regalo sorpresa',
          categoriaId: idOtros,
          fecha: '2026-09-11',
        },
      ]);

      // El total de la casa NO debe moverse: ni el gasto del grupo de amigos
      // ni el privado suman ahí. Es la garantía de que los grupos no se pisan.
      const [totalCasaDespues] = await tx
        .select({ total: sql<number>`coalesce(sum(${gastos.montoCentavos}), 0)::bigint` })
        .from(gastos)
        .where(filtroMes);
      if (Number(totalCasaDespues!.total) === totalEsperado) {
        ok('el total de la casa no cambia al cargar en otro grupo ni en privado');
      } else {
        mal(
          `el total de la casa se contaminó: ${formatearPesos(Number(totalCasaDespues!.total))} ` +
            `en vez de ${formatearPesos(totalEsperado)}`,
        );
      }

      // El alcance "solo yo" filtra por AUTOR y no por grupo: tiene que ver los
      // tres gastos de septiembre de Ana (casa, amigos y privado) juntos.
      // Es exactamente lo que fallaba en la app: al entrar a un hogar, "solo
      // yo" mostraba únicamente lo cargado dentro de ese hogar.
      const mios = await tx
        .select({ id: gastos.id })
        .from(gastos)
        .where(
          and(eq(gastos.usuarioId, ID_ANA), gte(gastos.fecha, desde), lte(gastos.fecha, hasta)),
        );
      if (mios.length === 4) {
        ok('"solo yo" cruza los grupos: 4 gastos de Ana (2 de la casa, 1 de amigos, 1 privado)');
      } else {
        mal(`"solo yo" devolvió ${mios.length} gastos, se esperaban 4`);
      }

      // Un gasto privado no puede aparecer en ninguna consulta por grupo.
      const privadosEnGrupos = await tx
        .select({ id: gastos.id })
        .from(gastos)
        .where(and(eq(gastos.usuarioId, ID_ANA), sql`${gastos.hogarId} is null`));
      if (privadosEnGrupos.length === 1) ok('el gasto privado quedó sin grupo, como corresponde');
      else mal(`se esperaba 1 gasto privado y hay ${privadosEnGrupos.length}`);

      // Revierte todo: la base queda como estaba.
      tx.rollback();
    });
  } catch (error) {
    // tx.rollback() lanza a proposito para revertir. Cualquier otro error si importa.
    if (!(error instanceof Error) || !error.message.includes('Rollback')) {
      throw error;
    }
  }

  console.log(
    fallos === 0
      ? '\nTodo bien. La transacción se revirtió: la base quedó intacta.\n'
      : `\n${fallos} verificaciones fallaron.\n`,
  );
  process.exit(fallos === 0 ? 0 : 1);
}

verificar().catch((error: unknown) => {
  console.error('\nFalló la verificación:', error);
  process.exit(1);
});

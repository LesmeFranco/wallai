import Fuse from 'fuse.js';
import { eq, inArray, isNull, or } from 'drizzle-orm';
import { CLAVE_CATEGORIA_DESCARTE, categorias, reglasTageo } from '@wallai/db';
import { buscarEnDiccionario, normalizarTexto } from '@wallai/validators';
import type { Contexto } from './context';

/**
 * El motor de tageo, desde la raíz.
 *
 * No hay ningún modelo entrenado ni IA generativa. El motor decide en tres
 * pasos, del conocimiento más específico al más general:
 *
 *  1. Las reglas APRENDIDAS. Cuando alguien corrige la categoría de un gasto,
 *     se guarda una fila en `reglas_tageo` que dice "este texto es de esta
 *     categoría" (eso pasa en `gastos.corregirCategoria`, no acá). Si el texto
 *     nuevo se parece a alguna de esas reglas, gana esa: es lo que esta
 *     familia enseñó sobre su propia forma de escribir, y vale más que
 *     cualquier default.
 *
 *  2. El DICCIONARIO base (`packages/validators/src/diccionarioTageo.ts`): una
 *     tabla de palabras conocidas del gasto argentino. Existe porque el paso 1
 *     no sirve el primer día: un grupo recién creado no tiene ninguna regla, y
 *     antes de esto TODO caía en "Otros" hasta que la persona corrigiera a
 *     mano cada categoría. Eso es el "arranque en frío" que el documento marca
 *     como riesgo en su punto 10, y era la causa de que el motor pareciera no
 *     andar.
 *
 *  3. "Otros", si ninguno de los dos reconoció nada. Mejor ninguna sugerencia
 *     que una equivocada (decisión del documento).
 *
 * El orden importa y es el que hace que el aprendizaje siga mandando: si la
 * familia enseñó que "coto" es otra cosa, el paso 1 contesta antes de que el
 * diccionario llegue a opinar.
 */

/**
 * Umbral de Fuse.js: 0 exige coincidencia perfecta, 1 acepta cualquier cosa.
 * 0.4 es permisivo con errores de tipeo y variaciones cortas ("medialuna" vs
 * "medialunas") pero sigue rechazando textos que no tienen que ver
 * ("subte" no debería activar una regla guardada para "supermercado").
 */
const UMBRAL_DE_CONFIANZA = 0.4;

/**
 * A quién pertenece una regla: a un grupo (y entonces la comparten todos sus
 * miembros) o a una persona. Es el mismo criterio de dueño único que exige el
 * CHECK `reglas_tageo_un_solo_duenio` en la base.
 */
export type PropietarioDeReglas = { hogarId: string } | { usuarioId: string };

/**
 * De quién son las reglas que hay que mirar para clasificar un gasto: las del
 * grupo al que va (si va a alguno) MÁS las propias de quien lo carga.
 *
 * Que sean las dos cosas y no una sola es deliberado, y arregla un olvido que
 * se notaba al usar la app: alguien carga gastos solo, corrige categorías y el
 * motor aprende esas reglas a su nombre; después se suma a un hogar y, si el
 * motor mirara únicamente las reglas del hogar, todo lo que había enseñado
 * dejaría de aplicarse de golpe. Sumar las propias hace que el aprendizaje
 * viaje con la persona además de quedarse en el grupo.
 *
 * No se miran las reglas de los OTROS grupos de la persona: el aprendizaje de
 * un grupo es de ese grupo (es la decisión del documento sobre aprendizaje
 * compartido), y mezclarlo todo haría que lo que enseñó la casa cambie de
 * forma inesperada lo que se carga en el grupo de amigos.
 */
export function propietariosDeReglas(
  hogarId: string | null,
  usuarioId: string,
): PropietarioDeReglas[] {
  return hogarId ? [{ hogarId }, { usuarioId }] : [{ usuarioId }];
}

/**
 * El dueño ÚNICO al que se le anota una regla nueva: el grupo del gasto si lo
 * tiene, o quien lo cargó si es privado.
 *
 * Es distinto de `propietariosDeReglas` (plural) a propósito, y la diferencia
 * importa: al LEER conviene mirar varias fuentes para acertar más, pero al
 * ESCRIBIR hay que elegir una sola, porque el CHECK
 * `reglas_tageo_un_solo_duenio` exige exactamente un dueño por fila. Si una
 * corrección se guardara en los dos lados, la misma enseñanza quedaría
 * duplicada y `vecesConfirmada` dejaría de medir lo que dice medir.
 */
export function propietarioDeReglas(
  hogarId: string | null,
  usuarioId: string,
): PropietarioDeReglas {
  return hogarId ? { hogarId } : { usuarioId };
}

/** Dónde salió la categoría, para poder medir si el motor sirve. */
export type OrigenSugerencia = 'regla' | 'diccionario' | 'descarte';

export type SugerenciaDeCategoria = {
  categoriaId: string;
  origen: OrigenSugerencia;
};

/**
 * Categoría a la que cae un gasto cuando no hay ninguna regla aplicable.
 * Nunca debería faltar: la siembra el script de seed (`db:seed`).
 */
export async function obtenerCategoriaDescarte(db: Contexto['db']): Promise<string> {
  const [fila] = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(eq(categorias.clave, CLAVE_CATEGORIA_DESCARTE));

  if (!fila) {
    throw new Error('Falta la categoría "Otros" en la base. ¿Se corrió pnpm --filter @wallai/db db:seed?');
  }
  return fila.id;
}

/** El id de una categoría global a partir de su clave, o null si no está. */
async function idDeCategoriaGlobal(db: Contexto['db'], clave: string): Promise<string | null> {
  const [fila] = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(eq(categorias.clave, clave));
  return fila?.id ?? null;
}

export async function sugerirCategoria(
  db: Contexto['db'],
  propietarios: PropietarioDeReglas[],
  textoDescriptivo: string,
): Promise<SugerenciaDeCategoria> {
  const hogaresIds = propietarios.flatMap((p) => ('hogarId' in p ? [p.hogarId] : []));
  const usuariosIds = propietarios.flatMap((p) => ('usuarioId' in p ? [p.usuarioId] : []));

  const condiciones = [
    ...(hogaresIds.length ? [inArray(reglasTageo.hogarId, hogaresIds)] : []),
    ...(usuariosIds.length ? [inArray(reglasTageo.usuarioId, usuariosIds)] : []),
  ];

  const reglas = condiciones.length
    ? await db
        .select({
          patronNormalizado: reglasTageo.patronNormalizado,
          categoriaId: reglasTageo.categoriaId,
          vecesConfirmada: reglasTageo.vecesConfirmada,
        })
        .from(reglasTageo)
        .where(condiciones.length === 1 ? condiciones[0]! : or(...condiciones)!)
    : [];

  const textoNormalizado = normalizarTexto(textoDescriptivo);

  if (reglas.length > 0 && textoNormalizado) {
    const fuse = new Fuse(reglas, {
      keys: ['patronNormalizado'],
      includeScore: true,
      threshold: UMBRAL_DE_CONFIANZA,
      /**
       * Sin esto, Fuse penaliza las coincidencias según lo lejos que estén del
       * principio del texto (su `location`/`distance` por defecto). Era una
       * causa concreta de que el motor fallara: una regla guardada como
       * "hamburguesa en guido" no llegaba a activarse contra "gaste en
       * hamburgueseria", porque la parte que coincide queda al final de la
       * frase. Para clasificar gastos la posición de la palabra no significa
       * nada, así que ignorarla es lo correcto.
       */
      ignoreLocation: true,
      /**
       * Evita que una coincidencia de una o dos letras cuente como parecido:
       * sin esto, textos muy cortos activan reglas por casualidad.
       */
      minMatchCharLength: 3,
    });
    const resultados = fuse.search(textoNormalizado);

    if (resultados.length > 0) {
      // Desempate cuando dos reglas quedan igual de parecidas: gana la que la
      // familia confirmó más veces (ver el comentario de `vecesConfirmada`
      // en el schema), no la que aparece primera por casualidad.
      resultados.sort((a, b) => {
        const diferencia = (a.score ?? 1) - (b.score ?? 1);
        return Math.abs(diferencia) > 0.001 ? diferencia : b.item.vecesConfirmada - a.item.vecesConfirmada;
      });
      return { categoriaId: resultados[0]!.item.categoriaId, origen: 'regla' };
    }
  }

  const delDiccionario = buscarEnDiccionario(textoDescriptivo);
  if (delDiccionario) {
    const categoriaId = await idDeCategoriaGlobal(db, delDiccionario.clave);
    // Si la categoría del diccionario no existe en la base (seed viejo, clave
    // renombrada), se sigue de largo al descarte en vez de romper la carga del
    // gasto: que el motor no acierte es molesto, que no se pueda guardar un
    // gasto es mucho peor.
    if (categoriaId) return { categoriaId, origen: 'diccionario' };
  }

  return { categoriaId: await obtenerCategoriaDescarte(db), origen: 'descarte' };
}

/**
 * Las categorías que el usuario puede elegir: las globales más las propias de
 * los grupos a los que pertenece.
 *
 * Vive acá y no en el router porque `categorias.listar` y cualquier validación
 * futura de "¿esta categoría es elegible por esta persona?" tienen que usar el
 * mismo criterio.
 */
export function filtroDeCategoriasVisibles(hogaresIds: string[]) {
  return hogaresIds.length
    ? or(isNull(categorias.hogarId), inArray(categorias.hogarId, hogaresIds))!
    : isNull(categorias.hogarId);
}

import { z } from 'zod';

/**
 * El alcance: que conjunto de gastos se esta mirando.
 *
 * Antes esto no hacia falta. Una persona pertenecia a un solo hogar, asi que
 * solo habia dos situaciones posibles y el servidor las deducia sola: si tenia
 * hogar veia los del hogar, y si no tenia veia los suyos. Ahora que puede
 * estar en varios grupos y ademas tener gastos privados, "que estoy mirando"
 * pasa a ser una pregunta con varias respuestas validas y la tiene que
 * contestar quien mira, no el servidor.
 *
 * Las dos respuestas que ofrece la app:
 *
 *  - `mio`    Todo lo que gasto la persona, en cualquier contexto y en
 *             cualquier momento: lo privado, lo que cargo en la casa, lo que
 *             cargo en el grupo de amigos, y tambien lo que cargo en grupos de
 *             los que despues se fue. Responde "cuanto gasto yo en total", que
 *             es una pregunta sobre la persona y no sobre un grupo, asi que no
 *             se recorta por grupo. Es el alcance por defecto.
 *
 *  - `hogar`  Los de un grupo puntual, de todos sus miembros (decision D2).
 *
 * Por que el default es `mio` y no una vista que mezcle todo: decision de
 * producto (septiembre de 2026). La billetera de uno y la de la casa
 * son dos preguntas distintas, y una pantalla que las suma no contesta bien
 * ninguna de las dos. Lo que cargan los demas se ve donde se comparte -adentro
 * del grupo- y no derramado en la vista personal de cada uno. Para saber
 * cuanto gasto la casa se entra a la casa; para saber cuanto gasto uno, a
 * "Mis gastos".
 *
 * `todo` (lo mio mas lo de todos mis grupos, mezclado) era ese default hasta
 * esa decision. Sigue aceptandose por compatibilidad: la version 1.0.0 de la
 * app, ya instalada en telefonos, lo manda en cada consulta del dashboard y
 * del historial, y el backend se despliega solo con cada push. Si se sacara
 * del esquema hoy, esos telefonos empezarian a recibir un error de validacion
 * en la pantalla principal en cuanto se suba el cambio, y seguirian rotos
 * hasta instalar la version nueva. Se puede borrar cuando no queden 1.0.0 en
 * uso; ningun codigo nuestro lo pide.
 *
 * Hubo tambien un alcance `personal`, que traia solo los gastos privados. Se
 * saco por decision de producto: `mio` ya los incluye junto con todo lo demas
 * que cargo la persona, asi que era un subconjunto que no respondia ninguna
 * pregunta nueva y agregaba una pastilla mas que leer. Que un gasto sea
 * privado se sigue viendo en el candado de cada fila, que es donde el dato
 * importa; lo que no existe es mirar SOLO los privados.
 *
 * Ojo con no confundir esto con `destinoGastoSchema`, mas abajo: ahi
 * `personal` sigue existiendo y es imprescindible. Son dos preguntas
 * distintas: el alcance es "que estoy mirando", el destino es "a donde va este
 * gasto que estoy cargando".
 */
export const alcanceSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('mio') }),
  z.object({ tipo: z.literal('hogar'), hogarId: z.uuid() }),
  /** Solo por compatibilidad con la app 1.0.0. Ver el comentario de arriba. */
  z.object({ tipo: z.literal('todo') }),
]);

export type Alcance = z.infer<typeof alcanceSchema>;

/** El alcance que se usa cuando el cliente no pide ninguno. */
export const ALCANCE_POR_DEFECTO: Alcance = { tipo: 'mio' };

/**
 * A donde va un gasto que se esta cargando.
 *
 * Es deliberadamente una union con etiqueta y no un `hogarId` que pueda venir
 * nulo. Las dos formas guardan lo mismo en la base, pero un `hogarId: null`
 * obliga a quien lee el codigo a acordarse de que null significa "privado",
 * y confunde el caso "no mande el campo" con el caso "lo quiero privado", que
 * son dos intenciones distintas: la primera pide el default, la segunda pide
 * explicitamente que no lo vea nadie.
 */
export const destinoGastoSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('personal') }),
  z.object({ tipo: z.literal('hogar'), hogarId: z.uuid() }),
]);

export type DestinoGasto = z.infer<typeof destinoGastoSchema>;

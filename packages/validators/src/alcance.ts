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
 * Las tres respuestas posibles:
 *
 *  - `todo`   Todo lo que la persona puede ver: sus propios gastos (los
 *             privados incluidos) mas los de todos los grupos a los que
 *             pertenece. Es el default y la vista general de la app.
 *
 *  - `mio`    Todo lo que gasto ELLA, en cualquier contexto y en cualquier
 *             momento: lo privado, lo que cargo en la casa, lo que cargo en el
 *             grupo de amigos, y tambien lo que cargo en grupos de los que
 *             despues se fue. Responde "cuanto gasto yo en total", que es una
 *             pregunta sobre la persona y no sobre un grupo, asi que no se
 *             recorta por grupo.
 *
 *  - `hogar`  Los de un grupo puntual, de todos sus miembros (decision D2).
 *
 * Hubo un cuarto alcance, `personal`, que traia solo los gastos privados. Se
 * saco por decision de Franco: `mio` ya incluye los privados junto con todo lo
 * demas que cargo la persona, asi que `personal` era un subconjunto que no
 * respondia ninguna pregunta nueva y agregaba una pastilla mas que leer. Que un
 * gasto sea privado se sigue viendo en el candado de cada fila, que es donde
 * el dato importa; lo que no existe es mirar SOLO los privados.
 *
 * Ojo con no confundir esto con `destinoGastoSchema`, mas abajo: ahi
 * `personal` sigue existiendo y es imprescindible. Son dos preguntas
 * distintas: el alcance es "que estoy mirando", el destino es "a donde va este
 * gasto que estoy cargando".
 */
export const alcanceSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('todo') }),
  z.object({ tipo: z.literal('mio') }),
  z.object({ tipo: z.literal('hogar'), hogarId: z.uuid() }),
]);

export type Alcance = z.infer<typeof alcanceSchema>;

/** El alcance que se usa cuando el cliente no pide ninguno. */
export const ALCANCE_POR_DEFECTO: Alcance = { tipo: 'todo' };

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

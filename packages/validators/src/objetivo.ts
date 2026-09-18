import { z } from 'zod';
import { destinoGastoSchema } from './alcance';
import { MONTO_MAXIMO_CENTAVOS } from './dinero';
import { diasEntre } from './fechas';

/**
 * El objetivo de gasto: cuanto se propuso gastar como maximo, en el mes, quien
 * mira la pantalla.
 *
 * DECISIONES DE ALCANCE, para que quede claro que es a proposito y no una
 * version a medias:
 *
 *  - UNO POR VISTA. Hay un objetivo para "Mis gastos" y uno por cada grupo, o
 *    sea uno por cada pastilla del selector de alcance. El modelo mental es de
 *    una linea: en esta vista, mi limite es X. Sumar el objetivo personal con
 *    el de la casa seria volver a mezclar dos billeteras distintas, que es
 *    justo lo que se decidio no hacer en la 1.1.0.
 *
 *  - SIN OBJETIVOS POR CATEGORIA, todavia. La tabla los soporta
 *    (`objetivos.categoria_id` es nullable y tiene sus indices unicos
 *    parciales), asi que agregarlos despues es una pantalla y no una
 *    migracion. Hoy nadie tiene historial suficiente para fijar once limites
 *    razonables, y el riesgo real del producto es que la familia deje de
 *    cargar gastos: una funcion mas nunca gana contra un flujo mas rapido.
 *
 *  - SOLO MENSUAL. El enum `periodo_objetivo` de la base tambien acepta
 *    'semanal', pero toda la app esta anclada al mes (el resumen, el selector
 *    "Este mes / Mes anterior", `rangoMesActual`). Ofrecer semanal obligaria a
 *    duplicar la logica de rangos del dashboard para algo que nadie pidio.
 *
 *  - ES OPCIONAL Y NO MOLESTA. Sin objetivo, la app se comporta exactamente
 *    como antes: no hay tarjeta vacia, ni recordatorio, ni nada que cerrar.
 */

/**
 * El unico periodo que la app ofrece hoy. Tiene que ser uno de los valores del
 * enum `periodo_objetivo` de la base (packages/db/src/schema/enums.ts).
 */
export const PERIODO_OBJETIVO: 'mensual' = 'mensual';

/**
 * A partir de que porcentaje del limite el objetivo pasa a estar "cerca".
 *
 * 80% y no 90%: sobre un mes, cruzar el 80% suele pasar alrededor del dia 24,
 * cuando todavia quedan varios dias por delante y avisar sirve para algo. Al
 * 90% ya casi no queda margen para cambiar nada.
 */
export const UMBRAL_CERCA = 80;

/**
 * Entrada para fijar (o cambiar) el objetivo de una vista.
 *
 * `destino` es la misma union etiquetada que usa un gasto al cargarse
 * (`{tipo:'personal'}` o `{tipo:'hogar', hogarId}`), y a proposito: el objetivo
 * de "Mis gastos" es el personal y el de un grupo es el de ese grupo, asi que
 * quien decide a quien pertenece un objetivo decide igual que quien decide a
 * donde va un gasto. Igual que ahi, el cliente propone y el servidor verifica
 * que sea miembro antes de escribir nada.
 */
export const fijarObjetivoSchema = z.object({
  destino: destinoGastoSchema,
  montoLimiteCentavos: z
    .number()
    .int('El limite se guarda en centavos enteros')
    .positive('El objetivo tiene que ser mayor a cero')
    .max(MONTO_MAXIMO_CENTAVOS, 'Ese objetivo es demasiado grande.'),
});

export type FijarObjetivoInput = z.infer<typeof fijarObjetivoSchema>;

/** Entrada para sacar el objetivo de una vista. */
export const quitarObjetivoSchema = z.object({
  destino: destinoGastoSchema,
});

export type QuitarObjetivoInput = z.infer<typeof quitarObjetivoSchema>;

/** Como viene el mes respecto del limite. Define el color de la barra. */
export type EstadoObjetivo = 'bien' | 'cerca' | 'excedido';

export type ProgresoObjetivo = {
  /** Cuanto del limite se lleva gastado, redondeado. Puede pasar de 100. */
  porcentaje: number;
  /** Cuanto falta para llegar al limite. Cero si ya se paso. */
  restanteCentavos: number;
  /** Cuanto se paso del limite. Cero si todavia no se paso. */
  excedidoCentavos: number;
  estado: EstadoObjetivo;
  /**
   * En cuanto cerraria el mes si se sigue gastando al mismo ritmo, o null
   * cuando el dato no aporta nada (ver `calcularProgresoObjetivo`).
   */
  proyeccionCentavos: number | null;
};

/**
 * Traduce "gaste tanto de tanto" a lo que la pantalla necesita mostrar.
 *
 * Es logica pura y vive aca, y no en la pantalla, por la razon de siempre en
 * este paquete: el mismo calculo lo va a necesitar despues quien decida el
 * texto de la notificacion de la noche. Dos implementaciones del mismo
 * porcentaje terminarian discrepando, y una notificacion que diga algo
 * distinto de lo que muestra el dashboard hace desconfiar de los dos.
 *
 * El estado se decide comparando centavos y no el porcentaje ya redondeado:
 * con el redondeo, gastar 99,6% del limite mostraria "100%" y haria pensar que
 * se paso cuando todavia no.
 */
export function calcularProgresoObjetivo({
  gastadoCentavos,
  limiteCentavos,
  desde,
  hasta,
  hoy,
}: {
  gastadoCentavos: number;
  limiteCentavos: number;
  /** Primer dia del periodo, ISO. */
  desde: string;
  /** Ultimo dia del periodo, ISO. */
  hasta: string;
  /** Hoy en el calendario argentino (`hoyArgentina`). */
  hoy: string;
}): ProgresoObjetivo {
  if (limiteCentavos <= 0) {
    throw new Error(`Limite de objetivo invalido: ${limiteCentavos}`);
  }

  const porcentaje = Math.round((gastadoCentavos / limiteCentavos) * 100);
  const excedidoCentavos = Math.max(gastadoCentavos - limiteCentavos, 0);
  const restanteCentavos = Math.max(limiteCentavos - gastadoCentavos, 0);

  // Comparacion entre enteros: equivale a (gastado / limite) * 100 >= UMBRAL,
  // pero sin division, asi que no arrastra error de punto flotante.
  const llegoAlUmbral = gastadoCentavos * 100 >= limiteCentavos * UMBRAL_CERCA;
  const estado: EstadoObjetivo =
    excedidoCentavos > 0 ? 'excedido' : llegoAlUmbral ? 'cerca' : 'bien';

  return {
    porcentaje,
    restanteCentavos,
    excedidoCentavos,
    estado,
    proyeccionCentavos: proyectarCierre({ gastadoCentavos, desde, hasta, hoy }),
  };
}

/**
 * Cuanto daria el total del periodo si se siguiera gastando al mismo ritmo.
 *
 * Es el dato que realmente cambia una decision a mitad de mes: "vas por el
 * 60%" no dice si eso es mucho o poco el dia 12, y "a este ritmo cerras en
 * $480.000" si.
 *
 * Devuelve null en los tres casos donde la cuenta no significa nada:
 *
 *  - El periodo no es el que esta corriendo (se esta mirando un mes cerrado):
 *    ahi no hay nada que proyectar, el total ya es definitivo.
 *  - Es el ultimo dia: la proyeccion seria el gasto que ya se ve arriba.
 *  - No se gasto nada: proyectar cero a treinta dias es ruido.
 */
function proyectarCierre({
  gastadoCentavos,
  desde,
  hasta,
  hoy,
}: {
  gastadoCentavos: number;
  desde: string;
  hasta: string;
  hoy: string;
}): number | null {
  if (hoy < desde || hoy > hasta) return null;
  if (gastadoCentavos <= 0) return null;

  // +1 porque el primer dia ya cuenta como transcurrido: el dia 1 del mes ya
  // paso un dia, no cero, y sin esto la division seria por cero.
  const diasDelPeriodo = diasEntre(desde, hasta) + 1;
  const diasTranscurridos = diasEntre(desde, hoy) + 1;
  if (diasTranscurridos >= diasDelPeriodo) return null;

  return Math.round((gastadoCentavos / diasTranscurridos) * diasDelPeriodo);
}

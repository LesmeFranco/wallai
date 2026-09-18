import type { ProgresoObjetivo } from './objetivo';

/**
 * El aviso de la noche: la unica notificacion que manda la app.
 *
 * LA REGLA DE PRODUCTO, que es lo que hace que no moleste: como maximo suena
 * una vez por dia, y en un dia normal NO suena. Si la persona cargo sus gastos
 * y viene bien con el objetivo, no hay nada que decirle, y una app que avisa
 * cuando no tiene nada que decir es una app que se termina silenciando desde
 * los ajustes del telefono. El silencio esta garantizado por como se arma el
 * mensaje y no por buena voluntad: `armarAvisoDiario` devuelve null.
 *
 * POR QUE A LAS 21. Es la hora en que el gasto en efectivo del dia ya ocurrio
 * (mas temprano falta toda la tarde), la persona esta en casa con el telefono
 * en la mano, y todavia no se durmio. Mas tarde ya se perdio.
 *
 * QUE NO SE AVISA NUNCA: que otro integrante cargo un gasto. En un grupo
 * activo eso es ruido constante y no contesta ninguna pregunta.
 *
 * Vive en este paquete y no en la app por dos razones: para que el texto se
 * pueda testear (la app mobile no corre tests), y porque usa el mismo
 * `ProgresoObjetivo` que dibuja la barra del dashboard. Si el porcentaje se
 * calculara dos veces, la notificacion podria decir 82% y la pantalla 80%, y no
 * habria forma de saber a cual creerle.
 */

/** La hora del telefono a la que se manda el aviso. */
export const HORA_DEL_AVISO = 21;

export type AvisoDiario = {
  titulo: string;
  cuerpo: string;
  /**
   * Que motivo lo genero. El que llama lo guarda para no repetir dos veces en
   * el mismo mes el mismo aviso sobre el objetivo.
   */
  motivo: 'excedido' | 'cerca' | 'sin-cargar';
};

/**
 * Decide que decir esta noche, o null si no hay nada que valga una
 * notificacion.
 *
 * El orden es por urgencia: pasarse del objetivo es lo unico que ya no tiene
 * arreglo este mes; estar cerca todavia se puede corregir; y no haber cargado
 * nada es el caso mas comun y el menos urgente, pero es el que sostiene todo lo
 * demas, porque una app de gastos sin gastos cargados no sirve para nada.
 *
 * Los dos avisos del objetivo se dan UNA vez por mes cada uno (`yaAvisado`):
 * sin eso, cruzar el 80% el dia 24 significaria recibir "vas por el 8x%" las
 * seis noches siguientes, que es exactamente la clase de insistencia que hace
 * que la gente apague las notificaciones.
 */
export function armarAvisoDiario({
  cargoHoy,
  progreso,
  yaAvisado,
  formatearMonto,
}: {
  /** Si la persona cargo al menos un gasto hoy. */
  cargoHoy: boolean;
  /** Como viene el mes contra el objetivo, o null si no fijo ninguno. */
  progreso: ProgresoObjetivo | null;
  /** Cuales avisos del objetivo ya se dieron este mes. */
  yaAvisado: { cerca: boolean; excedido: boolean };
  /**
   * Como escribir un monto. Se pasa de afuera para que este paquete no tenga
   * que elegir un formato de pantalla: la app ya tiene el suyo y el texto de la
   * notificacion tiene que verse igual que el del dashboard.
   */
  formatearMonto: (centavos: number) => string;
}): AvisoDiario | null {
  if (progreso?.estado === 'excedido' && !yaAvisado.excedido) {
    return {
      titulo: 'Te pasaste del objetivo',
      cuerpo: `Vas ${formatearMonto(progreso.excedidoCentavos)} arriba del límite de este mes.`,
      motivo: 'excedido',
    };
  }

  if (progreso?.estado === 'cerca' && !yaAvisado.cerca) {
    return {
      titulo: `Vas por el ${progreso.porcentaje}% del objetivo`,
      cuerpo: `Te quedan ${formatearMonto(progreso.restanteCentavos)} para lo que falta del mes.`,
      motivo: 'cerca',
    };
  }

  if (!cargoHoy) {
    return {
      titulo: '¿Gastaste algo hoy?',
      cuerpo: 'Cargalo en una frase, son diez segundos.',
      motivo: 'sin-cargar',
    };
  }

  return null;
}

/**
 * El instante en que tiene que sonar el aviso, en la hora del telefono.
 *
 * Usa la hora local del dispositivo a proposito, y esa es la diferencia con
 * todo el resto de las fechas del proyecto, que estan ancladas al calendario
 * argentino (ver `fechas.ts`). Los dos criterios son correctos y miden cosas
 * distintas: un gasto pertenece al dia argentino porque los totales del mes de
 * la familia tienen que cerrar siempre igual, y una notificacion tiene que
 * sonar a las nueve de la noche de donde este la persona, no a las nueve de
 * Buenos Aires mientras esta de viaje.
 *
 * `diasAdelante` es para las noches siguientes: la app programa varias, porque
 * las que importan son justamente las de los dias en que nadie abre la app (ver
 * `lib/notificaciones.ts` en la app mobile).
 */
export function fechaDelAviso(
  ahora: Date,
  diasAdelante = 0,
  hora: number = HORA_DEL_AVISO,
): Date {
  const fecha = new Date(ahora);
  fecha.setDate(fecha.getDate() + diasAdelante);
  fecha.setHours(hora, 0, 0, 0);
  return fecha;
}

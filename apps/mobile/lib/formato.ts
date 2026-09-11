import { centavosAPesos } from '@wallai/validators';

/**
 * Formatos de pantalla, propios de la app mobile.
 *
 * `formatearPesos` de @wallai/validators muestra los centavos ("$ 30.000,00"),
 * que es lo correcto cuando el monto exacto importa. En las pantallas de esta
 * app casi nunca importa: lo que se lee de un vistazo es la magnitud. Por eso
 * aca hay dos variantes mas cortas, que es lo que pide el diseno.
 */

const FORMATEADOR_SIN_CENTAVOS = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 3000000 -> "$ 30.000". Para montos que son el dato principal de la pantalla. */
export function formatearPesosSinCentavos(centavos: number): string {
  return `$ ${FORMATEADOR_SIN_CENTAVOS.format(centavosAPesos(centavos))}`;
}

/**
 * 3000000 -> "$ 30k", 150000000 -> "$ 1,5M". Para cuando el numero tiene que
 * entrar en una tarjeta chica o al lado de otros (barras, listas).
 */
export function formatearPesosCorto(centavos: number): string {
  const pesos = centavosAPesos(centavos);
  if (pesos >= 1_000_000) {
    const millones = (pesos / 1_000_000).toFixed(1).replace('.', ',');
    return `$ ${millones}M`;
  }
  if (pesos >= 1_000) {
    return `$ ${Math.round(pesos / 1_000)}k`;
  }
  return `$ ${FORMATEADOR_SIN_CENTAVOS.format(pesos)}`;
}

/**
 * Importante: el formateador usa la zona UTC a proposito.
 *
 * Las fechas de los gastos son "AAAA-MM-DD" sin hora (ver el invariante de
 * `gastos.fecha`). `new Date('2026-09-09')` las interpreta como medianoche UTC,
 * y si despues se formatearan en hora argentina (UTC-3) daria el dia anterior:
 * el 9 se mostraria como 8. Formatear en UTC deja el dia tal cual vino.
 */
const FORMATEADOR_DIA = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** "2026-09-09" -> "martes 9 de septiembre". */
export function formatearDiaLargo(fechaISO: string): string {
  return FORMATEADOR_DIA.format(new Date(`${fechaISO}T00:00:00Z`));
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

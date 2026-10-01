import { centavosAPesos, parsearTexto } from '@wallai/validators';

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

/**
 * La descripcion de un gasto, sin el monto ni la palabra de fecha adentro.
 *
 * POR QUE EXISTE: lo que la persona escribe es "5000 pan", y asi se guarda
 * (`gastos.texto_original` no se toca nunca: es la materia prima del motor). Si
 * la lista muestra ese texto tal cual, cada fila dice el monto dos veces, una
 * en el medio de la descripcion y otra en el numero de la derecha. Leer "5000
 * pan ... $5k" es ruido, y encima el ruido crece con la plata.
 *
 * Se calcula con `parsearTexto`, que es exactamente el mismo codigo que uso el
 * servidor para separar el monto cuando lo guardo. Por eso esto NO es volver a
 * adivinar nada: muestra el pedazo de texto que el motor ya habia identificado
 * como la descripcion, el mismo que compara contra las reglas aprendidas.
 *
 * Devuelve null cuando no queda nada ("4500" a secas, sin descripcion). El que
 * llama decide con que llenar ese hueco, porque depende de la pantalla: en una
 * lista conviene el nombre de la categoria, en una confirmacion no hace falta
 * nada.
 */
export function descripcionDeGasto(textoOriginal: string): string | null {
  const { textoRestante } = parsearTexto(textoOriginal);
  return textoRestante ? capitalizar(textoRestante) : null;
}

const FORMATEADOR_MES = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'UTC',
  month: 'long',
});

/** "2026-10-01" -> "octubre". Para titular un periodo sin repetir el ano. */
export function formatearMes(fechaISO: string): string {
  return FORMATEADOR_MES.format(new Date(`${fechaISO}T00:00:00Z`));
}

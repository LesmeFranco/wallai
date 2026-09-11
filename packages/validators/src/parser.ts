import { pesosACentavos } from './dinero';
import { hoyArgentina, sumarDias } from './fechas';

/**
 * Parser de monto y fecha dentro de una frase en lenguaje natural (P2).
 *
 * Es una pieza aparte del motor de tageo a propósito: el motor decide LA
 * CATEGORÍA de un gasto por similitud de texto contra correcciones previas,
 * y para eso necesita comparar solo la parte descriptiva de la frase
 * ("hamburguesa en Guido"), sin el ruido del monto y la fecha en el medio.
 * Este archivo se encarga de separar esas dos cosas del resto.
 *
 * Alcance deliberadamente acotado para esta fase:
 *  - Monto: reconoce un número (con o sin separador de miles/decimales, estilo
 *    argentino) que venga marcado con "$" o con la palabra "pesos"/"peso". Un
 *    número suelto sin ninguno de esos dos marcadores NO se toma como monto,
 *    a propósito: en una frase como "30000 hamburguesa" un monto suelto es
 *    indistinguible de cualquier otro número que aparezca en el texto.
 *  - No interpreta montos en palabras ("treinta mil pesos"): son un
 *    problema de NLP bastante más grande y el documento no lo pide para el
 *    MVP.
 *  - Fecha: solo reconoce "hoy", "ayer", "anteayer" y "antier". Fechas más
 *    especificas ("el lunes pasado", "el 3 de agosto") quedan afuera del
 *    alcance de esta fase.
 *  - Si no encuentra fecha, devuelve null: el que llama decide el default
 *    (en gastos.crear, dejarla en null hace que la base use su propio
 *    default, que ya está en hora argentina).
 */

export type ResultadoParseo = {
  /** null si no se encontró ningún monto marcado con "$" o "pesos"/"peso". */
  montoCentavos: number | null;
  /** Fecha ISO "AAAA-MM-DD", o null si no se mencionó ninguna palabra de fecha. */
  fecha: string | null;
  /** El texto que queda después de sacar el monto y la fecha encontrados. */
  textoRestante: string;
};

/**
 * Interpreta una cadena numérica que puede venir en formato argentino
 * ("30.000,50"), con coma decimal sola ("1250,5") o sin ningún separador
 * ("30000"), y la devuelve como número de punto flotante en pesos.
 */
function interpretarNumero(cadena: string): number {
  const tienePunto = cadena.includes('.');
  const tieneComa = cadena.includes(',');

  if (tienePunto && tieneComa) {
    // "30.000,50": el punto separa miles, la coma es el decimal.
    return Number.parseFloat(cadena.replace(/\./g, '').replace(',', '.'));
  }

  if (tieneComa) {
    // Con una sola coma, es decimal si le siguen 1 o 2 dígitos ("1250,5"),
    // y separador de miles si le siguen 3 o más ("1,000,000" al estilo
    // ingles, poco comun aca pero mejor cubrirlo que romper).
    const partes = cadena.split(',');
    const ultimaParte = partes[partes.length - 1]!;
    return ultimaParte.length <= 2
      ? Number.parseFloat(cadena.replace(',', '.'))
      : Number.parseFloat(cadena.replace(/,/g, ''));
  }

  if (tienePunto) {
    // Con un solo punto, "30.000" (grupo final de 3 dígitos, más de un grupo)
    // es separador de miles; "30.5" (grupo final de 1 o 2) es decimal.
    const partes = cadena.split('.');
    const ultimaParte = partes[partes.length - 1]!;
    if (partes.length > 1 && ultimaParte.length === 3) {
      return Number.parseFloat(cadena.replace(/\./g, ''));
    }
  }

  return Number.parseFloat(cadena);
}

const NUMERO = String.raw`\d+(?:[.,]\d+)*`;
const PATRONES_MONTO = [
  new RegExp(String.raw`\$\s*(${NUMERO})`),
  new RegExp(String.raw`(${NUMERO})\s*pesos?\b`, 'i'),
  new RegExp(String.raw`\bpesos?\s*(${NUMERO})`, 'i'),
];

function buscarMonto(texto: string): { valor: number; coincidencia: string } | null {
  for (const patron of PATRONES_MONTO) {
    const coincidencia = patron.exec(texto);
    if (coincidencia) {
      return { valor: interpretarNumero(coincidencia[1]!), coincidencia: coincidencia[0] };
    }
  }
  return null;
}

/** Cuántos días sumarle a "hoy" en Argentina para cada palabra reconocida. */
const OFFSETS_FECHA: Record<string, number> = {
  hoy: 0,
  ayer: -1,
  anteayer: -2,
  antier: -2,
};

function buscarFecha(texto: string): { offsetDias: number; coincidencia: string } | null {
  for (const [palabra, offsetDias] of Object.entries(OFFSETS_FECHA)) {
    const coincidencia = new RegExp(String.raw`\b${palabra}\b`, 'i').exec(texto);
    if (coincidencia) return { offsetDias, coincidencia: coincidencia[0] };
  }
  return null;
}

function limpiarEspacios(texto: string): string {
  return texto
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .trim();
}

export function parsearTexto(texto: string): ResultadoParseo {
  let restante = texto;
  let montoCentavos: number | null = null;

  const monto = buscarMonto(restante);
  if (monto) {
    montoCentavos = pesosACentavos(monto.valor);
    restante = restante.replace(monto.coincidencia, '');
  }

  let fecha: string | null = null;
  const fechaEncontrada = buscarFecha(restante);
  if (fechaEncontrada) {
    fecha = sumarDias(hoyArgentina(), fechaEncontrada.offsetDias);
    restante = restante.replace(fechaEncontrada.coincidencia, '');
  }

  return { montoCentavos, fecha, textoRestante: limpiarEspacios(restante) };
}

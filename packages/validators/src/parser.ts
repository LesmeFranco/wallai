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
 * Alcance:
 *  - Monto: reconoce un número (con o sin separador de miles/decimales, estilo
 *    argentino) en tres situaciones, en este orden de prioridad:
 *
 *      1. Marcado con "$" o con la palabra "pesos"/"peso", esté donde esté.
 *      2. Sin marcar, **al principio del texto**: "30000 nafta".
 *      3. Sin marcar, **al final del texto**: "nafta 30000".
 *
 *    La segunda se agregó en la 1.2.0 y la tercera en la 1.7.0, y las dos
 *    salieron del mismo lugar: usar la app todos los días. Hasta la 1.2.0 un
 *    número suelto no se tomaba nunca, con el argumento de que en
 *    "30000 hamburguesa" es indistinguible de cualquier otro número de la
 *    frase. El argumento sigue siendo cierto en el medio de la oración, pero no
 *    en las puntas: nadie abre ni cierra la descripción de un gasto con una
 *    cantidad que no sea la plata. Pesa más la prioridad número uno del
 *    producto, que es que cargar un gasto sea más simple que escribir un
 *    WhatsApp.
 *
 *    Un número que no está en ninguna de las dos puntas y no está marcado se
 *    sigue ignorando: en "cafe con 2 medialunas", el 2 no es plata.
 *
 *    CUANDO HAY UN NÚMERO EN CADA PUNTA gana el más grande, y esa es la única
 *    regla de todo el parser que no es estructural sino de dominio. El caso que
 *    la obliga es "2 empanadas 3000": si ganara el del principio, ese gasto
 *    entraría por $2. Y el caso inverso también existe, "30000 nafta 95", donde
 *    el que no es plata es el del final. Lo que los distingue no es la posición
 *    sino el tamaño: una cantidad ("2 empanadas"), un octanaje ("nafta 95") o
 *    el número de una línea ("subte 3") son números chicos, y un precio en
 *    pesos argentinos hoy no lo es. No es una regla infalible, y por eso NO es
 *    la última palabra: la pantalla muestra el monto detectado de cada renglón
 *    antes de guardar, así que cuando se equivoca se ve, no se descubre a fin
 *    de mes. Y el marcador siempre gana: "2 empanadas $3000" no pasa por acá.
 *
 *    El número tiene que estar solo (pegado al borde del texto y separado del
 *    resto por un espacio o un signo de puntuación), asi que "1/2 kilo de
 *    asado" y "2x1 cerveza" no se leen como monto.
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
  /** null si no se encontró ningún monto en el texto. */
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

/**
 * Un número que abre el texto, sin ningún marcador: "30000 nafta Shell".
 *
 * El `(?=\s|$|[,;:])` es lo que impide leer como monto la primera parte de una
 * cantidad que no es plata: en "1/2 kilo de asado" o "2x1 cerveza", al número
 * le sigue una letra o una barra, así que no coincide. Sin esa condición, esos
 * gastos se guardarían por $1 y $2.
 */
const MONTO_AL_PRINCIPIO = new RegExp(String.raw`^\s*(${NUMERO})(?=\s|$|[,;:])`);

/**
 * Un número que cierra el texto, sin ningún marcador: "nafta Shell 30000".
 *
 * Es el espejo exacto del anterior y por el mismo motivo: el `(?:^|\s)` del
 * principio pide que el número venga separado de lo anterior, así que en
 * "cerveza 2x1" o en "talle 42x30" no hay monto. El signo de puntuación final
 * opcional está para que "pan 5000." o "pan 5000!" sigan funcionando: escribir
 * un punto al terminar es lo normal, y no debería cambiar lo que se guarda.
 */
const MONTO_AL_FINAL = new RegExp(String.raw`(?:^|\s)(${NUMERO})\s*[.,;:!]?\s*$`);

/** Dónde empieza y dónde termina el monto encontrado, para poder sacarlo del texto. */
type MontoEncontrado = { valor: number; indice: number; largo: number };

function aMonto(coincidencia: RegExpExecArray): MontoEncontrado {
  return {
    valor: interpretarNumero(coincidencia[1]!),
    indice: coincidencia.index,
    largo: coincidencia[0].length,
  };
}

function buscarMonto(texto: string): MontoEncontrado | null {
  // Los marcadores explícitos van primero: si la persona se tomó el trabajo de
  // escribir "$" o "pesos", eso es el monto, esté donde esté. Así
  // "2 empanadas $3000" carga 3000 y no 2.
  for (const patron of PATRONES_MONTO) {
    const coincidencia = patron.exec(texto);
    if (coincidencia) return aMonto(coincidencia);
  }

  const alPrincipio = MONTO_AL_PRINCIPIO.exec(texto);
  const alFinal = MONTO_AL_FINAL.exec(texto);

  if (!alPrincipio) return alFinal ? aMonto(alFinal) : null;
  if (!alFinal) return aMonto(alPrincipio);

  const primero = aMonto(alPrincipio);
  const ultimo = aMonto(alFinal);

  // Un texto que es un número y nada más ("4500") coincide con los dos patrones
  // a la vez. Es el mismo número, no dos candidatos.
  if (primero.indice === ultimo.indice) return primero;

  // Hay un número en cada punta y hay que elegir. Gana el más grande; el porqué
  // está arriba, en la documentación del archivo ("2 empanadas 3000" contra
  // "30000 nafta 95").
  return ultimo.valor > primero.valor ? ultimo : primero;
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

  /**
   * LA FECHA SE BUSCA PRIMERO, y el orden importa desde que el monto puede ir
   * al final: en "colectivo 8900 ayer" el número ya no cierra el texto, así que
   * sacando la palabra de fecha antes vuelve a quedar en la punta. Al revés no
   * se pierde nada, porque ninguna palabra de fecha contiene dígitos.
   */
  let fecha: string | null = null;
  const fechaEncontrada = buscarFecha(restante);
  if (fechaEncontrada) {
    fecha = sumarDias(hoyArgentina(), fechaEncontrada.offsetDias);
    restante = restante.replace(fechaEncontrada.coincidencia, '');
  }

  let montoCentavos: number | null = null;
  const monto = buscarMonto(restante);
  if (monto) {
    montoCentavos = pesosACentavos(monto.valor);
    // Se saca por posición y no con `replace`: `replace` busca la primera
    // aparición del texto, que no siempre es la coincidencia elegida ahora que
    // hay dos candidatos. Sacar el tramo exacto no depende de esa suerte.
    restante = restante.slice(0, monto.indice) + restante.slice(monto.indice + monto.largo);
  }

  return { montoCentavos, fecha, textoRestante: limpiarEspacios(restante) };
}

/**
 * Cuantos gastos se aceptan en una sola carga.
 *
 * El tope no esta para limitar a nadie: es para que un pegado accidental de un
 * texto largo no se convierta en cincuenta gastos. Veinte lineas es mucho mas
 * de lo que alguien escribe de una sentada al llegar a la noche.
 */
export const MAXIMO_GASTOS_POR_LOTE = 20;

export type LineaDeGasto = {
  /** El texto de la linea tal como se escribio, sin los espacios de los bordes. */
  texto: string;
  /** El monto detectado en esa linea, o null si no tiene ninguno. */
  montoCentavos: number | null;
};

/**
 * Las comas que separan un gasto de otro, que no son todas las comas del texto.
 *
 * Una coma entre dos digitos es el separador decimal argentino ("1.250,50") o
 * el de miles ("1,000"), y no separa gastos. Se decide mirando el caracter de
 * cada lado, y a mano en vez de con un lookbehind dentro de la expresion
 * regular, porque esta funcion corre tambien en Hermes (el motor de JavaScript
 * del telefono) y las construcciones mas nuevas de regex no estan garantizadas
 * ahi. Un bucle de diez lineas no necesita garantias.
 */
function partirPorComas(linea: string): string[] {
  const partes: string[] = [];
  let desde = 0;

  for (let i = 0; i < linea.length; i += 1) {
    if (linea[i] !== ',') continue;
    const esDecimal = /\d/.test(linea[i - 1] ?? '') && /\d/.test(linea[i + 1] ?? '');
    if (esDecimal) continue;
    partes.push(linea.slice(desde, i));
    desde = i + 1;
  }
  partes.push(linea.slice(desde));

  return partes.map((parte) => parte.trim()).filter((parte) => parte.length > 0);
}

/**
 * Los gastos que hay en UNA linea: casi siempre uno, salvo que la linea sea una
 * enumeracion con coma donde cada parte tiene su propio monto.
 *
 * ACA ESTA LA REGLA QUE HACE QUE LA COMA SEA SEGURA, y es lo unico que cambio
 * respecto de la decision de la 1.5.0. Entonces se descarto separar por comas
 * con un contraejemplo correcto: "2000 cafe, medialunas y jugo" es UN gasto con
 * comas adentro, asi que la coma sola no distingue nada. Lo que faltaba no era
 * otro separador sino una condicion: se separa solo si DESPUES DE SEPARAR todas
 * las partes tienen monto.
 *
 * Con eso los dos casos se resuelven solos y por el mismo criterio:
 *
 *   "5000 pan, 7000 sube, hamburguesa 25000"  ->  tres partes, tres montos  ->  tres gastos
 *   "2000 cafe, medialunas y jugo"            ->  "medialunas y jugo" no tiene monto  ->  un gasto
 *
 * No se separa tambien por " y " ("5000 pan y 7000 sube"), aunque la misma regla
 * lo protegeria en ese ejemplo: "1000 coca y 2 litros" tiene monto en las dos
 * partes (la segunda entraria por $2) y quedarian dos gastos, uno inventado. La
 * coma es un gesto deliberado de enumeracion; la "y" aparece dentro de la
 * descripcion de un solo gasto todo el tiempo.
 */
function gastosDeUnaLinea(linea: string): LineaDeGasto[] {
  const partes = partirPorComas(linea);

  if (partes.length > 1) {
    const comoGastos = partes.map((parte) => ({
      texto: parte,
      montoCentavos: parsearTexto(parte).montoCentavos,
    }));
    if (comoGastos.every((gasto) => gasto.montoCentavos !== null)) return comoGastos;
  }

  return [{ texto: linea, montoCentavos: parsearTexto(linea).montoCentavos }];
}

/**
 * Parte un texto en un gasto por renglon, y tambien por coma cuando la linea es
 * una enumeracion de gastos con monto (ver `gastosDeUnaLinea`).
 *
 * POR QUE EXISTE. Cargar los gastos del dia de a uno significa abrir la
 * pantalla, escribir, guardar, volver, y otra vez, cinco veces. Nadie hace eso
 * a la noche: deja de cargar. Escribir los cinco juntos y guardar una sola vez
 * es la misma informacion con una quinta parte de los toques.
 *
 * OJO CON EL CAMBIO DE SIGNIFICADO DEL SALTO DE LINEA: antes de la 1.5.0 un
 * salto de linea era parte de la descripcion de UN gasto, y el placeholder de
 * la pantalla lo ensenaba asi ("30000 hamburguesa" / "en Guido"). Ahora eso
 * serian dos gastos, y el segundo no tiene monto. Por eso la pantalla cambio el
 * ejemplo y avisa que cada linea es un gasto.
 *
 * Las lineas vacias se descartan: un renglon de mas al final, o dos saltos
 * seguidos, son la forma normal de escribir una lista, no un gasto sin texto.
 */
export function separarEnGastos(texto: string): LineaDeGasto[] {
  return texto
    .split(/[\r\n]+/)
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0)
    .flatMap(gastosDeUnaLinea);
}

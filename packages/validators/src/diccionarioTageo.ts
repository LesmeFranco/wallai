import { normalizarTexto } from './texto';

/**
 * El diccionario base del motor de tageo: palabras conocidas y a que categoria
 * corresponden.
 *
 * Por que existe, desde la raiz. El motor v1 aprende de las correcciones del
 * usuario: cada vez que alguien arregla una categoria, se guarda una regla en
 * `reglas_tageo`, y los gastos parecidos que vengan despues usan esa regla.
 * El problema es el primer dia: un hogar recien creado no tiene ninguna regla,
 * asi que el motor no tiene con que comparar y TODO cae en "Otros". La persona
 * escribe "hamburguesa", ve "Otros", y concluye razonablemente que la app no
 * categoriza nada. Ese es el riesgo de "arranque en frio" que el documento
 * marca en su punto 10, y es exactamente lo que estaba pasando.
 *
 * Este diccionario le da al motor un punto de partida sin cambiar su
 * naturaleza: sigue sin haber IA generativa ni modelo entrenado, es una tabla
 * de palabras escrita a mano. Lo unico que cambia es que el motor arranca
 * sabiendo algo en vez de sabiendo nada.
 *
 * Orden de prioridad, definido en `tageo.ts`: las reglas APRENDIDAS del hogar
 * siempre ganan sobre este diccionario. Si la familia enseño que "coto" es
 * otra cosa, eso vale mas que lo que diga esta tabla, porque es conocimiento
 * sobre esa familia en particular. El diccionario solo contesta cuando nadie
 * enseño nada sobre ese texto.
 *
 * Criterio para agregar una palabra: tiene que ser inequivoca en el contexto
 * de un gasto argentino. Palabras como "dia" (la cadena de supermercados, pero
 * tambien "el otro dia") o "personal" (la telefonica, pero tambien "gasto
 * personal") quedaron deliberadamente afuera: una sugerencia equivocada le
 * hace perder mas tiempo al usuario que ninguna sugerencia, que es la misma
 * razon por la que existe la categoria de descarte.
 */
export const DICCIONARIO_TAGEO: Record<string, readonly string[]> = {
  comida: [
    'hamburguesa', 'hamburgueseria', 'burger', 'mcdonalds', 'pizza', 'pizzeria',
    'empanada', 'milanesa', 'asado', 'parrilla', 'restaurante', 'restaurant',
    'almuerzo', 'cena', 'desayuno', 'merienda', 'cafe', 'cafeteria',
    'medialuna', 'factura', 'panaderia', 'pan', 'helado', 'heladeria',
    'sushi', 'pancho', 'choripan', 'sandwich', 'lomito', 'kiosco', 'kiosko',
    'golosina', 'alfajor', 'rappi', 'pedidosya', 'delivery', 'comida',
    'vianda', 'rotiseria', 'empanadas',
  ],
  supermercado: [
    'super', 'supermercado', 'coto', 'carrefour', 'jumbo', 'disco', 'vea',
    'almacen', 'despensa', 'verduleria', 'carniceria', 'fiambreria',
    'pescaderia', 'dietetica', 'makro', 'diarco', 'mayorista', 'changuito',
    'mercado',
  ],
  transporte: [
    'nafta', 'gnc', 'combustible', 'ypf', 'shell', 'axion', 'puma', 'subte',
    'colectivo', 'bondi', 'tren', 'sube', 'taxi', 'remis', 'uber', 'cabify',
    'didi', 'peaje', 'estacionamiento', 'cochera', 'pasaje', 'micro', 'avion',
    'vtv', 'patente', 'gomeria', 'mecanico', 'lubricentro', 'neumatico',
    'cubierta', 'transporte', 'flete',
  ],
  salidas: [
    'cine', 'teatro', 'boliche', 'bar', 'cerveza', 'birra', 'salida', 'fiesta',
    'recital', 'concierto', 'entrada', 'pub', 'cumpleanos', 'regalo', 'museo',
    'cancha', 'futbol', 'pool', 'bowling', 'escapada', 'vacaciones', 'hotel',
    'camping', 'trago', 'vino', 'fernet',
  ],
  servicios: [
    'luz', 'edenor', 'edesur', 'gas', 'metrogas', 'camuzzi', 'agua', 'aysa',
    'internet', 'fibertel', 'telecentro', 'movistar', 'flow', 'directv',
    'cable', 'expensas', 'abl', 'arba', 'afip', 'monotributo', 'impuesto',
    'rentas', 'municipal', 'seguro', 'telefono', 'wifi', 'factura de luz',
  ],
  salud: [
    'farmacia', 'remedio', 'medicamento', 'medico', 'doctor', 'dentista',
    'odontologo', 'osde', 'swiss medical', 'galeno', 'medife', 'obra social',
    'psicologo', 'psicologa', 'terapia', 'analisis', 'laboratorio', 'oculista',
    'kinesiologo', 'vacuna', 'hospital', 'clinica', 'sanatorio', 'optica',
    'lentes', 'consulta', 'prepaga',
  ],
  hogar: [
    'ferreteria', 'pintura', 'mueble', 'sodimac', 'easy', 'sillon', 'colchon',
    'heladera', 'lavarropas', 'electrodomestico', 'limpieza', 'lavandina',
    'detergente', 'jabon', 'papel higienico', 'escoba', 'alquiler', 'plomero',
    'electricista', 'pintor', 'cortina', 'sabanas', 'toalla', 'vajilla',
    'olla', 'bazar', 'deposito',
  ],
  educacion: [
    'facultad', 'universidad', 'uade', 'utn', 'uba', 'colegio', 'escuela',
    'matricula', 'apunte', 'fotocopia', 'libro', 'libreria', 'curso', 'ingles',
    'instituto', 'profesor', 'particular', 'posgrado', 'maestria', 'examen',
  ],
  ropa: [
    'ropa', 'remera', 'pantalon', 'jean', 'zapatilla', 'zapato', 'campera',
    'buzo', 'camisa', 'vestido', 'medias', 'calzado', 'nike', 'adidas',
    'zara', 'indumentaria', 'modista', 'pollera', 'abrigo', 'gorra',
  ],
  suscripciones: [
    'netflix', 'spotify', 'disney', 'hbo', 'prime', 'youtube', 'premium',
    'suscripcion', 'gimnasio', 'gym', 'icloud', 'chatgpt', 'canva', 'steam',
    'playstation', 'xbox', 'twitch', 'membresia', 'abono',
  ],
};

/**
 * La raiz aproximada de una palabra, para que "medialunas" y "medialuna" se
 * consideren la misma.
 *
 * No es un lematizador de verdad ni pretende serlo: saca una "s" o "es" final
 * y nada mas. Solo lo hace si lo que queda tiene al menos 4 letras, porque si
 * no palabras cortas y legitimas se destrozarian ("gas" quedaria en "ga",
 * "mes" en "m"). Como la misma funcion se aplica a los dos lados de la
 * comparacion, dos formas de la misma palabra terminan igual aunque la raiz
 * que se calcule no sea la linguisticamente correcta.
 */
function raiz(palabra: string): string {
  if (palabra.length >= 6 && palabra.endsWith('es')) return palabra.slice(0, -2);
  if (palabra.length >= 5 && palabra.endsWith('s')) return palabra.slice(0, -1);
  return palabra;
}

/** Indice invertido raiz -> claves de categoria, armado una sola vez. */
const CLAVES_POR_RAIZ = new Map<string, string[]>();
/** Las entradas de varias palabras ("obra social") se buscan como subcadena. */
const FRASES: Array<{ frase: string; clave: string }> = [];

for (const [clave, palabras] of Object.entries(DICCIONARIO_TAGEO)) {
  for (const palabra of palabras) {
    const normalizada = normalizarTexto(palabra);
    if (normalizada.includes(' ')) {
      FRASES.push({ frase: normalizada, clave });
      continue;
    }
    const llave = raiz(normalizada);
    const existentes = CLAVES_POR_RAIZ.get(llave);
    if (existentes) existentes.push(clave);
    else CLAVES_POR_RAIZ.set(llave, [clave]);
  }
}

export type CoincidenciaDiccionario = {
  /** La `clave` de la categoria global sugerida. */
  clave: string;
  /** La palabra del diccionario que coincidio, para poder explicarlo. */
  palabra: string;
};

/**
 * Busca en el diccionario la categoria que mejor corresponde a un texto.
 *
 * Compara palabra por palabra (no por subcadena) a proposito: si buscara
 * subcadenas, "pan" coincidiria dentro de "pantalon" y un jean terminaria
 * clasificado como comida. Las entradas de varias palabras si se buscan como
 * subcadena, porque ahi el riesgo de coincidencia accidental no existe.
 *
 * Si dos categorias coinciden, gana la que mas palabras haya acertado, y a
 * igualdad de palabras gana la coincidencia mas larga (mas especifica).
 * Devuelve null si no reconocio nada: el que llama decide que hacer, que en
 * el motor es caer en "Otros".
 */
export function buscarEnDiccionario(texto: string): CoincidenciaDiccionario | null {
  const normalizado = normalizarTexto(texto);
  if (!normalizado) return null;

  const aciertos = new Map<string, { cantidad: number; palabra: string }>();

  function anotar(clave: string, palabra: string) {
    const previo = aciertos.get(clave);
    if (!previo) {
      aciertos.set(clave, { cantidad: 1, palabra });
      return;
    }
    previo.cantidad += 1;
    if (palabra.length > previo.palabra.length) previo.palabra = palabra;
  }

  for (const { frase, clave } of FRASES) {
    if (normalizado.includes(frase)) anotar(clave, frase);
  }

  for (const palabra of normalizado.split(' ')) {
    const claves = CLAVES_POR_RAIZ.get(raiz(palabra));
    if (claves) for (const clave of claves) anotar(clave, palabra);
  }

  let mejor: CoincidenciaDiccionario | null = null;
  let mejorCantidad = 0;
  for (const [clave, dato] of aciertos) {
    const gana =
      dato.cantidad > mejorCantidad ||
      (dato.cantidad === mejorCantidad && mejor !== null && dato.palabra.length > mejor.palabra.length);
    if (gana) {
      mejor = { clave, palabra: dato.palabra };
      mejorCantidad = dato.cantidad;
    }
  }

  return mejor;
}

/**
 * Representacion del dinero en toda la aplicacion.
 *
 * Regla unica: internamente el dinero SIEMPRE es un entero de centavos.
 * Nunca un numero con coma.
 *
 * Por que. En JavaScript los numeros con decimales son de punto flotante,
 * y el punto flotante no puede representar exactamente valores como 0.1.
 * El caso clasico: 0.1 + 0.2 da 0.30000000000000004. En una app de gastos
 * eso significa que la suma de la columna de una familia puede terminar
 * con un peso de diferencia respecto de la suma real, sin que nada falle
 * ni avise. Es el peor tipo de error: silencioso y acumulativo.
 *
 * Trabajando con enteros de centavos, sumar y restar es exacto por
 * definicion, porque son operaciones entre enteros. La conversion a pesos
 * ocurre solo en dos lugares: cuando entra un dato del usuario y cuando
 * se muestra en pantalla.
 */

export const CENTAVOS_POR_PESO = 100;

/**
 * Tope defensivo: 10.000 millones de pesos expresados en centavos.
 * No existe para limitar al usuario sino para atajar errores de tipeo
 * (alguien que escribe el monto pegado a otro numero) antes de que
 * contaminen los totales del hogar.
 */
export const MONTO_MAXIMO_CENTAVOS = 1_000_000_000_000;

/**
 * Convierte pesos (posiblemente con decimales) a centavos enteros.
 * Redondea al centavo mas cercano: 30000.294 -> 3000029 centavos.
 */
export function pesosACentavos(pesos: number): number {
  if (!Number.isFinite(pesos)) {
    throw new Error(`Monto invalido: ${pesos}`);
  }
  return Math.round(pesos * CENTAVOS_POR_PESO);
}

/**
 * Convierte centavos enteros a pesos. Usar solo para mostrar o exportar,
 * nunca como paso intermedio de un calculo.
 */
export function centavosAPesos(centavos: number): number {
  return centavos / CENTAVOS_POR_PESO;
}

/**
 * Formatea centavos como moneda argentina: 3000000 -> "$ 30.000,00".
 * Intl es parte del runtime, no hace falta ninguna libreria.
 */
export function formatearPesos(centavos: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(centavosAPesos(centavos));
}

/**
 * Suma una lista de montos en centavos. Existe como funcion propia
 * para que quede un solo lugar donde se sumen montos en todo el proyecto,
 * y para dejar explicito que la suma se hace sobre enteros.
 */
export function sumarCentavos(montos: readonly number[]): number {
  return montos.reduce((total, monto) => total + monto, 0);
}

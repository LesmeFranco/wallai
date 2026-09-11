/**
 * Categorias globales del sistema (decision P3).
 *
 * Existen para resolver el "arranque en frio" que el documento marca como
 * riesgo: sin ellas, el primer gasto de un hogar nuevo no tendria contra que
 * clasificarse y el motor no podria proponer nada.
 *
 * La lista es corta a proposito. Un catalogo largo obliga a la persona a
 * pensar en cual encaja cada gasto, que es exactamente la friccion que el
 * producto quiere eliminar. Cada hogar puede agregar las suyas.
 *
 * La `clave` es el identificador estable para el codigo; el `nombre` es lo que
 * se muestra en pantalla y podria cambiar sin romper nada.
 */
export const CATEGORIAS_GLOBALES = [
  { clave: 'comida', nombre: 'Comida' },
  { clave: 'supermercado', nombre: 'Supermercado' },
  { clave: 'transporte', nombre: 'Transporte' },
  { clave: 'salidas', nombre: 'Salidas' },
  { clave: 'servicios', nombre: 'Servicios' },
  { clave: 'salud', nombre: 'Salud' },
  { clave: 'hogar', nombre: 'Hogar' },
  { clave: 'educacion', nombre: 'Educacion' },
  { clave: 'ropa', nombre: 'Ropa' },
  { clave: 'suscripciones', nombre: 'Suscripciones' },
  { clave: 'otros', nombre: 'Otros' },
] as const;

/**
 * Categoria a la que cae un gasto cuando el motor de tageo no tiene confianza
 * suficiente. Preferimos dejarlo explicitamente en "Otros" antes que forzar
 * una categoria dudosa: una sugerencia equivocada le hace perder mas tiempo al
 * usuario que ninguna sugerencia.
 */
export const CLAVE_CATEGORIA_DESCARTE = 'otros';

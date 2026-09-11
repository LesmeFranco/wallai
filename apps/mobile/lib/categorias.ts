/**
 * Como se ve cada categoria: su icono y su color.
 *
 * Vive en el cliente y no en la base a proposito. El icono y el color son
 * presentacion, no datos: cambiarlos es un cambio de diseno, no una migracion.
 * Si estuvieran en la tabla `categorias`, cada ajuste visual obligaria a
 * escribir SQL y a mantener sincronizadas la base y el mockup.
 *
 * El indice es `clave`, que es justamente la columna que existe para
 * referirse a una categoria global desde el codigo (ver el comentario en
 * schema/categorias.ts). Usar el nombre seria fragil: si manana "Comida" pasa
 * a llamarse "Alimentacion", el icono se perderia.
 *
 * Las categorias que crea un hogar tienen `clave` en NULL y por eso no estan
 * aca: para esas se usa PRESENTACION_POR_DEFECTO.
 */
export type PresentacionCategoria = {
  icono: string;
  color: string;
};

export const PRESENTACION_POR_CLAVE: Record<string, PresentacionCategoria> = {
  comida: { icono: '🍔', color: '#FF6B6B' },
  supermercado: { icono: '🛒', color: '#FFBC42' },
  transporte: { icono: '🚌', color: '#5B8DFF' },
  salidas: { icono: '🎭', color: '#B47FFF' },
  servicios: { icono: '💡', color: '#AAFF4D' },
  salud: { icono: '❤️', color: '#FF6B9D' },
  hogar: { icono: '🏠', color: '#43D9AD' },
  educacion: { icono: '📚', color: '#FFD166' },
  ropa: { icono: '👕', color: '#06D6A0' },
  suscripciones: { icono: '📱', color: '#EF476F' },
  otros: { icono: '✨', color: '#9999B3' },
};

export const PRESENTACION_POR_DEFECTO: PresentacionCategoria = {
  icono: '🏷️',
  color: '#9999B3',
};

export function presentacionDe(clave: string | null): PresentacionCategoria {
  if (!clave) return PRESENTACION_POR_DEFECTO;
  return PRESENTACION_POR_CLAVE[clave] ?? PRESENTACION_POR_DEFECTO;
}

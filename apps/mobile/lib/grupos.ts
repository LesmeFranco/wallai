import type { TipoHogar } from '@wallai/validators';

/**
 * Como se nombra y como se dibuja cada tipo de grupo.
 *
 * Vive en el cliente por la misma razon que `categorias.ts`: el icono y la
 * palabra son presentacion, no datos. La base guarda `tipo` (casa | grupo),
 * que es el hecho; que una casa se muestre con una casita y se llame "hogar"
 * es una decision de diseno y cambiarla no deberia ser una migracion.
 */
export type PresentacionGrupo = {
  icono: string;
  /** Como se lo nombra en singular: "hogar", "grupo". */
  singular: string;
  /** El articulo que le corresponde, para armar frases sin que suenen mal. */
  articulo: string;
};

export const PRESENTACION_POR_TIPO: Record<TipoHogar, PresentacionGrupo> = {
  casa: { icono: '🏠', singular: 'hogar', articulo: 'el' },
  grupo: { icono: '👥', singular: 'grupo', articulo: 'el' },
};

export function presentacionDeGrupo(tipo: TipoHogar | null | undefined): PresentacionGrupo {
  // El fallback es 'casa' y no 'grupo' porque es el default de la columna: un
  // grupo creado antes de que existiera el tipo es una casa.
  return PRESENTACION_POR_TIPO[tipo ?? 'casa'] ?? PRESENTACION_POR_TIPO.casa;
}

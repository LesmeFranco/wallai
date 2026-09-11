/**
 * Generacion del codigo con el que alguien se suma a un hogar.
 *
 * El documento pide "un codigo simple, sin friccion". La friccion aca aparece
 * cuando la persona tipea mal el codigo que le dictaron por telefono, asi que
 * el alfabeto excluye los caracteres que se confunden al leer o al escuchar:
 * la I y el 1, la L y el 1, la O y el 0. Tampoco hay minusculas, para que no
 * importe como lo escriba.
 */

/**
 * Nota sobre donde corre cada funcion de este archivo:
 * `generarCodigoInvitacion` usa la Web Crypto API global, que existe en Node
 * (donde corre el backend) y en los navegadores. La generacion del codigo pasa
 * siempre en el servidor, al crear un hogar, asi que eso alcanza. Las otras dos
 * funciones son texto puro y corren en cualquier lado, incluida la app mobile.
 */

/** 23 letras (sin I, L, O) mas 8 digitos (sin 0 ni 1). 31 simbolos. */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const LARGO_CODIGO_INVITACION = 6;

/** Forma valida de un codigo, para validar lo que tipea el usuario. */
export const CODIGO_INVITACION_REGEX = /^[A-Z2-9]{6}$/;

/**
 * Genera un codigo aleatorio.
 *
 * Usa crypto.getRandomValues y no Math.random. Math.random no es
 * criptograficamente seguro: su salida es predecible si alguien conoce el
 * estado interno del generador, y aca un codigo adivinable significa que un
 * extrano puede entrar al hogar de una familia y ver todos sus gastos.
 *
 * El bucle descarta los bytes que caen en el "sobrante" del rango. Sin ese
 * descarte habria sesgo por modulo: como 256 no es multiplo de 31, los
 * primeros simbolos del alfabeto saldrian un poco mas seguido que los ultimos,
 * y eso reduce la cantidad real de codigos distintos.
 */
export function generarCodigoInvitacion(largo = LARGO_CODIGO_INVITACION): string {
  const limiteSinSesgo = Math.floor(256 / ALFABETO.length) * ALFABETO.length;
  let codigo = '';

  while (codigo.length < largo) {
    const bytes = new Uint8Array(largo);
    crypto.getRandomValues(bytes);

    for (const byte of bytes) {
      if (codigo.length === largo) break;
      if (byte >= limiteSinSesgo) continue; // descartado para evitar sesgo
      codigo += ALFABETO[byte % ALFABETO.length];
    }
  }

  return codigo;
}

/** Normaliza lo que tipea el usuario antes de buscarlo en la base. */
export function normalizarCodigoInvitacion(entrada: string): string {
  return entrada.trim().toUpperCase().replace(/\s+/g, '');
}

export function esCodigoInvitacionValido(entrada: string): boolean {
  return CODIGO_INVITACION_REGEX.test(normalizarCodigoInvitacion(entrada));
}

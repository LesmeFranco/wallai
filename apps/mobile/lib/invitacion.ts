import * as SecureStore from 'expo-secure-store';
import { CODIGO_INVITACION_REGEX, normalizarCodigoInvitacion } from '@wallai/validators';

/**
 * La invitacion que quedo esperando a que la persona entre a su cuenta.
 *
 * POR QUE HACE FALTA GUARDARLA. Quien recibe un link de invitacion puede no
 * tener sesion todavia: toca el link, la app abre en la pantalla de login, y el
 * codigo se perderia ahi mismo. Peor todavia si entra con Google, porque
 * Android puede levantar la app de cero al volver del navegador (es la misma
 * trampa que documenta `lib/sesion.tsx`): en ese arranque no queda nada en
 * memoria de la pantalla anterior.
 *
 * Por eso el codigo se escribe en el telefono y se lee despues del login, en vez
 * de pasarlo como parametro de navegacion. Un parametro sobrevive a un cambio de
 * pantalla; no sobrevive a que el sistema operativo mate el proceso.
 *
 * Se usa SecureStore por lo mismo que las preferencias del aviso de la noche: es
 * el almacenamiento que la app ya tiene. Un codigo de invitacion no es un
 * secreto -lo comparten por WhatsApp-, asi que el cifrado no aporta nada; no
 * molesta tampoco.
 */
const CLAVE = 'wallai.invitacion.pendiente';

export async function guardarInvitacionPendiente(codigo: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(CLAVE, normalizarCodigoInvitacion(codigo));
  } catch {
    // No poder guardarla solo significa que, despues de entrar, la persona va a
    // caer en el dashboard y va a tener que tocar el link otra vez. Es un peor
    // camino, no un error que valga la pena mostrar.
  }
}

/**
 * El codigo guardado, o null.
 *
 * Valida la forma antes de devolverlo: lo que sale de aca se usa para navegar,
 * y un valor corrupto mandaria a la persona a una pantalla que no puede
 * resolver nada.
 */
export async function leerInvitacionPendiente(): Promise<string | null> {
  try {
    const guardado = await SecureStore.getItemAsync(CLAVE);
    if (!guardado) return null;
    const codigo = normalizarCodigoInvitacion(guardado);
    return CODIGO_INVITACION_REGEX.test(codigo) ? codigo : null;
  } catch {
    return null;
  }
}

export async function olvidarInvitacionPendiente(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CLAVE);
  } catch {
    // Idem: no es un error que la persona pueda accionar.
  }
}

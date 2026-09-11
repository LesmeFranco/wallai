import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { supabaseAnonKey, supabaseUrl } from './entorno';

/**
 * Limite practico de SecureStore por valor. Arriba de esto avisa por consola y
 * en algunos dispositivos falla directamente.
 */
const LARGO_MAXIMO_POR_TROZO = 1800;

/**
 * Donde guarda Supabase la sesion en el telefono.
 *
 * Va en SecureStore (Keychain en iOS, EncryptedSharedPreferences en Android) y
 * no en AsyncStorage, porque lo que se guarda es el token de acceso: con ese
 * token, cualquiera que pueda leer el almacenamiento de la app entra como el
 * usuario. AsyncStorage guarda en texto plano.
 *
 * El problema es que SecureStore tiene un limite de tamano por valor (~2 KB) y
 * la sesion de Supabase lo roza: el token es un JWT ES256 de unos 700
 * caracteres, mas el refresh token, mas los datos del usuario. Queda justo en
 * el borde, asi que fallaria de forma intermitente, que es la peor manera de
 * fallar. Por eso este adaptador parte el valor en trozos y guarda aparte
 * cuantos son, para poder volver a armarlo al leer.
 */
const almacenamientoSeguro: SupportedStorage = {
  async getItem(clave) {
    const cantidad = await SecureStore.getItemAsync(`${clave}.trozos`);
    if (cantidad === null) return null;

    const trozos: string[] = [];
    for (let i = 0; i < Number(cantidad); i++) {
      const trozo = await SecureStore.getItemAsync(`${clave}.${i}`);
      // Si falta un trozo, el valor guardado esta incompleto y no se puede
      // reconstruir. Devolver null hace que Supabase lo trate como "no hay
      // sesion" y pida login de nuevo, que es el comportamiento correcto.
      if (trozo === null) return null;
      trozos.push(trozo);
    }
    return trozos.join('');
  },

  async setItem(clave, valor) {
    await borrarTrozos(clave);

    const trozos: string[] = [];
    for (let i = 0; i < valor.length; i += LARGO_MAXIMO_POR_TROZO) {
      trozos.push(valor.slice(i, i + LARGO_MAXIMO_POR_TROZO));
    }

    for (const [indice, trozo] of trozos.entries()) {
      await SecureStore.setItemAsync(`${clave}.${indice}`, trozo);
    }
    // El contador se escribe al final a proposito: mientras no exista, getItem
    // devuelve null y la escritura se considera no terminada. Si se guardara
    // primero y la app se cerrara en el medio, quedaria un contador que promete
    // mas trozos de los que hay.
    await SecureStore.setItemAsync(`${clave}.trozos`, String(trozos.length));
  },

  async removeItem(clave) {
    await borrarTrozos(clave);
    await SecureStore.deleteItemAsync(`${clave}.trozos`);
  },
};

async function borrarTrozos(clave: string): Promise<void> {
  const cantidad = await SecureStore.getItemAsync(`${clave}.trozos`);
  if (cantidad === null) return;
  for (let i = 0; i < Number(cantidad); i++) {
    await SecureStore.deleteItemAsync(`${clave}.${i}`);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: almacenamientoSeguro,
    autoRefreshToken: true,
    persistSession: true,
    /**
     * PKCE y no el flujo por defecto ("implicit").
     *
     * Con el implicito, al volver del login de Google los tokens llegan en el
     * fragmento de la URL (`#access_token=...`), que es justamente la parte que
     * no se manda al servidor y que en un deep link nativo es incómoda de leer.
     * Con PKCE vuelve un código de un solo uso (`?code=...`) que se canjea por
     * la sesión, y el secreto que autoriza ese canje (el "code verifier") nunca
     * sale del teléfono: lo guarda este mismo almacenamiento seguro. Es el
     * flujo recomendado para apps nativas.
     *
     * Ojo: `exchangeCodeForSession` solo funciona con PKCE. Si esto volviera al
     * default, el login con Google dejaría de andar.
     */
    flowType: 'pkce',
    /**
     * En una app nativa no hay URL donde Supabase pueda leer el token despues
     * de un login social: eso se maneja con el esquema `wallai://` (ver
     * lib/sesion.tsx), no mirando la barra de direcciones.
     */
    detectSessionInUrl: false,
  },
});

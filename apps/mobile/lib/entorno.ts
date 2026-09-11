import Constants from 'expo-constants';

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  urlApi?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function obligatorio(valor: string | undefined, nombre: string): string {
  if (!valor) {
    throw new Error(
      `Falta ${nombre}. Revisa que el .env de la raiz del monorepo este completo y reinicia el servidor de Expo (los valores se leen al arrancar, no en caliente).`,
    );
  }
  return valor;
}

export const supabaseUrl = obligatorio(extra.supabaseUrl, 'SUPABASE_URL');
export const supabaseAnonKey = obligatorio(extra.supabaseAnonKey, 'SUPABASE_ANON_KEY');

/**
 * De donde cuelga el backend de tRPC.
 *
 * En desarrollo el backend corre dentro de apps/web (`pnpm dev`), en el puerto
 * 3000 de la maquina de desarrollo. El problema es que "localhost" dentro de un
 * telefono es el telefono mismo, no la computadora, asi que hay que usar su IP
 * en la red local.
 *
 * En vez de pedir que se escriba esa IP a mano (y que haya que cambiarla cada
 * vez que el router reparte otra), se deduce del propio servidor de Expo:
 * `hostUri` es la direccion por la que el telefono ya se conecto para bajar el
 * bundle, asi que es, por definicion, una IP que el telefono puede alcanzar.
 *
 * `WALLAI_URL_API` en el .env tiene prioridad, para cuando el backend este
 * desplegado en un servidor de verdad.
 */
function deducirUrlApi(): string {
  if (extra.urlApi) return extra.urlApi;

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    throw new Error(
      'No se pudo deducir la URL del backend. Define WALLAI_URL_API en el .env de la raiz.',
    );
  }

  // hostUri viene como "192.168.0.10:8081". Nos interesa el host, no el puerto
  // de Metro: el backend escucha en el 3000.
  const host = hostUri.split(':')[0];
  return `http://${host}:3000`;
}

export const urlApi = deducirUrlApi();

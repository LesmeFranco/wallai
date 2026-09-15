import { config as cargarEnv } from 'dotenv';
import type { ExpoConfig } from 'expo/config';

/**
 * Configuracion de la app en TypeScript y no en app.json, por una sola razon:
 * necesitamos leer el `.env` de la raiz del monorepo.
 *
 * Expo solo lee archivos `.env` del directorio de la app, y el proyecto tiene
 * un unico `.env` arriba (mismo criterio que drizzle.config.ts y
 * next.config.ts: una sola base de datos y una sola configuracion). Esto lo
 * carga y pasa los valores por `extra`, que es la forma que tiene Expo de
 * hacer llegar configuracion al codigo de la app (se lee con expo-constants).
 *
 * Atencion: lo que se pone en `extra` queda embebido en el bundle y es
 * legible por cualquiera que lo inspeccione. Por eso van solo la URL y la
 * clave anonima, que son publicas por diseno. La clave de servicio NUNCA va
 * aca: vive solo en el servidor (ver packages/api/src/supabase.ts).
 */
cargarEnv({ path: '../../.env', quiet: true });

const config: ExpoConfig = {
  name: 'Wallai',
  slug: 'wallai',
  /**
   * La version que muestra el telefono en la pantalla de informacion de la app.
   *
   * 1.0.0 fue el primer build instalable. 1.1.0 trae el selector de alcance sin
   * la vista mezclada, la correccion de categoria con confirmacion, y el login
   * con Google atendiendo el deep link de vuelta.
   *
   * Subirla no es tramite: es lo unico que permite mirar el telefono y saber
   * cual de los dos APK quedo instalado.
   */
  version: '1.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'wallai',
  userInterfaceStyle: 'dark',
  ios: {
    supportsTablet: true,
    /**
     * El identificador con el que el sistema operativo reconoce a la app.
     *
     * Es para siempre: si se cambia despues de publicar, el sistema la trata
     * como una app distinta y quien tenga instalada la vieja no recibe la
     * nueva como actualizacion, sino que quedan las dos conviviendo.
     */
    bundleIdentifier: 'com.wallai.app',
  },
  android: {
    package: 'com.wallai.app',
    /**
     * El numero que mira Android para decidir si un APK es mas nuevo que el
     * instalado. Es un entero y solo puede subir; no tiene relacion con
     * `version`, que es el texto que ve la persona. El primer build no lo
     * declaraba y quedo en 1.
     */
    versionCode: 2,
    adaptiveIcon: {
      backgroundColor: '#0C0C13',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-web-browser',
    /**
     * El splash se configura aca y no en una clave `splash` de nivel superior:
     * en el SDK 57 esa clave ya no existe y paso a ser configuracion de este
     * plugin. El fondo va en el mismo tono que la app para que no haya un
     * destello claro entre el splash y la primera pantalla.
     */
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0C0C13',
        image: './assets/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    /**
     * De donde colgar las llamadas a tRPC. Si no se define, se deduce del
     * propio servidor de desarrollo de Expo (ver lib/entorno.ts), que es lo
     * que hace que funcione en un telefono real sin tener que escribir la IP
     * de la maquina a mano.
     */
    urlApi: process.env.WALLAI_URL_API,

    /**
     * Identificador del proyecto en los servidores de Expo, que es lo que le
     * dice a `eas build` a que proyecto de la cuenta pertenece este codigo.
     *
     * Va escrito a mano y no lo puso `eas init` solo: cuando la configuracion
     * es un archivo TypeScript (y no un app.json estatico), EAS no puede
     * editarla por su cuenta y avisa que hay que copiarlo. No es un secreto:
     * identifica al proyecto, no autoriza nada.
     */
    eas: {
      projectId: '6224b987-253d-4e15-9a5f-586c5e4c0365',
    },
  },

  /** La cuenta de Expo dueña del proyecto. */
  owner: 'fr4nco',
};

export default config;

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type EstadoSesion = {
  sesion: Session | null;
  /** True mientras se lee la sesion guardada en el telefono, al arrancar. */
  cargando: boolean;
  entrarConEmail: (email: string, contrasena: string) => Promise<void>;
  /**
   * Devuelve si la cuenta quedó esperando que la persona confirme su email.
   * Hace falta saberlo: con la confirmación activada en Supabase, registrarse
   * NO deja la sesión iniciada, y sin avisarlo parece que el registro falló.
   */
  registrarseConEmail: (
    email: string,
    contrasena: string,
  ) => Promise<{ necesitaConfirmarEmail: boolean }>;
  entrarConGoogle: () => Promise<void>;
  salir: () => Promise<void>;
};

const ContextoSesion = createContext<EstadoSesion | null>(null);

export function ProveedorDeSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Lee la sesion que quedo guardada de la vez anterior, si hay.
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });

    // A partir de ahi, Supabase avisa de cada cambio: login, logout, y tambien
    // la renovacion automatica del token (cada token vive una hora). Escuchar
    // esto es lo que evita tener que releer la sesion a mano en cada pantalla.
    const { data } = supabase.auth.onAuthStateChange((_evento, sesionNueva) => {
      setSesion(sesionNueva);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const valor = useMemo<EstadoSesion>(
    () => ({
      sesion,
      cargando,

      async entrarConEmail(email, contrasena) {
        const { error } = await supabase.auth.signInWithPassword({ email, password: contrasena });
        if (error) throw new Error(traducirError(error.message));
      },

      async registrarseConEmail(email, contrasena) {
        const { data, error } = await supabase.auth.signUp({ email, password: contrasena });
        if (error) throw new Error(traducirError(error.message));
        // Si Supabase tiene la confirmación por email activada, devuelve el
        // usuario creado pero sin sesión: recién hay sesión cuando la persona
        // hace clic en el enlace del correo.
        return { necesitaConfirmarEmail: data.session === null };
      },

      /**
       * Login con Google.
       *
       * En una app nativa no hay redireccion de navegador que Supabase pueda
       * completar sola, asi que el flujo se maneja a mano en tres pasos:
       * pedirle a Supabase la URL de autorizacion, abrirla en el navegador del
       * sistema (no en un WebView: Google bloquea los WebView por seguridad, y
       * ademas asi se aprovecha la sesion de Google que la persona ya tiene en
       * el telefono), y cuando el navegador vuelve a `wallai://`, canjear el
       * codigo que trae por una sesion.
       */
      async entrarConGoogle() {
        /**
         * Sin argumentos a propósito: `makeRedirectUri` elige la forma correcta
         * según dónde corre la app. En Expo Go devuelve una `exp://ip:puerto/--/`
         * (el esquema propio `wallai://` no funciona dentro de Expo Go); en una
         * build propia devuelve `wallai://`. Cualquiera de las dos tiene que
         * estar en la lista de Redirect URLs del proyecto de Supabase, o el
         * login vuelve sin sesión.
         */
        const redirectTo = makeRedirectUri();

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) {
          throw new Error(
            `${traducirError(error.message)}\n\nURL de retorno usada: ${redirectTo}\nTiene que estar permitida en Supabase (Authentication > URL Configuration > Redirect URLs).`,
          );
        }
        if (!data.url) throw new Error('Supabase no devolvió la URL de Google.');

        // Diagnostico del login social. Va como `warn` y no como `log` a
        // proposito: los warnings se reenvian al terminal de Metro y los logs
        // no siempre, asi que esto es lo que permite ver que paso sin tener que
        // leer la pantalla del telefono.
        console.warn(`[google] abriendo navegador. redirectTo=${redirectTo}`);

        const resultado = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        console.warn(
          `[google] volvio: tipo=${resultado.type} url=${'url' in resultado ? resultado.url : '(sin url)'}`,
        );

        if (resultado.type !== 'success') {
          throw new Error(
            `El navegador volvió sin completar el login (${resultado.type}).\n\nURL de retorno esperada: ${redirectTo}\nSi el navegador terminó en otra dirección, esa URL tiene que estar en Supabase: Authentication > URL Configuration > Redirect URLs.`,
          );
        }

        // El deep link de vuelta puede traer el código, o un error si algo
        // falló (lo más común: que esta URL de retorno no esté permitida en el
        // proyecto de Supabase). Los parámetros pueden venir en la query o en
        // el fragmento, así que se miran los dos antes de dar por perdido.
        const urlDeVuelta = new URL(resultado.url);
        const parametros = new URLSearchParams(
          `${urlDeVuelta.search.replace(/^\?/, '')}&${urlDeVuelta.hash.replace(/^#/, '')}`,
        );

        const problema = parametros.get('error_description') ?? parametros.get('error');
        if (problema) {
          throw new Error(
            `Google respondió: ${problema}\n\nURL de retorno usada: ${redirectTo}\nRevisá que esté permitida en Supabase (Authentication > URL Configuration > Redirect URLs).`,
          );
        }

        const codigo = parametros.get('code');
        if (!codigo) {
          throw new Error(
            `El login volvió sin código de autorización.\n\nURL de retorno usada: ${redirectTo}\nRevisá que esté permitida en Supabase (Authentication > URL Configuration > Redirect URLs).`,
          );
        }

        const { error: errorCanje } = await supabase.auth.exchangeCodeForSession(codigo);
        if (errorCanje) throw new Error(traducirError(errorCanje.message));
      },

      async salir() {
        await supabase.auth.signOut();
      },
    }),
    [sesion, cargando],
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): EstadoSesion {
  const contexto = useContext(ContextoSesion);
  if (!contexto) {
    throw new Error('useSesion tiene que usarse dentro de ProveedorDeSesion.');
  }
  return contexto;
}

/**
 * Los mensajes de error de Supabase Auth vienen en ingles y con vocabulario
 * tecnico. Estos son los que una persona se puede encontrar de verdad al usar
 * la app; el resto se muestra tal cual antes que inventar una traduccion que
 * oculte lo que paso.
 */
function traducirError(mensaje: string): string {
  const traducciones: Record<string, string> = {
    'Invalid login credentials': 'El email o la contraseña no son correctos.',
    'Email not confirmed': 'Todavía no confirmaste tu email. Revisá tu correo.',
    'User already registered': 'Ya existe una cuenta con ese email.',
    'Password should be at least 6 characters':
      'La contraseña tiene que tener al menos 6 caracteres.',
    'Unable to validate email address: invalid format': 'Ese email no parece válido.',
  };
  return traducciones[mensaje] ?? mensaje;
}

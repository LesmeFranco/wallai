import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
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
  /**
   * Ultimo paso del login con Google, en texto. Existe para poder diagnosticar
   * desde el telefono: en una build instalada no hay terminal de Metro donde
   * leer los console.warn, asi que si el login falla sin mensaje claro, esto es
   * lo unico que queda a la vista.
   */
  diagnosticoGoogle: string | null;
};

const ContextoSesion = createContext<EstadoSesion | null>(null);

export function ProveedorDeSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const [diagnosticoGoogle, setDiagnosticoGoogle] = useState<string | null>(null);

  /**
   * Los codigos de autorizacion ya canjeados.
   *
   * Un codigo de PKCE es de un solo uso: canjearlo dos veces falla, y el
   * segundo error borraria la sesion recien creada del primero. Como ahora hay
   * dos caminos que pueden traer el mismo codigo (el retorno del navegador y el
   * deep link), hace falta que solo uno lo use. Va en un ref y no en estado
   * porque tiene que ser consultable y modificable en el mismo instante, sin
   * esperar a que React vuelva a renderizar.
   */
  const codigosCanjeados = useRef(new Set<string>());

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

  /**
   * Canjea por una sesion el codigo que venga en una URL de retorno.
   *
   * Devuelve un texto describiendo que paso, para el diagnostico.
   */
  const canjearCodigoDeUrl = useCallback(async (url: string): Promise<string> => {
    let parametros: URLSearchParams;
    try {
      parametros = parametrosDeUrl(url);
    } catch {
      // Una URL que no se puede analizar no es motivo para tirar abajo el
      // listener de deep links, que queda escuchando toda la vida de la app.
      return 'la URL de vuelta no se pudo leer';
    }

    const problema = parametros.get('error_description') ?? parametros.get('error');
    if (problema) return `Google devolvió un error: ${problema}`;

    const codigo = parametros.get('code');
    if (!codigo) return 'la vuelta no traía código';

    // El chequeo y la marca van juntos y antes de cualquier await, para que dos
    // llamadas simultaneas no pasen las dos.
    if (codigosCanjeados.current.has(codigo)) return 'código ya canjeado';
    codigosCanjeados.current.add(codigo);

    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (error) {
      // Si fallo, que se pueda reintentar con el mismo codigo.
      codigosCanjeados.current.delete(codigo);
      return `no se pudo canjear el código: ${traducirError(error.message)}`;
    }
    return 'sesión iniciada';
  }, []);

  /**
   * Escucha los deep links que llegan a la app.
   *
   * Esta es la pieza que faltaba, y explica el sintoma que se veia: volver al
   * login sin ningun mensaje. El login con Google abria el navegador y esperaba
   * su retorno dentro de `entrarConGoogle`. Pero cuando Chrome abre
   * `wallai://...`, Android puede levantar la app de cero: el proceso arranca
   * nuevo, esa espera desaparece junto con todo el estado, y el codigo de
   * autorizacion llega a una app que ya no lo estaba esperando. Nadie lo
   * canjea, y nadie muestra un error porque la pantalla es nueva.
   *
   * Con este listener el canje no depende de que la app haya sobrevivido: se
   * hace cuando la URL llega, venga la app de cero (`getInitialURL`) o de
   * segundo plano (el evento `url`).
   */
  useEffect(() => {
    let vivo = true;

    async function atender(url: string | null, origen: string) {
      if (!vivo || !url) return;
      // Solo interesan las vueltas del login. Cualquier otro deep link (por
      // ejemplo, si algun dia se comparte un link a un gasto) no se toca.
      if (!url.includes('code=') && !url.includes('error')) return;
      const resultado = await canjearCodigoDeUrl(url);
      console.warn(`[google] deep link (${origen}): ${resultado}`);
      if (vivo) setDiagnosticoGoogle(`Vuelta de Google (${origen}): ${resultado}.`);
    }

    // La URL con la que se abrio la app, si se abrio por un deep link.
    void Linking.getInitialURL().then((url) => atender(url, 'arranque'));
    // Y las que lleguen con la app ya abierta.
    const suscripcion = Linking.addEventListener('url', (evento) =>
      atender(evento.url, 'en caliente'),
    );

    return () => {
      vivo = false;
      suscripcion.remove();
    };
  }, [canjearCodigoDeUrl]);

  const valor = useMemo<EstadoSesion>(
    () => ({
      sesion,
      cargando,
      diagnosticoGoogle,

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
       * completar sola, asi que el flujo se maneja a mano: pedirle a Supabase la
       * URL de autorizacion, abrirla en el navegador del sistema (no en un
       * WebView: Google los bloquea por seguridad, y ademas asi se aprovecha la
       * sesion de Google que la persona ya tiene en el telefono), y canjear por
       * una sesion el codigo que vuelve a `wallai://`.
       *
       * El canje puede terminar haciendolo el listener de deep links de arriba,
       * si Android decide levantar la app de cero en vez de devolverle el
       * control a esta funcion. Los dos caminos son validos y solo uno gana: el
       * codigo se marca como canjeado antes de usarse.
       */
      async entrarConGoogle() {
        setDiagnosticoGoogle(null);

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

        console.warn(`[google] abriendo navegador. redirectTo=${redirectTo}`);
        setDiagnosticoGoogle(`Abriendo Google. Vuelta esperada a ${redirectTo}`);

        const resultado = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        console.warn(
          `[google] volvio: tipo=${resultado.type} url=${'url' in resultado ? resultado.url : '(sin url)'}`,
        );

        if (resultado.type === 'success') {
          const detalle = await canjearCodigoDeUrl(resultado.url);
          setDiagnosticoGoogle(`Vuelta del navegador: ${detalle}.`);
          if (detalle === 'sesión iniciada' || detalle === 'código ya canjeado') return;
          throw new Error(
            `${detalle[0]!.toUpperCase()}${detalle.slice(1)}.\n\nURL de retorno usada: ${redirectTo}`,
          );
        }

        /**
         * El navegador no volvio por este camino. Antes esto era un error
         * seguro, pero ahora puede significar simplemente que el deep link
         * levanto la app de nuevo y el listener ya hizo el canje: el resultado
         * llega como `dismiss` porque quien esperaba era un proceso que ya no
         * existe. Asi que antes de dar el login por fallido se mira si hay
         * sesion, que es la unica pregunta que importa.
         */
        const { data: comprobacion } = await supabase.auth.getSession();
        if (comprobacion.session) {
          setDiagnosticoGoogle('Vuelta de Google: sesión iniciada.');
          return;
        }

        setDiagnosticoGoogle(`El navegador volvió sin completar el login (${resultado.type}).`);
        throw new Error(
          `El navegador volvió sin completar el login (${resultado.type}).\n\nURL de retorno esperada: ${redirectTo}\nSi el navegador terminó en otra dirección, esa URL tiene que estar en Supabase: Authentication > URL Configuration > Redirect URLs.`,
        );
      },

      async salir() {
        await supabase.auth.signOut();
      },
    }),
    [sesion, cargando, diagnosticoGoogle, canjearCodigoDeUrl],
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
 * Los parametros de una URL de retorno, vengan en la query o en el fragmento.
 *
 * Se miran los dos porque depende del flujo: con PKCE el codigo viene en la
 * query (`?code=...`), pero un error de Supabase puede volver en el fragmento
 * (`#error=...`). Buscar en uno solo deja casos sin explicacion.
 */
function parametrosDeUrl(url: string): URLSearchParams {
  const analizada = new URL(url);
  const query = analizada.search.startsWith('?') ? analizada.search.slice(1) : analizada.search;
  const fragmento = analizada.hash.startsWith('#') ? analizada.hash.slice(1) : analizada.hash;
  return new URLSearchParams(`${query}&${fragmento}`);
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
    'Unable to validate email address: invalid format': 'Ese email no parece válido.',
  };
  if (traducciones[mensaje]) return traducciones[mensaje];

  /**
   * El largo minimo se configura en el panel de Supabase, asi que el numero que
   * viene en el mensaje puede cambiar sin que se toque una linea de codigo. Se
   * lee del propio mensaje en vez de escribirlo aca: una traduccion que diga
   * "6 caracteres" cuando el panel pide 8 es peor que no traducir nada.
   */
  const largoMinimo = /^Password should be at least (\d+) characters$/.exec(mensaje);
  if (largoMinimo) {
    return `La contraseña tiene que tener al menos ${largoMinimo[1]} caracteres.`;
  }

  /**
   * Con la proteccion de contraseñas filtradas activada (Supabase la chequea
   * contra la base de HaveIBeenPwned), registrarse con una contraseña que
   * aparecio en alguna filtracion falla con este mensaje. Sin traducir, la
   * persona lee un texto tecnico en ingles y no entiende que tiene que hacer.
   */
  if (mensaje.toLowerCase().includes('known to be weak')) {
    return 'Esa contraseña apareció en filtraciones conocidas de otros sitios. Elegí otra.';
  }

  return mensaje;
}

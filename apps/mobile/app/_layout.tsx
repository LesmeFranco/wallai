import '../global.css';

import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { ProveedorDeDialogos } from '../componentes/Dialogo';
import { ProveedorDeSesion } from '../lib/sesion';
import { crearClienteTrpc, trpc } from '../lib/trpc';

/**
 * El splash se queda hasta que las fuentes esten listas.
 *
 * Sin esto, Expo lo saca solo apenas arranca el runtime de JavaScript, que es
 * antes de que `useFonts` termine de cargar Outfit e Inter. Como mientras tanto
 * no se dibuja ninguna pantalla (ver el `fuentesListas` de abajo), quedaban
 * unos cuadros de fondo vacio entre el logo y el primer contenido: en un
 * telefono rapido es un parpadeo y en uno lento parece que la app se colgo.
 *
 * `catch` vacio a proposito: si el splash ya se cerro solo, la promesa se
 * rechaza y no hay nada que hacer al respecto. Una app que no arranca por no
 * poder retener su pantalla de carga seria mucho peor que el parpadeo.
 */
void SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Le ensena a TanStack Query cuando la app vuelve al frente.
 *
 * POR QUE HACE FALTA, y es un bug que estuvo todo este tiempo: TanStack Query
 * trae `refetchOnWindowFocus` activado, pero "window focus" es un concepto de
 * navegador. En una app nativa no existe, asi que sin esto NO se repedia nada
 * nunca al volver a la app, aunque el comentario del `staleTime` de abajo diera
 * por hecho que si. El sintoma que lo delato: alguien se sumaba a un grupo y
 * tardaba muchisimo en aparecer en la lista de integrantes.
 *
 * `setEventListener` es la forma que recomienda la documentacion para React
 * Native: se le pasa el AppState y Query decide cuando repedir, en vez de
 * llamar a `setFocused` a mano, que puede dejar el estado en "sin foco" si la
 * suscripcion se limpia en mal momento.
 */
focusManager.setEventListener((manejarFoco) => {
  const suscripcion = AppState.addEventListener('change', (estado) => {
    manejarFoco(estado === 'active');
  });
  return () => suscripcion.remove();
});

export default function LayoutRaiz() {
  const [fuentesListas] = useFonts({
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fuentesListas) void SplashScreen.hideAsync().catch(() => {});
  }, [fuentesListas]);

  /**
   * Los clientes se crean una sola vez, con useState y no en el cuerpo del
   * componente: si se recrearan en cada render, TanStack Query perderia el
   * cache en cada cambio de estado y la app volveria a pedir todo
   * constantemente.
   */
  const [clienteQuery] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            /**
             * Un minuto antes de considerar los datos viejos. El dashboard es
             * agregacion calculada en el momento, asi que cada pedido trae el
             * estado actual; este margen evita repetir la consulta dos veces
             * seguidas por un toque de mas.
             *
             * El margen NO significa que haya que esperar un minuto para ver un
             * cambio: cada pantalla invalida lo que muestra al tomar foco (ver
             * los `useFocusEffect` del dashboard, el historial y los grupos), y
             * el `focusManager` de arriba repide al volver a la app.
             */
            staleTime: 60_000,
            retry: 1,
          },
        },
      }),
  );
  const [clienteTrpc] = useState(() => crearClienteTrpc());

  return (
    <trpc.Provider client={clienteTrpc} queryClient={clienteQuery}>
      <QueryClientProvider client={clienteQuery}>
        <ProveedorDeSesion>
          {/* Los dialogos se dibujan una sola vez, desde la raiz: asi ninguna
              pantalla puede pintar uno distinto. Va por dentro de la sesion
              para poder usarse tambien en las pantallas con sesion. */}
          <ProveedorDeDialogos>
            <SafeAreaProvider>
              <StatusBar style="light" />
              {/* El fondo se pinta aca y no en cada pantalla para que no haya un
                parpadeo blanco en las transiciones entre rutas. */}
              <View className="flex-1 bg-fondo">
                {fuentesListas ? (
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: '#0C0C13' },
                      animation: 'slide_from_right',
                    }}
                  />
                ) : null}
              </View>
            </SafeAreaProvider>
          </ProveedorDeDialogos>
        </ProveedorDeSesion>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

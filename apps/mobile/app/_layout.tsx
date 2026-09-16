import '../global.css';

import { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { ProveedorDeDialogos } from '../componentes/Dialogo';
import { ProveedorDeSesion } from '../lib/sesion';
import { crearClienteTrpc, trpc } from '../lib/trpc';

export default function LayoutRaiz() {
  const [fuentesListas] = useFonts({
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

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
             * estado actual; este margen evita repetir la consulta al cambiar
             * de pestana y volver.
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

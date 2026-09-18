import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cargando } from '../../componentes/base';
import { IconoHogar, IconoInicio, IconoLista } from '../../componentes/iconos';
import { useSesion } from '../../lib/sesion';

/**
 * Layout de la zona privada: todo lo que esta dentro de (sesion) exige sesion
 * activa.
 *
 * El chequeo va aca y no en cada pantalla a proposito: una pantalla nueva
 * queda protegida por el solo hecho de estar en esta carpeta, sin que haya que
 * acordarse de agregarle nada. Es la diferencia entre que olvidarse sea
 * imposible y que sea un agujero de seguridad.
 *
 * El parentesis en el nombre de la carpeta es de Expo Router: agrupa rutas sin
 * aparecer en la URL, asi que la pantalla es /dashboard, no /sesion/dashboard.
 */
export default function LayoutSesion() {
  const { sesion, cargando } = useSesion();
  /**
   * Cuanto mide la zona que el sistema operativo se reserva abajo de la
   * pantalla: la barra de los tres botones o la barrita de gestos en Android,
   * el indicador de inicio en el iPhone.
   *
   * Desde el SDK 54 Android dibuja SIEMPRE de borde a borde: la app pinta por
   * debajo de las barras del sistema, no arriba. Con un alto fijo, la barra de
   * pestanas quedaba tapada justo en la parte de abajo, que es donde estan las
   * etiquetas. En un telefono con navegacion por gestos casi no se notaba
   * (la barrita mide ~16px) y en uno con los tres botones se comia el texto
   * entero (~48px). Esa es la razon por la que la app no se veia igual en
   * todos los Android.
   */
  const insets = useSafeAreaInsets();

  if (cargando) return <Cargando />;
  if (!sesion) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#151520',
          borderTopColor: '#252538',
          borderTopWidth: 1,
          // El alto util del contenido (icono + etiqueta) mas lo que el
          // sistema se reserve abajo, que no es contenido: es margen para no
          // quedar debajo de los botones del telefono.
          height: 64 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: '#AAFF4D',
        tabBarInactiveTintColor: '#5A5A78',
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
        sceneStyle: { backgroundColor: '#0C0C13' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => <IconoInicio activo={focused} />,
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: 'Gastos',
          tabBarIcon: ({ focused }) => <IconoLista activo={focused} />,
        }}
      />
      <Tabs.Screen
        name="grupos"
        options={{
          title: 'Grupos',
          tabBarIcon: ({ focused }) => <IconoHogar activo={focused} />,
        }}
      />
    </Tabs>
  );
}

import { Redirect, Tabs } from 'expo-router';
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
          height: 86,
          paddingTop: 10,
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

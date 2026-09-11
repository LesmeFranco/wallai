import { Redirect } from 'expo-router';
import { Cargando } from '../componentes/base';
import { useSesion } from '../lib/sesion';

/**
 * Puerta de entrada: decide si la persona ve el login o el dashboard.
 *
 * Mientras `cargando` es true se esta leyendo la sesion guardada en el
 * telefono. Es importante no redirigir en ese momento: si se hiciera, alguien
 * con sesion activa veria la pantalla de login por un instante en cada
 * arranque.
 */
export default function Entrada() {
  const { sesion, cargando } = useSesion();

  if (cargando) return <Cargando />;
  return <Redirect href={sesion ? '/dashboard' : '/login'} />;
}

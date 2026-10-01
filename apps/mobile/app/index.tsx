import { Redirect } from 'expo-router';
import { Cargando } from '../componentes/base';
import { useDestinoTrasEntrar } from '../lib/primerIngreso';
import { useSesion } from '../lib/sesion';

/**
 * Puerta de entrada: decide si la persona ve el login, la bienvenida, una
 * invitacion que quedo esperando, o el dashboard. Quien decide es
 * `useDestinoTrasEntrar`, compartido con la pantalla de login.
 *
 * Mientras `cargando` es true se esta leyendo la sesion guardada en el
 * telefono. Es importante no redirigir en ese momento: si se hiciera, alguien
 * con sesion activa veria la pantalla de login por un instante en cada
 * arranque.
 */
export default function Entrada() {
  const { sesion, cargando } = useSesion();
  const destino = useDestinoTrasEntrar(sesion?.user.id);

  if (cargando) return <Cargando />;
  if (!sesion) return <Redirect href="/login" />;
  // Mientras se resuelve a donde va (invitacion pendiente, bienvenida o
  // dashboard) no se redirige: mandarla al dashboard y corregir despues haria
  // parpadear una pantalla que no era la que correspondia.
  if (!destino) return <Cargando />;
  if (destino.tipo === 'invitacion') {
    return <Redirect href={{ pathname: '/unirse/[codigo]', params: { codigo: destino.codigo } }} />;
  }
  if (destino.tipo === 'bienvenida') return <Redirect href="/bienvenida" />;
  return <Redirect href="/dashboard" />;
}

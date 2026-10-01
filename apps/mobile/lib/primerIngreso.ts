import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { leerInvitacionPendiente } from './invitacion';

/**
 * Si la persona ya vio la bienvenida, y a donde mandarla al entrar.
 *
 * POR QUE SE GUARDA POR USUARIO Y NO "a secas". Un telefono puede tener la
 * cuenta de prueba y la real, o pasar de mano en mano en la familia. Si la
 * bandera fuera una sola, el segundo en entrar nunca veria la bienvenida, que
 * es justo quien mas la necesita: alguien a quien le pasaron la app sin
 * explicarle nada.
 *
 * La clave de SecureStore solo admite letras, numeros, punto, guion y guion
 * bajo, asi que el id del usuario -que es un UUID- entra tal cual.
 */
const PREFIJO = 'wallai.bienvenida.vista.';

export async function marcarBienvenidaVista(usuarioId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(`${PREFIJO}${usuarioId}`, '1');
  } catch {
    // No poder guardarlo solo significa que la bienvenida se va a volver a
    // mostrar la proxima vez. Es molesto, no roto.
  }
}

async function yaVioLaBienvenida(usuarioId: string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(`${PREFIJO}${usuarioId}`)) === '1';
  } catch {
    /**
     * Si no se puede leer, se asume que YA la vio.
     *
     * Es la decision conservadora: equivocarse para este lado significa que
     * alguien no ve un tutorial que podria haberle servido. Equivocarse para el
     * otro significa meterle la bienvenida en la cara a alguien que usa la app
     * todos los dias, cada vez que abre.
     */
    return true;
  }
}

export type DestinoTrasEntrar =
  | { tipo: 'invitacion'; codigo: string }
  | { tipo: 'bienvenida' }
  | { tipo: 'dashboard' };

/**
 * A donde va alguien que acaba de entrar, o `undefined` mientras se resuelve.
 *
 * El orden de prioridades no es casual:
 *
 *  1. Una invitacion pendiente. Esa persona entro para contestar algo concreto
 *     -si se suma a un grupo- y hacerla pasar antes por un tutorial seria
 *     ponerle un trámite en el camino de lo que vino a hacer.
 *  2. La bienvenida, si nunca la vio.
 *  3. El dashboard.
 *
 * Vive en un solo lugar porque hay dos puertas de entrada: el arranque de la app
 * (`app/index.tsx`) y el momento de entrar a la cuenta (`app/login.tsx`). Si cada
 * una decidiera por su cuenta, tarde o temprano una de las dos se olvidaria de
 * un caso: ya paso con la invitacion pendiente, que al principio solo estaba en
 * el login.
 */
export function useDestinoTrasEntrar(usuarioId: string | undefined): DestinoTrasEntrar | undefined {
  const [destino, setDestino] = useState<DestinoTrasEntrar | undefined>(undefined);

  useEffect(() => {
    if (!usuarioId) {
      setDestino(undefined);
      return;
    }
    let vivo = true;
    void (async () => {
      const codigo = await leerInvitacionPendiente();
      if (!vivo) return;
      if (codigo) return setDestino({ tipo: 'invitacion', codigo });

      const vista = await yaVioLaBienvenida(usuarioId);
      if (!vivo) return;
      setDestino(vista ? { tipo: 'dashboard' } : { tipo: 'bienvenida' });
    })();
    return () => {
      vivo = false;
    };
  }, [usuarioId]);

  return destino;
}

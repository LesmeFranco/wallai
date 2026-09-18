import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { HORA_DEL_AVISO, rangoMesActual } from '@wallai/validators';
import { useDialogos } from './Dialogo';
import { Tarjeta } from './base';
import {
  guardarPreferenciasDeAviso,
  hayPermisoDeAvisos,
  leerPreferenciasDeAviso,
  pedirPermisoDeAvisos,
  reprogramarAvisos,
} from '../lib/notificaciones';

/**
 * El interruptor del aviso de la noche, en la pantalla de Grupos.
 *
 * Esta pantalla hace tambien de "ajustes" (es donde vive Cerrar sesion), y
 * sumar una pestana entera para una sola preferencia seria peor: una pestana
 * mas que mirar todos los dias a cambio de algo que se toca una vez.
 *
 * El interruptor esta dibujado a mano y no es el `Switch` de React Native por
 * el mismo motivo por el que los cuadros de confirmar dejaron de ser los de
 * Android: el del sistema se ve distinto en cada telefono y no acompana los
 * colores de la app.
 */
export function AvisoDeLaNoche() {
  const { avisar } = useDialogos();
  /** null mientras se lee la preferencia guardada: evita dibujar mal y corregir. */
  const [activos, setActivos] = useState<boolean | null>(null);
  const [permitido, setPermitido] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    void (async () => {
      const [preferencias, permiso] = await Promise.all([
        leerPreferenciasDeAviso(),
        hayPermisoDeAvisos(),
      ]);
      setActivos(preferencias.activos);
      setPermitido(permiso);
    })();
  }, []);

  if (activos === null) return null;

  /** Suena de verdad solo si la persona lo quiere Y el sistema lo permite. */
  const encendido = activos && permitido;

  async function alternar() {
    setGuardando(true);
    try {
      if (encendido) {
        setActivos(false);
        await guardarPreferenciasDeAviso({ activos: false });
        return;
      }

      const concedido = await pedirPermisoDeAvisos();
      if (!concedido) {
        await avisar({
          titulo: 'Los avisos están apagados',
          // No se nombra ninguna herramienta ni se explica una configuracion
          // que la persona no pueda hacer desde donde esta parada.
          mensaje: 'Activá las notificaciones de Wallai en los ajustes del teléfono.',
        });
        return;
      }

      setPermitido(true);
      setActivos(true);
      await guardarPreferenciasDeAviso({ activos: true });
      /**
       * Deja programadas las noches de reserva ya mismo.
       *
       * El calculo bueno (si cargo hoy, como viene el objetivo) lo hace el
       * dashboard cuando se vuelve a Inicio, porque es el que tiene esos datos.
       * Aca se pasa el caso mudo a proposito: programa los recordatorios de las
       * proximas noches sin arriesgar un aviso de esta noche que podria estar
       * equivocado.
       */
      await reprogramarAvisos({
        cargoHoy: true,
        progreso: null,
        mes: rangoMesActual().desde.slice(0, 7),
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta className="mb-4 px-5 py-4">
      <View className="flex-row items-center gap-4">
        <View className="flex-1">
          <Text className="font-cuerpo-semi text-[15px] text-primario">Aviso de la noche</Text>
          <Text className="mt-1 font-cuerpo text-xs leading-5 text-secundario">
            {encendido
              ? `Una sola notificación, a las ${HORA_DEL_AVISO}. Si cargaste tus gastos y venís bien con el objetivo, no suena.`
              : 'Un recordatorio por día para cargar lo que gastaste, y un aviso si te estás pasando del objetivo.'}
          </Text>
        </View>

        <Pressable
          onPress={() => void alternar()}
          disabled={guardando}
          accessibilityRole="switch"
          accessibilityState={{ checked: encendido }}
          accessibilityLabel="Aviso de la noche"
          className={`h-7 w-12 justify-center rounded-pastilla px-1 ${
            encendido ? 'bg-lima' : 'bg-borde-claro'
          } ${guardando ? 'opacity-50' : ''}`}
        >
          <View
            className={`h-5 w-5 rounded-pastilla bg-fondo ${encendido ? 'self-end' : 'self-start'}`}
          />
        </Pressable>
      </View>
    </Tarjeta>
  );
}

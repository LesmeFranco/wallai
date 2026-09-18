import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { IconoMas } from './iconos';

/**
 * El boton de "cargar gasto", flotando sobre el contenido.
 *
 * Es la accion mas importante de la app (cargar un gasto tiene que ser mas
 * simple que escribir un WhatsApp), asi que esta presente y alcanzable con el
 * pulgar en las dos pantallas donde la persona pasa el tiempo: el dashboard y
 * el historial.
 */
export function BotonFlotante() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/gasto/nuevo')}
      accessibilityLabel="Cargar un gasto"
      className="absolute bottom-6 right-5 h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-lima active:scale-[0.93]"
      style={{
        /**
         * La sombra tenida del color del boton es del mockup: lo despega del
         * fondo oscuro sin necesidad de un borde.
         *
         * Va como `boxShadow` y no como las cuatro propiedades `shadow*` de
         * antes porque esas son SOLO de iOS: en Android la sombra se pide con
         * `elevation`, que no acepta color y dibuja una sombra negra. O sea que
         * el resplandor lima se veia en iPhone y en Android no se veia nada.
         * `boxShadow` existe en React Native desde la 0.76 con la arquitectura
         * nueva (que es el default del SDK 57) y se dibuja igual en los dos.
         */
        boxShadow: '0px 8px 16px rgba(170, 255, 77, 0.35)',
      }}
    >
      <IconoMas />
    </Pressable>
  );
}

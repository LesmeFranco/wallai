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
        // La sombra tenida del color del boton es del mockup: lo despega del
        // fondo oscuro sin necesidad de un borde.
        shadowColor: '#AAFF4D',
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }}
    >
      <IconoMas />
    </Pressable>
  );
}

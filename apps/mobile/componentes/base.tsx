import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import type { ReactNode } from 'react';
import { presentacionDe } from '../lib/categorias';

/**
 * Piezas visuales que se repiten en todas las pantallas.
 *
 * Existen para que el diseno quede definido en un solo lugar: si manana cambia
 * el radio de las tarjetas o el color de un boton, se cambia aca y no en nueve
 * pantallas.
 */

export function Tarjeta({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-tarjeta border border-borde bg-superficie ${className}`}>
      {children}
    </View>
  );
}

/** Texto chico en mayusculas que titula una seccion o una tarjeta. */
export function Etiqueta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <Text className={`font-cuerpo-medio text-xs uppercase tracking-wide text-tenue ${className}`}>
      {children}
    </Text>
  );
}

export function BotonPrimario({
  children,
  onPress,
  deshabilitado = false,
  cargando = false,
  className = '',
}: {
  children: ReactNode;
  onPress: () => void;
  deshabilitado?: boolean;
  cargando?: boolean;
  className?: string;
}) {
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      // `active:scale-[0.97]` reproduce el feedback tactil del mockup: el boton
      // se hunde un poco al tocarlo.
      className={`items-center justify-center rounded-boton bg-lima py-[18px] active:scale-[0.97] ${inactivo ? 'opacity-40' : ''} ${className}`}
    >
      {cargando ? (
        <ActivityIndicator color="#0C0C13" />
      ) : (
        <Text className="font-display text-[17px] text-fondo">{children}</Text>
      )}
    </Pressable>
  );
}

export function BotonSecundario({
  children,
  onPress,
  className = '',
}: {
  children: ReactNode;
  onPress: () => void;
  className?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`items-center justify-center rounded-boton border-[1.5px] border-borde-claro bg-superficie-alta py-[18px] active:opacity-70 ${className}`}
    >
      <Text className="font-display text-[17px] text-primario">{children}</Text>
    </Pressable>
  );
}

export function Campo({ etiqueta, className = '', ...props }: TextInputProps & { etiqueta?: string; className?: string }) {
  return (
    <View>
      {etiqueta ? <Etiqueta className="mb-2">{etiqueta}</Etiqueta> : null}
      <TextInput
        placeholderTextColor="#5A5A78"
        className={`rounded-[14px] border-[1.5px] border-borde bg-campo px-[18px] py-4 font-cuerpo text-base text-primario ${className}`}
        {...props}
      />
    </View>
  );
}

/** El circulo con el icono de una categoria, tenido con su color. */
export function IconoCategoria({
  clave,
  tamano = 40,
}: {
  clave: string | null;
  tamano?: number;
}) {
  const { icono, color } = presentacionDe(clave);
  return (
    <View
      style={{
        width: tamano,
        height: tamano,
        borderRadius: tamano * 0.38,
        // El color de la categoria al 12% de opacidad como fondo y al 25% como
        // borde: el mismo color tine la pastilla sin competir con el texto.
        backgroundColor: `${color}20`,
        borderWidth: 1.5,
        borderColor: `${color}40`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: tamano * 0.45 }}>{icono}</Text>
    </View>
  );
}

/** Pastilla con el nombre de una categoria. */
export function PastillaCategoria({
  nombre,
  clave,
  seleccionada = false,
  onPress,
}: {
  nombre: string;
  clave: string | null;
  seleccionada?: boolean;
  onPress?: () => void;
}) {
  const { icono, color } = presentacionDe(clave);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 100,
        backgroundColor: seleccionada ? `${color}25` : '#1C1C2A',
        borderWidth: 1.5,
        borderColor: seleccionada ? color : '#252538',
      }}
    >
      <Text style={{ fontSize: 14 }}>{icono}</Text>
      <Text
        className="font-cuerpo-semi text-[13px]"
        style={{ color: seleccionada ? color : '#9999B3' }}
      >
        {nombre}
      </Text>
    </Pressable>
  );
}

/**
 * Mensaje de error de una operacion, en el lugar donde se intento.
 *
 * Se llama MensajeError y no Error para no pisar el `Error` de JavaScript en
 * los archivos que lo importen.
 */
export function MensajeError({ mensaje }: { mensaje: string }) {
  return (
    <View className="rounded-[14px] border border-coral/40 bg-coral/10 px-4 py-3">
      <Text className="font-cuerpo text-[13px] text-coral">{mensaje}</Text>
    </View>
  );
}

export function Cargando() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator color="#AAFF4D" />
    </View>
  );
}

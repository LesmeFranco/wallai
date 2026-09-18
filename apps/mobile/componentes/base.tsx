import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useState, type ReactNode } from 'react';
import { IconoOjo } from './iconos';
import { presentacionDe } from '../lib/categorias';

/**
 * Piezas visuales que se repiten en todas las pantallas.
 *
 * Existen para que el diseno quede definido en un solo lugar: si manana cambia
 * el radio de las tarjetas o el color de un boton, se cambia aca y no en nueve
 * pantallas.
 */

/**
 * Hasta cuanto se deja agrandar un monto cuando el telefono tiene el tamano de
 * letra del sistema en grande.
 *
 * Android y iOS dejan subir la letra bastante mas que esto (hasta 2x o mas en
 * los ajustes de accesibilidad). Los textos corridos de la app acompanan ese
 * ajuste sin problema, porque pueden usar mas renglones; los montos no: viven
 * en tarjetas de alto fijo y en filas con el icono a la izquierda, asi que a
 * 2x se cortan o desbordan la tarjeta. 1,3 es el punto donde todavia se leen
 * mas grandes y siguen entrando.
 *
 * Va aca y no suelto en cada pantalla para que sea un solo numero: si manana
 * hay que ajustarlo, se ajusta una vez.
 */
export const MAX_ESCALA_MONTO = 1.3;

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

export function Campo({
  etiqueta,
  className = '',
  secureTextEntry,
  ...props
}: TextInputProps & { etiqueta?: string; className?: string }) {
  /**
   * Si la contrasena se esta viendo o no.
   *
   * El boton aparece solo en los campos de contrasena, y arranca oculta: lo
   * normal es escribirla sin que se vea, y el ojo esta para las veces que uno
   * quiere confirmar que la tecleo bien. Sin esto, equivocarse en un caracter
   * obligaba a borrar todo y escribir de nuevo a ciegas.
   */
  const [visible, setVisible] = useState(false);
  const esContrasena = secureTextEntry === true;

  return (
    <View>
      {etiqueta ? <Etiqueta className="mb-2">{etiqueta}</Etiqueta> : null}
      <View className="relative justify-center">
        <TextInput
          placeholderTextColor="#5A5A78"
          // El texto se oculta salvo que la persona haya pedido verlo.
          secureTextEntry={esContrasena ? !visible : secureTextEntry}
          className={`rounded-[14px] border-[1.5px] border-borde bg-campo py-4 pl-[18px] font-cuerpo text-base text-primario ${
            // Espacio a la derecha solo cuando hay boton, para que el texto
            // largo no se meta abajo del ojo.
            esContrasena ? 'pr-[52px]' : 'pr-[18px]'
          } ${className}`}
          {...props}
        />
        {esContrasena ? (
          <Pressable
            onPress={() => setVisible(!visible)}
            // hitSlop porque el icono mide 20px: sin agrandar el area tocable
            // hay que apuntar demasiado con el pulgar.
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
            // top/bottom en 0 mas justify-center centra el ojo verticalmente sin
            // depender de la altura del campo, que cambia con el tamano de
            // fuente del sistema.
            className="absolute bottom-0 right-[18px] top-0 justify-center active:opacity-60"
          >
            <IconoOjo tachado={visible} />
          </Pressable>
        ) : null}
      </View>
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

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BotonPrimario, Etiqueta, Tarjeta } from '../componentes/base';
import { useSesion } from '../lib/sesion';
import { marcarBienvenidaVista } from '../lib/primerIngreso';

/**
 * La bienvenida que ve alguien la primera vez que entra.
 *
 * POR QUE TRES PANTALLAS Y NO GLOBITOS SOBRE LA INTERFAZ REAL. Los globitos
 * ("esto es el boton de cargar") suenan mejor, pero hay que medir posiciones en
 * pantalla, y esta app ya acumula tres bugs de exactamente eso: la barra de
 * pestanas tapada por los botones de Android, las hojas que cerraban debajo de
 * ellos, y los montos partidos por el tamano de letra del sistema. Un globito
 * posicionado a mano seria el cuarto, y encima en el primer minuto de uso de
 * alguien que todavia no confia en la app.
 *
 * QUE ENSENA, y por que en este orden: el unico gesto que hay que aprender es
 * escribir el gasto en una frase. Lo demas (categorias, grupos) se entiende solo
 * despues. Por eso el primer paso es el gesto, el segundo es que la app
 * categoriza sola -que es la razon por la que ese gesto alcanza-, y el tercero
 * es compartir, que es lo unico que requiere una decision.
 *
 * SE PUEDE SALTEAR SIEMPRE, y saltearla cuenta como haberla visto: alguien que
 * no quiere leer no tiene que volver a encontrarse esto cada vez que abre.
 */
export default function Bienvenida() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sesion } = useSesion();
  const [paso, setPaso] = useState(0);

  const usuarioId = sesion?.user.id;

  /** Marca la bienvenida como vista y sale. `luego` corre despues de salir. */
  async function terminar(luego?: () => void) {
    if (usuarioId) await marcarBienvenidaVista(usuarioId);
    router.replace('/dashboard');
    luego?.();
  }

  const pasos = [
    {
      titulo: 'Anotá lo que gastás escribiendo',
      cuerpo:
        'Poné el monto y qué fue, como se lo contarías a alguien por mensaje. No hay formularios ni categorías que elegir.',
      ejemplo: <EjemploDeUnGasto />,
    },
    {
      titulo: 'Wallai lo categoriza solo',
      cuerpo:
        'Si se equivoca, la corregís una vez y la próxima vez que escribas algo parecido ya lo va a saber. Y si tenés varios gastos juntos, van uno por renglón.',
      ejemplo: <EjemploDeVariosGastos />,
    },
    {
      titulo: 'Compartilo con tu casa',
      cuerpo:
        'Creá un hogar y mandá el link: lo que carga cada uno suma al mismo total. Wallai no lleva la cuenta de quién le debe a quién, sino de cuánto gastaron entre todos.',
      ejemplo: <EjemploDeHogar />,
    },
  ];

  const actual = pasos[paso]!;
  const esElUltimo = paso === pasos.length - 1;

  return (
    <View
      className="flex-1 px-7"
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }}
    >
      <View className="flex-row items-center justify-between">
        {/* Los puntos dicen cuanto falta, que es lo que hace que la persona
            siga en vez de buscar la salida. */}
        <View className="flex-row gap-1.5">
          {pasos.map((_, indice) => (
            <View
              key={indice}
              className={`h-1.5 rounded-pastilla ${
                indice === paso ? 'w-6 bg-lima' : 'w-1.5 bg-borde-claro'
              }`}
            />
          ))}
        </View>

        <Pressable onPress={() => void terminar()} hitSlop={12} className="active:opacity-60">
          <Text className="font-cuerpo text-[13px] text-tenue">Saltar</Text>
        </Pressable>
      </View>

      {/* `key` fuerza que la animacion de entrada se vuelva a disparar en cada
          paso: sin eso React reusa la vista y el cambio se siente seco. */}
      <Animated.View key={paso} entering={FadeIn.duration(220)} className="mt-10 flex-1">
        <Text className="font-display-extra text-[30px] leading-9 tracking-tight text-primario">
          {actual.titulo}
        </Text>
        <Text className="mt-3 font-cuerpo text-[15px] leading-6 text-secundario">
          {actual.cuerpo}
        </Text>

        <View className="mt-8">{actual.ejemplo}</View>
      </Animated.View>

      <View className="gap-3">
        <BotonPrimario onPress={() => (esElUltimo ? void terminar() : setPaso(paso + 1))}>
          {esElUltimo ? 'Empezar' : 'Siguiente'}
        </BotonPrimario>

        {/* El atajo a crear el hogar va solo en el ultimo paso, que es donde la
            idea recien se explico. Antes seria pedir una decision sobre algo que
            la persona todavia no sabe que es. */}
        {esElUltimo ? (
          <Pressable
            onPress={() => void terminar(() => router.push('/grupo/crear'))}
            className="items-center rounded-boton border-[1.5px] border-borde-claro py-3.5 active:opacity-70"
          >
            <Text className="font-cuerpo-semi text-sm text-primario">Crear un hogar ahora</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Lo que la persona escribe y lo que la app entiende, en una tarjeta. */
function EjemploDeUnGasto() {
  return (
    <Tarjeta className="p-5">
      <Etiqueta>Escribís</Etiqueta>
      <Text className="mt-2 font-display text-[26px] tracking-tight text-primario">
        3000 hamburguesa
      </Text>

      <View className="mt-5 flex-row items-center gap-3">
        <View className="flex-1">
          <Etiqueta>Monto</Etiqueta>
          <Text className="mt-1 font-display text-xl tracking-tight text-lima">$ 3.000</Text>
        </View>
        <View className="flex-1">
          <Etiqueta>Categoría</Etiqueta>
          <Text className="mt-1 font-cuerpo-semi text-[15px] text-primario">🍔 Comida</Text>
        </View>
      </View>
    </Tarjeta>
  );
}

/** Tres renglones y la categoria de cada uno. */
function EjemploDeVariosGastos() {
  const filas = [
    { texto: '3000 hamburguesa', categoria: '🍔 Comida' },
    { texto: '5000 sube', categoria: '🚌 Transporte' },
    { texto: '7000 pan', categoria: '🍔 Comida' },
  ];
  return (
    <Tarjeta className="p-5">
      <View className="gap-3">
        {filas.map((fila) => (
          <View key={fila.texto} className="flex-row items-center justify-between gap-3">
            <Text className="font-cuerpo text-[15px] text-primario">{fila.texto}</Text>
            <Text className="font-cuerpo text-[13px] text-secundario">{fila.categoria}</Text>
          </View>
        ))}
      </View>
    </Tarjeta>
  );
}

/** El total compartido, que es la pregunta que el producto contesta. */
function EjemploDeHogar() {
  return (
    <Tarjeta className="items-center p-6">
      <Etiqueta>Gastó la casa este mes</Etiqueta>
      <Text className="mt-2 font-display-extra text-[38px] leading-none tracking-tighter text-lima">
        $ 284.500
      </Text>
      <View className="mt-4 flex-row gap-2.5">
        {['F', 'M', 'P'].map((inicial, indice) => (
          <View
            key={inicial}
            className="h-9 w-9 items-center justify-center rounded-xl"
            style={{
              backgroundColor: ['#AAFF4D20', '#5B8DFF20', '#B47FFF20'][indice],
              borderWidth: 1.5,
              borderColor: ['#AAFF4D40', '#5B8DFF40', '#B47FFF40'][indice],
            }}
          >
            <Text
              className="font-display text-sm"
              style={{ color: ['#AAFF4D', '#5B8DFF', '#B47FFF'][indice] }}
            >
              {inicial}
            </Text>
          </View>
        ))}
      </View>
    </Tarjeta>
  );
}

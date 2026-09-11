import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { parsearTexto, type DestinoGasto } from '@wallai/validators';
import {
  BotonPrimario,
  Etiqueta,
  MensajeError,
  PastillaCategoria,
  Tarjeta,
} from '../../componentes/base';
import { IconoTilde, IconoVolver } from '../../componentes/iconos';
import { formatearPesosSinCentavos } from '../../lib/formato';
import { presentacionDeGrupo } from '../../lib/grupos';
import { trpc } from '../../lib/trpc';

/**
 * Ejemplos que se muestran como atajos.
 *
 * Todos llevan "$" a proposito: el parser solo toma como monto un numero
 * marcado con "$" o con la palabra "pesos" (ver el comentario de alcance en
 * packages/validators/src/parser.ts). Un ejemplo sin el signo se guardaria mal
 * o seria rechazado, asi que los atajos tienen que ensenar la forma que
 * funciona.
 */
const EJEMPLOS = ['$30000 nafta Shell', '$15500 café y medialunas', '$8900 colectivo', '$45000 super Coto'];

type Estado = 'escribiendo' | 'guardado';

export default function NuevoGasto() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();

  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<Estado>('escribiendo');
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categorias = trpc.categorias.listar.useQuery();
  const grupos = trpc.hogares.mios.useQuery();

  /**
   * A donde va este gasto. `null` significa "no lo elegi a mano todavia", que
   * no es lo mismo que "privado": sin eleccion explicita se usa el primer
   * grupo, y si la persona no esta en ninguno, queda privado.
   *
   * Se guarda la eleccion del usuario aparte del valor efectivo para que el
   * default pueda cambiar cuando terminan de cargar los grupos sin pisar lo
   * que la persona ya haya tocado.
   */
  const [destinoElegido, setDestinoElegido] = useState<DestinoGasto | null>(null);

  const misGrupos = grupos.data ?? [];
  const destino: DestinoGasto =
    destinoElegido ??
    (misGrupos[0] ? { tipo: 'hogar', hogarId: misGrupos[0].id } : { tipo: 'personal' });

  /**
   * El monto se muestra mientras la persona escribe, calculado en el telefono
   * con el MISMO parser que usa el servidor (esta en packages/validators, que
   * es codigo puro compartido). No hay forma de que lo que se ve en pantalla
   * difiera de lo que se va a guardar, y no cuesta una llamada de red.
   */
  const analisis = useMemo(() => parsearTexto(texto), [texto]);

  const [gastoGuardado, setGastoGuardado] = useState<{
    id: string;
    montoCentavos: number;
    categoriaId: string;
  } | null>(null);

  const crear = trpc.gastos.crear.useMutation({
    onSuccess: (gasto) => {
      setGastoGuardado({
        id: gasto.id,
        montoCentavos: gasto.montoCentavos,
        categoriaId: gasto.categoriaId,
      });
      setEstado('guardado');
      // Invalida lo que el dashboard y el historial muestran, para que al
      // volver ya estén con el gasto nuevo incluido.
      void utils.hogares.resumen.invalidate();
      void utils.gastos.listar.invalidate();
    },
    onError: (problema) => setError(problema.message),
  });

  /**
   * Corregir la categoria, con actualizacion optimista.
   *
   * Antes esto se sentia trabado y la razon era el orden de las cosas: al
   * tocar una pastilla se disparaba la mutacion y la pantalla recien se movia
   * cuando el servidor contestaba. Con la app corriendo contra un backend en
   * otra maquina eso son cientos de milisegundos o segundos enteros, y durante
   * todo ese rato la pastilla tocada no se marcaba: parecia que el toque no
   * habia registrado, asi que uno vuelve a tocar y empeora.
   *
   * Ahora la pantalla se actualiza en el mismo instante del toque y la
   * mutacion viaja despues. Es seguro porque la operacion casi nunca falla, y
   * si falla se vuelve atras: se restaura la categoria anterior y se muestra
   * el error, que es preferible a hacer esperar a todo el mundo por el caso
   * raro.
   */
  const corregir = trpc.gastos.corregirCategoria.useMutation({
    onSuccess: () => {
      setCorrigiendo(false);
      void utils.hogares.resumen.invalidate();
      void utils.gastos.listar.invalidate();
    },
    onError: (problema, _variables, categoriaPrevia) => {
      // El tercer argumento es lo que devolvio `onMutate`: la categoria que
      // habia antes de la correccion optimista.
      if (typeof categoriaPrevia === 'string') {
        setGastoGuardado((previo) => (previo ? { ...previo, categoriaId: categoriaPrevia } : previo));
      }
      setError(problema.message);
    },
    onMutate: (variables) => {
      setError(null);
      // Se lee del closure y no desde dentro de un updater de estado: React
      // puede ejecutar el updater mas tarde, asi que capturar el valor ahi
      // adentro no garantiza tenerlo a tiempo para devolverlo.
      const categoriaPrevia = gastoGuardado?.categoriaId;
      setGastoGuardado((previo) => (previo ? { ...previo, categoriaId: variables.categoriaId } : previo));
      return categoriaPrevia;
    },
  });

  const categoriaGuardada = categorias.data?.find((c) => c.id === gastoGuardado?.categoriaId);

  const grupoDelDestino =
    destino.tipo === 'hogar' ? misGrupos.find((grupo) => grupo.id === destino.hogarId) : undefined;
  const nombreDelDestino = grupoDelDestino
    ? `${presentacionDeGrupo(grupoDelDestino.tipo).icono} ${grupoDelDestino.nombre}`
    : '🔒 Privado, solo lo ves vos';

  if (estado === 'guardado' && gastoGuardado) {
    return (
      <View className="flex-1 items-center justify-center px-7" style={{ paddingTop: insets.top }}>
        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          className="h-20 w-20 items-center justify-center rounded-[28px] bg-lima"
        >
          <IconoTilde />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(150)} className="mt-6 items-center">
          <Text className="font-display-extra text-4xl tracking-tighter text-lima">
            {formatearPesosSinCentavos(gastoGuardado.montoCentavos)}
          </Text>
          <Text className="mt-1 font-cuerpo text-[15px] text-secundario">
            Guardado en{' '}
            <Text className="font-cuerpo-semi text-primario">
              {categoriaGuardada?.nombre ?? 'Otros'}
            </Text>
          </Text>
          {/* Con varios grupos posibles, saber en cual quedo es tan importante
              como saber la categoria: es lo que define quien lo va a ver. */}
          {misGrupos.length > 0 ? (
            <Text className="mt-0.5 font-cuerpo text-[13px] text-tenue">{nombreDelDestino}</Text>
          ) : null}
        </Animated.View>

        {corrigiendo ? (
          <Animated.View entering={FadeIn} className="mt-7 w-full">
            <Etiqueta className="mb-3 text-center">¿En qué categoría va?</Etiqueta>
            <View className="flex-row flex-wrap justify-center gap-2">
              {categorias.data?.map((categoria) => (
                <PastillaCategoria
                  key={categoria.id}
                  nombre={categoria.nombre}
                  clave={categoria.clave}
                  seleccionada={categoria.id === gastoGuardado.categoriaId}
                  onPress={() =>
                    corregir.mutate({ gastoId: gastoGuardado.id, categoriaId: categoria.id })
                  }
                />
              ))}
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.delay(300)} className="mt-7 items-center gap-3">
            <Pressable
              onPress={() => setCorrigiendo(true)}
              className="rounded-pastilla border border-lima/25 bg-lima/10 px-4 py-2"
            >
              <Text className="font-cuerpo-semi text-[13px] text-lima">
                No es esa categoría, corregir
              </Text>
            </Pressable>
            <Text className="text-center font-cuerpo text-xs text-tenue">
              Si la corregís, la próxima vez que escribas algo parecido{'\n'}Wallai ya va a saber
              dónde va.
            </Text>
          </Animated.View>
        )}

        {error ? <View className="mt-5 w-full"><MensajeError mensaje={error} /></View> : null}

        <View className="mt-9 w-full">
          <BotonPrimario onPress={() => router.back()}>Listo</BotonPrimario>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <View className="flex-row items-center gap-3 px-5 pb-5" style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <IconoVolver />
        </Pressable>
        <Text className="font-display-extra text-[22px] tracking-tight text-primario">
          Nuevo gasto
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="flex-grow px-5 pb-6"
        keyboardShouldPersistTaps="handled"
      >
        <Tarjeta className="min-h-[180px] flex-1 border-2 p-6">
          <Etiqueta className="mb-4">¿Qué gastaste?</Etiqueta>
          <TextInput
            value={texto}
            onChangeText={(valor) => {
              setTexto(valor);
              setError(null);
            }}
            placeholder={'$30000 hamburguesa\nen Guido'}
            placeholderTextColor="#5A5A78"
            multiline
            autoFocus
            className="flex-1 font-display text-[30px] leading-10 tracking-tight text-primario"
            style={{ textAlignVertical: 'top' }}
          />

          {analisis.montoCentavos === null ? (
            <Text className="mt-2 font-cuerpo text-[13px] text-tenue">
              Escribí el monto con $ adelante (o la palabra "pesos") y qué fue. Wallai lo categoriza
              solo.
            </Text>
          ) : (
            <View className="mt-3 flex-row items-baseline gap-2">
              <Etiqueta>Monto detectado</Etiqueta>
              <Text className="font-display text-xl tracking-tight text-lima">
                {formatearPesosSinCentavos(analisis.montoCentavos)}
              </Text>
            </View>
          )}
        </Tarjeta>

        {/*
          El selector de destino aparece solo si la persona pertenece a algun
          grupo. Sin grupos hay un unico destino posible y mostrar la pregunta
          seria agregarle un paso a la accion mas repetida de la app para que
          siempre conteste lo mismo.
        */}
        {misGrupos.length > 0 ? (
          <View className="mt-4">
            <Etiqueta className="mb-2.5">¿Dónde lo anoto?</Etiqueta>
            <View className="flex-row flex-wrap gap-2">
              {misGrupos.map((grupo) => {
                const activo = destino.tipo === 'hogar' && destino.hogarId === grupo.id;
                return (
                  <Pressable
                    key={grupo.id}
                    onPress={() => setDestinoElegido({ tipo: 'hogar', hogarId: grupo.id })}
                    className={`rounded-pastilla px-3.5 py-2 ${
                      activo ? 'border-[1.5px] border-lima bg-lima/15' : 'border-[1.5px] border-borde bg-superficie-alta'
                    }`}
                  >
                    <Text
                      className={`font-cuerpo-semi text-[13px] ${activo ? 'text-lima' : 'text-secundario'}`}
                    >
                      {presentacionDeGrupo(grupo.tipo).icono} {grupo.nombre}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => setDestinoElegido({ tipo: 'personal' })}
                className={`rounded-pastilla px-3.5 py-2 ${
                  destino.tipo === 'personal'
                    ? 'border-[1.5px] border-lima bg-lima/15'
                    : 'border-[1.5px] border-borde bg-superficie-alta'
                }`}
              >
                <Text
                  className={`font-cuerpo-semi text-[13px] ${
                    destino.tipo === 'personal' ? 'text-lima' : 'text-secundario'
                  }`}
                >
                  🔒 Solo mío
                </Text>
              </Pressable>
            </View>

            {destino.tipo === 'personal' ? (
              <Text className="mt-2 font-cuerpo text-xs leading-4 text-tenue">
                No lo va a ver nadie de tus grupos y no suma a ningún total compartido.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View className="mt-4">
          <Etiqueta className="mb-2.5">Rápidos</Etiqueta>
          <View className="flex-row flex-wrap gap-2">
            {EJEMPLOS.map((ejemplo) => (
              <Pressable
                key={ejemplo}
                onPress={() => setTexto(ejemplo)}
                className="rounded-pastilla border border-borde bg-superficie-alta px-3.5 py-2 active:opacity-70"
              >
                <Text className="font-cuerpo-medio text-[13px] text-secundario">{ejemplo}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? <View className="mt-4"><MensajeError mensaje={error} /></View> : null}

        <View className="mt-auto pt-4">
          <BotonPrimario
            onPress={() => crear.mutate({ texto: texto.trim(), destino })}
            deshabilitado={texto.trim().length === 0}
            cargando={crear.isPending}
          >
            Guardar gasto
          </BotonPrimario>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

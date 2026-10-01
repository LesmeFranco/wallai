import { useEffect, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  diasEntre,
  hoyArgentina,
  proyectarCierre,
  rangoMesAnterior,
  type Alcance,
} from '@wallai/validators';
import { Etiqueta, MontoAnimado, MAX_ESCALA_MONTO } from './base';
import { IconoCruz } from './iconos';
import { presentacionDe } from '../lib/categorias';
import {
  capitalizar,
  formatearDiaLargo,
  formatearMes,
  formatearPesosCorto,
  formatearPesosSinCentavos,
} from '../lib/formato';
import { trpc } from '../lib/trpc';
import type { SalidasApi } from '../lib/trpc';

type Resumen = SalidasApi['hogares']['resumen'];

/**
 * El resumen del mes, que se abre tocando el total del inicio.
 *
 * QUE CONTESTA QUE NO CONTESTE YA EL INICIO. El total del mes es un numero
 * suelto: $284.500 no es mucho ni poco hasta que se lo compara con algo. Esta
 * hoja existe para darle esas comparaciones, y son cuatro, en este orden:
 *
 *   1. Contra el mes pasado. Es la unica que dice si el mes viene bien o mal, y
 *      es la que nadie puede calcular de memoria.
 *   2. Contra el ritmo: cuanto por dia, y en cuanto cerraria el mes si se sigue
 *      asi. A mitad de mes es mas util que el total, porque todavia se puede
 *      hacer algo al respecto.
 *   3. Contra el dia pico, que es el que explica la mayor parte de un mes caro.
 *   4. Contra las categorias, que dicen en que se fue.
 *
 * POR QUE ES UNA HOJA Y NO UNA PANTALLA MAS. Todo esto se mira de vez en cuando
 * y se cierra; no es algo a lo que haya que navegar. Y al ser una hoja, el
 * numero que se toco sigue estando atras: no se pierde el contexto de que total
 * se esta desglosando.
 *
 * LAS ANIMACIONES NO USAN `entering` DE REANIMATED, a proposito. Es la trampa
 * que ya documentamos con los dialogos de la 1.3.0: adentro de un `Modal` de
 * Android las animaciones de entrada no siempre se disparan, y cuando no se
 * disparan la vista puede quedar invisible. Una hoja que a veces no se ve es
 * mucho peor que una sin animacion. Acá cada pieza arranca su propia animacion
 * desde un efecto, que si corre siempre, y el `Modal` entra con su animacion
 * nativa.
 */
export function ResumenDelMes({
  abierto,
  onCerrar,
  resumen,
  alcance,
  tituloDeLaVista,
  clavePorCategoria,
}: {
  abierto: boolean;
  onCerrar: () => void;
  resumen: Resumen;
  alcance: Alcance;
  /** "Mis gastos" o el nombre del grupo: de que billetera es este total. */
  tituloDeLaVista: string;
  /**
   * De que categoria global es cada id, para poder pintarla con su color.
   *
   * Llega por props y no se deduce del nombre a proposito: el nombre de una
   * categoria se puede cambiar y la clave no (es justo para eso que existe la
   * columna). Quien abre esta hoja ya pidio `categorias.listar` para dibujar la
   * pantalla de atras, asi que pasarla no cuesta ninguna consulta nueva.
   */
  clavePorCategoria: Map<string, string | null>;
}) {
  const insets = useSafeAreaInsets();

  /**
   * El mes pasado, para la comparacion. Se pide solo cuando la hoja se abre
   * (`enabled`), que es lo que hace que esta consulta no le cueste nada a quien
   * nunca la abre: el inicio sigue haciendo las mismas tres llamadas de antes.
   */
  const anterior = trpc.hogares.resumen.useQuery(
    { ...rangoMesAnterior(), alcance },
    { enabled: abierto },
  );

  if (!abierto) return null;

  const hoy = hoyArgentina();
  const total = resumen.totalCentavos;
  const esElMesEnCurso = hoy >= resumen.desde && hoy <= resumen.hasta;

  // Hasta donde contar para el promedio: hasta hoy si el mes esta corriendo, y
  // hasta el final si ya cerro. Sin esta distincion, el dia 3 el promedio se
  // dividiria por 31 y daria siempre casi cero.
  const diasContados = esElMesEnCurso
    ? diasEntre(resumen.desde, hoy) + 1
    : diasEntre(resumen.desde, resumen.hasta) + 1;
  const promedioPorDia = Math.round(total / Math.max(diasContados, 1));

  const proyeccion = proyectarCierre({
    gastadoCentavos: total,
    desde: resumen.desde,
    hasta: resumen.hasta,
    hoy,
  });

  const diaPico = [...(resumen.porDia ?? [])].sort(
    (uno, otro) => otro.totalCentavos - uno.totalCentavos,
  )[0];

  const totalAnterior = anterior.data?.totalCentavos ?? null;
  /**
   * La diferencia contra el mes pasado, en porcentaje.
   *
   * Es null cuando el mes pasado no tuvo gastos: dividir por cero daria
   * "infinito por ciento", y "gastaste infinito mas que el mes pasado" no le
   * sirve a nadie. Ese caso se cuenta con palabras mas abajo.
   */
  const variacion =
    totalAnterior !== null && totalAnterior > 0
      ? Math.round(((total - totalAnterior) / totalAnterior) * 100)
      : null;

  const maximoCategoria = Math.max(...resumen.porCategoria.map((c) => c.totalCentavos), 1);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCerrar}>
      <Pressable className="flex-1 bg-black/70" onPress={onCerrar} />

      <View
        className="max-h-[88%] rounded-t-[28px] border-t border-borde bg-superficie"
        style={{ paddingBottom: insets.bottom }}
      >
        <View className="flex-row items-start justify-between px-6 pb-2 pt-6">
          <View className="flex-1">
            <Etiqueta>{tituloDeLaVista}</Etiqueta>
            <Text className="mt-1 font-display-extra text-[26px] tracking-tight text-primario">
              {capitalizar(formatearMes(resumen.desde))}
            </Text>
          </View>
          <Pressable
            onPress={onCerrar}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Cerrar el resumen"
            className="h-9 w-9 items-center justify-center rounded-full border border-borde bg-superficie-alta active:opacity-60"
          >
            <IconoCruz tamano={14} color="#9999B3" />
          </Pressable>
        </View>

        <ScrollView contentContainerClassName="px-6 pb-8" showsVerticalScrollIndicator={false}>
          <Aparece indice={0}>
            {/* El total vuelve a subir desde cero acá adentro: es el mismo
                numero que se toco, y verlo armarse otra vez es lo que ata la
                hoja al gesto que la abrio. */}
            <MontoAnimado
              centavos={total}
              duracionMs={900}
              className="font-display-extra text-[46px] leading-none tracking-tighter text-lima"
              adjustsFontSizeToFit
              numberOfLines={1}
            />
          </Aparece>

          <Aparece indice={1}>
            <ComparacionConElMesPasado
              variacion={variacion}
              totalAnterior={totalAnterior}
              cargando={anterior.isPending}
              hayGastos={total > 0}
            />
          </Aparece>

          <View className="mt-5 flex-row gap-2.5">
            <Aparece indice={2} className="flex-1">
              <Dato
                etiqueta="Por día"
                valor={formatearPesosCorto(promedioPorDia)}
                detalle={`en ${diasContados} ${diasContados === 1 ? 'día' : 'días'}`}
              />
            </Aparece>
            <Aparece indice={3} className="flex-1">
              <Dato
                etiqueta={proyeccion !== null ? 'Cierra en' : 'Día más caro'}
                valor={
                  proyeccion !== null
                    ? formatearPesosCorto(proyeccion)
                    : diaPico
                      ? formatearPesosCorto(diaPico.totalCentavos)
                      : '—'
                }
                detalle={proyeccion !== null ? 'a este ritmo' : 'de todo el mes'}
              />
            </Aparece>
          </View>

          {/* El dia pico solo se nombra si no se uso el recuadro de arriba para
              la proyeccion: repetirlo seria decir dos veces lo mismo. */}
          {proyeccion !== null && diaPico ? (
            <Aparece indice={4}>
              <Text className="mt-4 font-cuerpo text-[13px] leading-5 text-secundario">
                El día más caro fue el{' '}
                <Text className="font-cuerpo-semi text-primario">
                  {formatearDiaLargo(diaPico.fecha)}
                </Text>
                , con{' '}
                <Text className="font-display text-primario" maxFontSizeMultiplier={MAX_ESCALA_MONTO}>
                  {formatearPesosSinCentavos(diaPico.totalCentavos)}
                </Text>
                .
              </Text>
            </Aparece>
          ) : null}

          {resumen.porCategoria.length > 0 ? (
            <Aparece indice={5}>
              <Etiqueta className="mb-3 mt-7">En qué se fue</Etiqueta>
              <View className="gap-3.5">
                {resumen.porCategoria.slice(0, 6).map((fila, indice) => {
                  const { color } = presentacionDe(clavePorCategoria.get(fila.categoriaId) ?? null);
                  const parte = total > 0 ? Math.round((fila.totalCentavos / total) * 100) : 0;
                  return (
                    <View key={fila.categoriaId}>
                      <View className="mb-1.5 flex-row items-center justify-between">
                        <Text className="font-cuerpo-medio text-sm text-primario">
                          {fila.nombre}
                        </Text>
                        <View className="flex-row items-baseline gap-2">
                          <Text className="font-cuerpo text-xs text-tenue">{parte}%</Text>
                          <Text
                            className="font-display text-[15px] text-primario"
                            maxFontSizeMultiplier={MAX_ESCALA_MONTO}
                          >
                            {formatearPesosCorto(fila.totalCentavos)}
                          </Text>
                        </View>
                      </View>
                      <Barra
                        proporcion={fila.totalCentavos / maximoCategoria}
                        color={color}
                        demoraMs={320 + indice * 70}
                      />
                    </View>
                  );
                })}
              </View>
            </Aparece>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function ComparacionConElMesPasado({
  variacion,
  totalAnterior,
  cargando,
  hayGastos,
}: {
  variacion: number | null;
  totalAnterior: number | null;
  cargando: boolean;
  hayGastos: boolean;
}) {
  if (cargando) {
    return <Text className="mt-2 font-cuerpo text-[13px] text-tenue">Comparando con el mes pasado…</Text>;
  }

  if (!hayGastos) {
    return (
      <Text className="mt-2 font-cuerpo text-[13px] text-tenue">
        Todavía no hay gastos en este período.
      </Text>
    );
  }

  if (totalAnterior === null || totalAnterior === 0) {
    return (
      <Text className="mt-2 font-cuerpo text-[13px] text-tenue">
        No hay con qué comparar: el mes pasado no quedó ningún gasto cargado acá.
      </Text>
    );
  }

  if (variacion === null) return null;

  // Gastar menos es la buena noticia en una app de gastos, asi que el lima -el
  // color con el que la app dice "vas bien"- va para abajo y el coral para
  // arriba. Al reves de lo que haria una app de inversiones.
  const gastoMas = variacion > 0;
  const color = variacion === 0 ? 'text-secundario' : gastoMas ? 'text-coral' : 'text-lima';

  return (
    <View className="mt-2 flex-row flex-wrap items-baseline gap-x-1.5">
      <Text className={`font-cuerpo-semi text-[15px] ${color}`}>
        {variacion === 0
          ? 'Igual que el mes pasado'
          : `${gastoMas ? '▲' : '▼'} ${Math.abs(variacion)}% ${gastoMas ? 'más' : 'menos'} que el mes pasado`}
      </Text>
      <Text className="font-cuerpo text-[13px] text-tenue">
        ({formatearPesosSinCentavos(totalAnterior)})
      </Text>
    </View>
  );
}

/** Un dato suelto dentro de su recuadro. */
function Dato({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
}) {
  return (
    <View className="rounded-[18px] border border-borde bg-superficie-alta px-4 py-3.5">
      <Etiqueta>{etiqueta}</Etiqueta>
      <Text
        className="mt-1.5 font-display text-xl tracking-tight text-primario"
        maxFontSizeMultiplier={MAX_ESCALA_MONTO}
        numberOfLines={1}
      >
        {valor}
      </Text>
      <Text className="mt-0.5 font-cuerpo text-[11px] text-tenue" numberOfLines={1}>
        {detalle}
      </Text>
    </View>
  );
}

/**
 * Envuelve a su contenido para que aparezca subiendo, un poco despues que el
 * anterior. El escalonado es lo que hace que la hoja se lea como una secuencia
 * -primero el numero, despues con que compararlo- y no como un volcado.
 */
function Aparece({
  indice = 0,
  className = '',
  children,
}: {
  indice?: number;
  className?: string;
  children: ReactNode;
}) {
  const avance = useSharedValue(0);

  useEffect(() => {
    avance.value = withDelay(indice * 60, withTiming(1, { duration: 320 }));
  }, [indice, avance]);

  const estilo = useAnimatedStyle(() => ({
    opacity: avance.value,
    transform: [{ translateY: (1 - avance.value) * 12 }],
  }));

  return (
    <Animated.View className={className} style={estilo}>
      {children}
    </Animated.View>
  );
}

/**
 * Una barra que crece desde la izquierda.
 *
 * Crece con `scaleX` y no cambiando el ancho: escalar lo resuelve el hilo de UI
 * sin volver a calcular el layout en cada cuadro, asi que seis barras animadas
 * a la vez no le cuestan nada al telefono. El `transformOrigin` es lo que hace
 * que crezca desde el borde izquierdo y no desde el centro.
 */
function Barra({
  proporcion,
  color,
  demoraMs,
}: {
  proporcion: number;
  color: string;
  demoraMs: number;
}) {
  const avance = useSharedValue(0);

  useEffect(() => {
    avance.value = withDelay(demoraMs, withTiming(proporcion, { duration: 520 }));
  }, [proporcion, demoraMs, avance]);

  const estilo = useAnimatedStyle(() => ({ transform: [{ scaleX: avance.value }] }));

  return (
    <View className="h-2 overflow-hidden rounded-pastilla bg-borde">
      <Animated.View
        style={[
          {
            height: '100%',
            width: '100%',
            borderRadius: 100,
            backgroundColor: color,
            transformOrigin: 'left',
          },
          estilo,
        ]}
      />
    </View>
  );
}

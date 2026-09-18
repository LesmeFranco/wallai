import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  calcularProgresoObjetivo,
  centavosAPesos,
  hoyArgentina,
  pesosACentavos,
  type Alcance,
  type DestinoGasto,
  type EstadoObjetivo,
} from '@wallai/validators';
import { useDialogos } from './Dialogo';
import { BotonPrimario, Etiqueta, MensajeError } from './base';
import { formatearPesosSinCentavos } from '../lib/formato';
import { trpc } from '../lib/trpc';

type ObjetivoVigente = { id: string; montoLimiteCentavos: number } | null;

/** El color de la barra segun como viene el mes. Los tres ya son tokens. */
const COLOR_POR_ESTADO: Record<EstadoObjetivo, string> = {
  bien: '#AAFF4D',
  cerca: '#FFBC42',
  excedido: '#FF6B6B',
};

/**
 * A quien pertenece el objetivo de la vista que se esta mirando.
 *
 * Devuelve null para el alcance `todo` (el de la app 1.0.0): mezcla la
 * billetera propia con la de todos los grupos, asi que no hay un objetivo que
 * le corresponda. El backend tampoco devuelve ninguno en ese caso.
 */
function destinoDelAlcance(alcance: Alcance): DestinoGasto | null {
  if (alcance.tipo === 'mio') return { tipo: 'personal' };
  if (alcance.tipo === 'hogar') return { tipo: 'hogar', hogarId: alcance.hogarId };
  return null;
}

/**
 * El objetivo de gasto dentro de la tarjeta del total: la barra si hay uno
 * fijado, y si no una linea para ponerlo.
 *
 * POR QUE TAN CHICO CUANDO NO HAY OBJETIVO. Es opcional de verdad: quien no
 * quiera fijarse un limite tiene que poder usar la app sin que nada se lo
 * recuerde. Por eso el estado vacio es una linea gris de 12px y no una tarjeta
 * con un boton, que es lo que hace la mayoria de las apps de gastos y lo que
 * convierte una funcion opcional en una tarea pendiente que mira feo.
 *
 * Toda la logica del porcentaje vive en `calcularProgresoObjetivo`
 * (packages/validators) y no aca, porque el texto de la notificacion de la
 * noche va a necesitar exactamente el mismo calculo: si el dashboard dijera
 * 82% y la notificacion 80%, no habria forma de saber a cual creerle.
 */
export function Objetivo({
  objetivo,
  gastadoCentavos,
  desde,
  hasta,
  alcance,
  periodoEnCurso,
}: {
  objetivo: ObjetivoVigente;
  /** Lo gastado en el mismo alcance y el mismo rango que devolvio el resumen. */
  gastadoCentavos: number;
  desde: string;
  hasta: string;
  alcance: Alcance;
  /**
   * Si el rango que se esta mirando es el mes que esta corriendo.
   *
   * Con "Mes anterior" no se muestra nada, y no es un olvido: el limite no
   * guarda historia (cambiarlo pisa el numero anterior), asi que dibujar la
   * barra sobre un mes ya cerrado seria medirlo contra un objetivo que en ese
   * momento a lo mejor no existia. Inventar ese pasado es peor que no mostrar
   * nada.
   */
  periodoEnCurso: boolean;
}) {
  const [editorAbierto, setEditorAbierto] = useState(false);
  const destino = destinoDelAlcance(alcance);

  if (!periodoEnCurso || !destino) return null;

  const progreso = objetivo
    ? calcularProgresoObjetivo({
        gastadoCentavos,
        limiteCentavos: objetivo.montoLimiteCentavos,
        desde,
        hasta,
        hoy: hoyArgentina(),
      })
    : null;

  return (
    <>
      {objetivo && progreso ? (
        <Pressable
          onPress={() => setEditorAbierto(true)}
          accessibilityRole="button"
          accessibilityLabel="Cambiar el objetivo del mes"
          className="mt-4 active:opacity-70"
        >
          <View className="mb-1.5 flex-row items-center justify-between">
            <Text className="font-cuerpo text-xs text-secundario">
              Objetivo {formatearPesosSinCentavos(objetivo.montoLimiteCentavos)}
            </Text>
            <Text
              className="font-cuerpo-semi text-xs"
              style={{ color: COLOR_POR_ESTADO[progreso.estado] }}
            >
              {progreso.porcentaje}%
            </Text>
          </View>

          <View className="h-2 overflow-hidden rounded-pastilla bg-borde">
            <View
              className="h-full rounded-pastilla"
              style={{
                // La barra se corta en 100 aunque el porcentaje siga subiendo:
                // una barra desbordada no dice nada que el texto de abajo no
                // diga mejor.
                width: `${Math.min(progreso.porcentaje, 100)}%`,
                backgroundColor: COLOR_POR_ESTADO[progreso.estado],
              }}
            />
          </View>

          <Text className="mt-2 font-cuerpo text-xs text-secundario">
            {progreso.estado === 'excedido'
              ? `Te pasaste por ${formatearPesosSinCentavos(progreso.excedidoCentavos)}`
              : `Te quedan ${formatearPesosSinCentavos(progreso.restanteCentavos)}`}
          </Text>

          {/* La proyeccion es lo unico que cambia una decision a mitad de mes:
              "vas por el 60%" no dice si eso es mucho o poco el dia 12. */}
          {progreso.proyeccionCentavos !== null ? (
            <Text className="mt-0.5 font-cuerpo text-xs text-tenue">
              A este ritmo cerrás el mes en {formatearPesosSinCentavos(progreso.proyeccionCentavos)}
            </Text>
          ) : null}
        </Pressable>
      ) : (
        <Pressable
          onPress={() => setEditorAbierto(true)}
          accessibilityRole="button"
          className="mt-3 self-start active:opacity-60"
          // El area tocable de una linea de 12px es incomoda sin esto.
          hitSlop={10}
        >
          <Text className="font-cuerpo text-xs text-tenue">+ Ponerle un objetivo al mes</Text>
        </Pressable>
      )}

      <EditorDeObjetivo
        abierto={editorAbierto}
        objetivo={objetivo}
        destino={destino}
        onCerrar={() => setEditorAbierto(false)}
      />
    </>
  );
}

/**
 * La hoja para fijar o cambiar el objetivo.
 *
 * Es una hoja y no una pantalla nueva por el mismo motivo que el editor de
 * gastos: es una sola decision (un numero), no vale la pena sacar a la persona
 * del dashboard para eso, y asi sigue viendo el total del mes mientras elige
 * el limite.
 */
function EditorDeObjetivo({
  abierto,
  objetivo,
  destino,
  onCerrar,
}: {
  abierto: boolean;
  objetivo: ObjetivoVigente;
  destino: DestinoGasto;
  onCerrar: () => void;
}) {
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const { confirmar } = useDialogos();
  const [pesos, setPesos] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Cada vez que se abre, el campo arranca del objetivo que haya hoy.
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (abierto !== abiertoAntes) {
    setAbiertoAntes(abierto);
    if (abierto) {
      setPesos(objetivo ? String(centavosAPesos(objetivo.montoLimiteCentavos)) : '');
      setError(null);
    }
  }

  function alTerminar() {
    void utils.hogares.resumen.invalidate();
    onCerrar();
  }

  const fijar = trpc.objetivos.fijar.useMutation({
    onSuccess: alTerminar,
    onError: (problema) => setError(problema.message),
  });

  const quitar = trpc.objetivos.quitar.useMutation({
    onSuccess: alTerminar,
    onError: (problema) => setError(problema.message),
  });

  if (!abierto) return null;

  const montoEnPesos = Number(pesos.replace(',', '.'));
  const montoValido = Number.isFinite(montoEnPesos) && montoEnPesos > 0;

  async function confirmarQuitar() {
    const seguro = await confirmar({
      titulo: '¿Sacar el objetivo?',
      mensaje: 'La barra deja de aparecer. Podés poner uno nuevo cuando quieras.',
      confirmar: 'Sacar',
      destructivo: true,
    });
    if (seguro) quitar.mutate({ destino });
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCerrar}>
      <Pressable className="flex-1 bg-black/60" onPress={onCerrar} />

      {/* El margen de abajo suma lo que el sistema se reserve: con edge-to-edge
          la hoja llega hasta el borde real de la pantalla, asi que en un
          telefono con los tres botones de Android (~48px) el ultimo boton
          quedaba debajo de ellos. Con gestos (~16px) el error existia igual
          pero casi no se veia. */}
      <View
        className="rounded-t-[28px] border-t border-borde bg-superficie px-6 pt-6"
        style={{ paddingBottom: 40 + insets.bottom }}
      >
        <Etiqueta>{objetivo ? 'Cambiar el objetivo' : 'Objetivo del mes'}</Etiqueta>
        <Text className="mt-1.5 font-cuerpo text-[13px] leading-5 text-secundario">
          {destino.tipo === 'personal'
            ? 'Cuánto querés gastar como máximo este mes, entre todos tus gastos.'
            : 'Cuánto quieren gastar como máximo este mes entre todos los del grupo.'}
        </Text>

        <Etiqueta className="mb-2 mt-5">Límite en pesos</Etiqueta>
        <TextInput
          value={pesos}
          onChangeText={(valor) => {
            setPesos(valor.replace(/[^0-9.,]/g, ''));
            setError(null);
          }}
          keyboardType="decimal-pad"
          placeholder="400000"
          placeholderTextColor="#5A5A78"
          // Sin `autoFocus`, igual que la hoja de corregir un gasto: abrir el
          // teclado mientras la hoja todavia esta entrando hace que en Android
          // el campo a veces pierda el foco y el teclado quede abierto contra
          // una hoja que no lo estaba esperando.
          className="rounded-[14px] border-[1.5px] border-borde bg-campo px-[18px] py-4 font-display text-2xl text-primario"
        />

        <Text className="mt-3 font-cuerpo text-xs leading-5 text-tenue">
          Se reinicia solo el primero de cada mes. No bloquea nada: es para saber cómo venís.
        </Text>

        {error ? (
          <View className="mt-4">
            <MensajeError mensaje={error} />
          </View>
        ) : null}

        <View className="mt-5 gap-3">
          <BotonPrimario
            onPress={() => {
              if (!montoValido) {
                setError('Poné un monto mayor a cero.');
                return;
              }
              fijar.mutate({ destino, montoLimiteCentavos: pesosACentavos(montoEnPesos) });
            }}
            cargando={fijar.isPending}
          >
            {objetivo ? 'Guardar' : 'Poner objetivo'}
          </BotonPrimario>

          {objetivo ? (
            <Pressable
              onPress={() => void confirmarQuitar()}
              disabled={quitar.isPending}
              className="items-center rounded-boton border-[1.5px] border-coral/40 py-3.5 active:opacity-70"
            >
              <Text className="font-cuerpo-semi text-sm text-coral">
                {quitar.isPending ? 'Sacando...' : 'Sacar el objetivo'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

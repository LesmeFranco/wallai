import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { centavosAPesos, pesosACentavos } from '@wallai/validators';
import { useDialogos } from './Dialogo';
import { BotonPrimario, Etiqueta, MensajeError, PastillaCategoria } from './base';
import { formatearDiaLargo, capitalizar } from '../lib/formato';
import { trpc } from '../lib/trpc';

type Gasto = {
  id: string;
  textoOriginal: string;
  montoCentavos: number;
  fecha: string;
  categoriaId: string;
  usuarioId: string;
};

/**
 * Hoja para corregir o borrar un gasto.
 *
 * El texto original se muestra pero no se edita: es un invariante del modelo
 * (es la materia prima del motor de tageo). Si el texto está mal, el camino es
 * borrar y cargar de nuevo, y eso la pantalla lo dice explícitamente para que
 * no parezca una omisión.
 */
export function EditorDeGasto({
  gasto,
  esMio,
  onCerrar,
}: {
  gasto: Gasto | null;
  /** Solo el autor puede editar o borrar. Si no, la hoja es de solo lectura. */
  esMio: boolean;
  onCerrar: () => void;
}) {
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const { confirmar } = useDialogos();
  const categorias = trpc.categorias.listar.useQuery();

  /**
   * El monto se edita en pesos porque es como lo piensa la persona, y se
   * convierte a centavos al guardar con el helper compartido. La conversión pasa
   * solo en estos dos puntos (entrada y pantalla), que es la regla del proyecto.
   */
  const [pesos, setPesos] = useState('');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cada vez que se abre con un gasto distinto, los campos arrancan de ese gasto.
  const [idCargado, setIdCargado] = useState<string | null>(null);
  if (gasto && gasto.id !== idCargado) {
    setIdCargado(gasto.id);
    setPesos(String(centavosAPesos(gasto.montoCentavos)));
    setCategoriaId(gasto.categoriaId);
    setError(null);
  }

  function invalidarTodo() {
    void utils.gastos.listar.invalidate();
    void utils.hogares.resumen.invalidate();
  }

  const editar = trpc.gastos.editar.useMutation({
    onSuccess: () => {
      invalidarTodo();
      onCerrar();
    },
    onError: (problema) => setError(problema.message),
  });

  const eliminar = trpc.gastos.eliminar.useMutation({
    onSuccess: () => {
      invalidarTodo();
      onCerrar();
    },
    onError: (problema) => setError(problema.message),
  });

  if (!gasto) return null;

  const montoEnPesos = Number(pesos.replace(',', '.'));
  const montoValido = Number.isFinite(montoEnPesos) && montoEnPesos > 0;
  const huboCambios =
    montoValido &&
    (pesosACentavos(montoEnPesos) !== gasto.montoCentavos || categoriaId !== gasto.categoriaId);

  // El id se copia a una constante porque dentro de la funcion asincronica
  // TypeScript ya no puede garantizar que `gasto` siga sin ser null.
  const gastoId = gasto.id;

  async function confirmarBorrado() {
    const seguro = await confirmar({
      titulo: '¿Borrar este gasto?',
      mensaje: 'No se puede deshacer.',
      confirmar: 'Borrar',
      destructivo: true,
    });
    if (seguro) eliminar.mutate({ gastoId });
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCerrar}>
      {/* El fondo oscurecido cierra la hoja al tocarlo, que es lo que una
          persona espera de una hoja que sube desde abajo. */}
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
        <View className="mb-5">
          <Etiqueta>{esMio ? 'Corregir gasto' : 'Detalle del gasto'}</Etiqueta>
          <Text className="mt-1.5 font-cuerpo-semi text-[17px] text-primario">
            {gasto.textoOriginal}
          </Text>
          <Text className="mt-1 font-cuerpo text-[13px] text-tenue">
            {capitalizar(formatearDiaLargo(gasto.fecha))}
          </Text>
        </View>

        {esMio ? (
          <>
            <Etiqueta className="mb-2">Monto en pesos</Etiqueta>
            <TextInput
              value={pesos}
              onChangeText={(valor) => {
                // Solo dígitos y un separador decimal: evita que se pueda
                // escribir algo que despues falle al guardar.
                setPesos(valor.replace(/[^0-9.,]/g, ''));
                setError(null);
              }}
              keyboardType="decimal-pad"
              className="rounded-[14px] border-[1.5px] border-borde bg-campo px-[18px] py-4 font-display text-2xl text-primario"
            />

            <Etiqueta className="mb-2 mt-5">Categoría</Etiqueta>
            <ScrollView className="max-h-[160px]">
              <View className="flex-row flex-wrap gap-2">
                {categorias.data?.map((categoria) => (
                  <PastillaCategoria
                    key={categoria.id}
                    nombre={categoria.nombre}
                    clave={categoria.clave}
                    seleccionada={categoria.id === categoriaId}
                    onPress={() => setCategoriaId(categoria.id)}
                  />
                ))}
              </View>
            </ScrollView>

            <Text className="mt-4 font-cuerpo text-xs leading-5 text-tenue">
              El texto del gasto no se puede editar: es lo que el motor usa para aprender. Si está
              mal escrito, borrá el gasto y cargalo de nuevo.
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
                  editar.mutate({
                    gastoId: gasto.id,
                    montoCentavos: pesosACentavos(montoEnPesos),
                    ...(categoriaId ? { categoriaId } : {}),
                  });
                }}
                deshabilitado={!huboCambios}
                cargando={editar.isPending}
              >
                Guardar cambios
              </BotonPrimario>

              <Pressable
                onPress={() => void confirmarBorrado()}
                disabled={eliminar.isPending}
                className="items-center rounded-boton border-[1.5px] border-coral/40 py-3.5 active:opacity-70"
              >
                <Text className="font-cuerpo-semi text-sm text-coral">
                  {eliminar.isPending ? 'Borrando...' : 'Borrar gasto'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text className="font-cuerpo text-sm leading-6 text-secundario">
            Este gasto lo cargó otra persona del grupo, así que solo ella puede corregirlo o
            borrarlo.
          </Text>
        )}
      </View>
    </Modal>
  );
}

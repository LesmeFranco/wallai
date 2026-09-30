import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotonPrimario, Etiqueta, MensajeError, PastillaCategoria } from './base';
import { formatearPesosSinCentavos } from '../lib/formato';
import { trpc } from '../lib/trpc';

export type GastoACorregir = {
  id: string;
  textoOriginal: string;
  montoCentavos: number;
  categoriaId: string;
};

/**
 * Hoja para corregir la categoria de un gasto recien cargado.
 *
 * Existe para la carga de varios gastos a la vez: ahi la confirmacion es una
 * lista, y la correccion no puede ser la lista de pastillas abierta en la
 * pantalla (como en el caso de un gasto solo) porque habria que decidir a cual
 * de las filas pertenece.
 *
 * MANTIENE EL CONTRATO DE DOS PASOS de la 1.1.0, y es lo importante de este
 * componente: tocar una pastilla solo marca, y el boton de abajo guarda.
 * `gastos.corregirCategoria` no cambia solo este gasto, le ENSENA al grupo, asi
 * que un toque sin querer dejaria una regla aprendida que despues va a
 * categorizar mal todo lo parecido.
 */
export function CorrectorDeCategoria({
  gasto,
  onCerrar,
  onCorregido,
}: {
  gasto: GastoACorregir | null;
  onCerrar: () => void;
  /** Avisa la categoria nueva, para que la lista de atras se actualice. */
  onCorregido: (gastoId: string, categoriaId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const categorias = trpc.categorias.listar.useQuery();

  const [elegida, setElegida] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Al abrirse con otro gasto, la eleccion arranca limpia: lo que se toco para
  // el gasto anterior no tiene nada que ver con este.
  const [idCargado, setIdCargado] = useState<string | null>(null);
  if (gasto && gasto.id !== idCargado) {
    setIdCargado(gasto.id);
    setElegida(null);
    setError(null);
  }

  const corregir = trpc.gastos.corregirCategoria.useMutation({
    onSuccess: (_datos, variables) => {
      void utils.hogares.resumen.invalidate();
      void utils.gastos.listar.invalidate();
      onCorregido(variables.gastoId, variables.categoriaId);
      onCerrar();
    },
    onError: (problema) => setError(problema.message),
  });

  if (!gasto) return null;

  const mostrada = elegida ?? gasto.categoriaId;
  const hayCambio = elegida !== null && elegida !== gasto.categoriaId;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCerrar}>
      <Pressable className="flex-1 bg-black/60" onPress={onCerrar} />

      <View
        className="rounded-t-[28px] border-t border-borde bg-superficie px-6 pt-6"
        style={{ paddingBottom: 40 + insets.bottom }}
      >
        <Etiqueta>¿En qué categoría va?</Etiqueta>
        <Text className="mt-1.5 font-cuerpo-semi text-[17px] text-primario" numberOfLines={2}>
          {gasto.textoOriginal}
        </Text>
        <Text className="mt-0.5 font-display text-xl tracking-tight text-lima">
          {formatearPesosSinCentavos(gasto.montoCentavos)}
        </Text>

        <ScrollView className="mt-5 max-h-[220px]">
          <View className="flex-row flex-wrap gap-2">
            {categorias.data?.map((categoria) => (
              <PastillaCategoria
                key={categoria.id}
                nombre={categoria.nombre}
                clave={categoria.clave}
                seleccionada={categoria.id === mostrada}
                onPress={() => {
                  setError(null);
                  setElegida(categoria.id);
                }}
              />
            ))}
          </View>
        </ScrollView>

        <Text className="mt-4 font-cuerpo text-xs leading-5 text-tenue">
          {hayCambio
            ? 'Todavía no se guardó. Tocá Guardar para confirmar.'
            : 'Si la corregís, la próxima vez que escribas algo parecido Wallai ya va a saber dónde va.'}
        </Text>

        {error ? (
          <View className="mt-4">
            <MensajeError mensaje={error} />
          </View>
        ) : null}

        <View className="mt-5 gap-3">
          <BotonPrimario
            onPress={() => {
              if (!elegida) return onCerrar();
              corregir.mutate({ gastoId: gasto.id, categoriaId: elegida });
            }}
            deshabilitado={!hayCambio}
            cargando={corregir.isPending}
          >
            Guardar
          </BotonPrimario>
          <Pressable
            onPress={onCerrar}
            disabled={corregir.isPending}
            className="items-center rounded-boton border-[1.5px] border-borde-claro py-3.5 active:opacity-70"
          >
            <Text className="font-cuerpo-semi text-sm text-secundario">Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

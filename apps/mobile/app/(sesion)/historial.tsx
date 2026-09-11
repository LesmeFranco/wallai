import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Alcance } from '@wallai/validators';
import { BotonFlotante } from '../../componentes/BotonFlotante';
import { EditorDeGasto } from '../../componentes/EditorDeGasto';
import { SelectorDeAlcance } from '../../componentes/SelectorDeAlcance';
import { Cargando, IconoCategoria, MensajeError, Tarjeta } from '../../componentes/base';
import { IconoBorrar, IconoBuscar, IconoCandado } from '../../componentes/iconos';
import { useSesion } from '../../lib/sesion';
import { capitalizar, formatearDiaLargo, formatearPesosCorto, formatearPesosSinCentavos } from '../../lib/formato';
import { trpc } from '../../lib/trpc';

export default function Historial() {
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const [busqueda, setBusqueda] = useState('');
  const [alcance, setAlcance] = useState<Alcance>({ tipo: 'todo' });
  const { sesion } = useSesion();
  const miId = sesion?.user.id;

  const grupos = trpc.hogares.mios.useQuery();
  const categorias = trpc.categorias.listar.useQuery();
  const gastos = trpc.gastos.listar.useQuery({
    limite: 50,
    alcance,
    // Solo se manda si tiene valor: el esquema lo espera ausente, no vacio.
    ...(busqueda.trim() ? { busqueda: busqueda.trim() } : {}),
  });

  /**
   * Borrar desde la lista, sin pasar por la hoja de edicion.
   *
   * Antes el unico camino para borrar era tocar el gasto, esperar la hoja y
   * buscar el boton ahi abajo. Para el caso mas comun -cargar algo mal y
   * querer rehacerlo al toque- eran demasiados pasos para deshacer un error
   * que uno acaba de cometer.
   *
   * La confirmacion no se saltea aunque ahora sean menos toques: borrar no se
   * puede deshacer, y un tacho al lado de cada fila es facil de tocar sin
   * querer mientras se scrollea.
   */
  const eliminar = trpc.gastos.eliminar.useMutation({
    onSuccess: () => {
      void utils.gastos.listar.invalidate();
      void utils.hogares.resumen.invalidate();
    },
    onError: (problema) => Alert.alert('No se pudo borrar', problema.message),
  });

  function confirmarBorrado(gastoId: string, texto: string) {
    Alert.alert('¿Borrar este gasto?', `"${texto}"\n\nNo se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => eliminar.mutate({ gastoId }) },
    ]);
  }

  type GastoDeLista = NonNullable<typeof gastos.data>['gastos'][number];
  /** El gasto cuya hoja de edicion esta abierta, o null si no hay ninguna. */
  const [gastoAbierto, setGastoAbierto] = useState<GastoDeLista | null>(null);

  const categoriaPorId = useMemo(
    () => new Map(categorias.data?.map((c) => [c.id, c]) ?? []),
    [categorias.data],
  );

  /**
   * Nombre de cada persona con la que se comparte algun grupo. Se arma con los
   * miembros de TODOS los grupos y no de uno solo, porque el historial puede
   * mezclar gastos de varios cuando el alcance es "Todo".
   */
  const nombrePorUsuario = useMemo(
    () =>
      new Map(
        (grupos.data ?? []).flatMap((grupo) =>
          grupo.miembros.map((miembro) => [miembro.id, miembro.nombre] as const),
        ),
      ),
    [grupos.data],
  );

  /**
   * Los gastos agrupados por dia, manteniendo el orden en que vinieron (ya
   * llegan del mas reciente al mas viejo).
   */
  const porDia = useMemo(() => {
    type Gasto = NonNullable<typeof gastos.data>['gastos'][number];
    const grupos = new Map<string, Gasto[]>();
    for (const gasto of gastos.data?.gastos ?? []) {
      const existente = grupos.get(gasto.fecha);
      if (existente) existente.push(gasto);
      else grupos.set(gasto.fecha, [gasto]);
    }
    return [...grupos.entries()];
  }, [gastos.data]);

  return (
    <View className="flex-1">
      <View className="px-5 pb-4" style={{ paddingTop: insets.top + 8 }}>
        <Text className="mb-4 font-display-extra text-[26px] tracking-tight text-primario">
          Historial
        </Text>

        <View className="mb-3.5 flex-row items-center gap-2.5 rounded-[14px] border-[1.5px] border-borde bg-superficie px-4 py-3">
          <IconoBuscar />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar gasto..."
            placeholderTextColor="#5A5A78"
            className="flex-1 font-cuerpo text-[15px] text-primario"
          />
        </View>

        <SelectorDeAlcance alcance={alcance} onCambiar={setAlcance} grupos={grupos.data ?? []} />
      </View>

      {gastos.isPending ? (
        <Cargando />
      ) : gastos.error ? (
        <View className="px-5">
          <MensajeError mensaje={gastos.error.message} />
        </View>
      ) : porDia.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-center font-cuerpo text-[15px] leading-6 text-tenue">
            {busqueda || alcance.tipo !== 'todo'
              ? 'No hay gastos que coincidan con ese filtro.'
              : 'Todavía no cargaste ningún gasto.\nTocá el botón de abajo para empezar.'}
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-28">
          {porDia.map(([fecha, delDia]) => (
            <View key={fecha} className="mb-6">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="font-cuerpo-semi text-[13px] text-secundario">
                  {capitalizar(formatearDiaLargo(fecha))}
                </Text>
                <Text className="font-display text-[15px] text-primario">
                  {formatearPesosSinCentavos(
                    delDia.reduce((suma, gasto) => suma + gasto.montoCentavos, 0),
                  )}
                </Text>
              </View>

              <View className="gap-2.5">
                {delDia.map((gasto) => {
                  const categoria = categoriaPorId.get(gasto.categoriaId);
                  const esMio = gasto.usuarioId === miId;
                  // Solo el autor puede borrar, asi que a los gastos de otros
                  // ni se les dibuja el tacho: un boton que siempre falla es
                  // peor que no tenerlo.
                  const autor = nombrePorUsuario.get(gasto.usuarioId);
                  return (
                    <Pressable key={gasto.id} onPress={() => setGastoAbierto(gasto)}>
                      <Tarjeta className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-70">
                        <IconoCategoria clave={categoria?.clave ?? null} tamano={42} />
                        <View className="flex-1">
                          <Text
                            className="font-cuerpo-semi text-[15px] text-primario"
                            numberOfLines={1}
                          >
                            {gasto.textoOriginal}
                          </Text>
                          <View className="mt-0.5 flex-row items-center gap-2">
                            <Text className="font-cuerpo text-xs text-secundario">
                              {categoria?.nombre ?? 'Otros'}
                            </Text>
                            {autor && !esMio ? (
                              <>
                                <Text className="font-cuerpo text-xs text-tenue">·</Text>
                                <Text className="font-cuerpo text-xs text-secundario">{autor}</Text>
                              </>
                            ) : null}
                            {/* Un gasto sin grupo no lo ve nadie mas. Se marca
                                porque con varios grupos deja de ser obvio a
                                donde fue a parar cada uno. */}
                            {gasto.hogarId === null ? (
                              <>
                                <Text className="font-cuerpo text-xs text-tenue">·</Text>
                                <IconoCandado />
                              </>
                            ) : null}
                          </View>
                        </View>
                        <Text className="font-display text-lg tracking-tight text-primario">
                          {formatearPesosCorto(gasto.montoCentavos)}
                        </Text>
                        {esMio ? (
                          <Pressable
                            onPress={() => confirmarBorrado(gasto.id, gasto.textoOriginal)}
                            disabled={eliminar.isPending}
                            // hitSlop agranda el area tocable sin agrandar el
                            // dibujo: un tacho de 18px es preciso de acertar
                            // con el pulgar, y fallar abre la hoja de edicion.
                            hitSlop={10}
                            accessibilityLabel={`Borrar ${gasto.textoOriginal}`}
                            className="ml-1 p-1 active:opacity-50"
                          >
                            <IconoBorrar />
                          </Pressable>
                        ) : null}
                      </Tarjeta>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <BotonFlotante />

      <EditorDeGasto
        gasto={gastoAbierto}
        esMio={gastoAbierto?.usuarioId === miId}
        onCerrar={() => setGastoAbierto(null)}
      />
    </View>
  );
}

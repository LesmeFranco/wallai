import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Alcance } from '@wallai/validators';
import { BotonFlotante } from '../../componentes/BotonFlotante';
import { EditorDeGasto } from '../../componentes/EditorDeGasto';
import { useDialogos } from '../../componentes/Dialogo';
import { SelectorDeAlcance, alcanceSeguro } from '../../componentes/SelectorDeAlcance';
import { FiltroDeCategorias } from '../../componentes/FiltroDeCategorias';
import {
  Cargando,
  IconoCategoria,
  MAX_ESCALA_MONTO,
  MensajeError,
  Tarjeta,
} from '../../componentes/base';
import { IconoBorrar, IconoBuscar, IconoCandado } from '../../componentes/iconos';
import { useSesion } from '../../lib/sesion';
import {
  capitalizar,
  descripcionDeGasto,
  formatearDiaLargo,
  formatearPesosCorto,
  formatearPesosSinCentavos,
} from '../../lib/formato';
import { trpc } from '../../lib/trpc';

export default function Historial() {
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const [busqueda, setBusqueda] = useState('');
  // Mismo default que el dashboard, a proposito: las dos pantallas tienen
  // que contestar la misma pregunta salvo que se toque el selector.
  const [alcanceElegido, setAlcanceElegido] = useState<Alcance>({ tipo: 'mio' });
  const router = useRouter();

  /**
   * El filtro por categoria vive en los parametros de la ruta y NO en estado
   * local, a proposito.
   *
   * Es lo que permite que el dashboard navegue hasta aca ya filtrado: toca una
   * categoria del desglose y llega con el filtro puesto. Con estado local
   * habria que sincronizarlo con el parametro al entrar, y eso trae el problema
   * clasico: tocar dos veces la misma categoria desde el dashboard no cambia el
   * parametro, asi que un efecto que depende de el no se volveria a disparar y
   * el filtro no se aplicaria la segunda vez. Siendo el parametro la unica
   * fuente, ese caso no existe.
   */
  const parametros = useLocalSearchParams<{
    categoriaId?: string;
    alcanceTipo?: string;
    hogarId?: string;
  }>();
  const categoriaFiltrada = parametros.categoriaId || null;

  /**
   * El alcance tambien puede llegar por parametro, para que el historial muestre
   * el mismo conjunto de gastos que el dashboard del que se vino: entrar a la
   * categoria "Comida" de la casa y ver los gastos personales seria desconcertante.
   */
  useEffect(() => {
    if (parametros.alcanceTipo === 'hogar' && parametros.hogarId) {
      setAlcanceElegido({ tipo: 'hogar', hogarId: parametros.hogarId });
    } else if (parametros.alcanceTipo === 'mio') {
      setAlcanceElegido({ tipo: 'mio' });
    }
  }, [parametros.alcanceTipo, parametros.hogarId]);
  const { sesion } = useSesion();
  const { confirmar, avisar } = useDialogos();
  const miId = sesion?.user.id;

  /**
   * Al entrar a esta pestana se refresca lo que muestra.
   *
   * Las dependencias son solo `utils`, que es estable, asi que corre una vez
   * por foco y no se puede enganchar en un bucle con los datos que invalida.
   */
  useFocusEffect(
    useCallback(() => {
      void utils.hogares.mios.invalidate();
      void utils.hogares.resumen.invalidate();
      void utils.gastos.listar.invalidate();
    }, [utils]),
  );

  const grupos = trpc.hogares.mios.useQuery();

  /**
   * El alcance que se usa de verdad, corregido si apunta a un grupo del que la
   * persona ya no forma parte (ver `alcanceSeguro`). Sin esto, salir de un grupo
   * dejaba esta pantalla trabada mostrando un error sin salida.
   */
  const alcance = alcanceSeguro(alcanceElegido, grupos.data);

  const categorias = trpc.categorias.listar.useQuery();
  const gastos = trpc.gastos.listar.useQuery({
    limite: 50,
    alcance,
    // Solo se manda si tiene valor: el esquema lo espera ausente, no vacio.
    ...(busqueda.trim() ? { busqueda: busqueda.trim() } : {}),
    ...(categoriaFiltrada ? { categoriaId: categoriaFiltrada } : {}),
  });

  /**
   * Las categorias que se ofrecen para filtrar son las que la persona TIENE
   * gastos en este mes, no las once del sistema.
   *
   * Sale del resumen y no de la lista de gastos cargada porque la lista cambia
   * al filtrar: si las pastillas se armaran con lo que hay a la vista, al elegir
   * "Comida" desaparecerian todas las demas y no habria forma de volver.
   */
  const resumen = trpc.hogares.resumen.useQuery({ alcance });

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
    onError: (problema) => void avisar({ titulo: 'No se pudo borrar', mensaje: problema.message }),
  });

  async function confirmarBorrado(gastoId: string, texto: string) {
    const seguro = await confirmar({
      titulo: '¿Borrar este gasto?',
      mensaje: `"${texto}". No se puede deshacer.`,
      confirmar: 'Borrar',
      destructivo: true,
    });
    if (seguro) eliminar.mutate({ gastoId });
  }

  type GastoDeLista = NonNullable<typeof gastos.data>['gastos'][number];
  /** El gasto cuya hoja de edicion esta abierta, o null si no hay ninguna. */
  const [gastoAbierto, setGastoAbierto] = useState<GastoDeLista | null>(null);

  const categoriaPorId = useMemo(
    () => new Map(categorias.data?.map((c) => [c.id, c]) ?? []),
    [categorias.data],
  );

  /**
   * Las categorias que se ofrecen para filtrar: las que tienen gastos este mes,
   * mas la que este filtrada aunque no tenga ninguno.
   *
   * Ese "mas la filtrada" no es un detalle. El filtro puede llegar desde el
   * inicio mirando el mes anterior, o desde un grupo con otro alcance; en esos
   * casos la categoria no esta en el resumen de este mes y, sin agregarla, la
   * fila no tendria como sacar el filtro que ella misma esta aplicando.
   */
  const categoriasParaFiltrar = useMemo(() => {
    const conGastos = (resumen.data?.porCategoria ?? []).map((fila) => ({
      id: fila.categoriaId,
      nombre: fila.nombre,
      clave: categoriaPorId.get(fila.categoriaId)?.clave ?? null,
    }));

    if (!categoriaFiltrada || conGastos.some((fila) => fila.id === categoriaFiltrada)) {
      return conGastos;
    }

    const suelta = categoriaPorId.get(categoriaFiltrada);
    if (!suelta) return conGastos;
    return [{ id: suelta.id, nombre: suelta.nombre, clave: suelta.clave }, ...conGastos];
  }, [resumen.data, categoriaPorId, categoriaFiltrada]);

  const nombreDeLaFiltrada = categoriaFiltrada
    ? (categoriaPorId.get(categoriaFiltrada)?.nombre ?? 'esa categoría')
    : null;

  /**
   * Nombre de cada persona con la que se comparte algun grupo. Se arma con los
   * miembros de TODOS los grupos y no de uno solo, porque el alcance se cambia
   * sin recargar la pantalla y cada grupo trae su propia gente.
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

        <SelectorDeAlcance alcance={alcance} onCambiar={setAlcanceElegido} grupos={grupos.data ?? []} />

        {/* El filtro por categoria. Que se dibuje o no lo decide el propio
            componente, que es tambien donde esta explicado por que ahora se
            dibuja casi siempre. */}
        <FiltroDeCategorias
          categorias={categoriasParaFiltrar}
          seleccionada={categoriaFiltrada}
          // El filtro vive en los parametros de la ruta (ver el comentario de
          // `parametros`), asi que sacarlo es mandar el parametro vacio.
          onCambiar={(categoriaId) => router.setParams({ categoriaId: categoriaId ?? '' })}
        />
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
            {busqueda
              ? 'No hay gastos que coincidan con esa búsqueda.'
              : nombreDeLaFiltrada
                ? `No hay gastos en ${nombreDeLaFiltrada} en lo que estás mirando.`
                : alcance.tipo === 'hogar'
                  ? 'Todavía no hay gastos en este grupo.'
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
                <Text
                  className="font-display text-[15px] text-primario"
                  maxFontSizeMultiplier={MAX_ESCALA_MONTO}
                >
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
                  const nombreCategoria = categoria?.nombre ?? 'Otros';
                  /**
                   * La descripcion sin el monto adentro: "5000 pan" se lee
                   * "Pan", y el monto queda una sola vez, a la derecha.
                   *
                   * Cuando no queda descripcion (alguien escribio "4500" y
                   * nada mas) el titulo pasa a ser el nombre de la categoria,
                   * que es lo unico que se sabe de ese gasto, y entonces no se
                   * repite abajo.
                   */
                  const descripcion = descripcionDeGasto(gasto.textoOriginal);
                  return (
                    <Pressable key={gasto.id} onPress={() => setGastoAbierto(gasto)}>
                      <Tarjeta className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-70">
                        <IconoCategoria clave={categoria?.clave ?? null} tamano={42} />
                        <View className="flex-1">
                          <Text
                            className="font-cuerpo-semi text-[15px] text-primario"
                            numberOfLines={1}
                          >
                            {descripcion ?? nombreCategoria}
                          </Text>
                          <View className="mt-0.5 flex-row items-center gap-2">
                            {descripcion ? (
                              <Text className="font-cuerpo text-xs text-secundario">
                                {nombreCategoria}
                              </Text>
                            ) : null}
                            {autor && !esMio ? (
                              <>
                                {descripcion ? (
                                  <Text className="font-cuerpo text-xs text-tenue">·</Text>
                                ) : null}
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
                        <Text
                          className="font-display text-lg tracking-tight text-primario"
                          maxFontSizeMultiplier={MAX_ESCALA_MONTO}
                          numberOfLines={1}
                        >
                          {formatearPesosCorto(gasto.montoCentavos)}
                        </Text>
                        {esMio ? (
                          <Pressable
                            onPress={() =>
                              void confirmarBorrado(gasto.id, descripcion ?? nombreCategoria)
                            }
                            disabled={eliminar.isPending}
                            // hitSlop agranda el area tocable sin agrandar el
                            // dibujo: un tacho de 18px es preciso de acertar
                            // con el pulgar, y fallar abre la hoja de edicion.
                            hitSlop={10}
                            accessibilityLabel={`Borrar ${descripcion ?? nombreCategoria}`}
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

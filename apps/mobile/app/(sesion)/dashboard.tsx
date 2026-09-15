import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hoyArgentina, rangoMesActual, sumarDias, type Alcance } from '@wallai/validators';
import { BotonFlotante } from '../../componentes/BotonFlotante';
import { Cargando, Etiqueta, IconoCategoria, MensajeError, Tarjeta } from '../../componentes/base';
import {
  DescripcionDeAlcance,
  SelectorDeAlcance,
  tituloDeAlcance,
} from '../../componentes/SelectorDeAlcance';
import { presentacionDe } from '../../lib/categorias';
import { formatearPesosCorto, formatearPesosSinCentavos } from '../../lib/formato';
import { trpc } from '../../lib/trpc';

type Periodo = 'este' | 'anterior';

/** Primer y ultimo dia del mes anterior al actual, como ISO. */
function rangoMesAnterior(): { desde: string; hasta: string } {
  const { desde } = rangoMesActual();
  // Un dia antes del primero de este mes cae en el ultimo dia del mes pasado.
  const ultimoDelAnterior = sumarDias(desde, -1);
  const [anio, mes] = ultimoDelAnterior.split('-') as [string, string];
  return { desde: `${anio}-${mes}-01`, hasta: ultimoDelAnterior };
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [periodo, setPeriodo] = useState<Periodo>('este');
  /**
   * Arranca en "Mis gastos": la primera pantalla contesta cuanto gasto uno,
   * que es la pregunta que se hace todos los dias. Lo que gastaron los demas
   * aparece al entrar a un grupo, que es donde se comparte; no derramado en la
   * vista personal.
   */
  const [alcance, setAlcance] = useState<Alcance>({ tipo: 'mio' });

  const rango = periodo === 'este' ? rangoMesActual() : rangoMesAnterior();

  const grupos = trpc.hogares.mios.useQuery();
  const resumen = trpc.hogares.resumen.useQuery({ ...rango, alcance });
  const categorias = trpc.categorias.listar.useQuery();
  /** Los ultimos gastos, para las tarjetas de "ultimo gasto" y "hoy". */
  const ultimos = trpc.gastos.listar.useQuery({ limite: 20, alcance });

  if (resumen.isPending) return <Cargando />;

  if (resumen.error) {
    return (
      <View className="flex-1 justify-center p-5">
        <MensajeError mensaje={resumen.error.message} />
      </View>
    );
  }

  const claveDeCategoria = new Map(categorias.data?.map((c) => [c.id, c.clave]) ?? []);
  const total = resumen.data.totalCentavos;
  const maximoPorCategoria = Math.max(...resumen.data.porCategoria.map((c) => c.totalCentavos), 1);
  const maximoPorPersona = Math.max(...resumen.data.porPersona.map((p) => p.totalCentavos), 1);
  const misGrupos = grupos.data ?? [];

  // `hoyArgentina` y no `new Date().toISOString()`: este ultimo da la fecha en
  // UTC, asi que despues de las 21:00 hora argentina devolveria el dia
  // siguiente y la tarjeta de "Hoy" quedaria siempre en cero a la noche.
  // La tarjeta solo tiene sentido mirando el mes en curso.
  const hoy = periodo === 'este' ? hoyArgentina() : null;
  const gastosDeHoy = (ultimos.data?.gastos ?? []).filter((g) => g.fecha === hoy);
  const totalDeHoy = gastosDeHoy.reduce((suma, g) => suma + g.montoCentavos, 0);
  const ultimoGasto = ultimos.data?.gastos[0];

  return (
    <View className="flex-1">
      <View className="px-5 pb-4" style={{ paddingTop: insets.top + 8 }}>
        <Etiqueta>{tituloDeAlcance(alcance, misGrupos)}</Etiqueta>

        <View className="mt-1.5 flex-row">
          {(['este', 'anterior'] as const).map((opcion) => {
            const activo = periodo === opcion;
            return (
              <Pressable
                key={opcion}
                onPress={() => setPeriodo(opcion)}
                className={`mr-2 rounded-pastilla px-3.5 py-1.5 ${
                  activo ? 'bg-lima' : 'border-[1.5px] border-borde'
                }`}
              >
                <Text
                  className={`font-cuerpo-semi text-[13px] ${activo ? 'text-fondo' : 'text-secundario'}`}
                >
                  {opcion === 'este' ? 'Este mes' : 'Mes anterior'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/*
          El selector se dibuja solo si la persona pertenece a algun grupo: sin
          grupos queda una sola opcion, la que ya esta activa. El propio
          componente se encarga de esa decision.
        */}
        <View className="mt-2">
          <SelectorDeAlcance alcance={alcance} onCambiar={setAlcance} grupos={misGrupos} />
          {misGrupos.length > 0 ? <DescripcionDeAlcance alcance={alcance} /> : null}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-6"
        refreshControl={
          <RefreshControl
            refreshing={resumen.isFetching}
            onRefresh={() => {
              void resumen.refetch();
              void ultimos.refetch();
            }}
            tintColor="#AAFF4D"
          />
        }
      >
        <Tarjeta className="mb-3 px-6 pb-5 pt-6">
          <Etiqueta>Total del mes</Etiqueta>
          <Text className="mt-2 font-display-extra text-[44px] leading-none tracking-tighter text-lima">
            {formatearPesosSinCentavos(total)}
          </Text>
          <Text className="mt-3 font-cuerpo text-xs text-secundario">
            {resumen.data.porPersona.length > 0
              ? `${resumen.data.porCategoria.length} categorías · ${resumen.data.porPersona.length} ${
                  resumen.data.porPersona.length === 1 ? 'persona' : 'personas'
                }`
              : 'Todavía no hay gastos en este período'}
          </Text>
        </Tarjeta>

        <View className="mb-3 flex-row gap-3">
          <Tarjeta className="flex-1 px-4 py-[18px]">
            <Etiqueta>Último gasto</Etiqueta>
            {ultimoGasto ? (
              <View className="mt-3">
                <IconoCategoria clave={claveDeCategoria.get(ultimoGasto.categoriaId) ?? null} tamano={36} />
                <Text className="mt-2.5 font-display text-xl tracking-tight text-primario">
                  {formatearPesosCorto(ultimoGasto.montoCentavos)}
                </Text>
                <Text className="mt-0.5 font-cuerpo text-xs text-secundario" numberOfLines={1}>
                  {ultimoGasto.textoOriginal}
                </Text>
              </View>
            ) : (
              <Text className="mt-3 font-cuerpo text-xs text-tenue">Sin gastos todavía</Text>
            )}
          </Tarjeta>

          <Tarjeta className="flex-1 px-4 py-[18px]">
            <Etiqueta>Hoy</Etiqueta>
            <Text className="mt-3 font-display text-xl tracking-tight text-lima">
              {formatearPesosSinCentavos(totalDeHoy)}
            </Text>
            <Text className="mt-0.5 font-cuerpo text-xs text-secundario">
              {gastosDeHoy.length} {gastosDeHoy.length === 1 ? 'gasto' : 'gastos'}
            </Text>
          </Tarjeta>
        </View>

        <Tarjeta className="mb-3 p-5">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-display text-[17px] text-primario">Por categoría</Text>
            <Etiqueta>{resumen.data.porCategoria.length} activas</Etiqueta>
          </View>

          {resumen.data.porCategoria.length === 0 ? (
            <Text className="font-cuerpo text-[13px] text-tenue">
              Cargá un gasto y acá vas a ver en qué se fue la plata.
            </Text>
          ) : (
            <View className="gap-3">
              {resumen.data.porCategoria.slice(0, 5).map((fila) => {
                const clave = claveDeCategoria.get(fila.categoriaId) ?? null;
                const { icono, color } = presentacionDe(clave);
                return (
                  <View key={fila.categoriaId}>
                    <View className="mb-1.5 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-lg">{icono}</Text>
                        <Text className="font-cuerpo-medio text-sm text-primario">{fila.nombre}</Text>
                      </View>
                      <Text className="font-display text-[15px] text-primario">
                        {formatearPesosCorto(fila.totalCentavos)}
                      </Text>
                    </View>
                    <View className="h-1.5 overflow-hidden rounded-pastilla bg-borde">
                      <View
                        className="h-full rounded-pastilla"
                        style={{
                          width: `${(fila.totalCentavos / maximoPorCategoria) * 100}%`,
                          backgroundColor: color,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {resumen.data.porCategoria.length > 5 ? (
            <Pressable onPress={() => router.push('/historial')} className="mt-3">
              <Text className="font-cuerpo-semi text-[13px] text-lima">Ver todas</Text>
            </Pressable>
          ) : null}
        </Tarjeta>

        {/* Con una sola persona el desglose seria una barra al 100%: no dice
            nada que el total de arriba no diga ya. Se decide por la cantidad
            de personas que devolvio el resumen y no por el alcance elegido,
            porque un grupo donde todavia cargo uno solo esta en el mismo caso. */}
        {resumen.data.porPersona.length > 1 ? (
          <Tarjeta className="p-5">
            <Text className="mb-4 font-display text-[17px] text-primario">Por persona</Text>
            <View className="flex-row gap-2.5">
              {resumen.data.porPersona.map((fila) => (
                <View key={fila.usuarioId} className="flex-1">
                  <View className="h-20 justify-end overflow-hidden rounded-2xl bg-superficie-alta">
                    <View
                      className="border-t-2 border-lima bg-lima/30"
                      style={{
                        height: `${Math.max((fila.totalCentavos / maximoPorPersona) * 100, 12)}%`,
                      }}
                    />
                  </View>
                  <Text
                    className="mt-2 text-center font-cuerpo-semi text-[13px] text-primario"
                    numberOfLines={1}
                  >
                    {fila.nombre}
                  </Text>
                  <Text className="text-center font-display text-sm tracking-tight text-lima">
                    {formatearPesosCorto(fila.totalCentavos)}
                  </Text>
                </View>
              ))}
            </View>
          </Tarjeta>
        ) : null}

        {/* La invitación a crear un grupo va atada a NO tener ninguno, no al
            alcance elegido: si estuviera en el `else` del bloque de arriba,
            aparecería también al mirar "Mis gastos" teniendo una casa. */}
        {misGrupos.length === 0 ? (
          <Pressable onPress={() => router.push('/grupos')}>
            <View className="flex-row items-center gap-3.5 rounded-tarjeta border-[1.5px] border-dashed border-borde-claro p-5">
              <Text className="text-3xl">🏠</Text>
              <View className="flex-1">
                <Text className="mb-0.5 font-cuerpo-semi text-sm text-primario">
                  ¿Querés compartir gastos?
                </Text>
                <Text className="font-cuerpo text-[13px] text-secundario">
                  Creá un hogar con tu familia o un grupo con amigos.
                </Text>
              </View>
              <View className="rounded-xl border border-lima/25 bg-lima/10 px-3.5 py-2">
                <Text className="font-cuerpo-semi text-[13px] text-lima">Crear</Text>
              </View>
            </View>
          </Pressable>
        ) : null}
      </ScrollView>

      <BotonFlotante />
    </View>
  );
}

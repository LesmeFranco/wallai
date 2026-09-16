import { useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  BotonPrimario,
  BotonSecundario,
  Cargando,
  Etiqueta,
  MensajeError,
  Tarjeta,
} from '../../componentes/base';
import { useDialogos } from '../../componentes/Dialogo';
import { IconoCopiar } from '../../componentes/iconos';
import { formatearPesosCorto } from '../../lib/formato';
import { presentacionDeGrupo } from '../../lib/grupos';
import { useSesion } from '../../lib/sesion';
import { trpc, type SalidasApi } from '../../lib/trpc';

/** Colores con los que se tiñe la inicial de cada miembro, en orden. */
const COLORES_MIEMBRO = ['#AAFF4D', '#5B8DFF', '#B47FFF', '#FF6B6B', '#FFBC42', '#43D9AD'];

type Grupo = SalidasApi['hogares']['mios'][number];

export default function PantallaGrupos() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { salir } = useSesion();

  const grupos = trpc.hogares.mios.useQuery();

  if (grupos.isPending) return <Cargando />;

  if (grupos.error) {
    return (
      <View className="flex-1 justify-center px-5">
        <MensajeError mensaje={grupos.error.message} />
      </View>
    );
  }

  const misGrupos = grupos.data ?? [];

  if (misGrupos.length === 0) {
    return (
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <Text className="px-5 font-display-extra text-[26px] tracking-tight text-primario">
          Grupos
        </Text>

        <View className="flex-1 items-center justify-center gap-5 px-5">
          <Text className="text-6xl">🏠</Text>
          <View>
            <Text className="mb-2 text-center font-display-extra text-[22px] text-primario">
              Todavía no compartís gastos
            </Text>
            <Text className="max-w-[280px] text-center font-cuerpo text-[15px] leading-6 text-secundario">
              Podés seguir usando Wallai vos solo, o crear un hogar con tu familia y un grupo con
              amigos.
            </Text>
          </View>

          <View className="mt-2 w-full gap-3">
            <BotonPrimario onPress={() => router.push('/grupo/crear')}>Crear un grupo</BotonPrimario>
            <BotonSecundario onPress={() => router.push('/grupo/unirse')}>
              Tengo un código
            </BotonSecundario>
          </View>
        </View>

        <Pressable onPress={() => void salir()} className="items-center pb-6">
          <Text className="font-cuerpo text-[13px] text-tenue">Cerrar sesión</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Text
        className="px-5 pb-4 font-display-extra text-[26px] tracking-tight text-primario"
        style={{ paddingTop: insets.top + 8 }}
      >
        Mis grupos
      </Text>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-6">
        {misGrupos.map((grupo) => (
          <TarjetaDeGrupo key={grupo.id} grupo={grupo} />
        ))}

        <View className="mt-2 gap-3">
          <BotonSecundario onPress={() => router.push('/grupo/crear')}>
            Crear otro grupo
          </BotonSecundario>
          <Pressable
            onPress={() => router.push('/grupo/unirse')}
            className="items-center py-2 active:opacity-70"
          >
            <Text className="font-cuerpo-semi text-sm text-lima">Sumarme con un código</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => void salir()} className="items-center py-4">
          <Text className="font-cuerpo text-[13px] text-tenue">Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/**
 * Una tarjeta por grupo, con su código, sus integrantes y la salida.
 *
 * Es un componente aparte y no un bloque dentro del `map` porque cada tarjeta
 * tiene estado propio (el "Copiado" del botón) y su propia mutación de salida.
 * Con todo en el padre, copiar el código de un grupo encendería el cartel de
 * "Copiado" en todos.
 */
function TarjetaDeGrupo({ grupo }: { grupo: Grupo }) {
  const [copiado, setCopiado] = useState(false);
  const utils = trpc.useUtils();
  const { confirmar, avisar } = useDialogos();
  const presentacion = presentacionDeGrupo(grupo.tipo);

  // El resumen del grupo, para mostrar cuánto lleva gastado cada integrante
  // este mes. Se pide por grupo y con su propio alcance: antes alcanzaba con
  // uno solo porque había un solo hogar.
  const resumen = trpc.hogares.resumen.useQuery({
    alcance: { tipo: 'hogar', hogarId: grupo.id },
  });

  const salirDelGrupo = trpc.hogares.salir.useMutation({
    onSuccess: () => {
      // Salir cambia qué gastos ve la persona, así que hay que invalidar todo
      // lo que depende de eso.
      void utils.hogares.mios.invalidate();
      void utils.hogares.resumen.invalidate();
      void utils.gastos.listar.invalidate();
      void utils.categorias.listar.invalidate();
    },
    onError: (problema) => void avisar({ titulo: 'No se pudo salir', mensaje: problema.message }),
  });

  const totalPorUsuario = new Map(
    resumen.data?.porPersona.map((fila) => [fila.usuarioId, fila.totalCentavos]) ?? [],
  );

  async function confirmarSalida() {
    const esElUltimo = grupo.miembros.length <= 1;
    const seguro = await confirmar({
      titulo: `¿Salir de ${grupo.nombre}?`,
      // Los dos textos dicen lo que se pierde, que no es lo mismo en cada
      // caso y no es obvio en ninguno de los dos.
      mensaje: esElUltimo
        ? `Sos el único integrante, así que ${presentacion.singular === 'hogar' ? 'el hogar' : 'el grupo'} se elimina. Tus gastos vuelven a ser privados y se pierde lo que el motor aprendió acá.`
        : `Dejás de ver los gastos de los demás. Los tuyos los seguís viendo en "Mis gastos".`,
      confirmar: 'Salir',
      destructivo: true,
    });
    if (seguro) salirDelGrupo.mutate({ hogarId: grupo.id });
  }

  async function copiarCodigo() {
    await Clipboard.setStringAsync(grupo.codigoInvitacion);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <Tarjeta className="mb-4 p-5">
      <View className="flex-row items-center gap-3.5">
        <View className="h-14 w-14 items-center justify-center rounded-[18px] border-[1.5px] border-lima/25 bg-lima/10">
          <Text className="text-2xl">{presentacion.icono}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-display-extra text-xl tracking-tight text-primario">
            {grupo.nombre}
          </Text>
          <Text className="mt-0.5 font-cuerpo text-[13px] text-secundario">
            {grupo.miembros.length}{' '}
            {grupo.miembros.length === 1 ? 'integrante' : 'integrantes'}
          </Text>
        </View>
      </View>

      <Etiqueta className="mb-2.5 mt-5">Código de invitación</Etiqueta>

      {/*
        Los casilleros van con `flex-1` en vez de un ancho fijo: seis
        casilleros de 42px mas el boton de copiar al lado no entran en el ancho
        de un telefono. Con flex-1 se reparten el ancho que haya.
      */}
      <View className="flex-row gap-2">
        {grupo.codigoInvitacion.split('').map((caracter, indice) => (
          <View
            key={`${caracter}-${indice}`}
            className="h-[48px] flex-1 items-center justify-center rounded-xl border-[1.5px] border-lima/20 bg-lima/[0.08]"
          >
            <Text className="font-display-extra text-[20px] text-lima">{caracter}</Text>
          </View>
        ))}
      </View>

      <View className="mt-3 flex-row gap-2.5">
        <Pressable
          onPress={() => void copiarCodigo()}
          className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-boton border-[1.5px] border-lima/30 py-3 active:opacity-70 ${
            copiado ? 'bg-lima/15' : ''
          }`}
        >
          <IconoCopiar />
          <Text className="font-cuerpo-semi text-sm text-lima">
            {copiado ? 'Copiado' : 'Copiar'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            void Share.share({
              message: `Sumate a ${grupo.nombre} en Wallai con el código ${grupo.codigoInvitacion}`,
            })
          }
          className="flex-1 items-center justify-center rounded-boton border-[1.5px] border-borde-claro py-3 active:opacity-70"
        >
          <Text className="font-cuerpo-semi text-sm text-primario">Compartir</Text>
        </Pressable>
      </View>

      <Etiqueta className="mb-3 mt-5">Integrantes</Etiqueta>
      <View className="gap-3">
        {grupo.miembros.map((miembro, indice) => {
          const color = COLORES_MIEMBRO[indice % COLORES_MIEMBRO.length]!;
          const total = totalPorUsuario.get(miembro.id);
          return (
            <View key={miembro.id} className="flex-row items-center gap-3.5">
              <View
                className="h-[42px] w-[42px] items-center justify-center rounded-[14px]"
                style={{ backgroundColor: `${color}20`, borderWidth: 1.5, borderColor: `${color}40` }}
              >
                <Text className="font-display text-[17px]" style={{ color }}>
                  {miembro.nombre.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-cuerpo-semi text-[15px] text-primario">{miembro.nombre}</Text>
                <Text className="font-cuerpo text-xs text-secundario" numberOfLines={1}>
                  {miembro.email}
                </Text>
              </View>
              <Text className="font-display text-sm text-secundario">
                {total === undefined ? '—' : formatearPesosCorto(total)}
              </Text>
            </View>
          );
        })}
      </View>
      <Text className="mt-3 font-cuerpo text-xs leading-5 text-tenue">
        Los totales son del mes en curso.
      </Text>

      <Pressable
        onPress={() => void confirmarSalida()}
        disabled={salirDelGrupo.isPending}
        className="mt-4 items-center rounded-boton border-[1.5px] border-coral/30 py-3 active:opacity-70"
      >
        <Text className="font-cuerpo-semi text-sm text-coral">
          {salirDelGrupo.isPending ? 'Saliendo...' : `Salir de ${grupo.nombre}`}
        </Text>
      </Pressable>
    </Tarjeta>
  );
}

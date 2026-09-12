import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NOMBRE_HOGAR_MAXIMO, TIPOS_HOGAR, type TipoHogar } from '@wallai/validators';
import { BotonPrimario, Etiqueta, MensajeError } from '../../componentes/base';
import { IconoVolver } from '../../componentes/iconos';
import { presentacionDeGrupo } from '../../lib/grupos';
import { trpc } from '../../lib/trpc';

/** Qué se le explica de cada tipo y qué nombre se le sugiere. */
const DESCRIPCION: Record<TipoHogar, { titulo: string; detalle: string; ejemplo: string }> = {
  casa: {
    titulo: 'Hogar',
    detalle: 'La gente con la que vivís.',
    ejemplo: 'Casa',
  },
  grupo: {
    titulo: 'Grupo',
    detalle: 'Amigos, un viaje, una salida.',
    ejemplo: 'Viaje a Bariloche',
  },
};

export default function CrearGrupo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoHogar>('casa');

  const crear = trpc.hogares.crear.useMutation({
    onSuccess: () => {
      // El grupo cambia quien ve que: el resumen y el listado pasan a incluir
      // los gastos de todos sus integrantes (decision D2). Hay que invalidar
      // los dos, mas la lista de grupos y las categorias (un grupo puede tener
      // categorias propias).
      void utils.hogares.mios.invalidate();
      void utils.hogares.resumen.invalidate();
      void utils.gastos.listar.invalidate();
      void utils.categorias.listar.invalidate();
      router.replace('/grupos');
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <View className="flex-row items-center gap-3 px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <IconoVolver />
        </Pressable>
        <Text className="font-display-extra text-[22px] tracking-tight text-primario">
          Nuevo grupo
        </Text>
      </View>

      <View className="flex-1 px-7">
        <Text className="mb-7 font-cuerpo text-[15px] leading-6 text-secundario">
          Vas a poder invitar a los demás con un código.
        </Text>

        <Etiqueta className="mb-2.5">¿Qué tipo es?</Etiqueta>
        <View className="mb-7 flex-row gap-3">
          {TIPOS_HOGAR.map((opcion) => {
            const activo = tipo === opcion;
            const { titulo, detalle } = DESCRIPCION[opcion];
            return (
              <Pressable
                key={opcion}
                onPress={() => setTipo(opcion)}
                className={`flex-1 rounded-[14px] border-[1.5px] p-4 active:opacity-70 ${
                  activo ? 'border-lima bg-lima/10' : 'border-borde bg-campo'
                }`}
              >
                <Text className="mb-1 text-2xl">{presentacionDeGrupo(opcion).icono}</Text>
                <Text
                  className={`font-cuerpo-semi text-[15px] ${activo ? 'text-lima' : 'text-primario'}`}
                >
                  {titulo}
                </Text>
                <Text className="mt-0.5 font-cuerpo text-xs leading-4 text-tenue">{detalle}</Text>
              </Pressable>
            );
          })}
        </View>

        <Etiqueta className="mb-2.5">Nombre</Etiqueta>
        <TextInput
          value={nombre}
          onChangeText={setNombre}
          placeholder={DESCRIPCION[tipo].ejemplo}
          placeholderTextColor="#5A5A78"
          maxLength={NOMBRE_HOGAR_MAXIMO}
          className="rounded-[14px] border-[1.5px] border-borde bg-campo px-[18px] py-[18px] font-display-semi text-xl text-primario"
        />

        {crear.error ? (
          <View className="mt-4">
            <MensajeError mensaje={crear.error.message} />
          </View>
        ) : null}

        <View className="mt-auto pb-10">
          <BotonPrimario
            onPress={() => crear.mutate({ nombre: nombre.trim(), tipo })}
            deshabilitado={nombre.trim().length === 0}
            cargando={crear.isPending}
          >
            Crear {DESCRIPCION[tipo].titulo.toLowerCase()}
          </BotonPrimario>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

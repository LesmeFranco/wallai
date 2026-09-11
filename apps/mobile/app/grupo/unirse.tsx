import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LARGO_CODIGO_INVITACION } from '@wallai/validators';
import { BotonPrimario, MensajeError } from '../../componentes/base';
import { IconoVolver } from '../../componentes/iconos';
import { trpc } from '../../lib/trpc';

export default function UnirseAGrupo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();

  const [caracteres, setCaracteres] = useState<string[]>(
    Array.from({ length: LARGO_CODIGO_INVITACION }, () => ''),
  );
  const campos = useRef<(TextInput | null)[]>([]);

  const unirse = trpc.hogares.unirse.useMutation({
    onSuccess: () => {
      void utils.hogares.mios.invalidate();
      void utils.hogares.resumen.invalidate();
      void utils.gastos.listar.invalidate();
      void utils.categorias.listar.invalidate();
      router.replace('/grupos');
    },
  });

  const codigo = caracteres.join('');
  const completo = codigo.length === LARGO_CODIGO_INVITACION;

  function escribir(indice: number, valor: string) {
    // El codigo no usa las letras y numeros que se confunden al dictarlos (ver
    // generarCodigoInvitacion), pero aca igual se acepta cualquier letra o
    // digito: si la persona tipea algo invalido, el servidor lo rechaza con un
    // mensaje claro. Filtrarlo en silencio seria mas confuso.
    const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!limpio) {
      // Borrado: solo vaciar este casillero. El foco lo mueve onKeyPress, y
      // unicamente si el casillero ya estaba vacio: si se borrara y se
      // retrocediera en el mismo gesto, el casillero recien vaciado quedaria
      // salteado y habria que volver a avanzar para reescribirlo.
      setCaracteres((previos) => previos.map((c, i) => (i === indice ? '' : c)));
      return;
    }

    // Si se pego el codigo completo, se reparte entre los campos.
    if (limpio.length > 1) {
      setCaracteres((previos) =>
        previos.map((c, i) => (i >= indice ? (limpio[i - indice] ?? '') : c)),
      );
      campos.current[Math.min(indice + limpio.length, LARGO_CODIGO_INVITACION - 1)]?.focus();
      return;
    }

    setCaracteres((previos) => previos.map((c, i) => (i === indice ? limpio : c)));
    if (limpio && indice < LARGO_CODIGO_INVITACION - 1) campos.current[indice + 1]?.focus();
  }

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
          Ingresá el código
        </Text>
      </View>

      <View className="flex-1 px-7">
        <Text className="mb-12 font-cuerpo text-[15px] leading-6 text-secundario">
          Pedíselo a quien ya creó el grupo en Wallai.
        </Text>

        <View className="flex-row justify-center gap-2.5">
          {caracteres.map((caracter, indice) => (
            <TextInput
              key={indice}
              ref={(elemento) => {
                campos.current[indice] = elemento;
              }}
              value={caracter}
              onChangeText={(valor) => escribir(indice, valor)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && !caracter && indice > 0) {
                  campos.current[indice - 1]?.focus();
                }
              }}
              maxLength={LARGO_CODIGO_INVITACION}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus={indice === 0}
              className={`h-[60px] w-12 rounded-[14px] border-2 text-center font-display-extra text-2xl text-lima ${
                caracter ? 'border-lima bg-lima/10' : 'border-borde bg-campo'
              }`}
            />
          ))}
        </View>

        {unirse.error ? (
          <View className="mt-6">
            <MensajeError mensaje={unirse.error.message} />
          </View>
        ) : null}

        <View className="mt-auto pb-10">
          <BotonPrimario
            onPress={() => unirse.mutate({ codigo })}
            deshabilitado={!completo}
            cargando={unirse.isPending}
          >
            Unirse al grupo
          </BotonPrimario>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

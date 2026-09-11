import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { BotonPrimario, Campo, MensajeError } from '../componentes/base';
import { IconoGoogle } from '../componentes/iconos';
import { useSesion } from '../lib/sesion';

export default function Login() {
  const { sesion, entrarConEmail, registrarseConEmail, entrarConGoogle } = useSesion();

  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [esRegistro, setEsRegistro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const puedeEnviar = email.trim().length > 0 && contrasena.length > 0;

  async function enviar(accion: () => Promise<void>) {
    setError(null);
    setAviso(null);
    setCargando(true);
    try {
      await accion();
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo entrar.');
    } finally {
      setCargando(false);
    }
  }

  async function registrarse() {
    setError(null);
    setAviso(null);
    setCargando(true);
    try {
      const { necesitaConfirmarEmail } = await registrarseConEmail(email.trim(), contrasena);
      if (necesitaConfirmarEmail) {
        setAviso(
          `Te mandamos un mail a ${email.trim()}. Tocá el enlace para confirmar la cuenta y después entrá con tu contraseña.`,
        );
      }
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : 'No se pudo crear la cuenta.');
    } finally {
      setCargando(false);
    }
  }

  /**
   * Quien ya tiene sesion no ve esta pantalla: pasa al dashboard.
   *
   * La navegacion depende del estado de la sesion y NO se hace a mano despues
   * de llamar a Supabase. Es importante que sea asi: `supabase.auth` avisa del
   * login por un evento asincronico, asi que apenas termina la llamada el
   * contexto todavia puede tener `sesion` en null. Navegar en ese momento hacia
   * que el guard de (sesion)/_layout.tsx no viera la sesion y rebotara de
   * vuelta aca sin mostrar ningun error: parecia que el login no funcionaba.
   */
  if (sesion) return <Redirect href="/dashboard" />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        contentContainerClassName="flex-grow px-7 pb-10 pt-16"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-[52px]">
          <View className="mb-2 flex-row items-center gap-2.5">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-lima">
              <Text className="text-xl">💸</Text>
            </View>
            <Text className="font-display-extra text-[28px] tracking-tight text-primario">
              Wallai
            </Text>
          </View>
          <Text className="font-cuerpo text-[15px] leading-6 text-secundario">
            Los gastos de la casa,{'\n'}en orden.
          </Text>
        </View>

        <View className="flex-1 gap-3.5">
          <Campo
            etiqueta="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="vos@ejemplo.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          <Campo
            etiqueta="Contraseña"
            value={contrasena}
            onChangeText={setContrasena}
            placeholder="••••••••"
            secureTextEntry
            autoComplete={esRegistro ? 'new-password' : 'current-password'}
          />

          {error ? <MensajeError mensaje={error} /> : null}
          {aviso ? (
            <View className="rounded-[14px] border border-lima/30 bg-lima/10 px-4 py-3">
              <Text className="font-cuerpo text-[13px] leading-5 text-lima">{aviso}</Text>
            </View>
          ) : null}

          <BotonPrimario
            onPress={() =>
              esRegistro ? registrarse() : enviar(() => entrarConEmail(email.trim(), contrasena))
            }
            deshabilitado={!puedeEnviar}
            cargando={cargando}
            className="mt-2"
          >
            {esRegistro ? 'Crear cuenta' : 'Entrar'}
          </BotonPrimario>

          <View className="my-1 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-borde" />
            <Text className="font-cuerpo text-[13px] text-tenue">o</Text>
            <View className="h-px flex-1 bg-borde" />
          </View>

          <Pressable
            onPress={() => enviar(entrarConGoogle)}
            className="flex-row items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-borde-claro bg-superficie-alta py-4 active:opacity-70"
          >
            <IconoGoogle />
            <Text className="font-cuerpo-medio text-[15px] text-primario">
              Continuar con Google
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            setEsRegistro(!esRegistro);
            setError(null);
            setAviso(null);
          }}
          className="mt-6"
        >
          <Text className="text-center font-cuerpo text-[13px] text-tenue">
            {esRegistro ? '¿Ya tenés cuenta? ' : '¿No tenés cuenta? '}
            <Text className="font-cuerpo-semi text-lima">
              {esRegistro ? 'Entrá' : 'Registrate'}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

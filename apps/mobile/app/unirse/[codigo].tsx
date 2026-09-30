import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CODIGO_INVITACION_REGEX,
  normalizarCodigoInvitacion,
} from '@wallai/validators';
import { BotonPrimario, Cargando, Etiqueta, MensajeError, Tarjeta } from '../../componentes/base';
import { presentacionDeGrupo } from '../../lib/grupos';
import {
  guardarInvitacionPendiente,
  olvidarInvitacionPendiente,
} from '../../lib/invitacion';
import { useSesion } from '../../lib/sesion';
import { trpc } from '../../lib/trpc';

/**
 * La pantalla que aparece al tocar un link de invitacion.
 *
 * Es la ruta que atiende `wallai://unirse/<codigo>`, que es a donde manda la
 * pagina web de invitacion (apps/web/app/unirse/[codigo]/page.tsx). Expo Router
 * resuelve sola esa URL a esta ruta, venga la app de cero o de segundo plano.
 *
 * Esta FUERA de la carpeta (sesion) a proposito: la persona invitada puede no
 * tener sesion, y si esta ruta exigiera sesion el guard la mandaria al login y
 * el codigo se perderia por el camino. Aca la falta de sesion se maneja
 * explicitamente: se guarda la invitacion y se va al login, que al entrar
 * vuelve sola a esta pantalla.
 *
 * Sumarse NO es automatico, y eso lo pidio Franco: el link abre la app y la
 * persona decide. Un link que te mete en un grupo con solo tocarlo es un link
 * que cualquiera puede usar para meterte donde no querias.
 */
export default function Invitacion() {
  const { codigo: recibido } = useLocalSearchParams<{ codigo: string }>();
  const codigo = normalizarCodigoInvitacion(String(recibido ?? ''));
  const esCodigoValido = CODIGO_INVITACION_REGEX.test(codigo);

  const { sesion, cargando: cargandoSesion } = useSesion();
  const router = useRouter();
  const utils = trpc.useUtils();
  const insets = useSafeAreaInsets();

  /**
   * Sin sesion: se guarda la invitacion y se manda al login, que al entrar
   * vuelve aca (ver `login.tsx`).
   *
   * Va en un efecto y no en el cuerpo del componente porque guardar es
   * asincronico y navegar durante el render es un error de React.
   */
  useEffect(() => {
    if (cargandoSesion || sesion || !esCodigoValido) return;
    void guardarInvitacionPendiente(codigo).then(() => router.replace('/login'));
  }, [cargandoSesion, sesion, esCodigoValido, codigo, router]);

  /**
   * Con sesion, la invitacion ya cumplio su funcion: se olvida para que no
   * vuelva a dispararse sola la proxima vez que la persona entre.
   */
  useEffect(() => {
    if (sesion) void olvidarInvitacionPendiente();
  }, [sesion]);

  const grupo = trpc.hogares.porCodigo.useQuery(
    { codigo },
    { enabled: esCodigoValido && Boolean(sesion) },
  );

  const unirse = trpc.hogares.unirse.useMutation({
    onSuccess: () => {
      void utils.hogares.mios.invalidate();
      void utils.hogares.resumen.invalidate();
      void utils.gastos.listar.invalidate();
      void utils.categorias.listar.invalidate();
      router.replace('/grupos');
    },
  });

  /**
   * Ya ser miembro no es un error de la persona: es la respuesta a su pregunta.
   * El backend lo devuelve como CONFLICT con el nombre del grupo adentro del
   * mensaje ("Ya formás parte de Casa"), asi que se muestra como informacion y
   * no como una falla en rojo.
   */
  const yaEsMiembro = unirse.error?.data?.code === 'CONFLICT';

  if (!esCodigoValido) {
    return (
      <Pantalla insets={insets}>
        <Tarjeta className="items-center p-7">
          <Text className="text-4xl">🔗</Text>
          <Text className="mt-4 text-center font-display-extra text-[22px] tracking-tight text-primario">
            Este link no está completo
          </Text>
          <Text className="mt-2.5 text-center font-cuerpo text-sm leading-6 text-secundario">
            Pedile a quien te invitó que te lo mande de nuevo.
          </Text>
          <BotonPrimario className="mt-7 w-full" onPress={() => router.replace('/dashboard')}>
            Ir a Wallai
          </BotonPrimario>
        </Tarjeta>
      </Pantalla>
    );
  }

  // Mientras se lee la sesion guardada, o mientras el efecto de arriba lleva al
  // login, no hay nada que decidir todavia.
  if (cargandoSesion || !sesion) return <Cargando />;
  if (grupo.isPending) return <Cargando />;

  if (grupo.error) {
    return (
      <Pantalla insets={insets}>
        <Tarjeta className="items-center p-7">
          <Text className="text-4xl">🔗</Text>
          <Text className="mt-4 text-center font-display-extra text-[22px] tracking-tight text-primario">
            Esta invitación no vale
          </Text>
          <Text className="mt-2.5 text-center font-cuerpo text-sm leading-6 text-secundario">
            El grupo pudo haberse borrado, o el link está mal. Pedile uno nuevo a quien te invitó.
          </Text>
          <BotonPrimario className="mt-7 w-full" onPress={() => router.replace('/dashboard')}>
            Ir a Wallai
          </BotonPrimario>
        </Tarjeta>
      </Pantalla>
    );
  }

  const presentacion = presentacionDeGrupo(grupo.data.tipo);

  return (
    <Pantalla insets={insets}>
      <Tarjeta className="items-center p-7">
        <View className="h-16 w-16 items-center justify-center rounded-[20px] border-[1.5px] border-lima/25 bg-lima/10">
          <Text className="text-3xl">{presentacion.icono}</Text>
        </View>

        <Etiqueta className="mt-5">Te invitaron a</Etiqueta>
        <Text className="mt-1.5 text-center font-display-extra text-3xl tracking-tight text-primario">
          {grupo.data.nombre}
        </Text>

        {yaEsMiembro ? (
          <>
            <Text className="mt-3 text-center font-cuerpo text-sm leading-6 text-secundario">
              {unirse.error?.message}
            </Text>
            <BotonPrimario className="mt-7 w-full" onPress={() => router.replace('/grupos')}>
              Ver el grupo
            </BotonPrimario>
          </>
        ) : (
          <>
            <Text className="mt-3 text-center font-cuerpo text-sm leading-6 text-secundario">
              Si te sumás, vas a ver los gastos de todos los integrantes y los tuyos van a sumar al
              total del {presentacion.singular}.
            </Text>

            {/* Lo que la gente no espera y conviene decir antes y no despues:
                los gastos que ya cargo no se mudan al grupo. Es el invariante de
                gastos.hogar_id, y sin avisarlo parece que la app perdio algo. */}
            <Text className="mt-2.5 text-center font-cuerpo text-xs leading-5 text-tenue">
              Lo que cargaste antes sigue siendo tuyo y no pasa al grupo.
            </Text>

            {unirse.error && !yaEsMiembro ? (
              <View className="mt-5 w-full">
                <MensajeError mensaje={unirse.error.message} />
              </View>
            ) : null}

            <View className="mt-7 w-full gap-3">
              <BotonPrimario
                onPress={() => unirse.mutate({ codigo })}
                cargando={unirse.isPending}
              >
                Sumarme
              </BotonPrimario>
              <Pressable
                onPress={() => router.replace('/dashboard')}
                disabled={unirse.isPending}
                className="items-center rounded-boton border-[1.5px] border-borde-claro py-3.5 active:opacity-70"
              >
                <Text className="font-cuerpo-semi text-sm text-secundario">No, gracias</Text>
              </Pressable>
            </View>
          </>
        )}
      </Tarjeta>
    </Pantalla>
  );
}

/** El marco centrado que comparten los cuatro estados de esta pantalla. */
function Pantalla({
  children,
  insets,
}: {
  children: React.ReactNode;
  insets: { top: number; bottom: number };
}) {
  return (
    <View
      className="flex-1 justify-center px-6"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}
    >
      {children}
    </View>
  );
}

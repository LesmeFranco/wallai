import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import {
  MAXIMO_GASTOS_POR_LOTE,
  separarEnGastos,
  type DestinoGasto,
} from '@wallai/validators';
import {
  BotonPrimario,
  Etiqueta,
  IconoCategoria,
  MAX_ESCALA_MONTO,
  MensajeError,
  PastillaCategoria,
  Tarjeta,
} from '../../componentes/base';
import { CorrectorDeCategoria } from '../../componentes/CorrectorDeCategoria';
import { IconoTilde, IconoVolver } from '../../componentes/iconos';
import { descripcionDeGasto, formatearPesosSinCentavos } from '../../lib/formato';
import { presentacionDeGrupo } from '../../lib/grupos';
import { pedirPermisoTrasElPrimerGasto } from '../../lib/notificaciones';
import { trpc } from '../../lib/trpc';

/**
 * Ejemplos que se muestran como atajos.
 *
 * Ya no llevan "$": desde la 1.2.0 el parser toma como monto un numero que abra
 * el texto, sin marcador. Los atajos ensenan la forma mas corta que funciona,
 * porque es lo que la gente va a copiar; el "$" sigue valiendo y sigue ganando
 * cuando esta (ver packages/validators/src/parser.ts).
 *
 * DOS DE LOS CUATRO LLEVAN EL MONTO AL FINAL, que es lo que se agrego en la
 * 1.7.0. Es la unica forma de que alguien se entere: nadie va a probar
 * "nafta 30000" por su cuenta si los cuatro ejemplos empiezan por el numero.
 * Y uno lleva "ayer", para que se vea que la fecha tambien entra en la frase.
 */
const EJEMPLOS = ['30000 nafta Shell', 'café y medialunas 15500', '8900 colectivo ayer', 'super Coto 45000'];

type Estado = 'escribiendo' | 'guardado';

/** Un gasto tal como volvio del servidor despues de guardarlo. */
type GastoCargado = {
  id: string;
  textoOriginal: string;
  montoCentavos: number;
  categoriaId: string;
};

export default function NuevoGasto() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();

  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<Estado>('escribiendo');
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categorias = trpc.categorias.listar.useQuery();
  const grupos = trpc.hogares.mios.useQuery();

  /**
   * A donde va este gasto. `null` significa "no lo elegi a mano todavia", que
   * no es lo mismo que "privado": sin eleccion explicita se usa el primer
   * grupo, y si la persona no esta en ninguno, queda privado.
   *
   * Se guarda la eleccion del usuario aparte del valor efectivo para que el
   * default pueda cambiar cuando terminan de cargar los grupos sin pisar lo
   * que la persona ya haya tocado.
   */
  const [destinoElegido, setDestinoElegido] = useState<DestinoGasto | null>(null);

  const misGrupos = grupos.data ?? [];
  const destino: DestinoGasto =
    destinoElegido ??
    (misGrupos[0] ? { tipo: 'hogar', hogarId: misGrupos[0].id } : { tipo: 'personal' });

  /**
   * El texto partido en un gasto por linea, con el monto de cada uno.
   *
   * Se calcula en el telefono con el MISMO codigo que usa el servidor (esta en
   * packages/validators, que es logica pura compartida), asi que la vista
   * previa no puede diferir de lo que se va a guardar. Y no cuesta una llamada
   * de red: se recalcula en cada tecla.
   */
  const lineas = useMemo(() => separarEnGastos(texto), [texto]);

  const lineasSinMonto = lineas.filter((linea) => linea.montoCentavos === null);
  const totalDelLote = lineas.reduce((suma, linea) => suma + (linea.montoCentavos ?? 0), 0);
  const sonDemasiadas = lineas.length > MAXIMO_GASTOS_POR_LOTE;
  // Guardar solo tiene sentido si hay al menos una linea, todas tienen monto, y
  // no son mas de las que el servidor acepta. Los tres casos se explican en
  // pantalla, asi que el boton deshabilitado nunca es un misterio.
  const sePuedeGuardar = lineas.length > 0 && lineasSinMonto.length === 0 && !sonDemasiadas;

  /**
   * Los gastos que quedaron guardados. Es una lista y no uno solo porque ahora
   * se puede cargar varios de una vez; con uno solo, la lista tiene un elemento
   * y la pantalla de confirmacion es la misma de siempre.
   */
  const [gastosGuardados, setGastosGuardados] = useState<GastoCargado[]>([]);

  /** El gasto cuya hoja de correccion esta abierta, cuando se cargo mas de uno. */
  const [gastoACorregir, setGastoACorregir] = useState<GastoCargado | null>(null);

  /**
   * El gasto, cuando se cargo uno solo.
   *
   * Con uno solo la confirmacion sigue siendo la de siempre: el monto grande,
   * la categoria, y las pastillas para corregir en la misma pantalla. Es el
   * caso mas comun y no habia ninguna razon para cambiarlo.
   */
  const unico = gastosGuardados.length === 1 ? gastosGuardados[0] : undefined;

  /**
   * La categoria que la persona toco mientras corrige, que NO es todavia la
   * guardada. Son dos cosas distintas a proposito: `unico.categoriaId`
   * es lo que hay en la base y esto es una intencion sin confirmar. Se separan
   * porque el paso de confirmar existe justamente para poder cambiar de idea
   * (o deshacer un toque sin querer) antes de que viaje nada.
   */
  const [categoriaElegida, setCategoriaElegida] = useState<string | null>(null);

  /**
   * Siempre se usa `crearVarios`, incluso para un gasto solo.
   *
   * Podria elegirse entre `crear` y `crearVarios` segun la cantidad, y seria
   * peor: dos caminos distintos para la accion mas repetida de la app, y el de
   * un gasto solo -el mas usado- ejercitando codigo que el de varios no. Con
   * uno solo, `crearVarios` recibe un array de un elemento y devuelve otro de
   * un elemento. `gastos.crear` sigue existiendo porque lo usan las versiones
   * de la app ya instaladas.
   */
  const crear = trpc.gastos.crearVarios.useMutation({
    onSuccess: (creados) => {
      setGastosGuardados(
        creados.map((gasto) => ({
          id: gasto.id,
          textoOriginal: gasto.textoOriginal,
          montoCentavos: gasto.montoCentavos,
          categoriaId: gasto.categoriaId,
        })),
      );
      setEstado('guardado');
      // Invalida lo que el dashboard y el historial muestran, para que al
      // volver ya estén con el gasto nuevo incluido.
      void utils.hogares.resumen.invalidate();
      void utils.gastos.listar.invalidate();
      /**
       * El momento de pedir el permiso de notificaciones: recien despues del
       * primer gasto cargado, nunca al abrir la app por primera vez.
       *
       * Un permiso pedido en frio, antes de que la persona haya visto para que
       * sirve la app, se rechaza casi siempre, y en Android y en iOS ese
       * rechazo es definitivo: la app no puede volver a preguntar. La funcion
       * se encarga de no insistir si ya hubo respuesta alguna vez.
       */
      void pedirPermisoTrasElPrimerGasto();
    },
    onError: (problema) => setError(problema.message),
  });

  /**
   * Corregir la categoria.
   *
   * Se dispara una sola vez, al confirmar con "Listo", y no en cada toque de
   * una pastilla. El cambio es de comportamiento y tiene dos motivos, uno de
   * uso y uno de fondo:
   *
   *  - De uso: antes, tocar una pastilla guardaba y cerraba la lista al toque.
   *    Si uno se equivocaba de pastilla -o solo queria mirar las opciones- ya
   *    era tarde y habia que volver a abrir la correccion.
   *
   *  - De fondo, y es el importante: `gastos.corregirCategoria` no solo cambia
   *    este gasto, tambien le ENSENA al grupo ("medialunas es comida"). Un
   *    toque sin querer no deberia dejar una regla aprendida que despues va a
   *    categorizar mal todo lo parecido. Confirmar a mano es lo que separa
   *    "estoy mirando las opciones" de "esta es la categoria".
   *
   * Al guardar bien se vuelve a la pantalla anterior: la correccion era el
   * ultimo paso pendiente y quedarse mirando la confirmacion no aporta nada.
   */
  const corregir = trpc.gastos.corregirCategoria.useMutation({
    onSuccess: () => {
      void utils.hogares.resumen.invalidate();
      void utils.gastos.listar.invalidate();
      router.back();
    },
    onError: (problema) => setError(problema.message),
  });

  /**
   * El boton de abajo. Guarda la correccion solo si hay algo que cambiar, y en
   * cualquier caso cierra la pantalla. Es un boton y no dos porque desde el
   * lado de quien lo usa la accion es una sola: "ya esta, listo".
   */
  function confirmarYSalir() {
    if (!unico) return router.back();
    const elegida = categoriaElegida ?? unico.categoriaId;
    if (elegida === unico.categoriaId) return router.back();
    setError(null);
    corregir.mutate({ gastoId: unico.id, categoriaId: elegida });
  }

  /**
   * La categoria que se muestra en pantalla: la que la persona acaba de tocar
   * si esta corrigiendo, y si no la que quedo guardada. Mostrar la tocada al
   * instante es lo que hace que el toque se sienta registrado sin haber
   * guardado nada todavia; el cartel de abajo aclara que falta confirmar.
   */
  const categoriaMostradaId = categoriaElegida ?? unico?.categoriaId;
  const categoriaMostrada = categorias.data?.find((c) => c.id === categoriaMostradaId);
  const hayCambioSinGuardar =
    categoriaElegida !== null && categoriaElegida !== unico?.categoriaId;

  const grupoDelDestino =
    destino.tipo === 'hogar' ? misGrupos.find((grupo) => grupo.id === destino.hogarId) : undefined;
  const nombreDelDestino = grupoDelDestino
    ? `${presentacionDeGrupo(grupoDelDestino.tipo).icono} ${grupoDelDestino.nombre}`
    : '🔒 Privado, solo lo ves vos';

  /**
   * Confirmacion de varios gastos: una lista.
   *
   * No se reusa la pantalla de uno solo con el monto grande porque con cinco
   * gastos el dato importante no es cada monto sino que quedaron los cinco y en
   * que categoria cayo cada uno, que es justo lo que hay que poder corregir.
   */
  if (estado === 'guardado' && gastosGuardados.length > 1) {
    return (
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="items-center px-7 pb-3 pt-4">
          <Animated.View
            entering={ZoomIn.springify().damping(12)}
            className="h-16 w-16 items-center justify-center rounded-[24px] bg-lima"
          >
            <IconoTilde />
          </Animated.View>

          <Animated.View entering={FadeIn.delay(150)} className="items-center">
            <Text className="mt-5 font-display-extra text-[26px] tracking-tight text-primario">
              Cargaste {gastosGuardados.length} gastos
            </Text>
            <Text
              className="mt-1 font-display-extra text-3xl tracking-tighter text-lima"
              maxFontSizeMultiplier={MAX_ESCALA_MONTO}
              numberOfLines={1}
            >
              {formatearPesosSinCentavos(
                gastosGuardados.reduce((suma, gasto) => suma + gasto.montoCentavos, 0),
              )}
            </Text>
            {misGrupos.length > 0 ? (
              <Text className="mt-1 font-cuerpo text-[13px] text-tenue">{nombreDelDestino}</Text>
            ) : null}
          </Animated.View>
        </View>

        <ScrollView contentContainerClassName="px-5 pb-6">
          <Etiqueta className="mb-2.5">Tocá uno para cambiarle la categoría</Etiqueta>

          <View className="gap-2.5">
            {gastosGuardados.map((gasto) => {
              const categoria = categorias.data?.find((c) => c.id === gasto.categoriaId);
              return (
                <Pressable key={gasto.id} onPress={() => setGastoACorregir(gasto)}>
                  <Tarjeta className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-70">
                    <IconoCategoria clave={categoria?.clave ?? null} tamano={40} />
                    <View className="flex-1">
                      <Text
                        className="font-cuerpo-semi text-[15px] text-primario"
                        numberOfLines={1}
                      >
                        {descripcionDeGasto(gasto.textoOriginal) ??
                          categoria?.nombre ??
                          'Sin descripción'}
                      </Text>
                      <Text className="mt-0.5 font-cuerpo text-xs text-secundario">
                        {categoria?.nombre ?? 'Otros'}
                      </Text>
                    </View>
                    <Text
                      className="font-display text-lg tracking-tight text-primario"
                      maxFontSizeMultiplier={MAX_ESCALA_MONTO}
                      numberOfLines={1}
                    >
                      {formatearPesosSinCentavos(gasto.montoCentavos)}
                    </Text>
                  </Tarjeta>
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-3.5 font-cuerpo text-xs leading-5 text-tenue">
            Corregir una categoría le enseña al grupo: la próxima vez que alguien escriba algo
            parecido, Wallai ya va a saber dónde va.
          </Text>

          <View className="mt-7">
            <BotonPrimario onPress={() => router.back()}>Listo</BotonPrimario>
          </View>
        </ScrollView>

        <CorrectorDeCategoria
          gasto={gastoACorregir}
          onCerrar={() => setGastoACorregir(null)}
          onCorregido={(gastoId, categoriaId) =>
            setGastosGuardados((previos) =>
              previos.map((gasto) => (gasto.id === gastoId ? { ...gasto, categoriaId } : gasto)),
            )
          }
        />
      </View>
    );
  }

  if (estado === 'guardado' && unico) {
    return (
      <View className="flex-1 items-center justify-center px-7" style={{ paddingTop: insets.top }}>
        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          className="h-20 w-20 items-center justify-center rounded-[28px] bg-lima"
        >
          <IconoTilde />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(150)} className="mt-6 items-center">
          <Text className="font-display-extra text-4xl tracking-tighter text-lima">
            {formatearPesosSinCentavos(unico.montoCentavos)}
          </Text>
          <Text className="mt-1 font-cuerpo text-[15px] text-secundario">
            Guardado en{' '}
            <Text className="font-cuerpo-semi text-primario">
              {categoriaMostrada?.nombre ?? 'Otros'}
            </Text>
          </Text>
          {/* Con varios grupos posibles, saber en cual quedo es tan importante
              como saber la categoria: es lo que define quien lo va a ver. */}
          {misGrupos.length > 0 ? (
            <Text className="mt-0.5 font-cuerpo text-[13px] text-tenue">{nombreDelDestino}</Text>
          ) : null}
        </Animated.View>

        {corrigiendo ? (
          <Animated.View entering={FadeIn} className="mt-7 w-full">
            <Etiqueta className="mb-3 text-center">¿En qué categoría va?</Etiqueta>
            <View className="flex-row flex-wrap justify-center gap-2">
              {categorias.data?.map((categoria) => (
                <PastillaCategoria
                  key={categoria.id}
                  nombre={categoria.nombre}
                  clave={categoria.clave}
                  /* Se marca la elegida a mano, que puede no ser la guardada
                     todavia: eso es lo que permite cambiar de idea. */
                  seleccionada={categoria.id === categoriaMostradaId}
                  onPress={() => {
                    setError(null);
                    setCategoriaElegida(categoria.id);
                  }}
                />
              ))}
            </View>
            <Text className="mt-3.5 text-center font-cuerpo text-xs leading-4 text-tenue">
              {hayCambioSinGuardar
                ? 'Todavía no se guardó. Tocá Listo para confirmar.'
                : 'Elegí la correcta y tocá Listo.'}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.delay(300)} className="mt-7 items-center gap-3">
            <Pressable
              onPress={() => setCorrigiendo(true)}
              className="rounded-pastilla border border-lima/25 bg-lima/10 px-4 py-2"
            >
              <Text className="font-cuerpo-semi text-[13px] text-lima">
                No es esa categoría, corregir
              </Text>
            </Pressable>
            <Text className="text-center font-cuerpo text-xs text-tenue">
              Si la corregís, la próxima vez que escribas algo parecido{'\n'}Wallai ya va a saber
              dónde va.
            </Text>
          </Animated.View>
        )}

        {error ? <View className="mt-5 w-full"><MensajeError mensaje={error} /></View> : null}

        <View className="mt-9 w-full">
          {/* Un solo boton para las dos cosas: guarda la correccion si hay
              alguna sin confirmar, y cierra. Ver `confirmarYSalir`. */}
          <BotonPrimario onPress={confirmarYSalir} cargando={corregir.isPending}>
            Listo
          </BotonPrimario>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <View className="flex-row items-center gap-3 px-5 pb-5" style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <IconoVolver />
        </Pressable>
        <Text className="font-display-extra text-[22px] tracking-tight text-primario">
          Nuevo gasto
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="flex-grow px-5 pb-6"
        keyboardShouldPersistTaps="handled"
      >
        <Tarjeta className="min-h-[180px] flex-1 border-2 p-6">
          <View className="mb-4 flex-row items-baseline justify-between">
            <Etiqueta>¿Qué gastaste?</Etiqueta>
            {/* Va en la etiqueta y no en un cartel aparte: que cada renglon sea
                un gasto hay que entenderlo antes de escribir, no despues. */}
            <Etiqueta>Uno por línea o coma</Etiqueta>
          </View>
          <TextInput
            value={texto}
            onChangeText={(valor) => {
              setTexto(valor);
              setError(null);
            }}
            /*
              El ejemplo cambio a proposito, y es el aviso mas importante de
              este cambio: antes mostraba UNA descripcion partida en dos
              renglones ("30000 hamburguesa" / "en Guido"), que ahora serian dos
              gastos y el segundo sin monto. Ahora muestra tres gastos, que es
              lo que el salto de linea significa.
            */
            placeholder={'3000 hamburguesa\npan 7000\nsube 5000'}
            placeholderTextColor="#5A5A78"
            multiline
            autoFocus
            className="flex-1 font-display text-[30px] leading-10 tracking-tight text-primario"
            style={{ textAlignVertical: 'top' }}
          />

          {lineas.length === 0 ? (
            <Text className="mt-2 font-cuerpo text-[13px] leading-5 text-tenue">
              El monto puede ir al principio o al final: &quot;5000 pan&quot; y &quot;pan
              5000&quot; valen igual. Si tenés varios, separalos por renglón o por coma: Wallai los
              categoriza solos.
            </Text>
          ) : null}
        </Tarjeta>

        {/*
          La vista previa, fuera de la tarjeta del campo.

          Es lo que hace que cargar varios de una no sea a ciegas: se ve el monto
          detectado en cada renglon antes de guardar, calculado con el mismo
          codigo que va a usar el servidor. Y el renglon al que le falta el monto
          se marca en el momento, que es cuando la persona todavia se acuerda de
          cuanto fue.
        */}
        {lineas.length > 0 ? (
          <View className="mt-4">
            <View className="mb-2.5 flex-row items-baseline justify-between">
              <Etiqueta>{lineas.length === 1 ? 'Un gasto' : `${lineas.length} gastos`}</Etiqueta>
              {lineas.length > 1 && lineasSinMonto.length === 0 ? (
                <Text
                  className="font-display text-[15px] tracking-tight text-lima"
                  maxFontSizeMultiplier={MAX_ESCALA_MONTO}
                >
                  {formatearPesosSinCentavos(totalDelLote)}
                </Text>
              ) : null}
            </View>

            <View className="gap-2">
              {lineas.map((linea, indice) => (
                <View
                  key={`${indice}-${linea.texto}`}
                  className={`flex-row items-center gap-3 rounded-[14px] border px-3.5 py-2.5 ${
                    linea.montoCentavos === null
                      ? 'border-coral/40 bg-coral/[0.07]'
                      : 'border-borde bg-superficie-alta'
                  }`}
                >
                  <Text className="flex-1 font-cuerpo text-[13px] text-secundario" numberOfLines={1}>
                    {linea.texto}
                  </Text>
                  {linea.montoCentavos === null ? (
                    <Text className="font-cuerpo-semi text-xs text-coral">falta el monto</Text>
                  ) : (
                    <Text
                      className="font-display text-[15px] tracking-tight text-primario"
                      maxFontSizeMultiplier={MAX_ESCALA_MONTO}
                    >
                      {formatearPesosSinCentavos(linea.montoCentavos)}
                    </Text>
                  )}
                </View>
              ))}
            </View>

            {sonDemasiadas ? (
              <Text className="mt-2.5 font-cuerpo text-xs leading-5 text-coral">
                Son demasiados para una sola vez. El máximo es {MAXIMO_GASTOS_POR_LOTE}: guardá
                estos y seguí con el resto.
              </Text>
            ) : null}
          </View>
        ) : null}

        {/*
          El selector de destino aparece solo si la persona pertenece a algun
          grupo. Sin grupos hay un unico destino posible y mostrar la pregunta
          seria agregarle un paso a la accion mas repetida de la app para que
          siempre conteste lo mismo.
        */}
        {misGrupos.length > 0 ? (
          <View className="mt-4">
            <Etiqueta className="mb-2.5">¿Dónde lo anoto?</Etiqueta>
            <View className="flex-row flex-wrap gap-2">
              {misGrupos.map((grupo) => {
                const activo = destino.tipo === 'hogar' && destino.hogarId === grupo.id;
                return (
                  <Pressable
                    key={grupo.id}
                    onPress={() => setDestinoElegido({ tipo: 'hogar', hogarId: grupo.id })}
                    className={`rounded-pastilla px-3.5 py-2 ${
                      activo ? 'border-[1.5px] border-lima bg-lima/15' : 'border-[1.5px] border-borde bg-superficie-alta'
                    }`}
                  >
                    <Text
                      className={`font-cuerpo-semi text-[13px] ${activo ? 'text-lima' : 'text-secundario'}`}
                    >
                      {presentacionDeGrupo(grupo.tipo).icono} {grupo.nombre}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => setDestinoElegido({ tipo: 'personal' })}
                className={`rounded-pastilla px-3.5 py-2 ${
                  destino.tipo === 'personal'
                    ? 'border-[1.5px] border-lima bg-lima/15'
                    : 'border-[1.5px] border-borde bg-superficie-alta'
                }`}
              >
                <Text
                  className={`font-cuerpo-semi text-[13px] ${
                    destino.tipo === 'personal' ? 'text-lima' : 'text-secundario'
                  }`}
                >
                  🔒 Solo mío
                </Text>
              </Pressable>
            </View>

            {destino.tipo === 'personal' ? (
              <Text className="mt-2 font-cuerpo text-xs leading-4 text-tenue">
                No lo va a ver nadie de tus grupos y no suma a ningún total compartido.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View className="mt-4">
          <Etiqueta className="mb-2.5">Rápidos</Etiqueta>
          <View className="flex-row flex-wrap gap-2">
            {EJEMPLOS.map((ejemplo) => (
              <Pressable
                key={ejemplo}
                /*
                  Agrega un renglon en vez de reemplazar lo escrito: ahora que se
                  cargan varios juntos, pisarle el texto a alguien que ya
                  escribio tres lineas seria borrarle el trabajo.
                */
                onPress={() =>
                  setTexto((previo) =>
                    previo.trim() ? `${previo.trimEnd()}\n${ejemplo}` : ejemplo,
                  )
                }
                className="rounded-pastilla border border-borde bg-superficie-alta px-3.5 py-2 active:opacity-70"
              >
                <Text className="font-cuerpo-medio text-[13px] text-secundario">{ejemplo}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? <View className="mt-4"><MensajeError mensaje={error} /></View> : null}

        <View className="mt-auto pt-4">
          <BotonPrimario
            onPress={() => crear.mutate({ textos: lineas.map((linea) => linea.texto), destino })}
            deshabilitado={!sePuedeGuardar}
            cargando={crear.isPending}
          >
            {lineas.length > 1 ? `Guardar ${lineas.length} gastos` : 'Guardar gasto'}
          </BotonPrimario>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

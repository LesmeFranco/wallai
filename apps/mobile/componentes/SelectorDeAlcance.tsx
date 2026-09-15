import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Alcance, TipoHogar } from '@wallai/validators';
import { presentacionDeGrupo } from '../lib/grupos';

export type GrupoParaSelector = {
  id: string;
  nombre: string;
  tipo: TipoHogar;
};

/**
 * El selector de "que estoy mirando", compartido por el dashboard y el
 * historial.
 *
 * Esta en un componente propio y no duplicado en las dos pantallas porque las
 * opciones tienen que ser exactamente las mismas: si el dashboard ofreciera un
 * alcance que el historial no, la persona veria un total que despues no puede
 * desglosar, que es justo el tipo de incoherencia que hace desconfiar de los
 * numeros.
 *
 * Una pastilla por pregunta, y son dos: "Mis gastos" (lo que gaste yo, en
 * donde sea) y un grupo puntual (lo que gastamos entre todos ahi). Antes habia
 * una tercera, "Todo", que sumaba lo propio con lo de todos los grupos y era el
 * default. Se saco: mezclaba dos billeteras distintas en un numero que no
 * contestaba bien ninguna de las dos preguntas, y hacia que lo que cargaban los
 * demas apareciera en la vista personal de uno en vez de quedarse donde se
 * comparte. Detalle importante: "Mis gastos" NO excluye lo que cargaste en un
 * grupo -eso lo gastaste vos igual-, solo excluye lo que cargaron los demas.
 *
 * Tampoco hay pastilla de "Privados": "Mis gastos" ya los trae junto con todo
 * lo demas, asi que filtrar solo los privados seria un subconjunto que no
 * contesta ninguna pregunta distinta. Cuales son privados se ve en el candado
 * de cada fila.
 */
export function SelectorDeAlcance({
  alcance,
  onCambiar,
  grupos,
}: {
  alcance: Alcance;
  onCambiar: (alcance: Alcance) => void;
  grupos: GrupoParaSelector[];
}) {
  /**
   * Sin ningun grupo, todo lo que la persona ve ya es suyo: la unica pastilla
   * que quedaria es la que ya esta activa, y un selector de una sola opcion es
   * ruido. Es el caso de alguien que recien se registra, que es justamente a
   * quien no hay que pedirle decisiones.
   */
  if (grupos.length === 0) return null;

  const opciones: Array<{ clave: string; etiqueta: string; alcance: Alcance }> = [
    { clave: 'mio', etiqueta: 'Mis gastos', alcance: { tipo: 'mio' } },
    ...grupos.map((grupo) => ({
      clave: grupo.id,
      etiqueta: `${presentacionDeGrupo(grupo.tipo).icono} ${grupo.nombre}`,
      alcance: { tipo: 'hogar' as const, hogarId: grupo.id },
    })),
  ];

  function estaActiva(opcion: Alcance): boolean {
    if (opcion.tipo !== alcance.tipo) return false;
    // Dos alcances de grupo solo son el mismo si apuntan al mismo grupo.
    if (opcion.tipo === 'hogar' && alcance.tipo === 'hogar') {
      return opcion.hogarId === alcance.hogarId;
    }
    return true;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 pr-5"
    >
      {opciones.map((opcion) => {
        const activa = estaActiva(opcion.alcance);
        return (
          <Pressable
            key={opcion.clave}
            onPress={() => onCambiar(opcion.alcance)}
            className={`rounded-pastilla px-3.5 py-1.5 ${
              activa ? 'border-[1.5px] border-lima bg-lima/15' : 'border-[1.5px] border-borde'
            }`}
          >
            <Text
              className={`font-cuerpo-semi text-[13px] ${activa ? 'text-lima' : 'text-secundario'}`}
              numberOfLines={1}
            >
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** El titulo que describe el alcance elegido, para el encabezado de la pantalla. */
export function tituloDeAlcance(alcance: Alcance, grupos: GrupoParaSelector[]): string {
  if (alcance.tipo === 'hogar') {
    return grupos.find((grupo) => grupo.id === alcance.hogarId)?.nombre ?? 'Grupo';
  }
  return 'Mis gastos';
}

/** Una linea que explica que incluye el alcance, porque no siempre es obvio. */
export function DescripcionDeAlcance({ alcance }: { alcance: Alcance }) {
  const textos: Record<Alcance['tipo'], string> = {
    // Esta es la distincion que la gente confunde, asi que se dice explicito:
    // lo que cargo uno en un grupo sigue siendo suyo y cuenta aca.
    mio: 'Todo lo que cargaste vos: en cualquier grupo, los privados, y también lo de antes de sumarte.',
    hogar: 'Los gastos de todos los integrantes de este grupo.',
    // La app ya no ofrece este alcance; el texto queda por si llega del bundle
    // viejo de la 1.0.0 (ver el comentario de `alcanceSchema`).
    todo: 'Tus gastos privados más los de todos tus grupos.',
  };
  return (
    <View className="mt-2">
      <Text className="font-cuerpo text-xs leading-4 text-tenue">{textos[alcance.tipo]}</Text>
    </View>
  );
}

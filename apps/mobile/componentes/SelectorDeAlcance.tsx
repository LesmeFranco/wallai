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
 * El orden de las pastillas va de lo mas general a lo mas especifico: Todo,
 * Solo yo, y despues cada grupo. "Solo yo" va segundo por ser el que mas se usa
 * despues del general.
 *
 * No hay pastilla de "Privados", a proposito: "Solo yo" ya trae todo lo que
 * cargo la persona, los privados incluidos, asi que filtrar solo los privados
 * seria un subconjunto que no contesta ninguna pregunta distinta. Cuales son
 * privados se ve en el candado de cada fila.
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
   * Sin ningun grupo, todo lo que la persona ve ya es suyo y privado: las tres
   * opciones devolverian exactamente lo mismo y el selector seria ruido.
   * Es el caso de alguien que recien se registra, que es justamente a quien no
   * hay que pedirle decisiones.
   */
  if (grupos.length === 0) return null;

  const opciones: Array<{ clave: string; etiqueta: string; alcance: Alcance }> = [
    { clave: 'todo', etiqueta: 'Todo', alcance: { tipo: 'todo' } },
    { clave: 'mio', etiqueta: 'Solo yo', alcance: { tipo: 'mio' } },
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
  if (alcance.tipo === 'mio') return 'Todo lo que gasté yo';
  if (alcance.tipo === 'hogar') {
    return grupos.find((grupo) => grupo.id === alcance.hogarId)?.nombre ?? 'Grupo';
  }
  return grupos.length > 0 ? 'Todo' : 'Mis gastos';
}

/** Una linea que explica que incluye el alcance, porque no siempre es obvio. */
export function DescripcionDeAlcance({ alcance }: { alcance: Alcance }) {
  const textos: Record<Alcance['tipo'], string> = {
    todo: 'Tus gastos privados más los de todos tus grupos.',
    // Esta es la distincion que la gente confunde, asi que se dice explicito.
    mio: 'Todo lo que cargaste vos: en cualquier grupo, los privados, y también lo de antes de sumarte.',
    hogar: 'Los gastos de todos los integrantes de este grupo.',
  };
  return (
    <View className="mt-2">
      <Text className="font-cuerpo text-xs leading-4 text-tenue">{textos[alcance.tipo]}</Text>
    </View>
  );
}

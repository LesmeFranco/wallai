import { Pressable, ScrollView, Text, View } from 'react-native';
import { IconoCruz } from './iconos';
import { presentacionDe } from '../lib/categorias';

export type CategoriaFiltrable = {
  id: string;
  nombre: string;
  /** La clave de la categoria global, o null si es una propia del grupo. */
  clave: string | null;
};

/**
 * La fila de iconos que filtra el historial por categoria.
 *
 * DE DONDE SALE. Desde la 1.6.0 se podia tocar una categoria del desglose del
 * inicio y aterrizar en el historial ya filtrado. Lo que faltaba era lo de
 * despues: sacar ese filtro sin volver al inicio. Habia pastillas con el nombre
 * de cada categoria, pero se dibujaban solo si habia mas de una categoria con
 * gastos en el mes, asi que justo en los casos en que no aparecian -una cuenta
 * nueva, un grupo recien creado, o haber entrado desde "Mes anterior"- el
 * filtro quedaba puesto y sin forma de sacarlo.
 *
 * Esta version arregla las dos cosas:
 *
 *  - SE DIBUJA SIEMPRE que haya al menos una categoria, y ademas la categoria
 *    filtrada se agrega a la fila aunque no tenga gastos este mes. Dicho de
 *    otra forma: si hay un filtro puesto, el boton para sacarlo existe. Sin
 *    excepciones.
 *  - SON ICONOS Y NO NOMBRES. Once pastillas con texto no entran en una
 *    pantalla de telefono, asi que filtrar significaba scrollear la fila
 *    buscando la palabra. Los iconos son los mismos que la persona ya ve en
 *    cada gasto de la lista de abajo, asi que no hay nada nuevo que aprender, y
 *    entran siete u ocho de una. La seleccionada se expande y muestra su nombre
 *    con una cruz al lado: el texto aparece cuando sirve para algo.
 *
 * Tocar la que ya esta elegida tambien la saca. Son dos caminos para lo mismo,
 * y esta bien que sean dos: el que la toco para ponerla va a volver a tocarla,
 * y el que llego con el filtro puesto desde otra pantalla busca una cruz.
 */
export function FiltroDeCategorias({
  categorias,
  seleccionada,
  onCambiar,
}: {
  categorias: CategoriaFiltrable[];
  seleccionada: string | null;
  onCambiar: (categoriaId: string | null) => void;
}) {
  if (categorias.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 pr-5"
      className="mt-3 flex-grow-0"
    >
      {categorias.map((categoria) => {
        const activa = categoria.id === seleccionada;
        const { icono, color } = presentacionDe(categoria.clave);

        return (
          <Pressable
            key={categoria.id}
            onPress={() => onCambiar(activa ? null : categoria.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={
              activa ? `Quitar el filtro ${categoria.nombre}` : `Ver solo ${categoria.nombre}`
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              height: 38,
              // Sin seleccionar es un circulo con el icono solo; seleccionada se
              // estira para que entren el nombre y la cruz.
              width: activa ? undefined : 38,
              justifyContent: 'center',
              paddingHorizontal: activa ? 12 : 0,
              borderRadius: 100,
              backgroundColor: activa ? `${color}25` : '#1C1C2A',
              borderWidth: 1.5,
              borderColor: activa ? color : '#252538',
            }}
          >
            {/* Las que no estan elegidas van con el icono apagado: la fila entera
                compitiendo en color tapaba la que si lo esta. */}
            <Text style={{ fontSize: 16, opacity: activa ? 1 : 0.65 }}>{icono}</Text>
            {activa ? (
              <>
                <Text className="font-cuerpo-semi text-[13px]" style={{ color }}>
                  {categoria.nombre}
                </Text>
                <View className="ml-0.5">
                  <IconoCruz color={color} />
                </View>
              </>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

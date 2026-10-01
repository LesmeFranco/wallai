import { Text, View } from 'react-native';
import { diasEntre, sumarDias } from '@wallai/validators';
import { Etiqueta, MAX_ESCALA_MONTO, Tarjeta } from './base';
import { capitalizar, formatearDiaLargo, formatearPesosSinCentavos } from '../lib/formato';

type DiaConGasto = { fecha: string; totalCentavos: number };

/**
 * El gasto de cada dia del periodo, como picos.
 *
 * Contesta algo que ningun otro numero del dashboard contesta: el total del mes
 * dice cuanto, el desglose por categoria dice en que, y esto dice CUANDO. Sirve
 * para reconocer la forma del mes -el pico del dia que se hizo el super, los
 * dias en cero- que es justo lo que uno no recuerda al mirar un total.
 *
 * SE DIBUJAN TODOS LOS DIAS DEL PERIODO, incluidos los que no tienen gastos. Es
 * la decision que hace que el grafico sirva: mostrando solo los dias con gasto,
 * tres dias salteados se verian pegados y el mes parecer continuo. Los valles
 * son tanta informacion como los picos.
 *
 * Las barras se dibujan con Views y no con una libreria de graficos. Para
 * barras verticales de una sola serie, una libreria seria varios cientos de
 * kilobytes en el bundle para hacer lo que hacen dos divs y un porcentaje.
 */
export function GastoPorDia({
  porDia,
  desde,
  hasta,
}: {
  /**
   * Solo los dias con gastos, como los devuelve `hogares.resumen`.
   *
   * Acepta `undefined` a proposito, aunque el tipo del router diga que siempre
   * viene: si una app con este grafico corriera contra un backend anterior a que
   * `porDia` existiera, el campo llegaria vacio y esto reventaria en la pantalla
   * principal. El orden de despliegue (backend primero) evita ese caso, pero la
   * pantalla principal no es el lugar donde confiar en que nadie se equivoque.
   */
  porDia: DiaConGasto[] | undefined;
  desde: string;
  hasta: string;
}) {
  // Sin ningun gasto no hay forma del mes que mostrar, y una tarjeta con
  // treinta barras en cero no dice nada.
  if (!porDia || porDia.length === 0) return null;

  const totalPorFecha = new Map(porDia.map((dia) => [dia.fecha, dia.totalCentavos]));
  const cantidadDeDias = diasEntre(desde, hasta) + 1;

  const dias = Array.from({ length: cantidadDeDias }, (_, indice) => {
    const fecha = sumarDias(desde, indice);
    return { fecha, totalCentavos: totalPorFecha.get(fecha) ?? 0 };
  });

  const maximo = Math.max(...dias.map((dia) => dia.totalCentavos));
  const diaPico = dias.reduce((mayor, dia) => (dia.totalCentavos > mayor.totalCentavos ? dia : mayor));

  return (
    <Tarjeta className="mb-3 p-5">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-display text-[17px] text-primario">Por día</Text>
        <Etiqueta>{porDia.length} con gastos</Etiqueta>
      </View>

      <View className="h-[84px] flex-row items-end gap-[2px]">
        {dias.map((dia) => {
          const esPico = dia.fecha === diaPico.fecha;
          const proporcion = maximo > 0 ? dia.totalCentavos / maximo : 0;
          return (
            <View key={dia.fecha} className="flex-1 justify-end">
              {/*
                Los dias en cero quedan como una linea de 2px: se ve que el dia
                existe y que no se gasto, que no es lo mismo que un hueco.
                El dia del pico va en lima y el resto en lima apagado, para que
                el pico se encuentre de un vistazo sin leer ningun numero.
              */}
              <View
                className={`rounded-t-[3px] ${esPico ? 'bg-lima' : 'bg-lima/35'}`}
                style={{ height: Math.max(proporcion * 76, dia.totalCentavos > 0 ? 4 : 2) }}
              />
            </View>
          );
        })}
      </View>

      {/* Las dos puntas del rango, para saber que se esta mirando sin contar
          barras. Treinta y una etiquetas no entrarian. */}
      <View className="mt-2 flex-row justify-between">
        <Text className="font-cuerpo text-[11px] text-tenue">{diaDelMes(desde)}</Text>
        <Text className="font-cuerpo text-[11px] text-tenue">{diaDelMes(hasta)}</Text>
      </View>

      <Text className="mt-3 font-cuerpo text-xs leading-5 text-secundario">
        El día que más gastaste fue el{' '}
        <Text className="font-cuerpo-semi text-primario">
          {capitalizar(formatearDiaLargo(diaPico.fecha))}
        </Text>
        :{' '}
        <Text className="font-display text-primario" maxFontSizeMultiplier={MAX_ESCALA_MONTO}>
          {formatearPesosSinCentavos(diaPico.totalCentavos)}
        </Text>
      </Text>
    </Tarjeta>
  );
}

/** "2026-09-01" -> "1 de septiembre", corto, para las puntas del eje. */
function diaDelMes(fechaISO: string): string {
  return formatearDiaLargo(fechaISO).replace(/^[^\s]+\s/, '');
}

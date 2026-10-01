'use client';

import { useMemo, useState } from 'react';
import { buscarEnDiccionario, separarEnGastos } from '@wallai/validators';

/**
 * El demo jugable del hero: un telefono con el motor de Wallai adentro.
 *
 * ESTO NO ES UNA MAQUETA. `separarEnGastos` y `buscarEnDiccionario` son las
 * mismas funciones que corren en la app y en el servidor: viven en
 * `packages/validators`, que es logica pura sin nada de base ni de red, asi que
 * funcionan igual en un navegador. Lo que la persona escribe acá lo procesa el
 * motor de verdad.
 *
 * QUE MUESTRA Y QUE NO. El motor real tiene tres escalones: las reglas que el
 * grupo enseño, el diccionario del gasto argentino, y "Otros" si ninguno
 * reconoce el texto. Acá no hay reglas aprendidas -nadie enseño nada en una
 * pagina web-, asi que lo que se ve es exactamente lo que ve alguien el primer
 * dia, antes de corregir nada. Es el caso menos favorable, y es el honesto.
 */

/** Las once categorias globales, con el mismo icono y color que usa la app. */
const CATEGORIAS: Record<string, { nombre: string; icono: string; color: string }> = {
  comida: { nombre: 'Comida', icono: '🍔', color: '#FF6B6B' },
  supermercado: { nombre: 'Supermercado', icono: '🛒', color: '#FFBC42' },
  transporte: { nombre: 'Transporte', icono: '🚌', color: '#5B8DFF' },
  salidas: { nombre: 'Salidas', icono: '🎭', color: '#B47FFF' },
  servicios: { nombre: 'Servicios', icono: '💡', color: '#AAFF4D' },
  salud: { nombre: 'Salud', icono: '❤️', color: '#FF6B9D' },
  hogar: { nombre: 'Hogar', icono: '🏠', color: '#43D9AD' },
  educacion: { nombre: 'Educación', icono: '📚', color: '#FFD166' },
  ropa: { nombre: 'Ropa', icono: '👕', color: '#06D6A0' },
  suscripciones: { nombre: 'Suscripciones', icono: '📱', color: '#EF476F' },
  otros: { nombre: 'Otros', icono: '✨', color: '#9999B3' },
};

const EJEMPLOS = [
  '3000 hamburguesa\n5000 sube\n7000 pan',
  '45000 super Coto',
  '2500 café y medialunas',
  '18000 nafta Shell\n9000 farmacia',
];

const formatearPesos = (centavos: number) =>
  `$ ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(centavos / 100)}`;

export function DemoEnVivo() {
  const [texto, setTexto] = useState(EJEMPLOS[0]!);

  /**
   * El analisis completo: una linea por gasto, con su monto y la categoria que
   * el motor le asignaria. Se recalcula en cada tecla, sin ninguna llamada de
   * red, porque todo el calculo es local.
   */
  const gastos = useMemo(
    () =>
      separarEnGastos(texto).map((linea) => {
        const coincidencia = buscarEnDiccionario(linea.texto);
        const clave = coincidencia?.clave ?? 'otros';
        return {
          ...linea,
          categoria: CATEGORIAS[clave] ?? CATEGORIAS.otros!,
        };
      }),
    [texto],
  );

  const total = gastos.reduce((suma, gasto) => suma + (gasto.montoCentavos ?? 0), 0);
  const faltanMontos = gastos.some((gasto) => gasto.montoCentavos === null);

  return (
    <div className="w-full">
      <Telefono>
        <div className="flex h-full flex-col">
          <div className="border-b border-borde px-5 pt-4 pb-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-tenue">
              Nuevo gasto
            </p>
            <div className="mt-1 flex items-baseline justify-between">
              <p className="text-[15px] font-semibold text-primario">¿Qué gastaste?</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-tenue">
                Uno por línea
              </p>
            </div>
          </div>

          <div className="px-5 pt-4">
            <textarea
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              rows={3}
              spellCheck={false}
              aria-label="Escribí un gasto para probar el motor"
              className="w-full resize-none bg-transparent text-[22px] leading-8 tracking-tight text-primario outline-none placeholder:text-tenue"
              style={{ fontFamily: 'var(--font-display)' }}
              placeholder="3000 hamburguesa"
            />
          </div>

          <div className="mt-2 flex-1 overflow-hidden px-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-medium uppercase tracking-wider text-tenue">
                {gastos.length === 1 ? 'Un gasto' : `${gastos.length} gastos`}
              </p>
              {gastos.length > 1 && !faltanMontos ? (
                <p className="text-[13px] font-bold tracking-tight text-lima">
                  {formatearPesos(total)}
                </p>
              ) : null}
            </div>

            <div className="mt-2 space-y-1.5">
              {gastos.map((gasto, indice) => (
                <div
                  key={`${indice}-${gasto.texto}`}
                  className="flex items-center gap-2.5 rounded-xl border border-borde bg-superficie-alta px-3 py-2"
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[13px]"
                    style={{
                      backgroundColor: `${gasto.categoria.color}20`,
                      border: `1.5px solid ${gasto.categoria.color}40`,
                    }}
                  >
                    {gasto.categoria.icono}
                  </span>
                  {/* Se muestra el texto escrito ADEMAS de la categoria: sin
                      el, la fila dice "Comida $3.000" y se pierde la relacion
                      con el renglon que lo origino, que es justo lo que la
                      demostracion tiene que dejar claro. */}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] text-primario">
                      {gasto.texto}
                    </span>
                    <span className="block text-[11px] text-tenue">{gasto.categoria.nombre}</span>
                  </span>
                  {gasto.montoCentavos === null ? (
                    <span className="text-[11px] font-semibold text-coral">falta el monto</span>
                  ) : (
                    <span className="text-[13px] font-bold tracking-tight text-primario">
                      {formatearPesos(gasto.montoCentavos)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Telefono>

      <p className="mx-auto mt-6 max-w-sm text-center text-[13px] leading-6 text-tenue">
        Escribí lo que quieras ahí arriba. El monto y la categoría los decide el motor real de
        Wallai, acá mismo, sin mandar nada a ningún lado.
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {EJEMPLOS.map((ejemplo) => (
          <button
            key={ejemplo}
            type="button"
            onClick={() => setTexto(ejemplo)}
            className="rounded-full border border-borde bg-superficie-alta px-3.5 py-1.5 text-[12px] text-secundario transition hover:border-lima/40 hover:text-primario"
          >
            {ejemplo.split('\n')[0]}
            {ejemplo.includes('\n') ? ' …' : ''}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * El marco del telefono.
 *
 * Es HTML y CSS, sin imagenes ni 3D: bordes redondeados, un borde grueso que
 * hace de carcasa y un resplandor detras. Las dos referencias que miramos
 * (sevengrid.app y pool.day) hacen exactamente esto, y por una buena razon: una
 * foto de telefono se ve borrosa en pantallas de alta densidad y pesa cien veces
 * mas que un div.
 */
export function Telefono({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[300px]">
      {/* El resplandor lima detras, que es lo que despega el telefono del fondo
          sin necesidad de una sombra gris. */}
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, #AAFF4D 0%, transparent 70%)' }}
      />
      <div className="rounded-[2.4rem] border-[6px] border-[#1C1C2A] bg-fondo shadow-2xl">
        <div className="h-[520px] overflow-hidden rounded-[1.9rem] bg-fondo">
          <div className="flex items-center justify-between px-5 pt-3 text-[10px] text-tenue">
            <span>23:58</span>
            <span className="flex gap-1">
              <span>▪</span>
              <span>▪</span>
              <span>▪</span>
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

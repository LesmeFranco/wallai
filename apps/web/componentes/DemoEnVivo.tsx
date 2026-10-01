'use client';

import { useMemo, useState } from 'react';
import { buscarEnDiccionario, parsearTexto, separarEnGastos } from '@wallai/validators';

/**
 * El demo jugable del hero: un telefono con el motor de Wallai adentro.
 *
 * ESTO NO ES UNA MAQUETA. `separarEnGastos`, `parsearTexto` y
 * `buscarEnDiccionario` son las mismas funciones que corren en la app y en el
 * servidor: viven en `packages/validators`, que es logica pura sin nada de base
 * ni de red, asi que funcionan igual en un navegador. Lo que la persona escribe
 * aca lo procesa el motor de verdad.
 *
 * QUE MUESTRA Y QUE NO. El motor real tiene tres escalones: las reglas que el
 * grupo enseño, el diccionario del gasto argentino, y "Otros" si ninguno
 * reconoce el texto. Aca no hay reglas aprendidas -nadie enseño nada en una
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

/**
 * Los atajos de abajo del telefono.
 *
 * Cada uno muestra una forma distinta de escribir, y ese es todo el criterio
 * para elegirlos: el monto adelante, el monto atras, varios por renglon y
 * varios separados por coma. Quien los toca en orden aprende el motor entero
 * sin leer una instruccion.
 */
const EJEMPLOS = [
  { titulo: 'Varios de una', texto: '3000 hamburguesa\npan 7000\nsube 5000' },
  { titulo: 'Con comas', texto: '5000 en pan, 7000 sube, hamburguesa 25000' },
  { titulo: 'El monto al final', texto: 'super Coto 45000' },
  { titulo: 'Una frase', texto: '2500 café y medialunas' },
];

const formatearPesos = (centavos: number) =>
  `$ ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(centavos / 100)}`;

export function DemoEnVivo() {
  const [texto, setTexto] = useState(EJEMPLOS[0]!.texto);

  /**
   * El analisis completo: un gasto por renglon (o por coma), con su monto, la
   * descripcion sin el monto adentro y la categoria que el motor le asignaria.
   * Se recalcula en cada tecla, sin ninguna llamada de red, porque todo el
   * calculo es local.
   */
  const gastos = useMemo(
    () =>
      separarEnGastos(texto).map((linea) => {
        const coincidencia = buscarEnDiccionario(linea.texto);
        const clave = coincidencia?.clave ?? 'otros';
        return {
          ...linea,
          descripcion: parsearTexto(linea.texto).textoRestante,
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
          <div className="border-b border-borde px-5 pb-3 pt-2">
            {/* `gap` y `shrink-0`: con el ancho de un telefono los dos textos no
                entran holgados, y sin esto el de la derecha se montaba encima
                del titulo. */}
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-[15px] font-semibold text-primario">¿Qué gastaste?</p>
              <p className="shrink-0 text-[9px] font-medium uppercase tracking-wider text-tenue">
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
              className="w-full resize-none bg-transparent text-[21px] leading-7 tracking-tight text-primario outline-none placeholder:text-tenue"
              style={{ fontFamily: 'var(--font-display)' }}
              placeholder="3000 hamburguesa"
            />
          </div>

          <div className="mt-1 flex min-h-0 flex-1 flex-col px-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[9px] font-medium uppercase tracking-wider text-tenue">
                {gastos.length === 1 ? 'Un gasto' : `${gastos.length} gastos`}
              </p>
              {gastos.length > 1 && !faltanMontos ? (
                <p className="text-[13px] font-bold tracking-tight text-lima">
                  {formatearPesos(total)}
                </p>
              ) : null}
            </div>

            {/* La lista ocupa lo que sobra y scrollea sola. Con un alto fijo
                -como estaba- el tercer gasto de los tres del ejemplo quedaba
                cortado, que es justo lo que no tiene que pasar en la pantalla
                que demuestra que se cargan varios de una. */}
            <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pb-2">
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
                  {/* La descripcion va SIN el monto adentro, igual que en la app:
                      el numero esta a la derecha y repetirlo en el texto es el
                      ruido que mas se nota en una fila angosta. */}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-primario">
                      {gasto.descripcion || gasto.categoria.nombre}
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

          {/*
            Los atajos, adentro de la pantalla. Estaban abajo del telefono y
            quedaban dos cosas mal: un hueco vacio en la mitad inferior de la
            pantalla, y un control de la pagina haciendo de control de la app.
            La app de verdad tiene exactamente esto, y se llama "Rapidos".
          */}
          <div className="mt-3 px-5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-tenue">Rápidos</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EJEMPLOS.map((ejemplo) => (
                <button
                  key={ejemplo.titulo}
                  type="button"
                  onClick={() => setTexto(ejemplo.texto)}
                  className="rounded-full border border-borde bg-superficie-alta px-2.5 py-1.5 text-[11px] text-secundario transition hover:border-lima/50 hover:text-primario"
                >
                  {ejemplo.titulo}
                </button>
              ))}
            </div>
          </div>

          {/*
            El pie de la pantalla. Es un resumen y no un boton: un "Guardar" en
            una pagina web no guardaria nada, y un boton que no hace nada es
            peor que no tenerlo.
          */}
          <div className="mt-auto border-t border-borde px-5 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-tenue">
                {faltanMontos ? 'Falta el monto de un renglón' : 'Listo para guardar'}
              </span>
              <span className="text-[15px] font-bold tracking-tight text-lima">
                {formatearPesos(total)}
              </span>
            </div>
          </div>
        </div>
      </Telefono>

      <p className="mx-auto mt-6 max-w-xs text-center text-[13px] leading-6 text-tenue">
        Escribí lo que quieras ahí arriba: el monto y la categoría los decide el motor real de
        Wallai, en tu navegador, sin mandar nada a ningún lado.
      </p>
    </div>
  );
}

/**
 * El marco del telefono.
 *
 * Es HTML y CSS, sin imagenes ni 3D: una carcasa con degrade, botones laterales,
 * isla y pantalla con su propio brillo. Una foto de telefono se ve borrosa en
 * pantallas de alta densidad y pesa cien veces mas que esto.
 *
 * LO QUE SE ARREGLO RESPECTO DE LA VERSION ANTERIOR, que es por lo que esto
 * esta escrito con tanto detalle:
 *
 *  - ERA DE ANCHO FIJO (300px) adentro de un contenedor con 24px de margen a
 *    cada lado. En una pantalla de 320px eso se desborda y la pagina entera
 *    scrollea de costado, que es el error de maquetado que mas barato se ve.
 *    Ahora es `w-full` con un maximo, y el alto sale de la proporcion.
 *  - EL ALTO ERA FIJO (520px) con el contenido cortado por `overflow-hidden`:
 *    escribir seis renglones en el demo hacia desaparecer los ultimos sin
 *    ninguna senal. Ahora la lista de adentro scrollea sola.
 *  - LOS REDONDEOS NO CERRABAN: el marco exterior iba en 2.4rem y la pantalla
 *    en 1.9rem con un borde de 6px en el medio, asi que las curvas no eran
 *    concentricas y de cerca se veia una esquina rara. La regla es que el radio
 *    de adentro sea el de afuera menos el grosor del marco.
 */
export function Telefono({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      {/* El resplandor lima detras, que es lo que despega el telefono del fondo
          sin necesidad de una sombra gris. */}
      <div
        aria-hidden
        className="absolute -inset-12 -z-10 opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle at 50% 35%, #AAFF4D 0%, transparent 65%)' }}
      />

      {/* La carcasa. El degrade de un gris claro arriba a uno oscuro abajo es lo
          que la hace parecer metal en vez de un borde pintado. */}
      <div
        className="relative rounded-[42px] p-[10px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]"
        style={{ background: 'linear-gradient(160deg, #35354A 0%, #1A1A26 45%, #2A2A3C 100%)' }}
      >
        {/* Botones laterales: volumen a la izquierda, encendido a la derecha. */}
        <span
          aria-hidden
          className="absolute -left-[3px] top-[110px] h-9 w-[3px] rounded-l-sm bg-[#2F2F42]"
        />
        <span
          aria-hidden
          className="absolute -left-[3px] top-[158px] h-9 w-[3px] rounded-l-sm bg-[#2F2F42]"
        />
        <span
          aria-hidden
          className="absolute -right-[3px] top-[130px] h-14 w-[3px] rounded-r-sm bg-[#2F2F42]"
        />

        <div className="relative aspect-[9/19] overflow-hidden rounded-[32px] bg-fondo">
          {/* La isla, encima de la barra de estado. */}
          <div
            aria-hidden
            className="absolute left-1/2 top-2.5 z-10 h-[26px] w-[86px] -translate-x-1/2 rounded-full bg-black"
          />

          <div className="flex h-full flex-col pt-2.5">
            <div className="flex items-center justify-between px-6 pb-3 text-[11px] text-primario">
              <span className="font-medium">21:00</span>
              <BarraDeEstado />
            </div>
            <div className="min-h-0 flex-1">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Senal, wifi y bateria. Dibujados chiquitos: a este tamano la silueta alcanza. */
function BarraDeEstado() {
  return (
    <span className="flex items-center gap-1.5" aria-hidden>
      <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
        <rect x="0" y="7" width="2.5" height="4" rx="0.8" fill="#F0F0FA" />
        <rect x="4" y="5" width="2.5" height="6" rx="0.8" fill="#F0F0FA" />
        <rect x="8" y="2.5" width="2.5" height="8.5" rx="0.8" fill="#F0F0FA" />
        <rect x="12" y="0" width="2.5" height="11" rx="0.8" fill="#F0F0FA" opacity="0.35" />
      </svg>
      <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
        <path
          d="M1 3.8a9 9 0 0112 0M3.3 6.3a5.6 5.6 0 017.4 0"
          stroke="#F0F0FA"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="7" cy="9" r="1.1" fill="#F0F0FA" />
      </svg>
      <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
        <rect x="0.5" y="0.5" width="18" height="10" rx="3" stroke="#F0F0FA" opacity="0.45" />
        <rect x="2" y="2" width="12" height="7" rx="1.8" fill="#AAFF4D" />
        <path d="M20.5 4v3a2 2 0 000-3z" fill="#F0F0FA" opacity="0.45" />
      </svg>
    </span>
  );
}

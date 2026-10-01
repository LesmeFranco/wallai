import type { Metadata } from 'next';
import { DemoEnVivo } from '../componentes/DemoEnVivo';

/**
 * La portada de Wallai.
 *
 * Antes acá había una página de una línea que decía "backend de la aplicación".
 * Tenía sentido cuando apps/web solo hospedaba tRPC; dejó de tenerlo cuando la
 * página de invitación convirtió este dominio en algo que ve gente que no
 * conoce el proyecto.
 *
 * LA DECISIÓN QUE SOSTIENE TODA LA PÁGINA: el demo del hero es el motor de
 * verdad, no una maqueta. `packages/validators` es lógica pura, así que el
 * mismo código que categoriza un gasto en el teléfono corre en el navegador de
 * quien entra. Se puede escribir cualquier cosa y ver qué haría Wallai. Es la
 * diferencia entre decir "categoriza solo" y dejar que la persona lo compruebe
 * en cinco segundos, que es lo que hace memorable a una página de producto.
 *
 * No hay 3D ni canvas ni video, y no es una limitación: las dos referencias que
 * miramos tampoco los usan. Lo que se siente "bien hecho" es el demo jugable y
 * el cuidado tipográfico, no los efectos.
 */

export const metadata: Metadata = {
  title: 'Wallai — Control de gastos para una familia',
  description:
    'Anotá lo que gastás escribiendo una frase. Wallai le saca el monto, lo categoriza solo y suma cuánto gastó la casa este mes.',
};

const URL_DESCARGA = 'https://github.com/LesmeFranco/wallai/releases/latest';
const URL_REPO = 'https://github.com/LesmeFranco/wallai';

export default function Portada() {
  return (
    <main className="mx-auto max-w-5xl px-6 pb-24">
      <nav className="flex items-center justify-between py-6">
        <span className="text-[15px] font-bold tracking-tight text-primario">Wallai</span>
        <a
          href={URL_REPO}
          className="text-[13px] text-secundario transition hover:text-primario"
          target="_blank"
          rel="noreferrer"
        >
          Código abierto
        </a>
      </nav>

      {/* ----------------------------------------------------------------- */}
      <section className="grid items-center gap-14 pt-6 pb-20 md:grid-cols-2 md:gap-12 md:pt-10">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-tenue">
            Gastos de la casa
          </p>

          <h1
            className="mt-4 text-[38px] leading-[1.06] tracking-tight text-primario sm:text-[46px]"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
          >
            Anotá lo que gastás como se lo contarías a alguien.
          </h1>

          <p className="mt-6 max-w-md text-[17px] leading-7 text-secundario">
            Wallai le saca el monto, lo categoriza solo y suma cuánto gastó la casa este mes.
            <span className="text-primario"> No lleva la cuenta de quién le debe a quién.</span>
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={URL_DESCARGA}
              className="rounded-2xl bg-lima px-6 py-3.5 text-[15px] font-bold text-fondo transition hover:brightness-110"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Descargar para Android
            </a>
            <span className="text-[13px] text-tenue">Gratis, sin cuenta paga</span>
          </div>

          {/* Decir lo que falta, y no solo lo que hay, es lo que hace creible
              todo lo demas que dice la pagina. */}
          <p className="mt-4 text-[13px] text-tenue">
            Para iPhone todavía no hay descarga. El código compila para iOS; falta la cuenta de
            Apple que exige para repartir la app.
          </p>
        </div>

        <DemoEnVivo />
      </section>

      {/* ----------------------------------------------------------------- */}
      <Seccion
        titulo="Varios de una, uno por renglón"
        cuerpo="Llegás a la noche y te acordás de todo junto. Escribís los cinco, uno abajo del otro, y se guardan los cinco con su categoría. Antes eso era abrir la pantalla cinco veces."
      >
        <Ejemplo
          lineas={[
            { texto: '3000 hamburguesa', detalle: '🍔 Comida' },
            { texto: '5000 sube', detalle: '🚌 Transporte' },
            { texto: '7000 pan', detalle: '🍔 Comida' },
          ]}
        />
      </Seccion>

      {/* ----------------------------------------------------------------- */}
      <Seccion
        titulo="Si se equivoca, aprende"
        cuerpo="Corregís la categoría una vez y la próxima vez que alguien de la casa escriba algo parecido, Wallai ya sabe dónde va. Lo que aprende es del grupo, no de la persona que corrigió."
      >
        <div className="rounded-2xl border border-borde bg-superficie p-6">
          <p className="text-[13px] text-tenue">Alguien corrige una vez</p>
          <p className="mt-1 text-[17px] text-primario">
            &quot;medialunas&quot; <span className="text-tenue">→</span>{' '}
            <span className="text-lima">Comida</span>
          </p>
          <div className="my-5 h-px bg-borde" />
          <p className="text-[13px] text-tenue">Y a partir de ahí, para toda la casa</p>
          <p className="mt-1 text-[17px] text-primario">
            &quot;2000 medialunas de la esquina&quot; <span className="text-tenue">→</span>{' '}
            <span className="text-lima">Comida</span>
          </p>
        </div>
      </Seccion>

      {/* ----------------------------------------------------------------- */}
      <Seccion
        titulo="La casa, en un número"
        cuerpo="Cada uno anota lo suyo desde su teléfono y la app suma el total del mes, con el desglose por categoría, por persona y por día. La pregunta que contesta es cuánto gastamos, no quién le debe a quién."
      >
        <div className="rounded-2xl border border-borde bg-superficie p-6 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-tenue">
            Gastó la casa este mes
          </p>
          <p
            className="mt-2 text-[40px] leading-none tracking-tight text-lima"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
          >
            $ 284.500
          </p>
          <div className="mt-6 flex h-16 items-end justify-center gap-[3px]">
            {[12, 4, 30, 8, 2, 46, 18, 6, 26, 10, 64, 14, 3, 22, 9, 38, 7, 16, 52, 11].map(
              (alto, indice) => (
                <span
                  key={indice}
                  className={`w-2 rounded-t-sm ${alto === 64 ? 'bg-lima' : 'bg-lima/30'}`}
                  style={{ height: `${alto}%` }}
                />
              ),
            )}
          </div>
          <p className="mt-3 text-[13px] text-secundario">
            El día que más gastaron, a la vista sin leer un número.
          </p>
        </div>
      </Seccion>

      {/* ----------------------------------------------------------------- */}
      <section className="mt-24 rounded-3xl border border-borde bg-superficie p-10 text-center">
        <h2
          className="text-[28px] tracking-tight text-primario"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
        >
          Es gratis y es abierto
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-7 text-secundario">
          Sin suscripción, sin anuncios y sin conexión con ningún banco: Wallai solo guarda los
          gastos que ustedes anotan. El código está publicado con licencia Apache 2.0.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a
            href={URL_DESCARGA}
            className="rounded-2xl bg-lima px-6 py-3.5 text-[15px] font-bold text-fondo transition hover:brightness-110"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Descargar para Android
          </a>
          <a
            href={URL_REPO}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-borde-claro bg-superficie-alta px-6 py-3.5 text-[15px] font-bold text-primario transition hover:border-lima/40"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Ver el código
          </a>
        </div>
      </section>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 text-[12px] text-tenue">
        <span>Wallai · Hecho en Argentina</span>
        <span>Apache 2.0</span>
      </footer>
    </main>
  );
}

/** Una sección: título y texto a la izquierda, demostración a la derecha. */
function Seccion({
  titulo,
  cuerpo,
  children,
}: {
  titulo: string;
  cuerpo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid items-center gap-8 border-t border-borde py-16 md:grid-cols-2 md:gap-14">
      <div>
        <h2
          className="text-[30px] leading-tight tracking-tight text-primario"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
        >
          {titulo}
        </h2>
        <p className="mt-4 max-w-md text-[16px] leading-7 text-secundario">{cuerpo}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

/** Lista de renglones con su categoría, como los muestra la app al guardar. */
function Ejemplo({ lineas }: { lineas: { texto: string; detalle: string }[] }) {
  return (
    <div className="space-y-2.5 rounded-2xl border border-borde bg-superficie p-6">
      {lineas.map((linea) => (
        <div key={linea.texto} className="flex items-center justify-between gap-4">
          <span className="text-[15px] text-primario">{linea.texto}</span>
          <span className="shrink-0 text-[13px] text-secundario">{linea.detalle}</span>
        </div>
      ))}
    </div>
  );
}

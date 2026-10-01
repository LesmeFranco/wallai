import type { Metadata } from 'next';
import { DemoEnVivo } from '../componentes/DemoEnVivo';
import { Logo, MarcaWallai } from '../componentes/Logo';

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
 * miramos tampoco los usan. Lo que se siente "bien hecho" es el demo jugable,
 * el cuidado tipográfico y que nada esté de adorno.
 */

export const metadata: Metadata = {
  title: 'Wallai — Control de gastos para una familia',
  description:
    'Anotá lo que gastás escribiendo una frase. Wallai le saca el monto, lo categoriza solo y suma cuánto gastó la casa este mes.',
};

const URL_DESCARGA = 'https://github.com/LesmeFranco/wallai/releases/latest';
const URL_REPO = 'https://github.com/LesmeFranco/wallai';

export default function Portada() {
  /*
   * `overflow-x-clip` y no `overflow-x-hidden`: los resplandores de la pagina
   * son divs absolutos que se salen a proposito de su contenedor, y en una
   * pantalla angosta eso agregaba scroll horizontal (medido: 378px de contenido
   * en una ventana de 360). `clip` corta lo que sobra sin convertir a `main` en
   * un contenedor de scroll, que es lo que `hidden` haria.
   */
  return (
    <main className="relative mx-auto max-w-5xl overflow-x-clip px-6 pb-24">
      {/*
        El resplandor del fondo. Va detrás de todo (-z-10) y con `pointer-events-none`
        para que no se coma ningún clic. Es lo único decorativo de la página y
        existe para una sola cosa: que el hero no arranque sobre un negro plano.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden"
      >
        <div
          className="absolute left-1/2 top-[-280px] h-[620px] w-[900px] -translate-x-1/2 opacity-[0.18] blur-[120px]"
          style={{ background: 'radial-gradient(circle, #AAFF4D 0%, transparent 70%)' }}
        />
      </div>

      <nav className="flex items-center justify-between py-6">
        <Logo />
        <div className="flex items-center gap-5">
          <a
            href={URL_REPO}
            className="hidden text-[13px] text-secundario transition hover:text-primario sm:inline"
            target="_blank"
            rel="noreferrer"
          >
            Código abierto
          </a>
          <a
            href={URL_DESCARGA}
            className="rounded-full border border-borde-claro bg-superficie px-4 py-2 text-[13px] font-semibold text-primario transition hover:border-lima/50"
          >
            Descargar
          </a>
        </div>
      </nav>

      {/* ----------------------------------------------------------------- */}
      <section className="grid items-center gap-14 pb-20 pt-6 md:grid-cols-[1fr_auto] md:gap-12 md:pt-12">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-borde bg-superficie px-3 py-1.5 text-[12px] text-secundario">
            <span className="h-1.5 w-1.5 rounded-full bg-lima" />
            Gratis, sin anuncios y sin conexión con ningún banco
          </p>

          <h1
            className="mt-5 text-[40px] leading-[1.04] tracking-tight text-primario sm:text-[52px]"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
          >
            {/* El `{' '}` no es decorativo: JSX se come el espacio del final de
                un renglon cuando lo sigue un elemento, asi que sin el, en el
                telefono -donde el <br /> esta oculto- las palabras quedaban
                pegadas ("gastáscomo"). */}
            Anotá lo que gastás{' '}
            <br className="hidden sm:inline" />
            como se lo contarías{' '}
            <br className="hidden sm:inline" />
            <span className="text-lima">a alguien.</span>
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
            <a
              href={URL_REPO}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-borde-claro bg-superficie px-6 py-3.5 text-[15px] font-bold text-primario transition hover:border-lima/40"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Ver el código
            </a>
          </div>

          {/* Decir lo que falta, y no solo lo que hay, es lo que hace creible
              todo lo demas que dice la pagina. */}
          <p className="mt-4 text-[13px] leading-6 text-tenue">
            Para iPhone todavía no hay descarga. El código compila para iOS; falta la cuenta de
            Apple que exige para repartir la app.
          </p>
        </div>

        <DemoEnVivo />
      </section>

      {/* ----------------------------------------------------------------- */}
      <Seccion
        titulo="Escribilo como te salga"
        cuerpo="El monto puede ir adelante o atrás, y varios gastos se separan por renglón o por coma. No hay formato que aprender: la app se adapta a cómo escribe cada uno, que es la única forma de que alguien la use todos los días."
      >
        <div className="grid gap-2.5">
          <Forma texto="5000 pan" nota="el monto adelante" />
          <Forma texto="pan 5000" nota="o atrás, da igual" />
          <Forma texto="5000 pan, 7000 sube" nota="dos gastos, una línea" />
          <Forma texto="8900 colectivo ayer" nota="y la fecha también entra" />
        </div>
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
      <section className="border-t border-borde py-16">
        <h2
          className="text-[30px] leading-tight tracking-tight text-primario"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
        >
          Lo que Wallai no hace
        </h2>
        <p className="mt-4 max-w-xl text-[16px] leading-7 text-secundario">
          Una app de gastos se vuelve inservible cuando pide demasiado. Estas tres cosas quedaron
          afuera a propósito, y no están en el camino de entrar.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <NoHace
            titulo="No se conecta al banco"
            cuerpo="No pide claves, no lee resúmenes y no toca una tarjeta. Solo guarda lo que ustedes anotan."
          />
          <NoHace
            titulo="No lleva deudas"
            cuerpo="Nada de saldos entre personas ni liquidaciones. La pregunta es cuánto gastó la casa."
          />
          <NoHace
            titulo="No cobra ni muestra anuncios"
            cuerpo="Sin suscripción y sin publicidad. El código está publicado con licencia Apache 2.0."
          />
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      <section className="mt-10 overflow-hidden rounded-3xl border border-borde bg-superficie p-10 text-center">
        <div className="flex justify-center">
          <MarcaWallai tamano={48} />
        </div>
        <h2
          className="mt-5 text-[28px] tracking-tight text-primario"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
        >
          Probala esta noche
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-7 text-secundario">
          Se instala, se escribe un gasto y listo. Si después querés compartir los gastos de la
          casa, se arma un grupo con un link y cada uno anota desde su teléfono.
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
        <span className="flex items-center gap-2">
          <MarcaWallai tamano={18} redondeo={5} />
          Wallai · Hecho en Argentina
        </span>
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

/** Una forma de escribir un gasto, con el aclarador al costado. */
function Forma({ texto, nota }: { texto: string; nota: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-borde bg-superficie px-5 py-4">
      <span
        className="text-[17px] tracking-tight text-primario"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
      >
        {texto}
      </span>
      <span className="shrink-0 text-[12px] text-tenue">{nota}</span>
    </div>
  );
}

function NoHace({ titulo, cuerpo }: { titulo: string; cuerpo: string }) {
  return (
    <div className="rounded-2xl border border-borde bg-superficie p-5">
      <p className="text-[15px] font-semibold text-primario">{titulo}</p>
      <p className="mt-2 text-[13px] leading-6 text-secundario">{cuerpo}</p>
    </div>
  );
}

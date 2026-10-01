/**
 * Los dos botones de descarga de la portada.
 *
 * Van juntos en un archivo propio porque son un par: el de Android es el que
 * se puede tocar y el de iOS es el que todavía no, y lo que importa es que se
 * lean como dos caminos del mismo producto y no como un botón y un cartel.
 *
 * Los dos íconos están dibujados acá y no traídos de una librería de íconos.
 * Son dos: bajar un paquete entero con miles para usar dos sería más peso que
 * toda la página.
 */

const URL_DESCARGA = 'https://github.com/LesmeFranco/wallai/releases/latest';

/**
 * El robot de Android.
 *
 * Los ojos se dibujan del color del fondo del botón y no en blanco: así siguen
 * siendo huecos si algún día el botón cambia de color.
 */
function IconoAndroid({ tamano = 20, color = 'currentColor', colorOjo = '#AAFF4D' }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" aria-hidden>
      {/* Las antenas van PRIMERO y arrancan bien arriba: la cúpula se dibuja
          encima y les tapa la mitad de abajo, que es como se unen a la cabeza.
          Con la cúpula más alta quedaban tapadas enteras y el ícono parecía una
          mancha con ojos. */}
      <path
        d="M7.7 1.9 9.6 4.9M16.3 1.9 14.4 4.9"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M4.8 11a7.2 7.2 0 0 1 14.4 0v6.1a1.4 1.4 0 0 1-1.4 1.4H6.2a1.4 1.4 0 0 1-1.4-1.4V11Z"
        fill={color}
      />
      <circle cx="9.4" cy="10.4" r=".95" fill={colorOjo} />
      <circle cx="14.6" cy="10.4" r=".95" fill={colorOjo} />
    </svg>
  );
}

/** La manzana. */
function IconoApple({ tamano = 20, color = 'currentColor' }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16.37 12.78c.02 2.5 2.2 3.33 2.23 3.35-.02.06-.35 1.2-1.15 2.37-.69 1.01-1.41 2.02-2.55 2.04-1.11.02-1.47-.66-2.75-.66s-1.67.64-2.72.68c-1.09.04-1.93-1.09-2.63-2.1-1.43-2.06-2.52-5.83-1.05-8.37.73-1.27 2.03-2.07 3.44-2.09 1.07-.02 2.09.72 2.75.72.66 0 1.89-.89 3.19-.76.54.02 2.07.22 3.05 1.65-.08.05-1.82 1.06-1.8 3.17M14.3 5.1c.59-.71.98-1.7.87-2.69-.85.03-1.87.57-2.48 1.28-.54.63-1.02 1.64-.89 2.61.94.07 1.91-.48 2.5-1.2"
        fill={color}
      />
    </svg>
  );
}

/** El botón que lleva al APK. Es el único de la página que descarga algo. */
export function DescargarAndroid() {
  return (
    <a
      href={URL_DESCARGA}
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-lima px-6 py-3.5 text-[15px] font-bold text-fondo transition hover:brightness-110 sm:w-auto"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <IconoAndroid color="#0C0C13" colorOjo="#AAFF4D" />
      Descargar para Android
    </a>
  );
}

/**
 * iOS, que todavía no existe.
 *
 * NO ES UN BOTÓN, y es a propósito: no es un `<a>` ni un `<button>`, así que no
 * se puede tocar, no toma el foco con el teclado y no promete nada. Un botón
 * gris que al tocarlo no hace nada es peor que decir "próximamente", porque la
 * persona se queda pensando que algo falló.
 *
 * Todo en gris y con la etiqueta al lado: el color es lo que separa lo que se
 * puede hacer de lo que todavía no, sin que haga falta leer.
 */
export function ProximamenteIOS() {
  /*
   * `flex-wrap` mas `whitespace-nowrap` en el texto: en un telefono angosto no
   * entran el icono, la frase y la etiqueta en un renglon. Sin esto lo que se
   * partia era la frase ("Descargar en / iOS"), que es lo peor que puede
   * partirse. Asi la frase queda entera y lo que baja al segundo renglon es la
   * etiqueta, que se entiende igual.
   */
  return (
    <span
      className="inline-flex w-full cursor-default select-none flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-borde bg-superficie px-6 py-3.5 text-[15px] font-bold text-tenue sm:w-auto"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <IconoApple color="#5A5A78" />
      <span className="whitespace-nowrap">Descargar en iOS</span>
      <span className="rounded-full border border-borde-claro px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-tenue">
        Próximamente
      </span>
    </span>
  );
}

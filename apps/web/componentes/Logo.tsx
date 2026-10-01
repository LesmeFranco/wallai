/**
 * La marca de Wallai.
 *
 * El dibujo es el mismo archivo que genera los iconos de la app
 * (docs/marca/generar-iconos.mjs): una sola linea continua que baja, sube al
 * pico del medio, vuelve a bajar y remata mas alto que donde empezo. Lee como
 * una W y como la linea de un grafico.
 *
 * VA COMO SVG EN EL CODIGO y no como un archivo `.svg` importado por una razon
 * practica: asi el color sale de las props y la marca se puede poner en lima
 * sobre el fondo oscuro o en oscuro sobre el lima sin tener dos archivos que
 * mantener sincronizados.
 *
 * El nombre, en cambio, NO es un SVG: es texto con la tipografia Outfit, la
 * misma que usan los titulos de la app. Un logotipo convertido a curvas es un
 * archivo mas que se desactualiza; un texto con la fuente correcta siempre se
 * ve igual que el resto de la marca, se puede seleccionar y lo lee un lector de
 * pantalla.
 */
export function MarcaWallai({
  tamano = 32,
  fondo = '#AAFF4D',
  trazo = '#0C0C13',
  redondeo = 22,
}: {
  tamano?: number;
  fondo?: string | null;
  trazo?: string;
  /** El radio de las esquinas del recuadro, en unidades del viewBox de 100. */
  redondeo?: number;
}) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      {fondo ? <rect width="100" height="100" rx={redondeo} fill={fondo} /> : null}
      <path
        d="M 23 32 L 37 70 L 50 40 L 63 70 L 79 22"
        stroke={trazo}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** La marca con el nombre al lado, que es como se firma la pagina. */
export function Logo({ tamano = 30 }: { tamano?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <MarcaWallai tamano={tamano} />
      <span
        className="text-[20px] leading-none text-primario"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '-0.03em' }}
      >
        wallai
      </span>
    </span>
  );
}

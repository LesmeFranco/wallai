import { ImageResponse } from 'next/og';

/**
 * La imagen que se ve cuando alguien pega el link de Wallai en WhatsApp, en un
 * chat o en LinkedIn.
 *
 * POR QUE GENERADA Y NO UN PNG EN /public: un PNG hay que volver a exportarlo
 * cada vez que cambia el nombre, el color o la frase, y en la practica eso
 * significa que queda viejo. Acá es código: se arma en el build, con los mismos
 * tokens que el resto de la página.
 *
 * Es la primera impresión de todo el proyecto para quien nunca lo vio -antes de
 * la página, antes de la app-, así que dice las dos cosas que importan: qué es
 * y qué se escribe.
 *
 * La tipografía no es Outfit sino la que trae `next/og` por defecto: cargar la
 * fuente de la marca obligaría a tener el .ttf dentro del repositorio y a
 * leerlo en el build. Para una imagen que se ve a 500px de ancho en una vista
 * previa, no compensa.
 */
export const alt = 'Wallai — Anotá lo que gastás como se lo contarías a alguien';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const LIMA = '#AAFF4D';
const FONDO = '#0C0C13';

export default function ImagenParaCompartir() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: FONDO,
          padding: 72,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg width="76" height="76" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="22" fill={LIMA} />
            <path
              d="M 23 32 L 37 70 L 50 40 L 63 70 L 79 22"
              fill="none"
              stroke={FONDO}
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: 46, fontWeight: 700, color: '#F0F0FA' }}>wallai</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 64, fontWeight: 700, color: '#F0F0FA', lineHeight: 1.1 }}>
            Anotá lo que gastás como
          </span>
          <span style={{ fontSize: 64, fontWeight: 700, color: LIMA, lineHeight: 1.1 }}>
            se lo contarías a alguien.
          </span>
          <span style={{ marginTop: 28, fontSize: 30, color: '#9999B3' }}>
            &quot;5000 pan&quot; · &quot;pan 5000&quot; · &quot;8900 colectivo ayer&quot;
          </span>
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 24, color: '#5A5A78' }}>
          <span>Gastos personales y de la casa</span>
          <span>·</span>
          <span>Sin banco, sin deudas entre personas</span>
          <span>·</span>
          <span>Código abierto</span>
        </div>
      </div>
    ),
    size,
  );
}

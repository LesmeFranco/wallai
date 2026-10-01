import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

/**
 * Las mismas dos familias que usa la app mobile: Outfit para titulos y montos,
 * Inter para el texto. Van con `next/font`, que las descarga en el build y las
 * sirve desde el propio dominio, asi que la pagina de invitacion no depende de
 * que el telefono de quien la abre pueda llegar a Google Fonts.
 */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-cuerpo',
  display: 'swap',
});

/**
 * La URL publica del sitio.
 *
 * Hace falta para que las imagenes de Open Graph (la vista previa del link en
 * WhatsApp o LinkedIn) salgan con la direccion absoluta: sin esto, Next las
 * referencia relativas y ninguna red social las muestra. En Vercel la variable
 * la define la plataforma; el valor fijo es el del dominio de produccion, para
 * que un build local tampoco quede sin base.
 */
const URL_DEL_SITIO = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'https://wallai-three.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(URL_DEL_SITIO),
  title: {
    default: 'Wallai — Control de gastos para una familia',
    template: '%s · Wallai',
  },
  description:
    'Anota lo que gastas escribiendo una frase. Wallai le saca el monto, lo categoriza solo y suma cuanto gasto la casa este mes.',
  openGraph: {
    type: 'website',
    siteName: 'Wallai',
    locale: 'es_AR',
  },
};

/**
 * El color con el que el navegador del telefono tine su barra. Va en `viewport`
 * y no en `metadata`: Next avisa en el build que ahi ya no corresponde.
 */
export const viewport: Viewport = {
  themeColor: '#0C0C13',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${outfit.variable} ${inter.variable}`}>
      <body
        className="min-h-screen bg-fondo text-primario antialiased"
        style={{ fontFamily: 'var(--font-cuerpo), system-ui, sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}

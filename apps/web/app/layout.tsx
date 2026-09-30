import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: 'Wallai',
  description: 'Control de gastos personales y del hogar con tageo automatico',
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

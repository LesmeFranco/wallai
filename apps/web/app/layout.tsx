import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wallai',
  description: 'Control de gastos personales y del hogar con tageo automatico',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className="min-h-screen bg-fondo text-texto antialiased">{children}</body>
    </html>
  );
}

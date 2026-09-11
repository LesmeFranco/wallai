/**
 * Tokens de diseno del mockup, traducidos a la configuracion de Tailwind.
 *
 * El mockup original (hecho en Figma Make) los definia con la sintaxis
 * `@theme` de Tailwind 4. Aca van como extension del tema porque NativeWind 4
 * trabaja sobre Tailwind 3: es la combinacion estable (el soporte de
 * Tailwind 4 esta en NativeWind 5, todavia en preview). Por eso esta app usa
 * Tailwind 3 y apps/web sigue en Tailwind 4.
 *
 * Los nombres van en castellano, como el resto del proyecto, asi que las
 * clases quedan `bg-fondo`, `text-primario`, `border-borde`.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './componentes/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        /** Fondo de la pantalla. */
        fondo: '#0C0C13',
        /** Fondo de las tarjetas. */
        superficie: '#151520',
        /** Tarjetas que tienen que destacarse sobre otra tarjeta. */
        'superficie-alta': '#1C1C2A',
        /** Fondo de los campos de texto. */
        campo: '#1A1A28',
        borde: '#252538',
        'borde-claro': '#333350',
        primario: '#F0F0FA',
        secundario: '#9999B3',
        tenue: '#5A5A78',
        /** Color de acento de la marca: botones, montos, estado activo. */
        lima: '#AAFF4D',
        azul: '#5B8DFF',
        violeta: '#B47FFF',
        coral: '#FF6B6B',
        ambar: '#FFBC42',
        rosa: '#FF6B9D',
        verde: '#43D9AD',
      },
      fontFamily: {
        /** Titulos, montos y botones. */
        display: ['Outfit_700Bold'],
        'display-semi': ['Outfit_600SemiBold'],
        'display-extra': ['Outfit_800ExtraBold'],
        /** Texto corrido y etiquetas. */
        cuerpo: ['Inter_400Regular'],
        'cuerpo-medio': ['Inter_500Medium'],
        'cuerpo-semi': ['Inter_600SemiBold'],
      },
      borderRadius: {
        tarjeta: '24px',
        boton: '16px',
        pastilla: '100px',
      },
    },
  },
  plugins: [],
};

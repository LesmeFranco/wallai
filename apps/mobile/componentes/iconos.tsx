import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Los iconos del mockup, pasados a react-native-svg.
 *
 * Van como componentes propios y no desde una libreria de iconos porque son
 * pocos y ya estaban dibujados en el diseno: traer @expo/vector-icons
 * completo (miles de iconos) para usar cinco no se justifica, y los de la
 * libreria no coinciden exactamente con los del mockup.
 */

const LIMA = '#AAFF4D';
const TENUE = '#5A5A78';
const FONDO = '#0C0C13';
const PRIMARIO = '#F0F0FA';

type IconoTab = { activo?: boolean };

export function IconoInicio({ activo }: IconoTab) {
  const color = activo ? LIMA : TENUE;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
        fill={activo ? LIMA : 'none'}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M9 21V12h6v9"
        stroke={activo ? FONDO : color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconoLista({ activo }: IconoTab) {
  const color = activo ? LIMA : TENUE;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={2.5} rx={1.25} fill={color} />
      <Rect x={3} y={11} width={18} height={2.5} rx={1.25} fill={color} />
      <Rect x={3} y={17} width={12} height={2.5} rx={1.25} fill={color} />
    </Svg>
  );
}

export function IconoHogar({ activo }: IconoTab) {
  const color = activo ? LIMA : TENUE;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={3.5} stroke={color} strokeWidth={1.8} />
      <Circle cx={17} cy={8} r={2.5} stroke={color} strokeWidth={1.8} />
      <Path
        d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path d="M21 20c0-2.2-1.8-4-4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function IconoMas() {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <Path d="M14 6v16M6 14h16" stroke={FONDO} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export function IconoTilde() {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Path
        d="M7 17l6 6L25 10"
        stroke={FONDO}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconoVolver() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19l-7-7 7-7"
        stroke={PRIMARIO}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconoCopiar() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Rect x={7} y={7} width={10} height={12} rx={2} stroke={LIMA} strokeWidth={1.6} />
      <Path
        d="M5 13H4a2 2 0 01-2-2V4a2 2 0 012-2h7a2 2 0 012 2v1"
        stroke={LIMA}
        strokeWidth={1.6}
      />
    </Svg>
  );
}

export function IconoBuscar() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Circle cx={8} cy={8} r={5.5} stroke={TENUE} strokeWidth={1.6} />
      <Path d="M12.5 12.5l3 3" stroke={TENUE} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

const CORAL = '#FF6B6B';

/**
 * Tacho de basura, para borrar un gasto directo desde la lista.
 *
 * Va en coral y no en el gris del resto de los iconos porque borrar no se
 * puede deshacer: conviene que se distinga de un toque cualquiera.
 */
export function IconoBorrar({ color = CORAL }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
      <Path
        d="M3.5 5.5h13M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5M5 5.5l.7 10a1.5 1.5 0 001.5 1.4h5.6a1.5 1.5 0 001.5-1.4l.7-10"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8.5 9v4.5M11.5 9v4.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/** Candado chico: marca un gasto privado, que no suma a ningun grupo. */
export function IconoCandado({ color = TENUE, tamano = 12 }: { color?: string; tamano?: number }) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 16 16" fill="none">
      <Rect x={3} y={7} width={10} height={7} rx={2} stroke={color} strokeWidth={1.5} />
      <Path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function IconoGoogle() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M18.17 10.2c0-.63-.06-1.23-.16-1.81H10v3.42h4.59a3.92 3.92 0 01-1.7 2.57v2.14h2.75c1.6-1.48 2.53-3.65 2.53-6.32z"
        fill="#4285F4"
      />
      <Path
        d="M10 18.33c2.3 0 4.22-.76 5.63-2.07l-2.75-2.14c-.76.51-1.73.81-2.88.81-2.21 0-4.08-1.49-4.75-3.5H2.41v2.2A8.33 8.33 0 0010 18.33z"
        fill="#34A853"
      />
      <Path d="M5.25 11.43a5 5 0 010-3.19V6.04H2.41a8.33 8.33 0 000 7.59l2.84-2.2z" fill="#FBBC05" />
      <Path
        d="M10 4.58c1.25 0 2.37.43 3.25 1.27l2.44-2.44A8.33 8.33 0 002.41 6.04l2.84 2.2C5.92 6.07 7.79 4.58 10 4.58z"
        fill="#EA4335"
      />
    </Svg>
  );
}

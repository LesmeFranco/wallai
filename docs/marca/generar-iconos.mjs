/**
 * Genera los PNG de la marca a partir de un unico SVG escrito aca adentro.
 *
 * POR QUE UN SCRIPT Y NO SEIS ARCHIVOS DIBUJADOS A MANO: los iconos de una app
 * son el mismo dibujo seis veces, en seis tamanos y con tres reglas distintas
 * (iOS no acepta transparencia, el adaptativo de Android recorta todo lo que
 * salga de un circulo central, el monocromo se tine solo). Mantenerlos a mano
 * garantiza que tarde o temprano queden distintos entre si. Aca el dibujo esta
 * una sola vez y el resto es aritmetica.
 *
 * Se corre a mano, cuando cambia la marca, y no en cada build:
 *
 *     node docs/marca/generar-iconos.mjs
 *
 * Necesita `sharp`, que ya esta en el workspace (lo usa Next para optimizar
 * imagenes). No se agrego ninguna dependencia nueva por esto.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ASSETS = path.join(RAIZ, 'apps/mobile/assets');

const LIMA = '#AAFF4D';
const OSCURO = '#0C0C13';

/**
 * El trazo de la marca, en un lienzo de 100x100.
 *
 * Es una sola linea continua: baja, sube al pico del medio, vuelve a bajar y
 * remata subiendo mas alto que donde empezo. Lee como una W y como la linea de
 * un grafico, que es exactamente lo que hace la app. El `escala` existe para el
 * icono adaptativo de Android, que recorta todo lo que caiga fuera del circulo
 * central: ahi el mismo dibujo entra mas chico.
 */
function trazo(color, { escala = 1, grosor = 9 } = {}) {
  const transformar = escala === 1 ? '' : ` transform="translate(50 50) scale(${escala}) translate(-50 -50)"`;
  return `<path d="M 23 32 L 37 70 L 50 40 L 63 70 L 79 22" fill="none" stroke="${color}"
    stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round"${transformar}/>`;
}

const svg = (contenido) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 100 100">${contenido}</svg>`,
  );

/** El icono completo: lima de borde a borde (la mascara la pone el sistema). */
const iconoLleno = svg(`<rect width="100" height="100" fill="${LIMA}"/>${trazo(OSCURO)}`);

const archivos = [
  {
    nombre: 'icon.png',
    tamano: 1024,
    entrada: iconoLleno,
    /**
     * SIN CANAL ALFA, y no es un detalle: Apple rechaza el icono principal si
     * tiene transparencia, y es de los rechazos mas tontos de diagnosticar.
     */
    sinAlfa: true,
  },
  {
    nombre: 'android-icon-foreground.png',
    tamano: 512,
    // 0.78 es lo que hace falta para que las puntas del trazo entren en el
    // circulo seguro del icono adaptativo (los dos tercios centrales). Sin eso,
    // en los telefonos que recortan en circulo la W queda sin extremos.
    entrada: svg(trazo(OSCURO, { escala: 0.78 })),
  },
  {
    nombre: 'android-icon-monochrome.png',
    tamano: 512,
    // El icono tematico: Android lo tine con el color del fondo de pantalla, asi
    // que lo unico que importa es la silueta. Va en blanco por convencion.
    entrada: svg(trazo('#FFFFFF', { escala: 0.78 })),
  },
  {
    nombre: 'splash-icon.png',
    tamano: 1024,
    // Sobre el fondo oscuro del splash, la marca va en lima.
    entrada: svg(trazo(LIMA, { grosor: 8 })),
  },
  { nombre: 'favicon.png', tamano: 48, entrada: iconoLleno, sinAlfa: true },
];

for (const { nombre, tamano, entrada, sinAlfa } of archivos) {
  let imagen = sharp(entrada, { density: 600 }).resize(tamano, tamano);
  if (sinAlfa) imagen = imagen.flatten({ background: LIMA });
  await imagen.png().toFile(path.join(ASSETS, nombre));
  console.log(`${nombre} ${tamano}x${tamano}${sinAlfa ? ' (sin alfa)' : ''}`);
}

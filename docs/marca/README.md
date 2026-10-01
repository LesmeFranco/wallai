# La marca de Wallai

Todo lo que define cómo se ve Wallai fuera del código: el logo, los colores, la
tipografía y de dónde sale cada archivo.

---

## El logo

Una sola línea continua que baja, sube al pico del medio, vuelve a bajar y
remata más alto que donde empezó.

Lee como una **W** y como la **línea de un gráfico**, que es exactamente lo que
hace la app. No es casualidad que se parezca al gráfico de "gasto por día" del
inicio: es la única forma visual que la app ya tenía, y repetirla es lo que hace
que el logo se reconozca adentro del producto y no solo afuera.

**Por qué el brazo derecho sube más.** Una W simétrica es una letra; esta es un
trazo con dirección. Es lo único que la separa de cualquier otra W redondeada, y
es lo que todavía se distingue a 64px, que es el tamaño real al que la gente la
va a ver todos los días en la grilla del teléfono.

### Archivos

| Archivo | Para qué |
|---|---|
| `wallai-icono.svg` | La marca sobre el lima, con las esquinas redondeadas. Avatar, favicon, ícono. |
| `wallai-marca-lima.svg` | El trazo solo, en lima. Para fondos oscuros. |
| `wallai-marca-oscura.svg` | El trazo solo, en el negro de la app. Para fondos claros o sobre el lima. |
| `generar-iconos.mjs` | Genera los seis PNG de `apps/mobile/assets` a partir del mismo dibujo. |

En la web, la marca **no** se importa como archivo: vive como componente en
`apps/web/componentes/Logo.tsx`, así el color sale de las props y no hay dos
copias del mismo dibujo que mantener sincronizadas.

### Regenerar los íconos de la app

```bash
node docs/marca/generar-iconos.mjs
```

Reescribe `icon.png`, `android-icon-foreground.png`,
`android-icon-monochrome.png`, `splash-icon.png` y `favicon.png`. Correrlo solo
cuando cambie el dibujo; no corre en cada build.

Tres cosas que el script resuelve y que a mano se olvidan siempre:

- **`icon.png` va sin canal alfa.** Apple rechaza el ícono principal si tiene
  transparencia, y es de los rechazos más tontos de diagnosticar.
- **El ícono adaptativo de Android se dibuja al 78%.** El sistema recorta todo
  lo que caiga fuera del círculo de los dos tercios centrales; a tamaño completo
  la W perdía las puntas en los teléfonos que recortan en círculo.
- **El monocromo va en blanco.** Android lo tiñe con el color del fondo de
  pantalla, así que lo único que importa es la silueta.

### Qué no hacer con el logo

- No rotarlo, inclinarlo ni ponerlo en perspectiva.
- No cambiarle el color del trazo por otro que no sea el lima o el negro de la
  marca.
- No ponerle sombra, degradé ni relleno: es un trazo.
- No escribir "Wallai" adentro del recuadro. El nombre va al lado.
- Espacio libre alrededor: como mínimo, la mitad del alto del recuadro.

---

## Colores

Los mismos tokens que usan la app y la web. Están definidos una sola vez en
`apps/mobile/tailwind.config.js` y en `apps/web/app/globals.css`.

| Nombre | Hex | Para qué |
|---|---|---|
| `lima` | `#AAFF4D` | El color de la marca. Acentos, montos, botón principal. |
| `fondo` | `#0C0C13` | El fondo de todo. |
| `superficie` | `#151520` | Tarjetas. |
| `superficie-alta` | `#1C1C2A` | Una tarjeta sobre otra tarjeta. |
| `borde` | `#252538` | Bordes. |
| `primario` | `#F0F0FA` | Texto principal. |
| `secundario` | `#9999B3` | Texto secundario. |
| `tenue` | `#5A5A78` | Etiquetas y texto de apoyo. |
| `coral` | `#FF6B6B` | Errores y acciones que no se deshacen. |

**El lima no se usa para texto corrido**: sobre el fondo oscuro un párrafo
entero en lima cansa la vista en dos renglones. Va en montos, en botones y en
una palabra suelta.

---

## Tipografía

- **Outfit** (600 / 700 / 800) para títulos, montos y botones.
- **Inter** (400 / 500 / 600) para texto corrido y etiquetas.

El nombre "wallai" se escribe en **minúscula**, en Outfit ExtraBold, con el
espaciado un poco cerrado (`letter-spacing: -0.03em`). Nunca convertido a
curvas: un logotipo en curvas es un archivo más que se desactualiza, y como
texto se puede seleccionar y lo lee un lector de pantalla.

---

## La imagen que se ve al compartir el link

`apps/web/app/opengraph-image.tsx` la genera en el build. Es lo primero que ve
alguien a quien le pasan el link por WhatsApp o que ve el posteo en LinkedIn,
antes de la página y antes de la app. Si cambia el nombre, el color o la frase
de la marca, cambia sola: es código, no un PNG exportado a mano.

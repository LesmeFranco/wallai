# El video de Wallai: el prompt

Un solo prompt, para pegar entero en el generador. Está en inglés a propósito:
todos los generadores de video entienden bastante mejor el inglés, y traducirlo
al castellano empeora el resultado sin ganar nada.

---

## El prompt

```
Vertical 9:16 cinematic product video, photorealistic, one continuous shot, 4K,
24fps. A single hand holds a modern bezel-less smartphone upright in a dark
kitchen at night, the phone centered in frame and facing camera. The screen is
on, showing a dark charcoal app interface lit by bright lime-green accents: a
large glowing lime numeral near the top, and below it a vertical stack of small
rounded dark cards, each with a tiny colored circular icon on its left side. The
content on the screen scrolls slowly and smoothly upward on its own, as if
someone were browsing it, and the cards settle into place one after another; the
lime numeral pulses once, softly. The screen is kept slightly soft and out of
focus so that nothing on it is legible. Lime-green light from the screen spills
onto the fingers and onto the matte counter below. In the deep blurred
background, a coffee cup and a set of keys, and far behind them the warm
out-of-focus glow of a kitchen light. The camera pushes in very slowly toward
the phone throughout the shot, with a subtle handheld float, 50mm lens look,
shallow depth of field; the phone never tilts away from camera. Lighting: one
soft key light from the upper left, a strong rim light along the phone edges,
deep shadows, the whole frame almost monochrome except for the lime green. Calm,
premium, late-evening mood. Nothing legible anywhere in the frame: no readable
text, no words, no letters, no logos, no watermarks, no subtitles, no captions,
no user interface labels. No camera shake, no cuts, no transitions, no people's
faces.

Remove the phone's borders so that only what matters—the app—remains.
```

---

## Tres cosas al generarlo

**Poné la duración máxima que te deje.** El prompt es un solo plano continuo, así
que cuanto más dure, mejor queda; no hay cortes que se puedan romper.

**Si te deja elegir formato, vertical (9:16).** Generarlo horizontal y recortarlo
después deja la mano fuera de cuadro.

**La línea de "nothing legible" no se saca.** Es la que sostiene todo el prompt.
Ninguna IA de video sabe escribir: si le dejás dibujar texto, la pantalla sale
con garabatos y números inventados, y ahí el video deja de servir. Por eso la
pantalla va apenas desenfocada: se entiende que es una app sin que haga falta
leer nada.

Por el mismo motivo, **el nombre de la marca no se lo pidas al generador**. Si
querés cerrar con el logo, lo ponés vos encima al final con el SVG de
`wallai-icono.svg` y el nombre en Outfit. Cualquier modelo escribe "WaIIai" o
"Walai", y el nombre mal escrito en el cierre arruina el video entero.

---

## Si después querés que se vea la app de verdad

El video de arriba muestra el gesto, no el producto. El día que quieras que se
vea la app funcionando, el camino es grabar la pantalla del teléfono y pegarla
encima del video con "corner pin" o seguimiento de esquinas (CapCut y DaVinci
Resolve lo hacen gratis). Así se hacen todos los videos de producto: la pantalla
nunca es la de la filmación.

El recorrido a grabar, que son unos 20 segundos: el inicio con el total del mes,
tocar el total para que suba el resumen, cerrar, tocar el botón de cargar,
escribir tres gastos uno por renglón, y guardar.

### Los textos sobreimpresos

En Outfit, blanco (`#F0F0FA`), con una palabra en lima. Cortos: en un video
vertical nadie lee más de seis palabras.

1. `Anotá lo que gastás como se lo contarías a alguien.`
2. `El monto y la categoría los pone sola.`
3. `Cuánto gastó la casa este mes.` *(la última palabra en lima)*
4. `wallai` + `Gratis y de código abierto.`

### Música

Sin letra, electrónica mínima, 90-110 BPM. Que no tenga voz es lo único
importante: una voz cantada compite con los textos sobreimpresos.

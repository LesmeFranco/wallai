# El video de Wallai: prompts para una IA de video

Para armar el video de presentación (LinkedIn, la portada, la ficha de Google
Play). Los prompts están en inglés a propósito: todos los generadores de video
entienden bastante mejor el inglés, y traducirlos al castellano empeora el
resultado sin ganar nada.

---

## Leer esto antes de generar nada

**Ninguna IA de video sabe dibujar la interfaz de una app.** Es el límite más
importante y el que más tiempo hace perder: los modelos de texto a video generan
texto ilegible, números inventados y menús que se deforman entre un cuadro y el
siguiente. Si le pedís "un teléfono mostrando la app Wallai con el total del
mes", vas a recibir un teléfono con garabatos verdes adentro.

Por eso el video se arma en dos partes:

1. **La IA genera el envoltorio**: la mano, el teléfono, la mesa, la luz, el
   movimiento de cámara. Ahí la IA es excelente y hacerlo con una cámara de
   verdad cuesta un día entero.
2. **La pantalla la ponés vos**, encima, con una grabación real de la app.

Esto no es un plan B: es como se hacen los videos de producto de todas las apps.
La pantalla nunca es la de la filmación.

### Cómo se graba la pantalla de verdad

Android graba la pantalla solo (el botón está en el panel de ajustes rápidos).
Grabá vertical, con la app ya abierta, y hacé el recorrido completo sin dudar:

1. Inicio, con el total del mes a la vista.
2. Tocar el total y que suba la hoja del resumen (ahí está la animación).
3. Cerrar, tocar el botón de cargar.
4. Escribir tres gastos, uno por renglón.
5. Guardar y que aparezcan categorizados.

Son unos 20 segundos. Después se pega sobre el teléfono generado con la IA
usando "corner pin" / "seguimiento de esquinas" en CapCut, DaVinci Resolve o
Premiere. Los tres son gratis salvo Premiere.

**Si querés saltearte el compuesto**, usá el PROMPT 4: la pantalla queda
abstracta a propósito (luz lima difusa, sin texto legible) y el mensaje lo
cuentan los textos sobreimpresos. Se ve bien y se resuelve en una sola toma,
pero no muestra el producto.

---

## PROMPT 1 — El plano principal (la mano y el teléfono)

Para el plano que abre el video. La pantalla queda oscura con un resplandor
lima: ahí va después la grabación real.

```
A cinematic vertical product shot, 9:16. A single hand holds a modern
bezel-less smartphone upright in the lower third of the frame. The phone
screen is OFF and deep black, emitting a soft lime-green glow (#AAFF4D)
that spills onto the fingers and the surface below.

Setting: a dark minimalist kitchen counter at night, matte charcoal
surface, a blurred coffee cup and a set of keys far out of focus in the
background. Deep shadows, almost monochrome, with the lime glow as the
only color in the frame.

Camera: slow push-in toward the phone over the full shot, very subtle
handheld float, shallow depth of field, 50mm lens look. The phone stays
perfectly centered and perpendicular to camera, never tilting away.

Lighting: single soft key light from the upper left, strong rim light on
the phone edges, lime bounce light from the screen onto the hand.

Mood: calm, premium, late evening. No text, no logos, no UI, no on-screen
graphics. Photorealistic, 4K, 24fps, no camera shake, no people's faces.
```

**El detalle que importa**: "the phone stays perfectly centered and
perpendicular to camera, never tilting away". Si el teléfono gira, el compuesto
de la pantalla se vuelve diez veces más difícil.

---

## PROMPT 2 — El recorrido (el teléfono rotando en el aire)

Para el medio del video, donde se muestran las pantallas. Mismo criterio: el
frente del teléfono queda disponible.

```
A cinematic vertical shot, 9:16. A modern bezel-less smartphone floats in
the center of a pure black void, screen facing the camera, lit only by its
own soft lime-green glow (#AAFF4D). The phone rotates very slowly around
its vertical axis, no more than 15 degrees total, so the front of the
screen is always visible and facing camera.

Thin lime-green light trails orbit the phone like slow particles. Faint
volumetric haze catches the light. Everything else is pure black.

Camera: locked off, no movement, phone perfectly centered. Slow, hypnotic,
weightless motion.

Photorealistic product rendering, 4K, 24fps. No text, no logos, no UI
elements, no reflections of people.
```

---

## PROMPT 3 — El cierre (el logo)

```
A minimalist 9:16 animation on a pure black background (#0C0C13). A single
rounded-square badge in bright lime green (#AAFF4D) sits in the center of
the frame. Inside it, a thick black zigzag stroke shaped like the letter W
draws itself on, left to right, in one continuous motion, with rounded
line caps: the stroke goes down, up to a peak, down again, and ends rising
higher than it started.

After the stroke finishes, the badge settles with a soft lime glow
radiating outward and fading. Clean motion-graphics look, perfectly
centered, no camera movement, no other elements, no text.

Duration 3 seconds, 4K, 24fps.
```

El nombre "wallai" **no** se lo pidas a la IA: va sobreimpreso después, en
Outfit ExtraBold minúscula, al lado del recuadro. Cualquier modelo de video
escribe mal una palabra de seis letras, y el nombre de la marca mal escrito en
el cierre arruina el video entero.

---

## PROMPT 4 — Si no vas a componer la pantalla

Una sola toma, autocontenida. La pantalla es luz, no interfaz, así que no hay
nada que pueda salir mal escrito.

```
A cinematic vertical shot, 9:16. A hand holding a smartphone at a dark
kitchen table at night. The screen shows only abstract soft-focus
lime-green light shapes, heavily blurred and bokeh-like, with no readable
text or interface, as if the screen were seen slightly out of focus.

A second pair of hands is barely visible in the deep background, out of
focus, suggesting someone else in the room.

Camera: slow dolly in, shallow depth of field, handheld float. Warm
practical light in the background, lime glow on the hand in front.

Mood: everyday, calm, domestic, late evening. Photorealistic, 4K, 24fps.
No readable text anywhere in the frame.
```

---

## Cómo queda armado el video (25 segundos)

| Tiempo | Qué se ve | De dónde sale |
|---|---|---|
| 0:00 - 0:04 | La mano con el teléfono, cámara acercándose | PROMPT 1 + grabación del inicio |
| 0:04 - 0:08 | Se toca el total y sube el resumen del mes | Grabación real |
| 0:08 - 0:16 | Se escriben tres gastos y quedan categorizados solos | Grabación real |
| 0:16 - 0:21 | El teléfono flotando, rotando apenas | PROMPT 2 + grabación del historial |
| 0:21 - 0:25 | El logo dibujándose, y el nombre al lado | PROMPT 3 + texto sobreimpreso |

### Los textos sobreimpresos

En Outfit, blanco (`#F0F0FA`), con una palabra en lima. Cortos: en un video
vertical nadie lee más de seis palabras.

1. `Anotá lo que gastás como se lo contarías a alguien.`
2. `El monto y la categoría los pone sola.`
3. `Cuánto gastó la casa este mes.` *(la última palabra en lima)*
4. `wallai` + `Gratis y de código abierto.`

### Música

Sin letra, electrónica mínima, 90-110 BPM, que entre en el segundo 0 y baje en
el cierre. Cualquier biblioteca libre de derechos sirve; que no tenga voz es lo
único importante, porque los textos sobreimpresos compiten con una voz cantada.

---

## Errores que ya sabemos que hay que evitar

- **No le pidas a la IA que escriba "Wallai"**. Va a salir "WaIIai", "Walai" o
  algo peor, y es el único error del video que nadie perdona.
- **No le pidas montos en pantalla**. Los números salen deformados.
- **No generes el video en horizontal y después lo recortes**: la app es
  vertical y el recorte deja la mano fuera de cuadro.
- **No uses más de 15 grados de rotación** en el teléfono si vas a componer la
  pantalla encima.
- **Pedí siempre "no camera shake"**: el temblor que agregan los modelos por
  defecto hace imposible seguir las esquinas de la pantalla.

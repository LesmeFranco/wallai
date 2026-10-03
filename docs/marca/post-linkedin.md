# El posteo de LinkedIn

Dos borradores para anunciar Wallai. Escritos para que los lea gente de sistemas
y gente que no: en LinkedIn, el que decide si sigue leyendo después de la
tercera línea casi nunca es programador.

Sin emojis, como el resto del proyecto. No es una limitación: en un feed lleno
de cohetes y fueguitos, un texto que no los usa se lee distinto.

---

## Borrador A — el producto (recomendado para anunciar)

> Mi mamá anotaba los gastos de casa en un cuaderno. Mi papá, en las notas del
> teléfono. Yo no los anotaba.
>
> Hice una app para los tres.
>
> Se llama Wallai y funciona así: escribís "5000 pan" y listo. Le saca el monto,
> entiende que es comida y lo suma al total del mes. Si te equivocás de
> categoría, la corregís una vez y no se vuelve a equivocar con nada parecido.
> Lo que aprende es de la casa, no tuyo: si yo le enseño que "medialunas" es
> comida, también lo sabe para mis viejos.
>
> Lo que NO hace, y es a propósito: no se conecta a ningún banco, no pide
> ninguna clave y no lleva la cuenta de quién le debe a quién. La pregunta que
> contesta es una sola, "cuánto gastó la casa este mes", que es la que nos
> hacíamos nosotros.
>
> Es gratis, no tiene anuncios y el código está publicado con licencia
> Apache 2.0.
>
> Está hecha con TypeScript de punta a punta: React Native con Expo, tRPC,
> Postgres en Supabase y un monorepo con Turborepo. El motor que categoriza no
> usa IA generativa: son reglas que aprende de las correcciones, más un
> diccionario del gasto argentino escrito a mano. Me parece la decisión técnica
> más interesante del proyecto, porque es la que hace que funcione sin conexión,
> sin costo por consulta y sin mandar lo que gastás a ningún servidor ajeno.
>
> En la página se puede probar el motor sin instalar nada: lo que escribís ahí
> lo procesa exactamente el mismo código que corre en el teléfono.
>
> El link está en el primer comentario.

**El link va en el primer comentario**, no en el posteo: LinkedIn le da menos
alcance a lo que se lleva gente afuera.

Primer comentario:

> Probar el motor y descargar: https://wallai-three.vercel.app
> El código: https://github.com/LesmeFranco/wallai

---

## Borrador B — la ingeniería (para después, no el mismo día)

> Publiqué una app de gastos y me quedaron tres cosas que no esperaba aprender.
>
> **1. El bug más caro no estaba en el código.** Las tablas que creás por
> migración en Supabase nacen SIN Row Level Security. Eso significa que la API
> REST que Supabase publica sola, con la clave anónima que viaja adentro del
> APK, dejaba leer los gastos y los emails de todos. Toda la autorización que
> había escrito en el servidor se salteaba yendo por otro lado. Lo encontré el
> día antes del primer build.
>
> **2. La decisión de producto más difícil fue sacar una función.** Había un
> filtro que mezclaba mis gastos con los de todos los grupos en un solo número.
> Mi viejo lo probó y la pregunta fue: "¿y esto qué me dice?". Nada. Dos
> billeteras distintas no se suman. Lo saqué.
>
> **3. Guardar la plata como entero de centavos no es exagerado.** 0,1 + 0,2 no
> da 0,3 en punto flotante, y el error se acumula callado. En una app de gastos
> eso es que los totales dejen de cerrar sin que nadie sepa por qué.
>
> Stack: TypeScript en todo, React Native con Expo, tRPC, Drizzle sobre Postgres
> en Supabase, monorepo con Turborepo. El código está abierto, con licencia
> Apache 2.0, por si a alguien le sirve de ejemplo.

---

## Cómo publicarlo

- **El video o la imagen van en el posteo.** Sin imagen, un texto largo en
  LinkedIn se ve como un bloque gris. Va el video vertical, o una captura de la
  app.
- **Si usás un recorte de la grabación del teléfono, mirá qué quedó en cuadro.**
  En la grabación original se ven los códigos de invitación de los grupos, y
  cualquiera que pause el video puede sumarse con ellos.
- **Si pegás solo el link**, la vista previa que arma LinkedIn ya sale bien: la
  imagen la genera `apps/web/app/opengraph-image.tsx`.
- **Las tres primeras líneas son las únicas que se ven** antes del "ver más".
  Las del borrador A están escritas para eso.
- **Contestá los comentarios el primer día.** Es lo que más mueve el alcance, y
  además es cuando aparece la gente que la va a probar de verdad.

<h1 align="center">Wallai</h1>

<p align="center">
  Control de gastos personales y del hogar.<br>
  Escribis el gasto como se lo contarias a alguien por mensaje,<br>
  y un motor propio lo categoriza solo.
</p>

<br>

<p align="center">
  <img src="docs/capturas/wallai-app.png" alt="Dashboard de Wallai: total del mes, ultimo gasto y desglose por categoria y por persona" width="300">
</p>

<p align="center">
  <sub><b>El dashboard.</b> Cuanto gasto la casa este mes, con el desglose por categoria y por persona.</sub>
</p>

<br>

## Que es

Una app de gastos para una familia. La carga es una sola frase:

```
30000 hamburguesa en Guido
```

De ahi el sistema saca el monto (el numero que abre el texto, o cualquiera
marcado con "$" o "pesos"), la fecha si la mencionaste, y le asigna una
categoria. Cuando se equivoca, la corregis una vez y no se vuelve a equivocar
con textos parecidos: esa correccion queda guardada y beneficia a todo el grupo.

**El diferencial no es el tageo ni el multiusuario por separado**, que ya
existen. Es la combinacion, con el foco puesto en *"cuanto gasto la casa este
mes"* y **no** en *"quien le debe a quien"*. Esa distincion define lo que el
proyecto decide no construir: nada de saldos entre personas, liquidaciones ni
deudas.

El alcance, el modelo de datos y el stack estan definidos en el documento de
producto.

## Estado actual

**La app esta desplegada y en uso.** El backend corre en Vercel y hay un APK
instalado en un telefono real: se carga un gasto con la computadora apagada y
funciona. Hasta la fase 4.1 la app solo vivia mientras la maquina de desarrollo
tenia dos servidores prendidos y el telefono estaba en la misma Wi-Fi.

| Fase | Que | Estado |
|---|---|---|
| 1 | Monorepo, modelo de datos, auth con Supabase, API tRPC | Completa |
| 2 | Parser de monto y fecha, motor de tageo que aprende | Completa |
| 3 | Grupos compartidos, app mobile, editar y borrar gastos | Completa |
| 3.5 | Varios grupos a la vez, gastos privados, diccionario del motor | Completa |
| 4.1 | Deploy del backend en Vercel y build de Android con EAS | Completa |
| 4.2 | Objetivos de gasto, aviso de la noche, pulido de UI | Completa |

La version instalada es la **1.3.0** y la **1.4.0** esta escrita y probada,
esperando su build. Lo que trajeron las ultimas salio entero de usar la app todos
los dias: el selector de que gastos se miran sin la vista que mezclaba lo propio
con lo de los demas, la correccion de categoria con un paso de confirmar, el
login con Google funcionando, el monto sin necesidad de escribir "$" adelante, el
ojo para ver la contrasena al escribirla, y los cuadros de confirmar con el
estilo de la app en vez de los del sistema.

La 1.4.0 cierra el MVP con las tres cosas que faltaban:

- **Objetivos de gasto.** Uno por vista -el propio y el de cada grupo-, mensual,
  sobre el total, y opcional: si no se pone ninguno, el dashboard queda igual.
- **El aviso de la noche.** Una sola notificacion por dia, a las 21, y en un dia
  normal **no suena**: si cargaste tus gastos y venis bien con el objetivo, no
  hay nada que decir. Ver la seccion propia.
- **El pulido de UI**, que era sobre todo la app viendose distinta segun el
  telefono Android. Ver las notas del final.

Lo que queda: desplegar la 1.4.0 (primero el push, despues el build), probar el
aviso en el telefono a las 21, y los detalles que solo aparecen usandola a
diario. Para iOS el codigo ya esta listo; lo que falta es la cuenta de Apple
Developer, que es lo unico que permite instalar la app en un iPhone de verdad.

## Descargar la app

### Android

El APK se instala a mano, fuera de Google Play:

**[Instalar Wallai 1.3.0 para Android](https://expo.dev/accounts/fr4nco/projects/wallai/builds/0a08d4e2-9dc9-4362-9d4c-88067a6022ad)**

Esa pagina la publica EAS y abre sin cuenta: tiene el boton de descarga y un
codigo QR para escanear desde el telefono. Como el APK no viene de la tienda,
Android va a pedir permiso para instalar "apps de origen desconocido" la primera
vez, que es el aviso normal de cualquier APK fuera de Play.

Ese link apunta a un build concreto de EAS y los artefactos de EAS caducan a los
30 dias en el plan gratuito. Por eso, **a partir de la 1.4.0 el APK se publica
tambien como release de este repositorio**, que es un link que no vence:
[releases](https://github.com/LesmeFranco/wallai/releases).

### iOS

**Todavia no hay descarga, y no es por el codigo.** La app es la misma para los
dos sistemas, compila para iPhone y no tiene nada especifico de Android.

El camino elegido es **TestFlight**, que es la app de Apple para repartir
versiones de prueba. Lo importante, porque no es obvio: **no hace falta una
Mac.** EAS compila en la nube y el envio a Apple se hace por linea de comandos,
asi que todo el proceso sale desde Windows o Linux.

Lo que si hace falta, y no tiene vuelta, es la cuenta de **Apple Developer
(99 USD al anio)**: Apple no permite instalar una app fuera de la App Store sin
ella, ni siquiera para probar. La firma gratuita con Xcode caduca a los siete
dias y necesita una Mac, asi que no sirve.

Una vez con la cuenta, quien quiera probarla instala TestFlight y entra con el
link de invitacion. Los builds de prueba caducan a los 90 dias.

## Requisitos

- Node 22 o superior
- pnpm 12 (`corepack enable` lo activa a partir del campo `packageManager`)
- Una cuenta gratuita de Supabase

## Como correrlo

### 1. Lo que no necesita base de datos

```bash
pnpm install      # instala todo el workspace de una sola vez
pnpm test         # 92 tests en packages/validators
pnpm typecheck    # verifica los tipos de los 5 paquetes
```

Que deberias ver: los 92 tests en verde y los 5 paquetes sin errores de tipos.

### 2. Conectar la base de datos

1. Crear un proyecto gratuito en supabase.com.
2. Ir a Project Settings > Database y copiar la cadena de conexion del
   **Session pooler**, no la conexion directa. La directa resuelve a una IP
   IPv6 que en muchas redes no es alcanzable; el Session pooler es IPv4 y, a
   diferencia del Transaction pooler, soporta sentencias preparadas, que es lo
   que necesitan las migraciones de Drizzle.
3. Copiar `.env.example` a `.env` en la raiz del repositorio y completar los
   valores. El archivo de ejemplo explica que es cada variable y de donde
   sacarla.

```bash
pnpm --filter @wallai/db db:migrar     # crea las tablas
pnpm --filter @wallai/db db:seed       # carga las 11 categorias globales
pnpm --filter @wallai/db db:verificar  # prueba de humo del modelo de datos
```

`db:verificar` arma un hogar de mentira con dos miembros y unos gastos, corre
las consultas del dashboard, comprueba que la base rechace los datos invalidos,
y al final **revierte todo**: no deja nada cargado, asi que es seguro correrlo
contra la base real. Termina en "Todo bien".

### 3. Levantar la app en desarrollo

Esto es solo para desarrollar. La app instalada desde el APK no necesita nada de
esto: habla con el backend desplegado y funciona con la computadora apagada.

Son dos terminales, porque la app mobile necesita el backend corriendo:

```bash
pnpm --filter @wallai/web dev      # 1) backend tRPC en localhost:3000
pnpm --filter @wallai/mobile dev   # 2) Metro, y el QR para Expo Go
```

El telefono tiene que estar en la misma red Wi-Fi que la maquina. La URL del
backend se deduce sola de la direccion por la que Expo sirve el bundle, asi que
no hay que escribir ninguna IP a mano.

## Variables de entorno

Van en un `.env` en la raiz del monorepo, no dentro de cada app. Hay un
`.env.example` con la lista completa y el porque de cada una; el `.env` de
verdad esta ignorado por git, asi que las claves nunca se commitean.

| Variable | Para que | Donde se usa |
|---|---|---|
| `DATABASE_URL` | Cadena de conexion a PostgreSQL | Backend y migraciones |
| `SUPABASE_URL` | URL del proyecto de Supabase | Backend y app mobile |
| `SUPABASE_ANON_KEY` | Clave publica, pensada para exponerse | Solo la app mobile |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio para verificar los JWT | **Solo el backend** |

La clave de servicio ignora las politicas de acceso de la base y **nunca** debe
llegar al cliente. Por eso `app.config.ts` expone unicamente la URL y la clave
anonima a la app mobile.

Un detalle util para el deploy: `SUPABASE_ANON_KEY` no hace falta en el servidor,
y `SUPABASE_SERVICE_ROLE_KEY` no hace falta en el build de la app.

## Despliegue

**El backend** (`apps/web`) va a Vercel, con el Root Directory apuntado a
`apps/web` y las tres variables del servidor cargadas en el panel. Dos cosas que
no son obvias:

- Vercel no soporta pnpm 12 en su imagen de build, asi que hay que activar
  Corepack con la variable `ENABLE_EXPERIMENTAL_COREPACK=1`. Con eso respeta el
  campo `packageManager` del `package.json` y usa la version exacta.
- `packages/api` lee las variables **al cargarse el modulo**, no al recibir un
  request. Eso significa que si faltan, falla el build entero y no un request
  suelto. Hay que cargarlas antes del primer deploy.

**El orden importa: primero el push, despues el build.** El backend se despliega
solo con cada push a `main`, y cada version de la app suele estrenar endpoints o
validaciones que el backend viejo no tiene. Al reves, el telefono quedaria con
botones que fallan hasta que termine el deploy. En el otro sentido no hay riesgo,
porque los cambios del backend son aditivos y la version instalada los ignora.

**La app** se construye con EAS. Para Android, `eas build --platform android
--profile preview` produce un APK instalable a mano.

Para iOS el camino es TestFlight, y **no hace falta una Mac**: EAS compila en la
nube y `eas submit` sube el build a Apple desde cualquier sistema. Lo que hace
falta es la cuenta de Apple Developer. En orden:

```bash
# 1) Con la cuenta ya dada de alta y la app creada en App Store Connect
#    usando el mismo bundle identifier que declara app.config.ts.
npx eas-cli build -p ios --profile production   # pide la cuenta de Apple la primera vez
npx eas-cli submit -p ios --latest              # sube el build a App Store Connect
```

EAS genera y administra solo el certificado de distribucion y el perfil de
aprovisionamiento; alcanza con contestar que si.

Despues, en App Store Connect, hay dos formas de repartirlo y conviene saber la
diferencia antes de elegir:

| | Cuantos | Cuanto tarda |
|---|---|---|
| **Testers internos** | Hasta 100, cada uno agregado como usuario de App Store Connect con su Apple ID | Minutos: **no pasa por revision** |
| **Testers externos** | Hasta 10.000, con un link publico para compartir | El primer build pasa por una revision de Apple, en general un dia |

Para unos pocos amigos, los testers internos son el camino rapido.

Sin la cuenta paga tambien se puede compilar para el simulador
(`eas build -p ios --profile preview`, que es lo que declara
`ios: { simulator: true }` en `eas.json`), pero eso produce un build sin firmar
que solo abre en el simulador de una Mac: sirve para mirar el diseno, no para
que alguien use la app.

Lo que hace que la app deje de depender de la maquina de desarrollo es
`WALLAI_URL_API`. Sin esa variable, `lib/entorno.ts` deduce la direccion del
backend a partir del servidor de Expo, que es lo correcto en desarrollo y no
existe en un build independiente.

## Estructura

```
apps/
  web/            Next.js (App Router). Hostea el backend tRPC.
  mobile/         Expo Router + NativeWind. La app de verdad.
    app/          Rutas. (sesion)/ exige sesion; el resto es publico.
                  (sesion)/: dashboard, historial, grupos.
                  gasto/nuevo, grupo/crear, grupo/unirse, login.
    componentes/  Piezas visuales compartidas entre pantallas.
    lib/          Cliente de Supabase, sesion, tRPC, formato y presentacion.
packages/
  validators/     Zod y logica de dominio pura. Sin acceso a base ni servidor,
                  que es lo que permite usarlo tambien desde la app mobile.
  db/             Schema de Drizzle, migraciones, cliente, seed y verificacion.
    src/schema/   Una tabla por archivo, con el porque de cada decision.
    migraciones/  SQL generado. Se commitea: es el historial de la base.
  api/            Routers de tRPC (gastos, hogares, categorias), puente del JWT
                  y el motor de tageo.
```

## El modelo de datos en una linea cada tabla

- `usuarios` — perfil publico. **No guarda contrasenas**: de eso se encarga
  Supabase Auth en su propio esquema.
- `hogares` — la unidad de agregacion, con su codigo de invitacion y su tipo
  (una casa o un grupo).
- `usuario_hogar` — quien pertenece a que grupo (muchos a muchos: una persona
  puede estar en varios).
- `categorias` — globales del sistema (`hogar_id` nulo) o propias de un grupo.
- `gastos` — la tabla central. Montos en centavos enteros, fecha sin hora.
- `reglas_tageo` — la memoria del motor: cada correccion del usuario queda aca.
- `objetivos` — limites de gasto por persona o por grupo. Guarda el limite, no
  lo gastado: lo acumulado se calcula sumando gastos, porque un contador
  denormalizado se desincroniza en silencio.

Cada archivo en `packages/db/src/schema/` explica en comentarios por que la
tabla es como es. Vale la pena leerlos antes de tocar nada.

## Como funciona el motor de tageo

No hay ningun modelo entrenado ni IA generativa, y no es una limitacion: la
promesa del producto es "corregilo una vez y no se vuelve a equivocar con algo
parecido", y eso se cumple con busqueda por similitud sobre las correcciones ya
hechas. En orden:

1. **Reglas aprendidas.** Cada correccion guarda una fila en `reglas_tageo` que
   dice "este texto es de esta categoria". Ante un gasto nuevo, Fuse.js busca el
   patron mas parecido. Las reglas pertenecen al grupo y no a la persona, asi
   que si uno ensena que "medialunas" es comida, todos se benefician.
2. **Diccionario base.** Si nadie enseno nada todavia, una tabla de palabras del
   gasto argentino escrita a mano resuelve los casos tipicos. Existe para el
   problema del arranque en frio: sin ella, el primer dia de un grupo nuevo
   **todo** caia en "Otros".
3. **"Otros".** Si ninguno de los dos reconoce el texto, no se arriesga una
   categoria. Una sugerencia equivocada hace perder mas tiempo que ninguna.

## El aviso de la noche

La unica notificacion que manda la app: **una por dia como maximo, a las 21, y en
un dia normal no suena**.

Esa ultima parte es el diseno entero. Si la persona cargo sus gastos y viene bien
con el objetivo, no hay nada que decirle, y una app que avisa cuando no tiene nada
que decir termina silenciada desde los ajustes del telefono. El silencio esta
garantizado por como se arma el mensaje, no por buena voluntad: la funcion que
decide el texto devuelve "nada" en ese caso. Lo que puede decir, por orden de
urgencia: que te pasaste del objetivo, que estas cerca del limite, o que todavia
no cargaste nada hoy.

Las 21 no son arbitrarias: el gasto en efectivo del dia ya ocurrio, la persona
esta en casa con el telefono en la mano, y todavia no se durmio.

Dos decisiones tecnicas que vale la pena mirar:

- **Es una notificacion local, no una push.** Una push necesitaria una tabla de
  tokens, un cron en el servidor y, en iPhone, una clave APNs que sale de la
  cuenta paga de Apple Developer. Todo eso para decir algo que el telefono ya
  sabe. La push va a hacer falta el dia que haya que avisar de algo que paso en
  **otro** telefono.
- **Se programan siete noches por adelantado, no una.** Como el texto se decide
  en el telefono, hay que resolver tambien que pasa los dias en que nadie abre la
  app, que son justo los dias en que hay que recordar cargar. La de hoy va con el
  texto calculado con datos frescos y las seis siguientes con el recordatorio
  generico; cada vez que se abre la app se cancelan todas y se recalculan. Asi,
  cuando el dato se pone viejo, el mensaje se degrada hacia el correcto y no
  hacia uno falso.

El permiso se pide despues del primer gasto cargado, nunca al abrir la app por
primera vez: un permiso pedido en frio se rechaza casi siempre, y ese rechazo es
definitivo en los dos sistemas operativos.

## Por que el monorepo

Los tipos y las validaciones se escriben una vez y se usan en los tres lados. Si
manana se agrega un campo al gasto, el error aparece al instante en la app mobile
y en la web, sin documentacion de API que se desactualice. Esa es la razon por la
que el documento eligio tRPC y TypeScript de punta a punta.

## Notas

- El dinero se guarda siempre como **centavos enteros**, nunca como decimales.
  El porque esta explicado en `packages/validators/src/dinero.ts`.
- `pnpm-workspace.yaml` fija `nodeLinker: hoisted` porque Metro, el bundler de
  Expo, no resuelve bien los symlinks que pnpm usa por defecto. Va en ese
  archivo y no en `.npmrc`: desde pnpm 10 las opciones propias de pnpm se leen
  del YAML y las del `.npmrc` se ignoran sin avisar.
- Las migraciones se commitean siempre. Son el historial de como llego la base a
  su forma actual, y es lo que permite recrearla desde cero en otra maquina.
  Nunca se edita una migracion ya aplicada: se genera una nueva.
- Si PostgreSQL deja de responder pero el login sigue andando, probablemente la
  red este filtrando los puertos 5432 y 6543.
- **Android dibuja de borde a borde y no se puede desactivar.** Desde el SDK 54
  la app pinta por debajo de las barras del sistema en vez de arriba, asi que
  todo lo que se apoye en el borde de abajo tiene que sumar `insets.bottom`.
  Cuanto tapa depende del telefono -unos 16px con navegacion por gestos, unos
  48px con los tres botones-, y por eso el mismo codigo se ve bien en un Android
  y mal en otro. Es lo que le pasaba a la barra de pestanas hasta la 1.4.0.
- **Las propiedades `shadow*` son solo de iOS.** En Android la sombra se pide con
  `elevation`, que no acepta color: una sombra de color escrita con `shadowColor`
  se ve en iPhone y no se ve en Android. La forma que funciona en los dos es
  `boxShadow`, que existe en React Native desde la 0.76.
- **Los montos llevan un tope de escala de fuente.** Con el tamano de letra del
  sistema en grande, un monto de 44px se parte en dos renglones y desborda su
  tarjeta. Los textos corridos no lo llevan: ahi escalar esta bien, porque pueden
  usar mas renglones.
- **El login social no puede depender de que la app siga viva.** Al volver del
  navegador por un esquema propio (`wallai://`), Android puede levantar la app
  de cero: el proceso arranca nuevo y la funcion que esperaba el retorno
  desaparece con todo el estado, asi que el codigo de autorizacion llega a una
  app que ya no lo espera. El sintoma es tan mudo como enganoso: se vuelve a la
  pantalla de login sin sesion y sin ningun error. Por eso el canje tambien se
  hace desde un escucha de deep links (`lib/sesion.tsx`), que funciona venga la
  app de cero o de segundo plano.
- **Para saber que URL de retorno acepta Supabase, preguntarle a la base.**
  GoTrue guarda en `auth.flow_state.referrer` el retorno ya validado contra la
  lista de Redirect URLs: si se pide una URL permitida queda esa, y si no queda
  la Site URL. Es una respuesta directa, a diferencia de `generate_link`, que da
  falsos negativos con los esquemas propios.
- **Toda tabla nueva necesita `ENABLE ROW LEVEL SECURITY` en su migracion.**
  Supabase no expone la base solo por este backend: publica ademas cada tabla en
  una API REST automatica a la que se entra con la clave anonima, que es publica
  por diseno y viaja dentro del APK. Lo unico que la hace segura es RLS, y **RLS
  viene desactivado en las tablas creadas por migraciones propias**: solo las
  creadas desde el panel de Supabase lo traen puesto. La migracion `0006` lo
  activa en las 7 tablas actuales, sin politicas, porque en esta arquitectura el
  cliente nunca habla con la base directamente. El backend no se entera porque
  se conecta con el rol duenio de las tablas, que ignora RLS.
- **Una funcion nueva en `public` tambien nace con permisos de mas.** PostgreSQL
  le da EXECUTE a PUBLIC por defecto, y Supabase agrega ademas `anon`,
  `authenticated` y `service_role` por privilegios predeterminados. En una
  funcion `SECURITY DEFINER` eso importa, porque corre con los privilegios de su
  duenio y no con los de quien la llama. La migracion `0007` se lo saca a la
  unica que hay (la del alta de perfiles) y le fija un `search_path` vacio. Toda
  funcion `SECURITY DEFINER` nueva lleva su propio REVOKE en su migracion.

## Licencia

Apache 2.0. Se puede usar, modificar y redistribuir, incluso comercialmente,
manteniendo el aviso de copyright y dejando constancia de los cambios. El texto
completo esta en [LICENSE](LICENSE).

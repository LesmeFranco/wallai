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
$30000 hamburguesa en Guido
```

De ahi el sistema saca el monto, la fecha si la mencionaste, y le asigna una
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

Las fases 1, 2 y 3 estan completas y probadas de punta a punta contra Supabase
real. La app funciona en un telefono de verdad con Expo Go.

| Fase | Que | Estado |
|---|---|---|
| 1 | Monorepo, modelo de datos, auth con Supabase, API tRPC | Completa |
| 2 | Parser de monto y fecha, motor de tageo que aprende | Completa |
| 3 | Grupos compartidos, app mobile, editar y borrar gastos | Completa |
| 3.5 | Varios grupos a la vez, gastos privados, diccionario del motor | Completa |
| 4.1 | Deploy del backend y build con EAS | En curso |
| 4.2 | Objetivos de gasto, notificaciones, pulido | Pendiente |

**Lo que falta para usarla a diario:** hoy la app solo anda mientras la maquina
de desarrollo tiene corriendo el backend y Metro, y el telefono esta en la misma
red Wi-Fi. Desplegar el backend y hacer el build es lo que la saca del
escritorio, y es por eso lo mas importante del momento.

El login con email y contraseña funciona. El Login de Google todavia no.

## Requisitos

- Node 22 o superior
- pnpm 12 (`corepack enable` lo activa a partir del campo `packageManager`)
- Una cuenta gratuita de Supabase

## Como correrlo

### 1. Lo que no necesita base de datos

```bash
pnpm install      # instala todo el workspace de una sola vez
pnpm test         # 56 tests en packages/validators
pnpm typecheck    # verifica los tipos de los 5 paquetes
```

Que deberias ver: los 56 tests en verde y los 5 paquetes sin errores de tipos.

### 2. Conectar la base de datos

1. Crear un proyecto gratuito en supabase.com.
2. Ir a Project Settings > Database y copiar la cadena de conexion del
   **Session pooler**, no la conexion directa. La directa resuelve a una IP
   IPv6 que en muchas redes no es alcanzable; el Session pooler es IPv4 y, a
   diferencia del Transaction pooler, soporta sentencias preparadas, que es lo
   que necesitan las migraciones de Drizzle.
3. Crear un archivo `.env` en la raiz del repositorio con las variables de la
   seccion siguiente.

```bash
pnpm --filter @wallai/db db:migrar     # crea las tablas
pnpm --filter @wallai/db db:seed       # carga las 11 categorias globales
pnpm --filter @wallai/db db:verificar  # prueba de humo del modelo de datos
```

`db:verificar` arma un hogar de mentira con dos miembros y unos gastos, corre
las consultas del dashboard, comprueba que la base rechace los datos invalidos,
y al final **revierte todo**: no deja nada cargado, asi que es seguro correrlo
contra la base real. Termina en "Todo bien".

### 3. Levantar la app

Son dos terminales, porque la app mobile necesita el backend corriendo:

```bash
pnpm --filter @wallai/web dev      # 1) backend tRPC en localhost:3000
pnpm --filter @wallai/mobile dev   # 2) Metro, y el QR para Expo Go
```

El telefono tiene que estar en la misma red Wi-Fi que la maquina. La URL del
backend se deduce sola de la direccion por la que Expo sirve el bundle, asi que
no hay que escribir ninguna IP a mano.

## Variables de entorno

Van en un `.env` en la raiz del monorepo, no dentro de cada app. El archivo esta
ignorado por git: las claves nunca se commitean.

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
- `objetivos` — limites de gasto por persona o por grupo.

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

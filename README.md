# Wallai

App de control de gastos personales y del hogar con tageo automatico.

El alcance, el modelo de datos y el stack estan definidos en el documento de
producto del proyecto. Las ambiguedades que ese documento dejo abiertas se
resuelven en `claude/decisiones-mvp.md` dentro del proyecto de Claude.

## Estado actual

**Semana 1, paso 1.2: modelo de datos.** Estan el esqueleto del monorepo, el
paquete de validaciones compartidas y el schema completo de la base con sus
migraciones. Todavia no hay autenticacion (paso 1.3) ni API (paso 1.4).

## Requisitos

- Node 22 o superior
- pnpm 12 (`corepack enable` lo activa a partir del campo `packageManager`)

## Como correrlo

### 1. Instalar y probar lo que no necesita base de datos

```bash
pnpm install      # instala todo el workspace de una sola vez
pnpm test         # corre los tests de packages/validators
pnpm typecheck    # verifica los tipos de todos los paquetes
pnpm dev          # levanta la web en http://localhost:3000
```

Que deberias ver: `pnpm test` en verde con 21 tests, `pnpm typecheck` con los
tres paquetes en verde, y en el navegador una tabla con tres gastos formateados
en pesos y su total.

### 2. Conectar la base de datos

1. Crear un proyecto gratuito en supabase.com.
2. Ir a Project Settings > Database y copiar la cadena de conexion.
   Usar la **conexion directa** (puerto 5432), no la del pooler: el pooler no
   soporta las sentencias que necesitan las migraciones.
3. Copiar `.env.example` a `.env` y pegar la cadena en `DATABASE_URL`.

```bash
pnpm --filter @wallai/db db:migrar     # crea las tablas
pnpm --filter @wallai/db db:seed       # carga las 11 categorias globales
pnpm --filter @wallai/db db:verificar  # prueba de humo del modelo de datos
```

Que deberias ver en `db:verificar`: diez bloques numerados, todos con "ok",
terminando en "Todo bien". Ese comando arma un hogar de mentira con dos
miembros y unos gastos, corre las consultas del dashboard, comprueba que la
base rechace los datos invalidos, y al final **revierte todo**: no deja nada
cargado, asi que es seguro correrlo contra la base real.

Otros comandos utiles:

```bash
pnpm --filter @wallai/db db:generar    # regenera migraciones al cambiar el schema
pnpm --filter @wallai/db db:studio     # navegador visual de la base
```

## Estructura

```
apps/
  web/          Next.js (App Router). Dashboard web y, desde el paso 1.4,
                host del backend tRPC.
  mobile/       Expo. Se crea en la Semana 3.
packages/
  validators/   Esquemas Zod y utilidades de dominio compartidos entre
                backend, web y mobile. Un solo lugar donde viven las reglas.
  db/           Schema de Drizzle, migraciones y cliente de PostgreSQL.
    src/schema/ Una tabla por archivo, con el porque de cada decision.
    migraciones/ SQL generado. Se commitea: es el historial de la base.
  api/          Routers de tRPC. Paso 1.4.
```

## El modelo de datos en una linea cada tabla

- `usuarios` — perfil publico. **No guarda contrasenas**: de eso se encarga
  Supabase Auth en su propio esquema.
- `hogares` — la unidad de agregacion, con su codigo de invitacion.
- `usuario_hogar` — quien pertenece a que hogar (muchos a muchos).
- `categorias` — globales del sistema (`hogar_id` nulo) o propias de un hogar.
- `gastos` — la tabla central. Montos en centavos enteros, fecha sin hora.
- `reglas_tageo` — la memoria del motor: cada correccion del usuario queda aca.
- `objetivos` — limites de gasto por persona o por hogar.

Cada archivo en `packages/db/src/schema/` explica en comentarios por que la
tabla es como es. Vale la pena leerlos antes de tocar nada.

## Por que el monorepo

Los tipos y las validaciones se escriben una vez y se usan en los tres lados. Si
manana se agrega un campo al gasto, el error aparece al instante en la app mobile
y en la web, sin documentacion de API que se desactualice. Esa es la razon por la
que el documento eligio tRPC y TypeScript de punta a punta.

## Variables de entorno

Copiar `.env.example` a `.env` y completar. El archivo `.env` esta ignorado por
git: las claves nunca se commitean.

## Notas

- El dinero se guarda siempre como **centavos enteros**, nunca como decimales.
  El porque esta explicado en `packages/validators/src/dinero.ts`.
- `.npmrc` fija `node-linker=hoisted` porque Metro, el bundler de Expo, no
  resuelve bien los symlinks que pnpm usa por defecto.
- Las migraciones se commitean siempre. Son el historial de como llego la base a
  su forma actual, y es lo que permite recrearla desde cero en otra maquina.
  Nunca se edita una migracion ya aplicada: se genera una nueva.

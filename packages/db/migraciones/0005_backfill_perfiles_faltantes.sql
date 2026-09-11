-- Crea la fila de perfil en public.usuarios para las cuentas de auth.users que
-- se registraron ANTES de que existiera el trigger de 0003.
--
-- Por que hace falta: el trigger `al_registrarse_crear_perfil` solo se dispara
-- en cada INSERT nuevo, asi que las cuentas creadas antes de aplicarlo quedaron
-- autenticables pero sin perfil. El sintoma es confuso y aparece tarde: el
-- login funciona perfecto, la sesion se guarda bien, y recien al querer sumarse
-- a un grupo falla con un error de clave foranea
-- (`usuario_hogar.usuario_id -> usuarios.id`), porque el usuario "no existe"
-- para el modelo de datos aunque si exista para Supabase Auth. Lo mismo le
-- pasaria a cualquier consulta que haga join con `usuarios`.
--
-- Es exactamente lo que habria hecho el trigger, aplicado hacia atras: misma
-- regla para el nombre (lo que haya mandado el proveedor, o la parte del email
-- antes de la arroba).
--
-- Idempotente por dos motivos, para que correrla de nuevo no rompa nada: el
-- SELECT ya filtra los que tienen perfil, y el ON CONFLICT cubre la carrera
-- improbable de que el trigger inserte la fila entre el SELECT y el INSERT.
--
-- Mismo condicional que 0001, 0002 y 0003: si no hay esquema `auth` (Postgres
-- local sin Supabase, que es como corren los tests), no hay nada que arreglar.

DO $$
DECLARE
  creados integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    INSERT INTO public.usuarios (id, nombre, email)
    SELECT
      u.id,
      COALESCE(
        u.raw_user_meta_data ->> 'full_name',
        u.raw_user_meta_data ->> 'name',
        split_part(u.email, '@', 1)
      ),
      u.email
    FROM auth.users u
    LEFT JOIN public.usuarios p ON p.id = u.id
    WHERE p.id IS NULL
      -- Sin email no se puede armar un perfil valido (la columna es NOT NULL).
      -- No deberia pasar con los metodos de login que usa la app, pero un
      -- registro por telefono dejaria el email vacio.
      AND u.email IS NOT NULL
    ON CONFLICT (id) DO NOTHING;

    GET DIAGNOSTICS creados = ROW_COUNT;
    RAISE NOTICE 'Perfiles creados para cuentas previas al trigger: %', creados;
  ELSE
    RAISE NOTICE 'Esquema auth ausente (PostgreSQL local): no hay nada que rellenar.';
  END IF;
END
$$;

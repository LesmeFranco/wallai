-- Crea automaticamente la fila de perfil en public.usuarios cuando alguien
-- se registra en Supabase Auth (auth.users), sin importar el metodo de login
-- (email y contrasena, Google, etc.).
--
-- Por que un trigger y no codigo en el backend: el alta en auth.users la hace
-- Supabase internamente (incluso en el flujo de OAuth, donde nuestro backend
-- ni se entera hasta que el usuario ya vuelve con sesion iniciada). Si
-- esperaramos a crear el perfil desde nuestro codigo, habria una ventana en la
-- que el usuario esta autenticado pero no tiene fila en `usuarios`, y
-- cualquier consulta que haga join con esa tabla fallaria.
--
-- Union de la funcion y el trigger en un mismo condicional que en 0001 y 0002:
-- si no hay esquema `auth` (Postgres local sin Supabase), no se crea nada.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER SET search_path = public
      AS $body$
      BEGIN
        -- Nombre a mostrar: el que haya mandado el proveedor de login (Google
        -- lo manda como full_name o name segun la version de la libreria del
        -- cliente), y si no vino ninguno (caso email y contrasena sin datos
        -- extra), la parte del email antes de la arroba. Nunca queda en NULL:
        -- la columna nombre es NOT NULL.
        INSERT INTO public.usuarios (id, nombre, email)
        VALUES (
          NEW.id,
          COALESCE(
            NEW.raw_user_meta_data ->> 'full_name',
            NEW.raw_user_meta_data ->> 'name',
            split_part(NEW.email, '@', 1)
          ),
          NEW.email
        );
        RETURN NEW;
      END;
      $body$;
    $fn$;

    EXECUTE 'DROP TRIGGER IF EXISTS al_registrarse_crear_perfil ON auth.users';

    EXECUTE $trg$
      CREATE TRIGGER al_registrarse_crear_perfil
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.crear_perfil_usuario();
    $trg$;

    RAISE NOTICE 'Trigger de alta de usuario creado sobre auth.users.';
  ELSE
    RAISE NOTICE 'Esquema auth ausente (PostgreSQL local): se omite el trigger.';
  END IF;
END
$$;

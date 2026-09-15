-- Le saca a los roles publicos el permiso de ejecutar `crear_perfil_usuario()`
-- y le fija un search_path vacio.
--
-- QUE AVISO CIERRA:
--
-- El panel de Supabase (Advisors > Security) marca dos avisos sobre esta misma
-- funcion: "Public Can Execute SECURITY DEFINER Function" y "Signed-In Users
-- Can Execute SECURITY DEFINER Function".
--
-- POR QUE PASA, desde la raiz:
--
-- En PostgreSQL, toda funcion nueva queda con permiso de ejecucion para PUBLIC:
-- es el default del motor, no algo que haya hecho la migracion 0003. Supabase
-- ademas tiene definido `ALTER DEFAULT PRIVILEGES ... GRANT EXECUTE ON
-- FUNCTIONS TO anon, authenticated, service_role`, asi que cada funcion que se
-- crea en el esquema `public` nace con permiso explicito para esos tres roles.
-- Se comprobo contra la base antes de escribir esto: el ACL de la funcion era
-- `=X/postgres | postgres=X/postgres | anon=X/postgres | authenticated=X/postgres
-- | service_role=X/postgres`.
--
-- Que la funcion sea SECURITY DEFINER es lo que hace que ese permiso importe:
-- corre con los privilegios de `postgres`, su duenio, y no con los de quien la
-- llama. Una funcion asi al alcance del rol anonimo es, en el caso general, una
-- forma de escribir en la base salteando todas las reglas de autorizacion.
--
-- CUAL ES EL RIESGO REAL HOY, sin exagerarlo:
--
-- Ninguno explotable, y se verifico en vez de suponerlo. Esta funcion devuelve
-- `trigger`, y PostgREST no publica funciones de ese tipo: llamarla con la
-- clave anonima en /rest/v1/rpc/crear_perfil_usuario devuelve 404 (PGRST202,
-- "no matches were found in the schema cache"). Y aunque se pudiera llegar a
-- ella por otro camino, PostgreSQL rechaza ejecutar una funcion de trigger
-- fuera de un trigger. O sea que el aviso es preventivo y no la descripcion de
-- un agujero abierto.
--
-- Se arregla igual por dos razones concretas: el permiso no le sirve a nadie
-- (la funcion la dispara el trigger, no una llamada), y el dia que alguien
-- cambie el tipo de retorno o agregue otra funcion SECURITY DEFINER al lado, el
-- default de PostgreSQL vuelve a jugar en contra. Un permiso que no se usa es
-- lo mas barato que hay para sacar.
--
-- POR QUE REVOCAR NO ROMPE EL TRIGGER:
--
-- PostgreSQL verifica el permiso EXECUTE sobre la funcion en el momento de
-- CREATE TRIGGER, no cada vez que el trigger se dispara. El trigger ya existe
-- (`al_registrarse_crear_perfil` sobre auth.users), asi que el alta de usuarios
-- sigue funcionando igual. Se verifico creando un usuario de prueba despues de
-- aplicar esta migracion y confirmando que la fila de perfil se creo sola.
--
-- EL search_path VACIO:
--
-- La 0003 la habia dejado en `search_path = public`. Vacio es la forma
-- endurecida que recomienda PostgreSQL para SECURITY DEFINER: obliga a que todo
-- nombre este calificado con su esquema, de modo que nadie pueda anteponer un
-- esquema propio con una tabla o funcion del mismo nombre y hacer que la
-- funcion privilegiada opere sobre la suya. El cuerpo ya nombraba
-- `public.usuarios` completo, y `coalesce` y `split_part` viven en `pg_catalog`,
-- que PostgreSQL busca siempre primero sin importar el search_path.
--
-- Todo va dentro del mismo condicional que 0001, 0002 y 0003: si no existe el
-- esquema `auth` (un PostgreSQL local sin Supabase, que es como corren los
-- tests), esta funcion no existe y no hay nada que endurecer.
--
-- NOTA PARA EL FUTURO: cada funcion nueva en `public` nace otra vez con estos
-- permisos. Si se agrega otra SECURITY DEFINER, le va su propio REVOKE en la
-- misma migracion, igual que con ENABLE ROW LEVEL SECURITY para las tablas.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    -- CREATE OR REPLACE conserva los permisos existentes, asi que primero se
    -- redefine la funcion y despues se revoca. Al reves, el REPLACE no los
    -- devolveria pero tampoco tendria sentido el orden.
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER SET search_path = ''
      AS $body$
      BEGIN
        -- Mismo cuerpo que en 0003. Nombre a mostrar: el que haya mandado el
        -- proveedor de login (Google lo manda como full_name o name segun la
        -- version de la libreria del cliente), y si no vino ninguno (caso email
        -- y contrasena sin datos extra), la parte del email antes de la arroba.
        -- Nunca queda en NULL: la columna nombre es NOT NULL.
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

    -- PUBLIC cubre "cualquier rol", pero los tres roles de Supabase tienen
    -- ademas un permiso explicito propio que hay que revocar aparte: revocar de
    -- PUBLIC no borra una concesion nominal. Se revocan uno por uno y solo si
    -- el rol existe, para que la migracion tambien corra contra un PostgreSQL
    -- que no sea de Supabase.
    EXECUTE 'REVOKE ALL ON FUNCTION public.crear_perfil_usuario() FROM PUBLIC';

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE 'REVOKE ALL ON FUNCTION public.crear_perfil_usuario() FROM anon';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE 'REVOKE ALL ON FUNCTION public.crear_perfil_usuario() FROM authenticated';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE 'REVOKE ALL ON FUNCTION public.crear_perfil_usuario() FROM service_role';
    END IF;

    RAISE NOTICE 'Funcion crear_perfil_usuario endurecida: sin permisos publicos y con search_path vacio.';
  ELSE
    RAISE NOTICE 'Esquema auth ausente (PostgreSQL local): no hay funcion que endurecer.';
  END IF;
END
$$;

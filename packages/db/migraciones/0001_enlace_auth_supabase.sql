-- Enlace entre nuestra tabla `usuarios` y `auth.users`, la tabla de Supabase.
--
-- Por que va en una migracion escrita a mano y no en el schema de Drizzle:
-- `auth.users` pertenece a Supabase, no a nosotros. Si la declararamos en el
-- schema, Drizzle intentaria administrarla (crearla, alterarla, borrarla) y
-- podria romper el sistema de autenticacion. Aca solo declaramos la relacion.
--
-- El bloque condicional permite que la migracion corra tambien contra un
-- PostgreSQL local sin Supabase (para tests o desarrollo sin conexion):
-- si el esquema `auth` no existe, simplemente no se agrega la clave foranea.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    -- ON DELETE CASCADE: si se borra la cuenta en Supabase, se borra el perfil,
    -- y con el (por las claves foraneas ya definidas) sus gastos y reglas.
    ALTER TABLE public.usuarios
      ADD CONSTRAINT usuarios_id_auth_users_fk
      FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
    RAISE NOTICE 'Clave foranea a auth.users agregada.';
  ELSE
    RAISE NOTICE 'Esquema auth ausente (PostgreSQL local): se omite la clave foranea.';
  END IF;
END
$$;

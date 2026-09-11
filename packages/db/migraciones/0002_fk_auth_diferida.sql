-- Hace diferible la clave foranea entre `usuarios` y `auth.users`.
--
-- Por que: `db:verificar` arma un hogar de prueba dentro de una transaccion
-- que siempre termina en rollback, para poder correr el script sin ensuciar
-- la base real. Antes de esta migracion, la clave foranea se revisaba en el
-- momento del INSERT, y como los usuarios de prueba usan UUIDs inventados que
-- no existen en `auth.users`, Postgres rechazaba el insert inmediatamente.
--
-- Al marcarla DEFERRABLE INITIALLY DEFERRED, Postgres recien la revisa al
-- hacer COMMIT. Como la transaccion de prueba nunca llega a esa instancia
-- (siempre revierte), el chequeo no se ejecuta nunca para datos de prueba.
-- En el uso real no cambia nada: el trigger que crea la fila en `usuarios`
-- corre dentro de la misma transaccion del alta en `auth.users`, asi que para
-- cuando Postgres hace el commit la fila referenciada ya existe.
--
-- Mismo condicional que en 0001: si no hay esquema `auth` (Postgres local sin
-- Supabase), la clave foranea no existe y no hay nada que alterar.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'usuarios'
      AND constraint_name = 'usuarios_id_auth_users_fk'
  ) THEN
    ALTER TABLE public.usuarios
      ALTER CONSTRAINT usuarios_id_auth_users_fk
      DEFERRABLE INITIALLY DEFERRED;
    RAISE NOTICE 'Clave foranea a auth.users ahora es diferible.';
  ELSE
    RAISE NOTICE 'Esquema auth ausente (PostgreSQL local): no hay clave foranea que alterar.';
  END IF;
END
$$;

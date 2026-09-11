import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Perfil publico de un usuario dentro de la app.
 *
 * IMPORTANTE - desviacion respecto del documento de producto:
 * el punto 7 del documento incluye "hash de contrasena" en esta tabla.
 * Aca NO existe esa columna, y es a proposito.
 *
 * Al usar Supabase Auth (decision D3), las credenciales viven en el esquema
 * `auth` que administra Supabase: ahi se guarda el hash de la contrasena, los
 * tokens de sesion y la recuperacion de clave. Duplicar el hash en nuestra
 * tabla seria un riesgo de seguridad puro, sin ningun beneficio: dos copias de
 * un secreto son dos lugares desde los que se puede filtrar.
 *
 * Entonces esta tabla guarda solo lo que la app necesita mostrar: como se llama
 * la persona y como identificarla dentro del hogar.
 *
 * El `id` es el mismo UUID que Supabase le asigna al usuario en `auth.users`.
 * La clave foranea que los une se agrega en una migracion aparte, porque
 * `auth.users` es una tabla de Supabase y no la administra Drizzle.
 */
export const usuarios = pgTable('usuarios', {
  /**
   * Igual al id de auth.users. No lleva valor por defecto: siempre viene
   * del sistema de autenticacion, nunca lo inventa la app.
   */
  id: uuid('id').primaryKey(),

  nombre: text('nombre').notNull(),

  /**
   * Copia del email para poder mostrar e identificar miembros sin tener que
   * consultar el esquema `auth` en cada pantalla. La fuente de verdad sigue
   * siendo auth.users: si el usuario cambia su email ahi, hay que
   * actualizar esta copia.
   */
  email: text('email').notNull().unique(),

  fechaAlta: timestamp('fecha_alta', { withTimezone: true }).notNull().defaultNow(),
});

export type Usuario = typeof usuarios.$inferSelect;
export type UsuarioNuevo = typeof usuarios.$inferInsert;

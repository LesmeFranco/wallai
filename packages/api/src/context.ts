import { crearClienteDb, type ClienteDb } from '@wallai/db';
import { supabaseAdmin } from './supabase';

const urlBaseDeDatos = process.env.DATABASE_URL;
if (!urlBaseDeDatos) {
  throw new Error('Falta DATABASE_URL en las variables de entorno.');
}

/**
 * Un solo cliente de base de datos para todo el proceso, no uno por request.
 * `postgres` ya administra su propio pool de conexiones (ver `cliente.ts` en
 * @wallai/db); crear un cliente nuevo en cada llamada abriria conexiones sin
 * necesidad.
 */
const db: ClienteDb = crearClienteDb(urlBaseDeDatos);

/**
 * Usuario autenticado segun Supabase Auth, ya verificado.
 *
 * A proposito solo trae `id` y `email`, que es lo unico que sale del token.
 * El resto del perfil (nombre, etc.) vive en `usuarios` y cada router lo
 * consulta si lo necesita: duplicarlo aca invitaria a que quedara
 * desactualizado.
 */
export type UsuarioAutenticado = {
  id: string;
  email: string;
};

export type Contexto = {
  db: ClienteDb;
  usuario: UsuarioAutenticado | null;
};

/**
 * Verifica el token del header Authorization contra Supabase Auth y arma el
 * contexto de tRPC.
 *
 * El id del usuario sale siempre de ese token ya verificado, nunca de un
 * campo que mande el cliente en el body de la request: si el cliente pudiera
 * decir "soy el usuario X", cualquiera podria leer o cargar gastos a nombre de
 * otra persona.
 */
export async function crearContexto(request: Request): Promise<Contexto> {
  const encabezadoAuth = request.headers.get('authorization');
  const token = encabezadoAuth?.startsWith('Bearer ') ? encabezadoAuth.slice('Bearer '.length) : null;

  if (!token) {
    return { db, usuario: null };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.email) {
    return { db, usuario: null };
  }

  return { db, usuario: { id: data.user.id, email: data.user.email } };
}

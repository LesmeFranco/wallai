import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase del lado del servidor, con la clave de servicio.
 *
 * Se usa exclusivamente para verificar el token (JWT) que manda el cliente en
 * cada request, llamando a `auth.getUser(token)`. Esa llamada le pregunta al
 * propio servidor de Supabase Auth si el token es valido, no vencio y no fue
 * revocado (por ejemplo, por un cierre de sesion). La alternativa seria
 * verificar la firma del JWT nosotros mismos con el secreto del proyecto, pero
 * eso nos obligaria a manejar ese secreto y a mantenernos al tanto de que
 * algoritmo de firma usa el proyecto (Supabase esta migrando de HS256 a claves
 * asimetricas). Delegarlo a Supabase es mas simple y no puede quedar
 * desactualizado.
 *
 * Nunca se expone al cliente: esta clave ignora las politicas de acceso de la
 * base.
 */
const url = process.env.SUPABASE_URL;
const claveDeServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !claveDeServicio) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.');
}

export const supabaseAdmin = createClient(url, claveDeServicio, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

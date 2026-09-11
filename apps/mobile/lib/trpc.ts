import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@wallai/api';
import { urlApi } from './entorno';
import { supabase } from './supabase';

export const trpc = createTRPCReact<AppRouter>();

/**
 * Lo que devuelve cada endpoint, derivado del router del backend.
 *
 * Sirve para tipar un componente que recibe por props algo que vino de la API
 * (por ejemplo una tarjeta que recibe un grupo) sin volver a escribir su forma
 * a mano. Escribirla a mano es lo que hace que un campo agregado en el backend
 * no llegue nunca al cliente sin que nadie se entere: asi, el compilador avisa.
 */
export type SalidasApi = inferRouterOutputs<AppRouter>;

export function crearClienteTrpc() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${urlApi}/api/trpc`,

        /**
         * El token se lee en cada request, no una sola vez al crear el cliente.
         *
         * Es a proposito: los tokens de Supabase duran una hora y se renuevan
         * solos en segundo plano. Si lo capturaramos al arrancar la app,
         * seguiriamos mandando el viejo y el backend empezaria a responder 401
         * despues de una hora de uso, que es un error especialmente molesto de
         * diagnosticar porque al principio todo funciona.
         */
        async headers() {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

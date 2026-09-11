import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, crearContexto } from '@wallai/api';

function manejador(request: Request): Promise<Response> {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: () => crearContexto(request),
  });
}

export { manejador as GET, manejador as POST };

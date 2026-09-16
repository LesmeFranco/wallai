import { initTRPC, TRPCError } from '@trpc/server';
import type { Contexto } from './context';

const t = initTRPC.context<Contexto>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Procedimiento que exige un usuario autenticado.
 *
 * El middleware corta la ejecucion antes de llegar al resolver del router si
 * `ctx.usuario` es null, y le avisa al que llamo con UNAUTHORIZED en vez de
 * dejar que el router explote mas adelante con un error menos claro (por
 * ejemplo, al intentar usar un id de usuario que no existe).
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.usuario) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Iniciá sesión para continuar.' });
  }
  return next({ ctx: { ...ctx, usuario: ctx.usuario } });
});

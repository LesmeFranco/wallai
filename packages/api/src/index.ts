import { categoriasRouter } from './router/categorias';
import { gastosRouter } from './router/gastos';
import { hogaresRouter } from './router/hogares';
import { publicProcedure, protectedProcedure, router } from './trpc';

/**
 * Router de salud, solo para probar de punta a punta que el puente JWT
 * funciona: `salud.ping` no pide autenticacion, y `salud.quienSoy` devuelve el
 * id y el email del usuario si el token de Supabase es valido, o un error
 * UNAUTHORIZED si no vino token o no es valido.
 */
export const appRouter = router({
  salud: router({
    ping: publicProcedure.query(() => ({ ok: true })),
    quienSoy: protectedProcedure.query(({ ctx }) => ({
      autenticado: true as const,
      usuario: ctx.usuario,
    })),
  }),
  gastos: gastosRouter,
  hogares: hogaresRouter,
  categorias: categoriasRouter,
});

export type AppRouter = typeof appRouter;

export { crearContexto, type Contexto, type UsuarioAutenticado } from './context';

import { categoriasRouter } from './router/categorias';
import { gastosRouter } from './router/gastos';
import { hogaresRouter } from './router/hogares';
import { publicProcedure, router } from './trpc';

export const appRouter = router({
  /**
   * Chequeo de vida del backend desplegado: responde sin pedir autenticacion,
   * asi que sirve para saber si el servidor esta arriba sin tener que armar un
   * token primero.
   *
   * Antes este router tenia tambien un `quienSoy` que devolvia el usuario del
   * token. Era una prueba del paso 1.3, cuando se construyo el puente del JWT
   * y no habia todavia ningun endpoint real contra el cual comprobarlo. Hoy
   * cualquier procedimiento protegido cumple esa funcion, asi que se saco.
   */
  salud: router({
    ping: publicProcedure.query(() => ({ ok: true })),
  }),
  gastos: gastosRouter,
  hogares: hogaresRouter,
  categorias: categoriasRouter,
});

export type AppRouter = typeof appRouter;

export { crearContexto, type Contexto, type UsuarioAutenticado } from './context';

/**
 * La unica pagina de apps/web.
 *
 * Este proyecto de Next.js existe para hostear el backend de tRPC, que vive en
 * app/api/trpc/[trpc]/route.ts. No hay dashboard web: el producto es la app
 * mobile, y toda la interfaz esta en apps/mobile.
 *
 * Antes aca habia una pagina de humo del paso 1.2, con tres gastos escritos a
 * mano, que servia para comprobar que el enlace del monorepo funcionaba. Se
 * saco cuando el backend se desplego: era la cara publica del proyecto,
 * mostraba datos inventados como si fueran reales y decia "Semana 1" mucho
 * despues de que eso dejara de ser cierto.
 *
 * Se deja una pagina minima en vez de borrarla porque la raiz de un dominio
 * desplegado deberia decir que es, aunque sea en una linea.
 */
export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Wallai</h1>
      <p className="mt-3 text-atenuado">
        Backend de la aplicacion. La interfaz es la app mobile.
      </p>
      <p className="mt-6 text-xs leading-relaxed text-atenuado">
        La API responde en <code>/api/trpc</code> y requiere autenticacion.
      </p>
    </main>
  );
}

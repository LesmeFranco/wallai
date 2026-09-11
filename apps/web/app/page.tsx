import { formatearPesos, pesosACentavos, sumarCentavos } from '@wallai/validators';

/**
 * Pagina de humo de la Semana 1.
 *
 * No es una pantalla del producto. Su unico proposito es probar que el enlace
 * del monorepo funciona: esta pagina importa codigo de packages/validators,
 * que es un paquete distinto del workspace. Si esto renderiza los montos bien
 * formateados, quiere decir que pnpm enlazo los paquetes y que Next los
 * transpila correctamente.
 *
 * El dashboard real llega en la Semana 3.
 */

const gastosDeEjemplo = [
  { descripcion: 'hamburguesa en Guido', pesos: 30000 },
  { descripcion: 'subte', pesos: 1250.5 },
  { descripcion: 'supermercado', pesos: 84300.75 },
];

export default function Home() {
  const enCentavos = gastosDeEjemplo.map((gasto) => pesosACentavos(gasto.pesos));
  const total = sumarCentavos(enCentavos);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Wallai</h1>
      <p className="mt-2 text-atenuado">
        Semana 1 &middot; esqueleto del monorepo funcionando
      </p>

      <div className="mt-10 overflow-hidden rounded-xl border border-borde bg-superficie">
        <table className="w-full text-sm">
          <tbody>
            {gastosDeEjemplo.map((gasto, indice) => (
              <tr key={gasto.descripcion} className="border-b border-borde last:border-0">
                <td className="px-5 py-3">{gasto.descripcion}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {formatearPesos(enCentavos[indice]!)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-borde bg-fondo/50">
              <td className="px-5 py-3 font-medium">Total</td>
              <td className="px-5 py-3 text-right font-medium tabular-nums text-acento">
                {formatearPesos(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-atenuado">
        Estos montos vienen de <code>@wallai/validators</code>, un paquete separado del
        workspace. Se guardan como centavos enteros y se formatean recien al mostrarlos.
      </p>
    </main>
  );
}

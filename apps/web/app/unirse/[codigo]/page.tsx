import type { Metadata } from 'next';
import { appRouter, crearContexto } from '@wallai/api';
import {
  CODIGO_INVITACION_REGEX,
  normalizarCodigoInvitacion,
  type TipoHogar,
} from '@wallai/validators';

/**
 * La pagina que abre un link de invitacion.
 *
 * POR QUE EXISTE. Antes, invitar a alguien era mandarle el codigo de seis
 * caracteres por WhatsApp y esperar que lo tipeara bien en la pantalla
 * correcta. Eso supone que la otra persona ya tiene la app, ya sabe que hay que
 * ir a Grupos y despues a "Sumarme con un codigo", y que no se equivoca al
 * copiar. Demasiado para el primer contacto de alguien con Wallai.
 *
 * Ahora se comparte un link a esta pagina. El codigo sigue existiendo y se
 * puede copiar (sirve para dictarlo por telefono), pero lo que se comparte es
 * el link.
 *
 * POR QUE UNA PAGINA WEB Y NO DIRECTAMENTE UN LINK `wallai://`. Un esquema
 * propio solo funciona si la app ya esta instalada; si no, el link no hace nada
 * y quien lo recibio no entiende por que. Un link https siempre abre en algun
 * lado, y desde aca se puede mandar a la app a quien la tenga y al APK a quien
 * no. Es tambien la unica forma de que el link se vea confiable al pegarlo en
 * un chat.
 *
 * `force-dynamic` porque el nombre del grupo se lee de la base en cada visita:
 * sin esto Next podria servir una version guardada y mostrar un nombre viejo, o
 * peor, decir que una invitacion no existe porque no existia cuando se
 * compilo.
 */
export const dynamic = 'force-dynamic';

/**
 * El emoji de cada tipo de grupo. Es la unica cosa que esta duplicada de
 * `apps/mobile/lib/grupos.ts`, y a proposito: ese archivo explica que el icono
 * es presentacion del cliente y no un dato de la base. El resto de los textos
 * de esta pagina estan escritos para servir igual a una casa y a un grupo de
 * amigos, asi que no hace falta traer nada mas.
 */
const ICONO_POR_TIPO: Record<TipoHogar, string> = { casa: '🏠', grupo: '👥' };

const URL_DESCARGA = 'https://github.com/LesmeFranco/wallai/releases/latest';

export const metadata: Metadata = {
  title: 'Te invitaron a un grupo en Wallai',
  description: 'Sumate para llevar los gastos compartidos.',
};

async function buscarGrupo(codigo: string) {
  if (!CODIGO_INVITACION_REGEX.test(codigo)) return null;
  try {
    /**
     * Se llama al mismo procedimiento de tRPC que usa la app, en vez de
     * consultar la base desde aca. Es una llamada en proceso, sin red: lo que
     * se gana es que la regla de que se devuelve (solo el nombre y el tipo, ver
     * `hogares.porCodigo`) este escrita en un solo lugar. Si esta pagina
     * hiciera su propio SELECT, el dia que ese procedimiento deje de exponer
     * algo, la pagina lo seguiria exponiendo.
     *
     * El Request es de mentira y no lleva cabecera de autorizacion, asi que el
     * contexto queda sin usuario. Alcanza porque `porCodigo` es publico.
     */
    const contexto = await crearContexto(new Request('http://interno/invitacion'));
    return await appRouter.createCaller(contexto).hogares.porCodigo({ codigo });
  } catch {
    // Un codigo que no existe llega como NOT_FOUND. Cualquier otra falla
    // (la base caida, por ejemplo) termina igual: no se puede confirmar la
    // invitacion, y decir "no existe" es mas honesto que mostrar un error
    // tecnico a alguien que solo toco un link.
    return null;
  }
}

export default async function PaginaDeInvitacion({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo: recibido } = await params;
  const codigo = normalizarCodigoInvitacion(decodeURIComponent(recibido));
  const grupo = await buscarGrupo(codigo);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      {grupo ? (
        <>
          <div className="rounded-3xl border border-borde bg-superficie p-7 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-lima/25 bg-lima/10 text-3xl">
              {ICONO_POR_TIPO[grupo.tipo] ?? ICONO_POR_TIPO.casa}
            </div>

            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-tenue">
              Te invitaron a
            </p>
            <h1
              className="mt-1.5 text-3xl font-extrabold tracking-tight text-primario"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {grupo.nombre}
            </h1>
            <p className="mt-3 text-sm leading-6 text-secundario">
              En Wallai anotan lo que gastan escribiendo una frase, y la app suma cuanto gastaron
              entre todos este mes.
            </p>

            {/*
              El link `wallai://` es el que abre la app. Va como boton y no como
              redireccion automatica a proposito: si la app no esta instalada, el
              navegador no sabe que hacer con ese esquema y muestra un error que
              no le dice nada a la persona. Que lo toque a mano hace que ese
              error, si pasa, ocurra despues de haber leido de que se trata, con
              la descarga a la vista justo abajo.
            */}
            <a
              href={`wallai://unirse/${codigo}`}
              className="mt-7 block rounded-2xl bg-lima py-4 text-base font-bold text-fondo transition active:scale-[0.98]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Abrir en Wallai
            </a>

            <p className="mt-5 text-sm text-secundario">
              Todavia no la tenes?{' '}
              <a href={URL_DESCARGA} className="font-semibold text-lima underline">
                Descargala aca
              </a>
            </p>
          </div>

          {/*
            El codigo a la vista, como salida de emergencia. Si el boton no
            abre la app -un navegador que bloquea los esquemas propios, un
            telefono raro-, con esto igual se puede entrar a Wallai y tipearlo a
            mano en "Sumarme con un codigo". Es la unica parte de la pagina que
            no se apoya en que nada funcione.
          */}
          <p className="mt-6 text-center text-xs leading-5 text-tenue">
            Si el boton no funciona, entra a Wallai, toca Grupos y despues
            &quot;Sumarme con un codigo&quot;, y escribi{' '}
            <span className="font-semibold tracking-widest text-secundario">{codigo}</span>
          </p>
        </>
      ) : (
        <div className="rounded-3xl border border-borde bg-superficie p-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-coral/25 bg-coral/10 text-3xl">
            🔗
          </div>
          <h1
            className="mt-5 text-2xl font-extrabold tracking-tight text-primario"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Esta invitacion no vale
          </h1>
          <p className="mt-3 text-sm leading-6 text-secundario">
            El link puede estar incompleto, o el grupo pudo haberse borrado. Pedile a quien te
            invito que te comparta uno nuevo.
          </p>
          <a
            href={URL_DESCARGA}
            className="mt-7 block rounded-2xl border border-borde-claro bg-superficie-alta py-4 text-base font-bold text-primario"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Conocer Wallai
          </a>
        </div>
      )}
    </main>
  );
}

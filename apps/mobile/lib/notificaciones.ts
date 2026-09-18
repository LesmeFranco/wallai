import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  armarAvisoDiario,
  fechaDelAviso,
  type AvisoDiario,
  type ProgresoObjetivo,
} from '@wallai/validators';
import { formatearPesosSinCentavos } from './formato';

/**
 * El aviso de la noche, del lado del telefono.
 *
 * POR QUE NOTIFICACION LOCAL Y NO PUSH DESDE EL SERVIDOR. Una push necesitaria
 * una tabla de tokens (con su migracion y su RLS), un cron en Vercel, y en
 * iPhone una clave APNs, que sale de la cuenta paga de Apple Developer. Todo
 * eso para decir algo que el telefono ya sabe. La local no necesita nada de
 * eso, funciona sin conexion, y suena a las nueve de la noche de donde este la
 * persona. La push va a hacer falta el dia que haya que avisar de algo que paso
 * en OTRO telefono; hoy no hay ningun aviso asi.
 *
 * EL TRUCO QUE HACE QUE FUNCIONE. Como el texto se decide en el telefono, se
 * reprograma cada vez que la app se usa. Pero lo que hay que decidir es tambien
 * que pasa los dias en que NADIE abre la app, que son justamente los dias en
 * que hay que recordar cargar. Por eso no se programa una sola noche sino una
 * semana: la de hoy con el texto calculado con datos frescos, y las siguientes
 * con el recordatorio generico. Si la persona abre la app manana, se cancelan
 * todas y se vuelven a calcular; si no la abre, la que queda programada es el
 * recordatorio, que es exactamente lo que corresponde. O sea que cuando el dato
 * se pone viejo, el mensaje se degrada hacia el correcto y no hacia uno falso.
 */

/** Cuantas noches se dejan programadas por adelantado (ver el comentario de arriba). */
const NOCHES_DE_RESERVA = 6;

/**
 * El canal de Android donde caen los avisos.
 *
 * Android exige que toda notificacion pertenezca a un canal, y el canal es lo
 * que la persona puede silenciar por su cuenta desde los ajustes del sistema
 * sin tener que apagar toda la app. La importancia es DEFAULT y no HIGH a
 * proposito: HIGH hace que el aviso se despliegue encima de lo que la persona
 * este haciendo, y este aviso no es urgente.
 */
const CANAL_ANDROID = 'aviso-de-la-noche';

/**
 * Las claves de SecureStore.
 *
 * SecureStore guarda cifrado y esta pensado para secretos; esto no lo es. Se
 * usa igual porque es el almacenamiento que la app ya tiene (la sesion vive
 * ahi, ver `lib/supabase.ts`) y sumar AsyncStorage seria una dependencia mas
 * para guardar dos banderas. Si alguna vez hay mas preferencias, conviene
 * mudarlas juntas.
 */
const CLAVE_PREFERENCIAS = 'wallai.avisos.preferencias';
const CLAVE_AVISOS_DADOS = 'wallai.avisos.dados';

export type PreferenciasDeAviso = {
  /** Si la persona quiere recibir el aviso de la noche. */
  activos: boolean;
};

const PREFERENCIAS_POR_DEFECTO: PreferenciasDeAviso = { activos: true };

/**
 * Que avisos del objetivo ya se dieron, y en que mes.
 *
 * Guardar el mes es lo que hace que el permiso se renueve solo: el 1 de octubre
 * el mes guardado deja de coincidir y los dos avisos vuelven a estar
 * disponibles, sin ningun trabajo de limpieza.
 */
type AvisosDados = { mes: string; cerca: boolean; excedido: boolean };

async function leerJson<T>(clave: string, porDefecto: T): Promise<T> {
  try {
    const guardado = await SecureStore.getItemAsync(clave);
    return guardado ? (JSON.parse(guardado) as T) : porDefecto;
  } catch {
    // Un almacenamiento ilegible no puede romper el dashboard: se sigue con el
    // valor por defecto, que es el comportamiento de una instalacion nueva.
    return porDefecto;
  }
}

async function guardarJson(clave: string, valor: unknown): Promise<void> {
  try {
    await SecureStore.setItemAsync(clave, JSON.stringify(valor));
  } catch {
    // Idem: no poder guardar una preferencia no justifica romper nada.
  }
}

export async function leerPreferenciasDeAviso(): Promise<PreferenciasDeAviso> {
  return leerJson(CLAVE_PREFERENCIAS, PREFERENCIAS_POR_DEFECTO);
}

export async function guardarPreferenciasDeAviso(
  preferencias: PreferenciasDeAviso,
): Promise<void> {
  await guardarJson(CLAVE_PREFERENCIAS, preferencias);
  if (!preferencias.activos) await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Si el sistema operativo ya nos dejo mandar notificaciones. */
export async function hayPermisoDeAvisos(): Promise<boolean> {
  const permiso = await Notifications.getPermissionsAsync();
  return permiso.granted;
}

/**
 * Pide el permiso, y devuelve si quedo concedido.
 *
 * Se llama desde el interruptor de los ajustes, o sea cuando la persona acaba
 * de pedir el aviso explicitamente. Si el sistema ya no deja volver a
 * preguntar (`canAskAgain` en false, porque lo rechazo antes), no se insiste:
 * desde ahi solo se puede cambiar en los ajustes del telefono, y quien llama se
 * encarga de decirlo.
 */
export async function pedirPermisoDeAvisos(): Promise<boolean> {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain) return false;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

/**
 * Pide el permiso una unica vez, despues del primer gasto cargado.
 *
 * El momento no es casual: un permiso que se pide al abrir la app por primera
 * vez, antes de que la persona haya visto para que sirve, se rechaza casi
 * siempre, y en Android e iOS un rechazo es definitivo (no se puede volver a
 * preguntar desde la app). Pedido justo despues de cargar el primer gasto, la
 * pregunta tiene contexto: la persona ya sabe que hace la app.
 *
 * Si ya contesto alguna vez -que si o que no- no vuelve a preguntar nada.
 */
export async function pedirPermisoTrasElPrimerGasto(): Promise<void> {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.status !== 'undetermined') return;
  await Notifications.requestPermissionsAsync();
}

async function asegurarCanalDeAndroid(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
    name: 'Aviso de la noche',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function programar(aviso: AvisoDiario, cuando: Date): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: aviso.titulo, body: aviso.cuerpo },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: cuando,
      channelId: CANAL_ANDROID,
    },
  });
}

/**
 * Recalcula y vuelve a dejar programadas las proximas noches.
 *
 * Se llama desde el dashboard cada vez que hay datos nuevos, que en la practica
 * es cada vez que la persona abre la app o carga un gasto.
 *
 * Todo lo que decide QUE decir vive en `armarAvisoDiario`
 * (packages/validators), que es donde estan los tests. Aca solo esta el cuando
 * y el como.
 */
export async function reprogramarAvisos({
  cargoHoy,
  progreso,
  mes,
}: {
  cargoHoy: boolean;
  progreso: ProgresoObjetivo | null;
  /** El mes que se esta mirando, "AAAA-MM", para no repetir avisos del objetivo. */
  mes: string;
}): Promise<void> {
  const { activos } = await leerPreferenciasDeAviso();

  // Se cancela siempre y antes que nada: si la persona apago los avisos, o si
  // el permiso se revoco desde los ajustes del sistema, lo que quedo programado
  // de antes tiene que dejar de existir igual.
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!activos) return;
  if (!(await hayPermisoDeAvisos())) return;

  await asegurarCanalDeAndroid();

  const ahora = new Date();
  const dados = await leerJson<AvisosDados>(CLAVE_AVISOS_DADOS, {
    mes,
    cerca: false,
    excedido: false,
  });
  // Un mes distinto del guardado quiere decir que ese registro es del mes
  // pasado: los avisos del objetivo arrancan de cero.
  const yaAvisado =
    dados.mes === mes ? { cerca: dados.cerca, excedido: dados.excedido } : { cerca: false, excedido: false };

  const avisoDeHoy = armarAvisoDiario({
    cargoHoy,
    progreso,
    yaAvisado,
    formatearMonto: formatearPesosSinCentavos,
  });

  const estaNoche = fechaDelAviso(ahora);
  if (avisoDeHoy && estaNoche > ahora) {
    await programar(avisoDeHoy, estaNoche);
    /**
     * Los avisos del objetivo se anotan como dados al programarlos y no al
     * dispararse, porque el telefono no nos cuenta cuando sonaron.
     *
     * La consecuencia conocida: si la persona vuelve a abrir la app mas tarde
     * esa misma noche, se reprograma y ese aviso ya figura como dado, asi que
     * no se repite. Se prefiere ese error -callarse de mas- antes que el
     * contrario, que es la insistencia que hace que la gente apague las
     * notificaciones.
     */
    if (avisoDeHoy.motivo !== 'sin-cargar') {
      await guardarJson(CLAVE_AVISOS_DADOS, {
        mes,
        cerca: yaAvisado.cerca || avisoDeHoy.motivo === 'cerca',
        excedido: yaAvisado.excedido || avisoDeHoy.motivo === 'excedido',
      } satisfies AvisosDados);
    }
  }

  /**
   * Las noches siguientes, con el recordatorio generico.
   *
   * Sale del mismo `armarAvisoDiario` en vez de escribirse a mano aca para que
   * el texto tenga un solo lugar de verdad: se le pide el caso "no cargo nada y
   * no hay nada que decir del objetivo", que es lo unico que se puede saber de
   * un dia que todavia no paso.
   */
  const recordatorio = armarAvisoDiario({
    cargoHoy: false,
    progreso: null,
    yaAvisado: { cerca: true, excedido: true },
    formatearMonto: formatearPesosSinCentavos,
  });
  if (!recordatorio) return;

  for (let dia = 1; dia <= NOCHES_DE_RESERVA; dia++) {
    await programar(recordatorio, fechaDelAviso(ahora, dia));
  }
}

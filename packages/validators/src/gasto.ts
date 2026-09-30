import { z } from 'zod';
import { alcanceSchema, destinoGastoSchema } from './alcance';
import { MONTO_MAXIMO_CENTAVOS } from './dinero';
import { MAXIMO_GASTOS_POR_LOTE } from './parser';

/**
 * Esquemas de validacion de gastos, compartidos entre backend y frontend.
 *
 * Viven en un paquete propio y no dentro del backend por una razon concreta:
 * el mismo esquema valida el formulario en la app (feedback inmediato al
 * usuario) y valida de nuevo en el servidor (que es donde la validacion
 * realmente cuenta, porque un cliente se puede modificar). Un solo esquema,
 * dos usos, cero posibilidad de que las reglas se desincronicen.
 */

/**
 * Longitud maxima del texto libre. 280 caracteres alcanza de sobra para
 * "30000 pesos hamburguesa en Guido" y evita que alguien pegue un documento
 * entero en el campo.
 */
export const TEXTO_MAXIMO = 280;

/**
 * Fecha sin hora, formato ISO "AAAA-MM-DD".
 * Exportado porque `hogar.ts` lo reusa para el rango del resumen del dashboard.
 */
export const fechaSchema = z.iso.date();

/**
 * Entrada para crear un gasto.
 *
 * `texto` es la frase completa en lenguaje natural ("30000 pesos hamburguesa
 * en Guido"): el servidor le pasa el parser (P2, en `parser.ts`) para sacar
 * el monto y la fecha si no vienen explícitos, y el resto de la frase va al
 * motor de tageo para sugerir la categoría si tampoco viene explícita.
 *
 * `montoCentavos`, `categoriaId` y `fecha` son overrides opcionales, no
 * requisitos: existen para cuando el cliente ya tiene esos datos por otro
 * lado (un formulario con campo de monto separado, una categoría elegida a
 * mano) y no hace falta que el servidor los adivine. Si `montoCentavos` no
 * viene y el parser tampoco lo encuentra en el texto, el servidor rechaza la
 * carga: no hay forma válida de guardar un gasto sin saber cuánto fue.
 *
 * Sobre `destino` (revision de la decision D1): antes no habia ningun campo
 * de hogar aca, porque una persona pertenecia a lo sumo a uno y el servidor
 * deducia el destino sola. Ahora que puede estar en varios grupos, y que un
 * gasto puede ser privado, el destino lo tiene que poder elegir quien carga.
 *
 * Que el cliente lo mande NO significa que el cliente decida: el servidor
 * verifica que quien carga sea miembro de ese hogar antes de guardar. Esa
 * verificacion es lo que conserva la garantia que motivaba D1 (nadie puede
 * cargar gastos en un hogar ajeno); lo unico que se relajo es quien propone
 * el destino, no quien lo autoriza.
 *
 * Si `destino` no viene, el servidor usa el primer grupo al que la persona se
 * unio, o lo deja privado si no esta en ninguno. Se eligio ese default y no
 * "privado" porque el uso principal de la app es el gasto de la casa: que un
 * gasto no cuente en la casa por un olvido es peor que el caso contrario.
 */
export const crearGastoSchema = z.object({
  texto: z.string().trim().min(1, 'Escribí qué gastaste.').max(TEXTO_MAXIMO),
  montoCentavos: z
    .number()
    .int('El monto se guarda en centavos enteros')
    .positive('El monto tiene que ser mayor a cero')
    .max(MONTO_MAXIMO_CENTAVOS, 'Ese monto es demasiado grande.')
    .optional(),
  categoriaId: z.uuid().optional(),
  /** Si no viene, se intenta sacar del texto; si tampoco, el servidor usa hoy. */
  fecha: fechaSchema.optional(),
  /** A que grupo suma, o `{ tipo: 'personal' }` para que no lo vea nadie. */
  destino: destinoGastoSchema.optional(),
});

export type CrearGastoInput = z.infer<typeof crearGastoSchema>;

/**
 * Entrada para cargar varios gastos de una sola vez, uno por linea.
 *
 * POR QUE VIENE YA PARTIDO EN UN ARRAY y no como un texto de varias lineas que
 * el servidor separa. Las dos formas funcionan, porque la funcion que parte
 * (`separarEnGastos`) es compartida. La diferencia esta en lo que se puede
 * prometer: la pantalla muestra una vista previa con el monto de cada linea
 * antes de guardar, y mandando el array se guarda exactamente eso, linea por
 * linea. Si el servidor volviera a partir el texto, cualquier diferencia futura
 * en la regla de corte haria que se guardara algo distinto de lo que la persona
 * vio, que es el peor error posible en una app de plata.
 *
 * No se acepta ninguna linea sin monto: el servidor rechaza el lote entero y no
 * guarda nada. Es a proposito, y la pantalla lo evita antes de llegar aca
 * marcando la linea en rojo. La alternativa -guardar las que se pueden- deja a
 * la persona con la pregunta de cuales entraron y cuales no, justo cuando
 * acababa de cargar cinco cosas de memoria.
 */
export const crearVariosGastosSchema = z.object({
  textos: z
    .array(z.string().trim().min(1).max(TEXTO_MAXIMO))
    .min(1, 'Escribí al menos un gasto.')
    .max(MAXIMO_GASTOS_POR_LOTE, `No se pueden cargar más de ${MAXIMO_GASTOS_POR_LOTE} de una vez.`),
  /** A que grupo van TODOS los del lote, o privado. Mismo criterio que un gasto suelto. */
  destino: destinoGastoSchema.optional(),
});

export type CrearVariosGastosInput = z.infer<typeof crearVariosGastosSchema>;

/**
 * Entrada para corregir la categoría de un gasto ya cargado.
 *
 * Es el gesto que alimenta el aprendizaje del hogar: cada corrección queda
 * como una regla nueva (o refuerza una existente) en `reglas_tageo`, así que
 * la próxima vez que alguien escriba algo parecido, el motor ya lo sabe.
 */
export const corregirCategoriaSchema = z.object({
  gastoId: z.uuid(),
  categoriaId: z.uuid(),
});

export type CorregirCategoriaInput = z.infer<typeof corregirCategoriaSchema>;

/**
 * Entrada para corregir un gasto ya cargado: el monto, la fecha o el medio de
 * pago.
 *
 * Lo que NO se puede cambiar acá es el texto original, y es a propósito: es un
 * invariante del modelo (ver el comentario de `gastos.texto_original` en el
 * schema). Ese texto es la materia prima del motor de tageo y lo que permite
 * reprocesar el historial el día que el motor mejore; si se pudiera
 * sobrescribir, se perdería el registro de lo que la persona escribió de
 * verdad, que es justamente lo que el motor aprendió a interpretar.
 *
 * Para arreglar un texto mal escrito, el camino es borrar el gasto y cargarlo
 * de nuevo: son dos toques y no rompe nada.
 *
 * Todos los campos son opcionales salvo el id, pero tiene que venir al menos
 * uno: un "editar" que no edita nada es con seguridad un error de quien llama.
 */
export const editarGastoSchema = z
  .object({
    gastoId: z.uuid(),
    montoCentavos: z
      .number()
      .int('El monto se guarda en centavos enteros')
      .positive('El monto tiene que ser mayor a cero')
      .max(MONTO_MAXIMO_CENTAVOS, 'Ese monto es demasiado grande.')
      .optional(),
    fecha: fechaSchema.optional(),
    categoriaId: z.uuid().optional(),
  })
  .refine(
    (datos) =>
      datos.montoCentavos !== undefined ||
      datos.fecha !== undefined ||
      datos.categoriaId !== undefined,
    { message: 'No hay nada que cambiar.' },
  );

export type EditarGastoInput = z.infer<typeof editarGastoSchema>;

/** Entrada para borrar un gasto. */
export const eliminarGastoSchema = z.object({
  gastoId: z.uuid(),
});

export type EliminarGastoInput = z.infer<typeof eliminarGastoSchema>;

/**
 * Entrada para listar gastos con filtros.
 * Cubre el requisito del MVP: historial con busqueda y filtro por persona,
 * categoria y periodo.
 */
export const listarGastosSchema = z.object({
  desde: fechaSchema.optional(),
  hasta: fechaSchema.optional(),
  categoriaId: z.uuid().optional(),
  /**
   * Que conjunto de gastos se mira (ver `alcance.ts`). Si no viene, el
   * servidor usa `todo`: los propios mas los de todos sus grupos.
   */
  alcance: alcanceSchema.optional(),
  /** Filtrar por un miembro del hogar. Si no viene, trae los de todos. */
  usuarioId: z.uuid().optional(),
  /** Busqueda por texto libre sobre la descripcion del gasto. */
  busqueda: z.string().trim().max(TEXTO_MAXIMO).optional(),
  limite: z.number().int().min(1).max(100).default(50),
  /** Paginado por cursor: id del ultimo gasto de la pagina anterior. */
  cursor: z.uuid().optional(),
});

export type ListarGastosInput = z.infer<typeof listarGastosSchema>;

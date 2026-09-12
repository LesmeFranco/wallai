import { z } from 'zod';
import { alcanceSchema } from './alcance';
import { CODIGO_INVITACION_REGEX, normalizarCodigoInvitacion } from './codigoInvitacion';
import { fechaSchema } from './gasto';

/** 60 caracteres alcanza de sobra para "Casa" o "Departamento del centro". */
export const NOMBRE_HOGAR_MAXIMO = 60;

/**
 * Que clase de grupo es. Tiene que coincidir exactamente con los valores del
 * enum `tipo_hogar` de la base (packages/db/src/schema/enums.ts): si alguno se
 * agrega en un lado y no en el otro, la base rechaza el insert.
 *
 * Es solo presentacion: cambia la palabra y el icono que ve el usuario. Los
 * dos tipos se comportan igual en todo el resto de la app.
 */
export const TIPOS_HOGAR = ['casa', 'grupo'] as const;
export const tipoHogarSchema = z.enum(TIPOS_HOGAR);
export type TipoHogar = z.infer<typeof tipoHogarSchema>;

export const crearHogarSchema = z.object({
  nombre: z.string().trim().min(1, 'Poné un nombre para el hogar').max(NOMBRE_HOGAR_MAXIMO),
  /** Si no viene, es una casa: es el caso mas comun y el unico que existia antes. */
  tipo: tipoHogarSchema.default('casa'),
});

export type CrearHogarInput = z.infer<typeof crearHogarSchema>;

/**
 * Entrada para sumarse a un hogar con el código que le pasó otro miembro.
 *
 * El `transform` normaliza ANTES de validar el formato: así "ab 234c" se
 * corrige a "AB234C" y se valida esa versión, en vez de rechazar algo que la
 * persona tipeó bien pero con minúsculas o un espacio de más.
 */
export const unirseHogarSchema = z.object({
  codigo: z
    .string()
    .trim()
    .transform(normalizarCodigoInvitacion)
    .pipe(z.string().regex(CODIGO_INVITACION_REGEX, 'Ese código no tiene el formato esperado')),
});

export type UnirseHogarInput = z.infer<typeof unirseHogarSchema>;

/**
 * Entrada para salir de un grupo.
 *
 * El id es obligatorio y no opcional: ahora que se puede pertenecer a varios,
 * "salir" sin decir de cual es ambiguo, y adivinar (por ejemplo, sacando a la
 * persona del primero) seria una forma silenciosa de que alguien se vaya de un
 * grupo que no queria dejar. Una operacion que no se puede deshacer no deberia
 * depender de una suposicion.
 */
export const salirHogarSchema = z.object({
  hogarId: z.uuid(),
});

export type SalirHogarInput = z.infer<typeof salirHogarSchema>;

/**
 * Entrada del resumen del dashboard. Sin `desde`/`hasta`, el servidor usa el
 * mes en curso (calendario argentino): es la pregunta que hace el documento
 * ("¿cuánto gastó la casa este mes?"), no un rango arbitrario.
 */
export const resumenHogarSchema = z.object({
  desde: fechaSchema.optional(),
  hasta: fechaSchema.optional(),
  /**
   * Que conjunto de gastos resume (ver `alcance.ts`). Si no viene, el servidor
   * usa `todo`.
   *
   * Reemplaza a la deduccion automatica que hacia antes ("si tiene hogar, el
   * hogar; si no, lo propio"), que dejo de alcanzar cuando una persona pudo
   * pertenecer a varios grupos a la vez.
   */
  alcance: alcanceSchema.optional(),
  /**
   * Acota el resumen a una sola persona dentro del alcance elegido. Si no
   * viene, incluye a todos los que ese alcance deje ver.
   *
   * Se aplica ENCIMA del alcance, nunca en su lugar: pedir el id de alguien
   * que no comparte ningun grupo con vos devuelve cero, no sus gastos. Mismo
   * campo y mismo significado que en `listarGastosSchema`, para que filtrar el
   * dashboard y filtrar el historial se pidan igual.
   */
  usuarioId: z.uuid().optional(),
});

export type ResumenHogarInput = z.infer<typeof resumenHogarSchema>;

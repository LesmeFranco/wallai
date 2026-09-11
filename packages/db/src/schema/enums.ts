import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Tipos enumerados de PostgreSQL.
 *
 * Un enum es una lista cerrada de valores permitidos que la base misma
 * verifica. La alternativa seria una columna de texto libre, pero entonces
 * nada impide que un dia entre "efectivo", otro "Efectivo" y otro "cash",
 * y las consultas de agregacion empiecen a mentir.
 */

/**
 * De donde salio la categoria de un gasto.
 *
 * Esta columna es la que permite medir si el motor de tageo funciona: si el
 * 80% de los gastos quedan en 'automatico' y nadie los corrige, el motor
 * acerto. Si la mayoria termina en 'manual', el motor esta fallando. Sin este
 * dato no hay forma de saberlo.
 */
export const origenCategoriaEnum = pgEnum('origen_categoria', ['automatico', 'manual']);

/**
 * Medio de pago. El documento lo marca como opcional.
 * 'efectivo' esta primero a proposito: en Argentina es una porcion grande del
 * gasto diario y es justamente lo que las apps que leen resumenes bancarios
 * no pueden capturar.
 */
export const medioDePagoEnum = pgEnum('medio_de_pago', [
  'efectivo',
  'debito',
  'credito',
  'transferencia',
  'otro',
]);

/** Cada cuanto se reinicia el conteo de un objetivo de gasto. */
export const periodoObjetivoEnum = pgEnum('periodo_objetivo', ['semanal', 'mensual']);

/**
 * Que clase de grupo compartido es: la casa donde uno vive, o cualquier otro
 * grupo de gente que comparte gastos (amigos, un viaje, una pareja).
 *
 * Es solo presentacion: cambia la palabra y el icono que ve el usuario, nada
 * del calculo. Existe como columna y no como convencion de nombre porque
 * llamarle "hogar" a un grupo de amigos confunde, y adivinar el tipo a partir
 * del nombre ("Amigos" contiene "amigos"?) seria fragil y estaria mal la mitad
 * de las veces.
 */
export const tipoHogarEnum = pgEnum('tipo_hogar', ['casa', 'grupo']);

/**
 * Normalización de texto libre para el motor de tageo.
 *
 * "Panadería", "panaderia" y "PANADERIA" son la misma palabra para una
 * persona, pero tres cadenas distintas para una comparación de texto. Esta
 * función lleva cualquier texto a una forma canónica (minúsculas, sin
 * acentos, sin puntuación, espacios colapsados) para que dos frases que
 * dicen lo mismo se comparen como iguales.
 *
 * Se usa en dos momentos que tienen que dar el mismo resultado para el mismo
 * texto: cuando se busca una regla parecida a un gasto nuevo, y cuando se
 * guarda la regla al corregir una categoría. Por eso vive acá, en un paquete
 * puro sin dependencias, y no duplicada en cada lugar que la necesita.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    // El rango ̀-ͯ son las marcas diacriticas (tildes, dieresis)
    // que normalize('NFD') separa de su letra base. Sacarlas es lo que hace
    // que "panaderia" y "panadería" normalicen igual.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // puntuación y símbolos fuera
    .replace(/\s+/g, ' ')
    .trim();
}

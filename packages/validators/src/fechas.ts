const FORMATEADOR_ISO_ARGENTINA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Fechas del calendario argentino, como "AAAA-MM-DD".
 *
 * Se calculan con `Intl` en el huso horario argentino y no con `new Date()`
 * a secas (que usa el huso del servidor) por la misma razón que el default de
 * `gastos.fecha` en la base: un proceso corriendo en UTC podría pensar que ya
 * es el día siguiente. El locale "en-CA" da el formato "AAAA-MM-DD" directo,
 * sin tener que armarlo a mano con las partes.
 */
export function hoyArgentina(): string {
  return FORMATEADOR_ISO_ARGENTINA.format(new Date());
}

/**
 * Suma (o resta, con un número negativo) días a una fecha ISO.
 *
 * Trabaja en UTC a propósito: una vez que se tiene el día (año, mes, día) no
 * hace falta ningún huso horario más, y usar UTC evita que un cambio de hora
 * del proceso Node corte el día por la mitad.
 */
export function sumarDias(fechaISO: string, dias: number): string {
  const [anio, mes, dia] = fechaISO.split('-').map(Number) as [number, number, number];
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** Primer y último día del mes en curso (calendario argentino), como ISO. */
export function rangoMesActual(): { desde: string; hasta: string } {
  const hoy = hoyArgentina();
  const [anio, mes] = hoy.split('-').map(Number) as [number, number];
  const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
  // Día 0 del mes siguiente = último día de este mes.
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  return { desde, hasta };
}

/**
 * Cuántos días enteros hay entre dos fechas ISO, contando el primero como cero.
 * `diasEntre('2026-09-01', '2026-09-10')` da 9.
 *
 * Existe para la proyección del objetivo de gasto ("a este ritmo terminás el
 * mes en X"), que necesita saber cuántos días del período ya pasaron y cuántos
 * tiene el período entero.
 *
 * Trabaja en UTC por el mismo motivo que `sumarDias`: una vez que se tiene el
 * día, no hace falta ningún huso horario, y así ningún cambio de hora del
 * proceso parte un día por la mitad.
 */
export function diasEntre(desdeISO: string, hastaISO: string): number {
  const aUTC = (fechaISO: string) => {
    const [anio, mes, dia] = fechaISO.split('-').map(Number) as [number, number, number];
    return Date.UTC(anio, mes - 1, dia);
  };
  const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.round((aUTC(hastaISO) - aUTC(desdeISO)) / MILISEGUNDOS_POR_DIA);
}

import { describe, expect, it } from 'vitest';
import { hoyArgentina, rangoMesActual, sumarDias } from './fechas';

describe('hoyArgentina', () => {
  it('devuelve una fecha con formato AAAA-MM-DD', () => {
    expect(hoyArgentina()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('sumarDias', () => {
  it('suma días dentro del mismo mes', () => {
    expect(sumarDias('2026-09-10', 1)).toBe('2026-09-11');
  });

  it('resta días con un número negativo', () => {
    expect(sumarDias('2026-09-10', -1)).toBe('2026-09-09');
  });

  it('cruza el límite de mes', () => {
    expect(sumarDias('2026-09-30', 1)).toBe('2026-10-01');
  });

  it('cruza el límite de año', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('rangoMesActual', () => {
  it('devuelve el primer y el último día del mes en curso', () => {
    const hoy = hoyArgentina();
    const [anio, mes] = hoy.split('-');
    const { desde, hasta } = rangoMesActual();
    expect(desde).toBe(`${anio}-${mes}-01`);
    // La fecha de hoy siempre tiene que caer dentro del rango del mes actual.
    expect(desde <= hoy && hoy <= hasta).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { crearHogarSchema, resumenHogarSchema, unirseHogarSchema } from './hogar';

describe('crearHogarSchema', () => {
  it('acepta un nombre válido y recorta espacios', () => {
    const resultado = crearHogarSchema.parse({ nombre: '  Casa  ' });
    expect(resultado.nombre).toBe('Casa');
  });

  it('rechaza un nombre vacío', () => {
    expect(crearHogarSchema.safeParse({ nombre: '   ' }).success).toBe(false);
  });
});

describe('unirseHogarSchema', () => {
  it('normaliza minúsculas y espacios antes de validar', () => {
    const resultado = unirseHogarSchema.parse({ codigo: ' ab 234c ' });
    expect(resultado.codigo).toBe('AB234C');
  });

  it('rechaza un código con largo incorrecto', () => {
    expect(unirseHogarSchema.safeParse({ codigo: 'ABC' }).success).toBe(false);
  });

  it('rechaza los dígitos 0 y 1, que el alfabeto de generación no usa', () => {
    expect(unirseHogarSchema.safeParse({ codigo: 'ABC01D' }).success).toBe(false);
  });
});

describe('resumenHogarSchema', () => {
  it('acepta sin fechas: el servidor decide el default', () => {
    expect(resumenHogarSchema.safeParse({}).success).toBe(true);
  });

  it('rechaza una fecha mal formada', () => {
    expect(resumenHogarSchema.safeParse({ desde: '09/2026' }).success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  LARGO_CODIGO_INVITACION,
  esCodigoInvitacionValido,
  generarCodigoInvitacion,
  normalizarCodigoInvitacion,
} from './codigoInvitacion';

describe('generarCodigoInvitacion', () => {
  it('genera codigos del largo esperado', () => {
    expect(generarCodigoInvitacion()).toHaveLength(LARGO_CODIGO_INVITACION);
  });

  it('nunca usa caracteres que se confunden al dictarlos', () => {
    const prohibidos = /[ILO01]/;
    for (let i = 0; i < 500; i++) {
      expect(generarCodigoInvitacion()).not.toMatch(prohibidos);
    }
  });

  it('genera codigos que pasan su propia validacion', () => {
    for (let i = 0; i < 200; i++) {
      expect(esCodigoInvitacionValido(generarCodigoInvitacion())).toBe(true);
    }
  });

  it('no repite el mismo codigo en una tanda chica', () => {
    const codigos = new Set(Array.from({ length: 200 }, () => generarCodigoInvitacion()));
    expect(codigos.size).toBe(200);
  });
});

describe('normalizarCodigoInvitacion', () => {
  it('acepta el codigo tipeado en minuscula y con espacios', () => {
    expect(normalizarCodigoInvitacion('  ab2 c9d ')).toBe('AB2C9D');
    expect(esCodigoInvitacionValido(' ab2c9d ')).toBe(true);
  });

  it('rechaza codigos de largo incorrecto', () => {
    expect(esCodigoInvitacionValido('AB2C9')).toBe(false);
    expect(esCodigoInvitacionValido('AB2C9DE')).toBe(false);
  });
});

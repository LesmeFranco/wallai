import { describe, expect, it } from 'vitest';
import { normalizarTexto } from './texto';

describe('normalizarTexto', () => {
  it('pasa a minúsculas', () => {
    expect(normalizarTexto('PANADERIA')).toBe('panaderia');
  });

  it('saca acentos', () => {
    expect(normalizarTexto('panadería')).toBe('panaderia');
    expect(normalizarTexto('café')).toBe('cafe');
  });

  it('saca puntuación', () => {
    expect(normalizarTexto('subte, linea B')).toBe('subte linea b');
  });

  it('colapsa espacios repetidos y recorta los bordes', () => {
    expect(normalizarTexto('  hamburguesa    en   guido  ')).toBe('hamburguesa en guido');
  });

  it('da el mismo resultado para textos que dicen lo mismo', () => {
    expect(normalizarTexto('Medialunas')).toBe(normalizarTexto('medialunas '));
  });
});

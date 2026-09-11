import { describe, expect, it } from 'vitest';
import { parsearTexto } from './parser';

describe('parsearTexto', () => {
  it('el ejemplo canónico del documento', () => {
    const r = parsearTexto('30000 pesos hamburguesa en Guido');
    expect(r.montoCentavos).toBe(3_000_000);
    expect(r.fecha).toBeNull();
    expect(r.textoRestante).toBe('hamburguesa en Guido');
  });

  it('monto con signo peso y decimales estilo argentino', () => {
    const r = parsearTexto('$1.250,50 subte');
    expect(r.montoCentavos).toBe(125050);
    expect(r.textoRestante).toBe('subte');
  });

  it('monto con separador de miles sin decimales', () => {
    const r = parsearTexto('30.000 pesos super del mes');
    expect(r.montoCentavos).toBe(3_000_000);
    expect(r.textoRestante).toBe('super del mes');
  });

  it('la palabra pesos puede ir antes del número', () => {
    const r = parsearTexto('pesos 500 nafta');
    expect(r.montoCentavos).toBe(50000);
    expect(r.textoRestante).toBe('nafta');
  });

  it('reconoce "hoy", "ayer" y "anteayer"', () => {
    const hoy = parsearTexto('500 pesos cafe hoy');
    const ayer = parsearTexto('500 pesos cafe ayer');
    const anteayer = parsearTexto('500 pesos cafe anteayer');
    expect(hoy.fecha).not.toBeNull();
    expect(ayer.fecha).not.toBeNull();
    expect(anteayer.fecha).not.toBeNull();
    // ayer tiene que ser un día antes que hoy, y anteayer un día antes que ayer
    expect(new Date(ayer.fecha!).getTime()).toBeLessThan(new Date(hoy.fecha!).getTime());
    expect(new Date(anteayer.fecha!).getTime()).toBeLessThan(new Date(ayer.fecha!).getTime());
    expect(ayer.textoRestante).toBe('cafe');
  });

  it('sin marcador de moneda, no toma ningún número como monto', () => {
    const r = parsearTexto('30000 hamburguesa en Guido');
    expect(r.montoCentavos).toBeNull();
    expect(r.textoRestante).toBe('30000 hamburguesa en Guido');
  });

  it('sin palabra de fecha, la fecha queda en null', () => {
    const r = parsearTexto('500 pesos cafe');
    expect(r.fecha).toBeNull();
  });
});

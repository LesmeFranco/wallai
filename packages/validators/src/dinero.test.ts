import { describe, expect, it } from 'vitest';
import { centavosAPesos, formatearPesos, pesosACentavos, sumarCentavos } from './dinero';

describe('pesosACentavos', () => {
  it('convierte pesos enteros', () => {
    expect(pesosACentavos(30000)).toBe(3_000_000);
  });

  it('redondea al centavo mas cercano', () => {
    expect(pesosACentavos(10.005)).toBe(1001);
    expect(pesosACentavos(10.004)).toBe(1000);
  });

  it('rechaza valores no numericos', () => {
    expect(() => pesosACentavos(Number.NaN)).toThrow();
    expect(() => pesosACentavos(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe('sumarCentavos', () => {
  it('suma sin error de punto flotante', () => {
    // Este es el caso que justifica guardar centavos enteros.
    // Con pesos decimales, 0.1 + 0.2 daria 0.30000000000000004.
    const centavos = [pesosACentavos(0.1), pesosACentavos(0.2)];
    expect(sumarCentavos(centavos)).toBe(30);
    expect(centavosAPesos(sumarCentavos(centavos))).toBe(0.3);
  });

  it('la suma de una lista vacia es cero', () => {
    expect(sumarCentavos([])).toBe(0);
  });
});

describe('formatearPesos', () => {
  it('formatea como moneda argentina', () => {
    // Se normalizan los espacios porque Intl usa espacios no separables.
    const resultado = formatearPesos(3_000_000).replace(/ /g, ' ');
    expect(resultado).toContain('30.000,00');
    expect(resultado).toContain('$');
  });
});

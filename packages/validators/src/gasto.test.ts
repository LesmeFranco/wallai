import { describe, expect, it } from 'vitest';
import { crearGastoSchema, listarGastosSchema } from './gasto';

describe('crearGastoSchema', () => {
  it('acepta un gasto minimo valido', () => {
    const resultado = crearGastoSchema.safeParse({
      texto: 'hamburguesa en Guido',
      montoCentavos: 3_000_000,
    });
    expect(resultado.success).toBe(true);
  });

  it('recorta espacios del texto', () => {
    const resultado = crearGastoSchema.parse({
      texto: '  cafe  ',
      montoCentavos: 100,
    });
    expect(resultado.texto).toBe('cafe');
  });

  it('rechaza monto cero o negativo', () => {
    expect(crearGastoSchema.safeParse({ texto: 'x', montoCentavos: 0 }).success).toBe(false);
    expect(crearGastoSchema.safeParse({ texto: 'x', montoCentavos: -5 }).success).toBe(false);
  });

  it('rechaza monto con decimales, porque se espera centavos enteros', () => {
    expect(crearGastoSchema.safeParse({ texto: 'x', montoCentavos: 10.5 }).success).toBe(false);
  });

  it('rechaza texto vacio', () => {
    expect(crearGastoSchema.safeParse({ texto: '   ', montoCentavos: 100 }).success).toBe(false);
  });

  it('acepta un gasto sin montoCentavos: el servidor lo saca del texto', () => {
    // Fase 2: montoCentavos es un override opcional, no un requisito. Si no
    // viene, gastos.crear le pasa `texto` al parser (parser.ts) antes de
    // rechazar la carga.
    const resultado = crearGastoSchema.safeParse({ texto: '500 pesos cafe' });
    expect(resultado.success).toBe(true);
  });

  it('no acepta que el cliente elija el hogar', () => {
    // Decision D1: el hogar lo resuelve el servidor a partir del usuario
    // autenticado. Zod descarta la clave desconocida en vez de propagarla.
    const resultado = crearGastoSchema.parse({
      texto: 'x',
      montoCentavos: 100,
      hogarId: '00000000-0000-4000-8000-000000000000',
    });
    expect(resultado).not.toHaveProperty('hogarId');
  });
});

describe('listarGastosSchema', () => {
  it('aplica el limite por defecto', () => {
    expect(listarGastosSchema.parse({}).limite).toBe(50);
  });

  it('rechaza un limite fuera de rango', () => {
    expect(listarGastosSchema.safeParse({ limite: 500 }).success).toBe(false);
  });

  it('rechaza una fecha mal formada', () => {
    expect(listarGastosSchema.safeParse({ desde: '01/03/2026' }).success).toBe(false);
  });
});

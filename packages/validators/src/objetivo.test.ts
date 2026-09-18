import { describe, expect, it } from 'vitest';
import { calcularProgresoObjetivo, fijarObjetivoSchema, UMBRAL_CERCA } from './objetivo';

/** Un mes completo, para no repetirlo en cada caso. */
const MES = { desde: '2026-09-01', hasta: '2026-09-30' };

describe('calcularProgresoObjetivo', () => {
  it('calcula el porcentaje y lo que queda', () => {
    const progreso = calcularProgresoObjetivo({
      gastadoCentavos: 25_000_00,
      limiteCentavos: 100_000_00,
      ...MES,
      hoy: '2026-09-10',
    });
    expect(progreso.porcentaje).toBe(25);
    expect(progreso.restanteCentavos).toBe(75_000_00);
    expect(progreso.excedidoCentavos).toBe(0);
    expect(progreso.estado).toBe('bien');
  });

  it('pasa a "cerca" justo al llegar al umbral', () => {
    const limiteCentavos = 100_000_00;
    const justoAbajo = calcularProgresoObjetivo({
      gastadoCentavos: limiteCentavos * (UMBRAL_CERCA / 100) - 1,
      limiteCentavos,
      ...MES,
      hoy: '2026-09-24',
    });
    const justoEnElUmbral = calcularProgresoObjetivo({
      gastadoCentavos: limiteCentavos * (UMBRAL_CERCA / 100),
      limiteCentavos,
      ...MES,
      hoy: '2026-09-24',
    });
    expect(justoAbajo.estado).toBe('bien');
    expect(justoEnElUmbral.estado).toBe('cerca');
  });

  /**
   * El caso que motiva comparar centavos en vez del porcentaje redondeado:
   * 99,6% del limite se muestra como "100%" pero NO es haberse pasado.
   */
  it('no dice "excedido" por el redondeo del porcentaje', () => {
    const progreso = calcularProgresoObjetivo({
      gastadoCentavos: 99_600_00,
      limiteCentavos: 100_000_00,
      ...MES,
      hoy: '2026-09-29',
    });
    expect(progreso.porcentaje).toBe(100);
    expect(progreso.estado).toBe('cerca');
    expect(progreso.excedidoCentavos).toBe(0);
  });

  it('informa cuanto se paso del limite', () => {
    const progreso = calcularProgresoObjetivo({
      gastadoCentavos: 130_000_00,
      limiteCentavos: 100_000_00,
      ...MES,
      hoy: '2026-09-20',
    });
    expect(progreso.porcentaje).toBe(130);
    expect(progreso.estado).toBe('excedido');
    expect(progreso.excedidoCentavos).toBe(30_000_00);
    expect(progreso.restanteCentavos).toBe(0);
  });

  it('rechaza un limite que no sea positivo', () => {
    expect(() =>
      calcularProgresoObjetivo({
        gastadoCentavos: 100,
        limiteCentavos: 0,
        ...MES,
        hoy: '2026-09-10',
      }),
    ).toThrow();
  });
});

describe('la proyeccion de cierre', () => {
  it('proyecta el total del mes al ritmo de lo que va', () => {
    // 10 dias transcurridos de 30: lo gastado deberia triplicarse.
    const progreso = calcularProgresoObjetivo({
      gastadoCentavos: 100_000_00,
      limiteCentavos: 400_000_00,
      ...MES,
      hoy: '2026-09-10',
    });
    expect(progreso.proyeccionCentavos).toBe(300_000_00);
  });

  it('no proyecta un mes que ya cerro', () => {
    const progreso = calcularProgresoObjetivo({
      gastadoCentavos: 100_000_00,
      limiteCentavos: 400_000_00,
      desde: '2026-08-01',
      hasta: '2026-08-31',
      hoy: '2026-09-10',
    });
    expect(progreso.proyeccionCentavos).toBeNull();
  });

  it('no proyecta el ultimo dia, donde la proyeccion es el total que ya se ve', () => {
    const progreso = calcularProgresoObjetivo({
      gastadoCentavos: 100_000_00,
      limiteCentavos: 400_000_00,
      ...MES,
      hoy: '2026-09-30',
    });
    expect(progreso.proyeccionCentavos).toBeNull();
  });

  it('no proyecta sin gastos', () => {
    const progreso = calcularProgresoObjetivo({
      gastadoCentavos: 0,
      limiteCentavos: 400_000_00,
      ...MES,
      hoy: '2026-09-10',
    });
    expect(progreso.proyeccionCentavos).toBeNull();
  });

  it('el primer dia del mes cuenta como un dia transcurrido, no como cero', () => {
    const progreso = calcularProgresoObjetivo({
      gastadoCentavos: 10_000_00,
      limiteCentavos: 400_000_00,
      ...MES,
      hoy: '2026-09-01',
    });
    expect(progreso.proyeccionCentavos).toBe(300_000_00);
  });
});

describe('fijarObjetivoSchema', () => {
  it('acepta un objetivo personal', () => {
    const resultado = fijarObjetivoSchema.safeParse({
      destino: { tipo: 'personal' },
      montoLimiteCentavos: 400_000_00,
    });
    expect(resultado.success).toBe(true);
  });

  it('acepta un objetivo de grupo', () => {
    const resultado = fijarObjetivoSchema.safeParse({
      destino: { tipo: 'hogar', hogarId: '11111111-1111-4111-8111-111111111111' },
      montoLimiteCentavos: 400_000_00,
    });
    expect(resultado.success).toBe(true);
  });

  it('rechaza un limite de cero o negativo', () => {
    for (const montoLimiteCentavos of [0, -100]) {
      const resultado = fijarObjetivoSchema.safeParse({
        destino: { tipo: 'personal' },
        montoLimiteCentavos,
      });
      expect(resultado.success).toBe(false);
    }
  });

  it('rechaza centavos con decimales', () => {
    const resultado = fijarObjetivoSchema.safeParse({
      destino: { tipo: 'personal' },
      montoLimiteCentavos: 1000.5,
    });
    expect(resultado.success).toBe(false);
  });
});

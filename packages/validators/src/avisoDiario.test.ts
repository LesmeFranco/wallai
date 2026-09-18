import { describe, expect, it } from 'vitest';
import { HORA_DEL_AVISO, armarAvisoDiario, fechaDelAviso } from './avisoDiario';
import { calcularProgresoObjetivo } from './objetivo';

/** Formateador de mentira: lo que importa es que el monto aparezca en el texto. */
const formatearMonto = (centavos: number) => `$${centavos / 100}`;

const NADA_AVISADO = { cerca: false, excedido: false };
const MES = { desde: '2026-09-01', hasta: '2026-09-30' };

/** Un progreso con el estado que pida el caso. */
function progresoCon(gastadoCentavos: number) {
  return calcularProgresoObjetivo({
    gastadoCentavos,
    limiteCentavos: 100_000_00,
    ...MES,
    hoy: '2026-09-20',
  });
}

describe('armarAvisoDiario', () => {
  it('no dice nada si cargó sus gastos y viene bien', () => {
    const aviso = armarAvisoDiario({
      cargoHoy: true,
      progreso: progresoCon(30_000_00),
      yaAvisado: NADA_AVISADO,
      formatearMonto,
    });
    expect(aviso).toBeNull();
  });

  it('no dice nada si cargó sus gastos y no tiene objetivo', () => {
    const aviso = armarAvisoDiario({
      cargoHoy: true,
      progreso: null,
      yaAvisado: NADA_AVISADO,
      formatearMonto,
    });
    expect(aviso).toBeNull();
  });

  it('recuerda cargar cuando no cargó nada en el día', () => {
    const aviso = armarAvisoDiario({
      cargoHoy: false,
      progreso: null,
      yaAvisado: NADA_AVISADO,
      formatearMonto,
    });
    expect(aviso?.motivo).toBe('sin-cargar');
  });

  it('avisa que se pasó del objetivo, y con cuánto', () => {
    const aviso = armarAvisoDiario({
      cargoHoy: true,
      progreso: progresoCon(130_000_00),
      yaAvisado: NADA_AVISADO,
      formatearMonto,
    });
    expect(aviso?.motivo).toBe('excedido');
    expect(aviso?.cuerpo).toContain('$30000');
  });

  it('avisa al estar cerca del límite', () => {
    const aviso = armarAvisoDiario({
      cargoHoy: true,
      progreso: progresoCon(85_000_00),
      yaAvisado: NADA_AVISADO,
      formatearMonto,
    });
    expect(aviso?.motivo).toBe('cerca');
    expect(aviso?.titulo).toContain('85%');
  });

  /**
   * El caso que define que la notificacion no sea insistente: cruzar el 80% el
   * dia 24 no puede significar el mismo aviso las seis noches siguientes.
   */
  it('no repite el aviso del objetivo dentro del mismo mes', () => {
    const aviso = armarAvisoDiario({
      cargoHoy: true,
      progreso: progresoCon(85_000_00),
      yaAvisado: { cerca: true, excedido: false },
      formatearMonto,
    });
    expect(aviso).toBeNull();
  });

  it('pasarse del objetivo gana sobre no haber cargado nada', () => {
    const aviso = armarAvisoDiario({
      cargoHoy: false,
      progreso: progresoCon(130_000_00),
      yaAvisado: NADA_AVISADO,
      formatearMonto,
    });
    expect(aviso?.motivo).toBe('excedido');
  });

  it('si el aviso del objetivo ya se dio, todavía puede recordar cargar', () => {
    const aviso = armarAvisoDiario({
      cargoHoy: false,
      progreso: progresoCon(130_000_00),
      yaAvisado: { cerca: true, excedido: true },
      formatearMonto,
    });
    expect(aviso?.motivo).toBe('sin-cargar');
  });
});

describe('fechaDelAviso', () => {
  it('cae en la hora del aviso, del mismo día', () => {
    const fecha = fechaDelAviso(new Date(2026, 8, 18, 10, 30));
    expect(fecha.getHours()).toBe(HORA_DEL_AVISO);
    expect(fecha.getMinutes()).toBe(0);
    expect(fecha.getDate()).toBe(18);
  });

  it('puede quedar en el pasado si ya pasó la hora, y eso lo decide quien llama', () => {
    const ahora = new Date(2026, 8, 18, 23, 0);
    expect(fechaDelAviso(ahora).getTime()).toBeLessThan(ahora.getTime());
  });

  it('adelanta días, cruzando el límite de mes', () => {
    const fecha = fechaDelAviso(new Date(2026, 8, 29, 10, 0), 3);
    expect(fecha.getMonth()).toBe(9);
    expect(fecha.getDate()).toBe(2);
  });
});

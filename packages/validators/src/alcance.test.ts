import { describe, expect, it } from 'vitest';
import { ALCANCE_POR_DEFECTO, alcanceSchema, destinoGastoSchema } from './alcance';

describe('alcance', () => {
  it('por defecto muestra lo que gasto uno, no una mezcla con lo de los grupos', () => {
    // Es una decision de producto, no un detalle: la vista personal no mezcla
    // lo que cargaron los demas. Lo compartido se ve entrando al grupo.
    expect(ALCANCE_POR_DEFECTO).toEqual({ tipo: 'mio' });
  });

  it('acepta mirar un grupo puntual', () => {
    const entrada = { tipo: 'hogar', hogarId: '11111111-1111-4111-8111-111111111111' };
    expect(alcanceSchema.parse(entrada)).toEqual(entrada);
  });

  it('rechaza un grupo sin id, que traeria gastos de cualquiera', () => {
    expect(alcanceSchema.safeParse({ tipo: 'hogar' }).success).toBe(false);
  });

  it('sigue aceptando "todo", que manda la app 1.0.0 ya instalada', () => {
    // La app nueva no lo ofrece mas, pero el backend se despliega solo con cada
    // push y los telefonos con la version vieja lo mandan en cada consulta del
    // dashboard. Sacarlo del esquema les romperia la pantalla principal hasta
    // que instalen la version nueva.
    expect(alcanceSchema.safeParse({ tipo: 'todo' }).success).toBe(true);
  });

  it('no confunde el alcance con el destino de un gasto', () => {
    // "personal" es un destino valido (un gasto privado) y NO un alcance.
    expect(destinoGastoSchema.safeParse({ tipo: 'personal' }).success).toBe(true);
    expect(alcanceSchema.safeParse({ tipo: 'personal' }).success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { parsearTexto, separarEnGastos } from './parser';

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

  it('sin palabra de fecha, la fecha queda en null', () => {
    const r = parsearTexto('500 pesos cafe');
    expect(r.fecha).toBeNull();
  });

  /**
   * Lo que cambió en la 1.1.0: un número que abre el texto es el monto, sin
   * necesidad de "$" ni "pesos". Era la fricción que más se sentía cargando
   * gastos todos los días.
   */
  describe('monto sin marcador, al principio del texto', () => {
    it('lo toma como monto y lo saca del texto', () => {
      const r = parsearTexto('30000 hamburguesa en Guido');
      expect(r.montoCentavos).toBe(3_000_000);
      expect(r.textoRestante).toBe('hamburguesa en Guido');
    });

    it('funciona con separador de miles y con decimales', () => {
      expect(parsearTexto('30.000 nafta').montoCentavos).toBe(3_000_000);
      expect(parsearTexto('1.250,50 subte').montoCentavos).toBe(125050);
    });

    it('funciona combinado con la fecha', () => {
      const r = parsearTexto('8900 colectivo ayer');
      expect(r.montoCentavos).toBe(890000);
      expect(r.fecha).not.toBeNull();
      expect(r.textoRestante).toBe('colectivo');
    });

    it('un número que NO abre el texto se sigue ignorando', () => {
      // En "cafe con 2 medialunas" el 2 no es plata, y no hay forma de
      // distinguirlo de una cantidad cualquiera.
      const r = parsearTexto('cafe con 2 medialunas');
      expect(r.montoCentavos).toBeNull();
      expect(r.textoRestante).toBe('cafe con 2 medialunas');
    });

    it('el marcador gana sobre la posición', () => {
      // Si se tomara el número del principio, este gasto entraría por $2.
      const r = parsearTexto('2 empanadas $3000');
      expect(r.montoCentavos).toBe(300000);
      expect(r.textoRestante).toBe('2 empanadas');
    });

    it('no confunde una cantidad pegada a otra cosa con un monto', () => {
      // El número tiene que estar solo. Sin esta condición, estos dos gastos
      // se guardarían por $1 y $2.
      expect(parsearTexto('1/2 kilo de asado').montoCentavos).toBeNull();
      expect(parsearTexto('2x1 cerveza').montoCentavos).toBeNull();
    });

    it('un texto que es solo un número también vale', () => {
      const r = parsearTexto('4500');
      expect(r.montoCentavos).toBe(450000);
      expect(r.textoRestante).toBe('');
    });
  });

  /**
   * Lo que cambió en la 1.7.0: el monto también se reconoce al final, porque
   * "pan 5000" es tan natural como "5000 pan" y obligar a una de las dos formas
   * era fricción pura.
   */
  describe('monto sin marcador, al final del texto', () => {
    it('lo toma como monto y lo saca del texto', () => {
      const r = parsearTexto('pan 5000');
      expect(r.montoCentavos).toBe(500000);
      expect(r.textoRestante).toBe('pan');
    });

    it('funciona con una descripción larga', () => {
      const r = parsearTexto('hamburguesa en Guido 30000');
      expect(r.montoCentavos).toBe(3_000_000);
      expect(r.textoRestante).toBe('hamburguesa en Guido');
    });

    it('funciona con separador de miles y con decimales', () => {
      expect(parsearTexto('nafta 30.000').montoCentavos).toBe(3_000_000);
      expect(parsearTexto('subte 1.250,50').montoCentavos).toBe(125050);
    });

    it('tolera el punto final de la oración', () => {
      expect(parsearTexto('pan 5000.').montoCentavos).toBe(500000);
    });

    it('funciona combinado con la fecha, aunque la fecha vaya al final', () => {
      // La palabra de fecha se saca antes de buscar el monto, justamente para
      // que el número vuelva a quedar en la punta.
      const r = parsearTexto('colectivo 8900 ayer');
      expect(r.montoCentavos).toBe(890000);
      expect(r.fecha).not.toBeNull();
      expect(r.textoRestante).toBe('colectivo');
    });

    it('el marcador sigue ganando sobre la posición', () => {
      const r = parsearTexto('$3000 cerveza 2');
      expect(r.montoCentavos).toBe(300000);
    });

    it('un número pegado a otra cosa no es monto', () => {
      expect(parsearTexto('cerveza 2x1').montoCentavos).toBeNull();
      expect(parsearTexto('remera talle 42x30').montoCentavos).toBeNull();
    });
  });

  /**
   * Con un número en cada punta hay que elegir uno, y gana el más grande. El
   * porqué está documentado en parser.ts: lo que distingue al precio de una
   * cantidad o de un octanaje no es la posición sino el tamaño.
   */
  describe('un número en cada punta', () => {
    it('la cantidad adelante no le gana al precio de atrás', () => {
      const r = parsearTexto('2 empanadas 3000');
      expect(r.montoCentavos).toBe(300000);
      expect(r.textoRestante).toBe('2 empanadas');
    });

    it('el precio adelante no pierde contra un número chico de atrás', () => {
      const r = parsearTexto('30000 nafta 95');
      expect(r.montoCentavos).toBe(3_000_000);
      expect(r.textoRestante).toBe('nafta 95');
    });

    it('con dos números iguales se queda con el primero', () => {
      // El monto es el mismo de los dos lados, así que la regla del más grande
      // no decide nada. Queda el primero, que es la descripción más probable
      // ("500 cafe" y después otro 500 suelto).
      const r = parsearTexto('500 cafe 500');
      expect(r.montoCentavos).toBe(50000);
      expect(r.textoRestante).toBe('cafe 500');
    });
  });
});

describe('separarEnGastos', () => {
  it('una sola linea se comporta como un gasto solo', () => {
    const lineas = separarEnGastos('3000 hamburguesa');
    expect(lineas).toHaveLength(1);
    expect(lineas[0]?.texto).toBe('3000 hamburguesa');
    expect(lineas[0]?.montoCentavos).toBe(300000);
  });

  it('separa un gasto por linea y parsea el monto de cada uno', () => {
    const lineas = separarEnGastos('3000 hamburguesa\n5000 sube\n7000 pan');
    expect(lineas.map((l) => l.montoCentavos)).toEqual([300000, 500000, 700000]);
    expect(lineas.map((l) => l.texto)).toEqual(['3000 hamburguesa', '5000 sube', '7000 pan']);
  });

  it('descarta lineas vacias y recorta espacios', () => {
    const lineas = separarEnGastos('\n  3000 cafe  \n\n\n5000 sube\n  \n');
    expect(lineas.map((l) => l.texto)).toEqual(['3000 cafe', '5000 sube']);
  });

  it('marca con null la linea que no tiene monto', () => {
    const lineas = separarEnGastos('3000 cafe\nmedialunas\n5000 sube');
    expect(lineas.map((l) => l.montoCentavos)).toEqual([300000, null, 500000]);
  });

  it('dos lineas iguales son dos gastos, no uno repetido', () => {
    const lineas = separarEnGastos('500 cafe\n500 cafe');
    expect(lineas).toHaveLength(2);
  });

  it('un texto vacio no da ningun gasto', () => {
    expect(separarEnGastos('   \n\n  ')).toEqual([]);
  });

  it('respeta los marcadores del parser en cada linea por separado', () => {
    // El "2" que abre la segunda linea no es plata porque el $ manda: es la
    // misma regla que para un gasto suelto, aplicada linea por linea.
    const lineas = separarEnGastos('cafe con 2 medialunas $1500\n2 empanadas $3000');
    expect(lineas.map((l) => l.montoCentavos)).toEqual([150000, 300000]);
  });

  it('tambien parte con saltos de linea de Windows', () => {
    const lineas = separarEnGastos('3000 cafe\r\n5000 sube');
    expect(lineas.map((l) => l.montoCentavos)).toEqual([300000, 500000]);
  });

  /**
   * La coma como separador, que es lo que cambio en la 1.7.0. La condicion que
   * la hace segura: se separa solo si todas las partes tienen monto.
   */
  describe('separar por comas', () => {
    it('separa una enumeracion donde cada parte tiene su monto', () => {
      const lineas = separarEnGastos('5000 en pan, 7000 sube, hamburguesa 25000');
      expect(lineas.map((l) => l.texto)).toEqual(['5000 en pan', '7000 sube', 'hamburguesa 25000']);
      expect(lineas.map((l) => l.montoCentavos)).toEqual([500000, 700000, 2_500_000]);
    });

    it('NO separa cuando alguna parte se queda sin monto', () => {
      // Este es el contraejemplo que en la 1.5.0 hizo descartar la coma: es un
      // gasto solo, con comas adentro de la descripcion.
      const lineas = separarEnGastos('2000 cafe, medialunas y jugo');
      expect(lineas).toHaveLength(1);
      expect(lineas[0]?.texto).toBe('2000 cafe, medialunas y jugo');
      expect(lineas[0]?.montoCentavos).toBe(200000);
    });

    it('no confunde la coma decimal con un separador de gastos', () => {
      const lineas = separarEnGastos('1.250,50 subte');
      expect(lineas).toHaveLength(1);
      expect(lineas[0]?.montoCentavos).toBe(125050);
    });

    it('la coma decimal sigue valiendo dentro de una enumeracion', () => {
      const lineas = separarEnGastos('1.250,50 subte, 3000 cafe');
      expect(lineas.map((l) => l.montoCentavos)).toEqual([125050, 300000]);
    });

    it('una coma al final no inventa un gasto vacio', () => {
      const lineas = separarEnGastos('3000 cafe,');
      expect(lineas).toHaveLength(1);
      expect(lineas[0]?.montoCentavos).toBe(300000);
    });

    it('se combina con los saltos de linea', () => {
      const lineas = separarEnGastos('5000 pan, 7000 sube\n25000 hamburguesa');
      expect(lineas.map((l) => l.montoCentavos)).toEqual([500000, 700000, 2_500_000]);
    });
  });
});

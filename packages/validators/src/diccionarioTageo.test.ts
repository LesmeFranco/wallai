import { describe, expect, it } from 'vitest';
import { buscarEnDiccionario } from './diccionarioTageo';

describe('buscarEnDiccionario', () => {
  it('reconoce el caso que fallaba: una hamburgueseria es comida', () => {
    expect(buscarEnDiccionario('hamburgueseria')?.clave).toBe('comida');
    expect(buscarEnDiccionario('gaste en hamburgueseria')?.clave).toBe('comida');
  });

  it('ignora acentos y mayusculas, porque normaliza antes de comparar', () => {
    expect(buscarEnDiccionario('PANADERÍA de la esquina')?.clave).toBe('comida');
  });

  it('reconoce el plural de una palabra guardada en singular', () => {
    expect(buscarEnDiccionario('medialunas')?.clave).toBe('comida');
    expect(buscarEnDiccionario('zapatillas nuevas')?.clave).toBe('ropa');
  });

  it('no confunde una palabra con otra que la contiene', () => {
    // "pan" es comida y esta en el diccionario, pero "pantalon" es ropa: si la
    // busqueda fuera por subcadena, un jean terminaria clasificado como comida.
    expect(buscarEnDiccionario('pantalon')?.clave).toBe('ropa');
  });

  it('reconoce entradas de varias palabras', () => {
    expect(buscarEnDiccionario('pague la obra social')?.clave).toBe('salud');
    expect(buscarEnDiccionario('papel higienico y lavandina')?.clave).toBe('hogar');
  });

  it('devuelve null cuando no reconoce nada, para que el motor caiga en Otros', () => {
    expect(buscarEnDiccionario('asdfgh qwerty')).toBeNull();
    expect(buscarEnDiccionario('')).toBeNull();
  });

  it('gana la categoria con mas palabras acertadas', () => {
    // "nafta" y "ypf" son las dos de transporte; "cafe" sola es de comida.
    expect(buscarEnDiccionario('nafta en ypf y un cafe')?.clave).toBe('transporte');
  });

  it('cubre las categorias tipicas de un gasto argentino', () => {
    const casos: Array<[string, string]> = [
      ['super coto', 'supermercado'],
      ['nafta shell', 'transporte'],
      ['entradas para el cine', 'salidas'],
      ['factura de luz de edenor', 'servicios'],
      ['farmacia remedios', 'salud'],
      ['ferreteria tornillos', 'hogar'],
      ['fotocopias de la facultad', 'educacion'],
      ['remera nueva', 'ropa'],
      ['netflix mensual', 'suscripciones'],
    ];
    for (const [texto, claveEsperada] of casos) {
      expect(buscarEnDiccionario(texto)?.clave, texto).toBe(claveEsperada);
    }
  });

  it('no toma como marca palabras ambiguas que se dejaron afuera a proposito', () => {
    // "dia" (la cadena) y "personal" (la telefonica) son palabras de uso
    // corriente: incluirlas haria que "el otro dia" o "gasto personal"
    // cayeran en una categoria equivocada.
    expect(buscarEnDiccionario('el otro dia')).toBeNull();
    expect(buscarEnDiccionario('gasto personal')).toBeNull();
  });
});

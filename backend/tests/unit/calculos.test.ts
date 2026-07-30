import { describe, it, expect } from 'vitest';
import { calcularIMC, calcularDelta, generarReporteMensualFromDocs, construirComparativa } from '../../src/services/calculos.ts';
import { cifrarCampo, descifrarCampo } from '../../src/utils/campoCifrado.ts';
describe('calcularIMC', () => {
  it('calcula IMC correctamente', () => {
    expect(calcularIMC(70, 1.75)).toBe(22.9);
    expect(calcularIMC(80, 1.8)).toBe(24.7);
  });
  it('retorna 0 con estatura inválida', () => {
    expect(calcularIMC(70, 0)).toBe(0);
  });
});

describe('calcularDelta', () => {
  it('calcula diferencia', () => {
    expect(calcularDelta(68.5, 72)).toBe(-3.5);
    expect(calcularDelta(45, 42)).toBe(3);
  });
  it('retorna null sin anterior', () => {
    expect(calcularDelta(70, null)).toBeNull();
    expect(calcularDelta(70, undefined)).toBeNull();
  });
});

describe('generarReporteMensual', () => {
  it('marca insuficiente con 1 evaluación', () => {
    const r = generarReporteMensualFromDocs([
      { fecha: new Date(), antropometria: { peso: 70 }, composicionCorporal: { grasaCorporalPct: 20, masaMuscular: 50 } },
    ]);
    expect(r.suficiente).toBe(false);
  });
  it('calcula cambio total con 2+ evaluaciones', () => {
    const r = generarReporteMensualFromDocs([
      { fecha: new Date('2026-01-01'), antropometria: { peso: 72 }, composicionCorporal: { grasaCorporalPct: 32, masaMuscular: 42 } },
      { fecha: new Date('2026-02-01'), antropometria: { peso: 68.5 }, composicionCorporal: { grasaCorporalPct: 28.5, masaMuscular: 43.5 } },
    ]);
    expect(r.suficiente).toBe(true);
    expect(r.cambioTotalPeso).toBe(-3.5);
    expect(r.serieHistorica).toHaveLength(2);
  });
});

describe('construirComparativa', () => {
  it('deltas correctos en 3 casos', () => {
    const actual = {
      fecha: new Date(),
      antropometria: { peso: 68.5, imc: 25.1, cintura: 76 },
      composicionCorporal: { grasaCorporalPct: 28.5, masaMuscular: 43.5 },
    };
    const anterior = {
      fecha: new Date('2026-01-01'),
      antropometria: { peso: 72, imc: 26.4, cintura: 82 },
      composicionCorporal: { grasaCorporalPct: 32, masaMuscular: 42 },
    };
    const c = construirComparativa(actual, anterior);
    expect(c.deltas.peso.delta).toBe(-3.5);
    expect(c.deltas.grasaCorporalPct.delta).toBe(-3.5);
    expect(c.deltas.masaMuscular.delta).toBe(1.5);
  });
});

describe('campoCifrado', () => {
  it('cifra y descifra roundtrip', () => {
    const plain = 'Lesión de menisco 2022';
    const enc = cifrarCampo(plain);
    expect(enc).not.toBe(plain);
    expect(descifrarCampo(enc)).toBe(plain);
  });
});

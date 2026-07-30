import { describe, it, expect } from 'vitest';
import {
  calcularIMC,
  porcentajeGrasaJacksonPollock,
  metabolismoBasalMifflin,
  pesoIdealDevine,
  relacionCinturaCadera,
  calcularResultadosCompletos,
} from '../src/services/calculationsEngine.js';

describe('calculationsEngine', () => {
  it('IMC', () => {
    expect(calcularIMC(80, 1.8)).toBe(24.7);
  });

  it('BMR Mifflin male', () => {
    expect(metabolismoBasalMifflin({ pesoKg: 80, estaturaM: 1.8, edad: 30, sexo: 'Masculino' })).toBe(1780);
  });

  it('WHR', () => {
    expect(relacionCinturaCadera(80, 100)).toBe(0.8);
  });

  it('Devine ideal', () => {
    const r = pesoIdealDevine(1.78, 'Masculino');
    expect(r.idealKg).toBeGreaterThan(70);
    expect(r.rangoImcSaludable.min).toBeLessThan(r.rangoImcSaludable.max);
  });

  it('Jackson-Pollock + full pipeline', () => {
    const jp = porcentajeGrasaJacksonPollock(
      {
        tricipital: 12,
        pectoral: 10,
        escapular: 14,
        abdominal: 18,
        suprailiaco: 12,
        muslo: 15,
        pantorrilla: 8,
      },
      30,
      'Masculino'
    );
    expect(jp).not.toBeNull();
    expect(jp!.valor).toBeGreaterThan(5);
    expect(jp!.valor).toBeLessThan(40);

    const full = calcularResultadosCompletos({
      pesoKg: 82,
      estaturaM: 1.78,
      edad: 30,
      sexo: 'Masculino',
      cinturaCm: 84,
      gluteosCm: 98,
      pliegues: {
        tricipital: 12,
        pectoral: 10,
        escapular: 14,
        abdominal: 18,
        suprailiaco: 12,
        muslo: 15,
      },
      diametros: { codo: 7, rodilla: 9.5, muneca: 5.5 },
      objetivo: 'perder_grasa',
    });
    expect(full.imc).toBeGreaterThan(20);
    expect(full.porcentajeGrasaCorporal).toBeDefined();
    expect(full.disclaimers.length).toBeGreaterThan(0);
  });
});

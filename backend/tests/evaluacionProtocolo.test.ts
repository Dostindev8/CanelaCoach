import { describe, it, expect } from 'vitest';
import {
  calcularSumaMedidasBody,
  detectarDiscrepanciaBascula,
  kgToLb,
  lbToKg,
} from '../src/theme/canelaCoach.tokens.js';
import { cifrarCampo, descifrarCampo, esCifrado } from '../src/utils/campoCifrado.js';

describe('protocolo / evaluación helpers', () => {
  it('suma medidas Estiven fixture = 489', () => {
    expect(
      calcularSumaMedidasBody({
        neck: 37,
        torso: 102,
        biceps: 33,
        waist: 100,
        glutes: 112,
        quadriceps: 65,
        calves: 40,
      })
    ).toBe(489);
  });

  it('null pliegues do not become 0 in sum', () => {
    expect(calcularSumaMedidasBody({ neck: 37, torso: null, biceps: 33 })).toBe(70);
  });

  it('discrepancia báscula altura/edad', () => {
    const d = detectarDiscrepanciaBascula({
      heightCmDevice: 170,
      heightCmProfile: 177.8,
      ageDeviceEstimate: 36,
      ageProfile: 19,
    });
    expect(d.altura).toBe(true);
    expect(d.edad).toBe(true);
    expect(d.mensajes.length).toBe(2);
  });

  it('no discrepancia dentro de umbral', () => {
    const d = detectarDiscrepanciaBascula({
      heightCmDevice: 178,
      heightCmProfile: 177.8,
      ageDeviceEstimate: 20,
      ageProfile: 19,
    });
    expect(d.altura).toBe(false);
    expect(d.edad).toBe(false);
  });

  it('unidades kg ↔ lb', () => {
    expect(kgToLb(97)).toBeCloseTo(213.8, 0);
    expect(lbToKg(213)).toBeCloseTo(96.6, 0);
  });

  it('cifrado AES-256-GCM no es plaintext', () => {
    const plain = '110/70 mmHg';
    const enc = cifrarCampo(plain);
    expect(enc).not.toBe(plain);
    expect(esCifrado(enc)).toBe(true);
    expect(descifrarCampo(enc)).toBe(plain);
  });
});

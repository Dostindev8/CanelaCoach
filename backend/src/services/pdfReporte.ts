import { IEvaluacion } from '../models/Evaluacion.js';
import { ICliente } from '../models/Cliente.js';
import { ReporteMensual } from './calculos.js';

const BRAND = {
  navy: '#0B1220',
  accent: '#2E9BE6',
  silver: '#9AA5B1',
  light: '#F4F7FA',
  success: '#3FA65B',
  warn: '#E0A72E',
  error: '#D64545',
  white: '#FFFFFF',
};

function pageShell(title: string, pageNum: number, body: string): string {
  return `
  <section class="page">
    <header class="page-header">
      <div class="brand">CANELA COACH®</div>
      <div class="page-title">${title}</div>
      <div class="page-num">${pageNum}/12</div>
    </header>
    <div class="page-body">${body}</div>
    <footer class="page-footer">Logic Code Spot · Confidencial · Datos de salud protegidos</footer>
  </section>`;
}

function kv(label: string, value: unknown): string {
  const v = value == null || value === '' ? '—' : String(value);
  return `<div class="kv"><span class="k">${label}</span><span class="v">${v}</span></div>`;
}

export function renderizarPlantillaReporte(opts: {
  evaluacion: IEvaluacion;
  cliente: ICliente & { antecedentes?: Record<string, string> };
  entrenadorNombre: string;
  comparativa: ReporteMensual;
}): string {
  const { evaluacion: e, cliente: c, entrenadorNombre, comparativa } = opts;
  const ant = e.antropometria || {};
  const comp = e.composicionCorporal || {};
  const post = e.evaluacionPostural || {};
  const func = e.evaluacionFuncional || {};
  const cond = e.condicionFisica || {};
  const diag = e.diagnostico || {};
  const plan = e.planAccion || {};
  const fotos = e.fotografias || {};
  const antecedentes = c.antecedentes || {};
  const habitos = c.habitos || {};

  const pages = [
    pageShell(
      'PORTADA',
      1,
      `<div class="cover">
        <div class="cover-photo">${fotos.frenteUrl ? `<img src="${fotos.frenteUrl}" alt="foto"/>` : '<div class="photo-ph">SIN FOTO</div>'}</div>
        <h1>${c.nombre}</h1>
        <p class="code">${c.codigoCliente}</p>
        <div class="meta-grid">
          ${kv('Edad', c.edad)}
          ${kv('Sexo', c.sexo)}
          ${kv('Fecha', new Date(e.fecha).toLocaleDateString('es-DO'))}
          ${kv('Tipo', e.tipo)}
          ${kv('Entrenador', entrenadorNombre)}
          ${kv('Objetivo', c.objetivo || '—')}
        </div>
      </div>`
    ),
    pageShell(
      'HISTORIA CLÍNICA DEPORTIVA',
      2,
      `<div class="grid2">
        <div class="card"><h3>Datos generales</h3>
          ${kv('Ocupación', c.ocupacion)}
          ${kv('Estado civil', c.estadoCivil)}
          ${kv('Nivel actividad', c.nivelActividad)}
          ${kv('Tiempo disponible', c.tiempoDisponible)}
        </div>
        <div class="card"><h3>Antecedentes</h3>
          ${kv('Enfermedades', antecedentes.enfermedades)}
          ${kv('Cirugías', antecedentes.cirugias)}
          ${kv('Lesiones', antecedentes.lesiones)}
          ${kv('Medicamentos', antecedentes.medicamentos)}
          ${kv('Alergias', antecedentes.alergias)}
        </div>
        <div class="card full"><h3>Hábitos</h3>
          <div class="grid2">
            ${kv('Sueño (1-5)', habitos.calidadSueno)}
            ${kv('Estrés (1-5)', habitos.nivelEstres)}
            ${kv('Agua', habitos.consumoAgua)}
            ${kv('Alcohol', habitos.alcohol)}
            ${kv('Tabaco', habitos.tabaco)}
          </div>
        </div>
      </div>`
    ),
    pageShell(
      'EVALUACIÓN ANTROPOMÉTRICA',
      3,
      `<div class="grid3">
        ${kv('Peso (kg)', ant.peso)}
        ${kv('Estatura (m)', ant.estatura)}
        ${kv('IMC', ant.imc)}
        ${kv('Cuello', ant.cuello)}
        ${kv('Tórax', ant.torax)}
        ${kv('Bíceps', ant.biceps)}
        ${kv('Cintura', ant.cintura)}
        ${kv('Glúteos', ant.gluteos)}
        ${kv('Cuádriceps', ant.cuadriceps)}
        ${kv('Pantorrilla', ant.pantorrilla)}
        ${kv('Cintura/Estatura', ant.cinturaEstatura)}
        ${kv('Cintura/Cadera', ant.cinturaCadera)}
      </div>`
    ),
    pageShell(
      'COMPOSICIÓN CORPORAL',
      4,
      (() => {
        const rc = (e as { resultadosCalculados?: Record<string, number | string[] | undefined> })
          .resultadosCalculados || {};
        const badge = (label: string, val: unknown, hint?: string) =>
          `<div class="metric-badge"><div class="mb-l">${label}</div><div class="mb-v">${val ?? '—'}</div>${hint ? `<div class="mb-h">${hint}</div>` : ''}</div>`;
        return `
        <p class="disclaimer">Estimación basada en métodos antropométricos estándar — no constituye diagnóstico médico.</p>
        <div class="metric-row">
          ${badge('IMC', rc.imc ?? ant.imc)}
          ${badge('% Grasa', rc.porcentajeGrasaCorporal ?? comp.grasaCorporalPct, 'Jackson-Pollock / Siri')}
          ${badge('Masa muscular', rc.masaMuscular ?? comp.masaMuscular, 'kg')}
          ${badge('MLG', rc.masaLibreGrasa ?? comp.masaMagra, 'kg')}
          ${badge('Masa ósea', rc.masaOsea, 'Von Döbeln')}
          ${badge('Agua (L)', rc.aguaCorporal, 'Watson')}
          ${badge('Grasa visceral*', rc.grasaVisceral ?? comp.grasaVisceral, '*estimación')}
          ${badge('BMR (kcal)', rc.metabolismoBasal, 'Mifflin-St Jeor')}
          ${badge('Cintura/Cadera', rc.relacionCinturaCadera ?? ant.cinturaCadera)}
          ${badge('Peso ideal', rc.pesoIdeal, 'Devine')}
          ${badge('Peso objetivo', (e as { pesoObjetivoEditable?: number }).pesoObjetivoEditable ?? rc.pesoObjetivo)}
        </div>
        <div class="grid3" style="margin-top:16px">
          ${kv('% Grasa', comp.grasaCorporalPct)}
          ${kv('Grasa (lb)', comp.grasaCorporalLb)}
          ${kv('Masa magra', comp.masaMagra)}
          ${kv('Masa muscular', comp.masaMuscular)}
          ${kv('% Agua', comp.aguaCorporalPct)}
          ${kv('Grasa visceral', comp.grasaVisceral)}
        </div>
        ${
          (e as { objetivosProximoMes?: string }).objetivosProximoMes
            ? `<div class="card" style="margin-top:14px"><h3>Objetivos próximo mes</h3><p>${(e as { objetivosProximoMes?: string }).objetivosProximoMes}</p></div>`
            : ''
        }
        ${
          (e as { notasEntrenador?: string }).notasEntrenador
            ? `<div class="card" style="margin-top:14px"><h3>Observaciones del coach</h3><p>${(e as { notasEntrenador?: string }).notasEntrenador}</p></div>`
            : ''
        }`;
      })()
    ),
    pageShell(
      'EVALUACIÓN POSTURAL',
      5,
      `<div class="grid2">${Object.entries(post).map(([k, v]) => kv(k, v)).join('') || '<p class="muted">Sin datos</p>'}</div>`
    ),
    pageShell(
      'EVALUACIÓN FUNCIONAL',
      6,
      `<div class="grid2">${Object.entries(func).map(([k, v]) => kv(k, v)).join('') || '<p class="muted">Sin datos</p>'}</div>`
    ),
    pageShell(
      'CONDICIÓN FÍSICA',
      7,
      `<div class="grid3">${Object.entries(cond).map(([k, v]) => kv(k, v)).join('') || '<p class="muted">Sin datos</p>'}</div>`
    ),
    pageShell(
      'FOTOGRAFÍAS',
      8,
      `<div class="photos">
        <div><h4>Frente</h4>${fotos.frenteUrl ? `<img src="${fotos.frenteUrl}"/>` : '<div class="photo-ph">—</div>'}</div>
        <div><h4>Perfil</h4>${fotos.perfilDerechoUrl ? `<img src="${fotos.perfilDerechoUrl}"/>` : '<div class="photo-ph">—</div>'}</div>
        <div><h4>Espalda</h4>${fotos.espaldaUrl ? `<img src="${fotos.espaldaUrl}"/>` : '<div class="photo-ph">—</div>'}</div>
      </div>`
    ),
    pageShell(
      'DIAGNÓSTICO PROFESIONAL',
      9,
      `<div class="card">${kv('Composición', diag.composicionCorporalTexto)}
        ${kv('Condición física', diag.condicionFisicaTexto)}
        ${kv('Hábitos', diag.habitosTexto)}
        ${kv('Potencial', diag.potencial)}
        ${kv('Resumen', diag.resumen)}</div>`
    ),
    pageShell(
      'PLAN DE ACCIÓN',
      10,
      `<div class="card">
        <h3>Foco principal</h3>
        <p>${plan.focoPrincipal || '—'}</p>
        <h3>Acciones</h3>
        <ol>${(plan.items || []).map((i) => `<li>${i}</li>`).join('') || '<li>—</li>'}</ol>
      </div>`
    ),
    pageShell(
      'REPORTE MENSUAL DE AVANCES',
      11,
      comparativa.suficiente
        ? `<div class="grid3">
            ${kv('Peso inicial', comparativa.pesoInicial)}
            ${kv('Peso actual', comparativa.pesoActual)}
            ${kv('Δ Peso', comparativa.cambioTotalPeso)}
            ${kv('% Grasa inicial', comparativa.grasaInicial)}
            ${kv('% Grasa actual', comparativa.grasaActual)}
            ${kv('Masa muscular inicial', comparativa.masaMuscularInicial)}
            ${kv('Masa muscular actual', comparativa.masaMuscularActual)}
          </div>`
        : `<p class="muted">Sin datos suficientes — se requiere al menos 2 evaluaciones.</p>`
    ),
    pageShell(
      'HISTORIAL DE EVOLUCIÓN',
      12,
      `<table class="hist">
        <thead><tr><th>Fecha</th><th>Peso</th><th>% Grasa</th><th>Masa muscular</th></tr></thead>
        <tbody>
          ${comparativa.serieHistorica
            .map(
              (s) =>
                `<tr><td>${new Date(s.fecha).toLocaleDateString('es-DO')}</td><td>${s.peso ?? '—'}</td><td>${s.grasaCorporalPct ?? '—'}</td><td>${s.masaMuscular ?? '—'}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>`
    ),
  ];

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; color: ${BRAND.navy}; background: ${BRAND.white}; }
  .page { width: 210mm; height: 297mm; padding: 14mm 12mm 16mm; page-break-after: always; position: relative; background: linear-gradient(180deg, ${BRAND.light} 0%, #fff 40%); }
  .page-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid ${BRAND.accent}; padding-bottom: 8px; margin-bottom: 16px; }
  .brand { font-weight: 800; letter-spacing: 0.14em; font-size: 11px; color: ${BRAND.navy}; }
  .page-title { font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.accent}; }
  .page-num { font-size: 11px; color: ${BRAND.silver}; }
  .page-footer { position: absolute; bottom: 10mm; left: 12mm; right: 12mm; font-size: 9px; color: ${BRAND.silver}; border-top: 1px solid #e5eaf0; padding-top: 6px; }
  .cover h1 { font-size: 28px; margin: 12px 0 4px; }
  .code { color: ${BRAND.accent}; font-weight: 700; letter-spacing: 0.08em; }
  .cover-photo img, .photos img { width: 100%; max-height: 220px; object-fit: contain; background: ${BRAND.navy}; border-radius: 12px; }
  .photo-ph { height: 180px; background: ${BRAND.navy}; color: ${BRAND.silver}; display:flex;align-items:center;justify-content:center;border-radius:12px; }
  .photos { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .card { background: #fff; border: 1px solid #e5eaf0; border-radius: 12px; padding: 14px; }
  .card.full { grid-column: 1 / -1; }
  .card h3 { margin: 0 0 10px; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: ${BRAND.accent}; }
  .kv { display: flex; justify-content: space-between; gap: 8px; padding: 6px 0; border-bottom: 1px solid #eef2f6; font-size: 12px; }
  .k { color: ${BRAND.silver}; text-transform: capitalize; }
  .v { font-weight: 600; text-align: right; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 20px; }
  .muted { color: ${BRAND.silver}; }
  .hist { width: 100%; border-collapse: collapse; font-size: 12px; }
  .hist th { background: ${BRAND.navy}; color: #fff; padding: 8px; text-align: left; }
  .hist td { padding: 8px; border-bottom: 1px solid #e5eaf0; }
  .disclaimer { font-size: 10px; color: ${BRAND.silver}; margin: 0 0 12px; font-style: italic; }
  .metric-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .metric-badge { background: ${BRAND.navy}; color: #fff; border-radius: 12px; padding: 12px; border-left: 4px solid ${BRAND.accent}; }
  .mb-l { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: ${BRAND.silver}; }
  .mb-v { font-size: 20px; font-weight: 800; margin-top: 4px; }
  .mb-h { font-size: 9px; color: ${BRAND.accent}; margin-top: 4px; }
</style>
</head>
<body>${pages.join('\n')}</body>
</html>`;
}

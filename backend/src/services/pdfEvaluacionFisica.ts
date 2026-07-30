import puppeteer from 'puppeteer';
import { Evaluacion } from '../models/Evaluacion.js';
import { Cliente } from '../models/Cliente.js';
import { Entrenador } from '../models/Entrenador.js';
import { canelaCoachTokens as T } from '../theme/canelaCoach.tokens.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { detectarDiscrepanciaBascula, kgToLb } from '../theme/canelaCoach.tokens.js';
import { uploadBuffer } from '../config/cloudinary.js';

function pend(v: unknown, unit = ''): string {
  if (v == null || v === '') return 'Pendiente';
  return `${escapeHtml(String(v))}${unit ? ` ${unit}` : ''}`;
}

/** Compact evaluation PDF matching Estiven-style "Registro de Medición de Grasa Corporal" */
export async function generarEvaluacionFisicaPDF(
  evaluacionId: string,
  opts?: { upload?: boolean }
): Promise<{ buffer: Buffer; url?: string; filename: string }> {
  const evaluacion = await Evaluacion.findOne({ _id: evaluacionId, activo: { $ne: false } });
  if (!evaluacion) throw new Error('Evaluación no encontrada');

  const [cliente, entrenador] = await Promise.all([
    Cliente.findById(evaluacion.clienteId),
    Entrenador.findById(evaluacion.entrenadorId).select('nombre'),
  ]);
  if (!cliente) throw new Error('Cliente no encontrado');

  const ant = evaluacion.antropometria || {};
  const pl = evaluacion.pliegues || {};
  const bone = evaluacion.diametrosOseos || {};
  const comp = evaluacion.composicionCorporal || {};
  const ss = evaluacion.smartScale || {};
  const weightKg = ant.peso;
  const weightLb = evaluacion.weightLb ?? (weightKg != null ? kgToLb(weightKg) : null);
  const heightCm =
    ant.estatura != null ? (ant.estatura > 3 ? ant.estatura : ant.estatura * 100) : cliente.estaturaInicial ? cliente.estaturaInicial * 100 : null;

  const disc = detectarDiscrepanciaBascula({
    heightCmDevice: ss.heightCmDevice,
    heightCmProfile: heightCm,
    ageDeviceEstimate: ss.ageDeviceEstimate,
    ageProfile: cliente.edad,
  });

  const planItems = [
    ...(evaluacion.puntosAMejorar || []),
    ...(evaluacion.planAccion?.items || []),
  ];

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: ${T.fonts.body}; color: ${T.navy}; }
  h1 { font-family: ${T.fonts.display}; letter-spacing: 0.08em; font-size: 18px; margin: 0 0 4px; }
  .brand { font-weight:800; letter-spacing:0.14em; color:${T.accent}; font-size:12px; }
  .section { margin-top: 14px; }
  .section h2 { font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:${T.accent}; margin:0 0 8px; border-bottom:2px solid ${T.accent}; padding-bottom:4px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 16px; font-size:13px; }
  .kv { display:flex; justify-content:space-between; border-bottom:1px solid #eef2f6; padding:5px 0; }
  .badge { display:inline-block; background:${T.navy}; color:#fff; border-radius:8px; padding:8px 12px; margin:4px; }
  .badge b { display:block; font-size:18px; }
  .warn { background:#fff8e6; border-left:4px solid ${T.warn}; padding:8px 10px; font-size:11px; margin:10px 0; }
  .footer { margin-top:20px; font-size:10px; color:${T.silver}; }
  ul { margin:4px 0; padding-left:18px; font-size:13px; }
</style></head>
<body>
  <div class="brand">CANELA COACH®</div>
  <h1>Registro de Medición de Grasa Corporal</h1>
  <p style="font-size:12px;color:${T.silver}">Fecha: ${new Date(evaluacion.fecha).toLocaleDateString('es-DO')} · ${escapeHtml(cliente.nombre)}</p>

  <div class="section">
    <h2>Datos del paciente</h2>
    <div class="grid">
      <div class="kv"><span>Nombre</span><span>${escapeHtml(cliente.nombre)}</span></div>
      <div class="kv"><span>Edad</span><span>${cliente.edad} años</span></div>
      <div class="kv"><span>Peso</span><span>${pend(weightLb, 'lb')} (${pend(weightKg, 'kg')})</span></div>
      <div class="kv"><span>Estatura (perfil)</span><span>${pend(heightCm != null ? heightCm.toFixed(1) : null, 'cm')}</span></div>
      <div class="kv"><span>Presión arterial</span><span>${pend(ant.presionArterial || evaluacion.condicionFisica?.presionArterial, 'mmHg')}</span></div>
      <div class="kv"><span>% Grasa estimado</span><span>${pend(comp.grasaCorporalPct ?? evaluacion.resultadosCalculados?.porcentajeGrasaCorporal, '%')}</span></div>
      <div class="kv"><span>Masa muscular</span><span>${pend(comp.masaMuscular ?? evaluacion.resultadosCalculados?.masaMuscular, 'kg')}</span></div>
      <div class="kv"><span>Suma medidas</span><span>${pend(ant.sumaMedidasCm, 'cm')}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>Medidas corporales (cm)</h2>
    <div class="grid">
      <div class="kv"><span>Cuello</span><span>${pend(ant.cuello, 'cm')}</span></div>
      <div class="kv"><span>Torso</span><span>${pend(ant.torax, 'cm')}</span></div>
      <div class="kv"><span>Bíceps</span><span>${pend(ant.biceps, 'cm')}</span></div>
      <div class="kv"><span>Cintura</span><span>${pend(ant.cintura, 'cm')}</span></div>
      <div class="kv"><span>Glúteos</span><span>${pend(ant.gluteos, 'cm')}</span></div>
      <div class="kv"><span>Cuádriceps</span><span>${pend(ant.cuadriceps, 'cm')}</span></div>
      <div class="kv"><span>Pantorrillas</span><span>${pend(ant.pantorrilla, 'cm')}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>Densidad ósea / Pliegues (mm)</h2>
    <div class="grid">
      <div class="kv"><span>Codo</span><span>${pend(bone.codo)}</span></div>
      <div class="kv"><span>Rodilla</span><span>${pend(bone.rodilla)}</span></div>
      <div class="kv"><span>Escapular</span><span>${pend(pl.escapular, 'mm')}</span></div>
      <div class="kv"><span>Tricipital</span><span>${pend(pl.tricipital, 'mm')}</span></div>
      <div class="kv"><span>Pectoral</span><span>${pend(pl.pectoral, 'mm')}</span></div>
      <div class="kv"><span>Abdominal</span><span>${pend(pl.abdominal, 'mm')}</span></div>
      <div class="kv"><span>Cuádriceps (pliegue)</span><span>${pend(pl.muslo, 'mm')}</span></div>
      <div class="kv"><span>Pantorrilla (pliegue)</span><span>${pend(pl.pantorrilla, 'mm')}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>Observaciones desde última medición</h2>
    <p>${pend(evaluacion.observacionesDesdeUltima)}</p>
  </div>

  <div class="section">
    <h2>Plan del coach</h2>
    <ul>${planItems.length ? planItems.map((i) => `<li>${escapeHtml(i)}</li>`).join('') : '<li>Pendiente</li>'}</ul>
    ${evaluacion.notasEntrenador ? `<p>${escapeHtml(evaluacion.notasEntrenador)}</p>` : ''}
  </div>

  <div class="section">
    <h2>Báscula inteligente (dato del dispositivo — no fusionado con perfil)</h2>
    ${disc.mensajes.length ? `<div class="warn">${disc.mensajes.map(escapeHtml).join('<br/>')}</div>` : ''}
    <div class="grid">
      <div class="kv"><span>Estado</span><span>${pend(ss.status)}</span></div>
      <div class="kv"><span>Peso (bascula)</span><span>${pend(ss.weightKg, 'kg')}</span></div>
      <div class="kv"><span>IMC dispositivo</span><span>${pend(ss.bmi)}</span></div>
      <div class="kv"><span>% Grasa</span><span>${pend(ss.bodyFatPercent, '%')}</span></div>
      <div class="kv"><span>Masa muscular</span><span>${pend(ss.muscleMassKg, 'kg')}</span></div>
      <div class="kv"><span>Agua</span><span>${pend(ss.waterPercent, '%')}</span></div>
      <div class="kv"><span>Grasa visceral</span><span>${pend(ss.visceralFat)}</span></div>
      <div class="kv"><span>Metabolismo</span><span>${pend(ss.metabolismKcalDay, 'kcal')}</span></div>
      <div class="kv"><span>Estatura dispositivo</span><span>${pend(ss.heightCmDevice, 'cm')}</span></div>
      <div class="kv"><span>Edad estimada dispositivo</span><span>${pend(ss.ageDeviceEstimate, 'años')}</span></div>
    </div>
  </div>

  <p style="font-size:10px;font-style:italic;color:${T.silver};margin-top:16px">
    Estimación basada en métodos antropométricos estándar — no constituye diagnóstico médico.
  </p>

  <div class="footer">
    ${escapeHtml(entrenador?.nombre || "Abraham D' Oleo Canela")} · Coach Fitness · @CanelaCoach<br/>
    Generado ${new Date().toLocaleString('es-DO')} · Individual por evaluación · Confidencial
  </div>
</body></html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  let buffer: Buffer;
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
    buffer = Buffer.from(
      await page.pdf({ format: 'A4', printBackground: true })
    );
  } finally {
    await browser.close();
  }

  const filename = `evaluacion-${cliente.nombre.replace(/\s+/g, '-').toLowerCase()}-${evaluacion._id}.pdf`;
  let url: string | undefined;
  if (opts?.upload !== false) {
    const subida = await uploadBuffer(buffer, {
      folder: `canela-coach/reportes/${cliente._id}`,
      public_id: `eval-fisica-${evaluacion._id}`,
      resource_type: 'raw',
    });
    url = subida.secure_url;
    evaluacion.reporte = {
      ...(evaluacion.reporte || {}),
      pdfUrl: url,
      generadoEn: new Date(),
      enviado: evaluacion.reporte?.enviado || false,
    };
    await evaluacion.save();
  }

  return { buffer, url, filename };
}

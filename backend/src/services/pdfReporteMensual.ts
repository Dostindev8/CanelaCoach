import puppeteer from 'puppeteer';
import { Evaluacion } from '../models/Evaluacion.js';
import { Cliente, clienteConAntecedentesDescifrados } from '../models/Cliente.js';
import { Entrenador } from '../models/Entrenador.js';
import { compareEvaluations } from './evaluationComparison.js';
import { kgToLb } from './medidas.js';
import { uploadBuffer } from '../config/cloudinary.js';
import { escapeHtml } from '../utils/escapeHtml.js';

function fmtDate(d?: Date | string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fmtDelta(cambio: number | null | undefined, unit: string) {
  if (cambio == null) return '—';
  const arrow = cambio < 0 ? '↓' : cambio > 0 ? '↑' : '→';
  return `${arrow} ${Math.abs(cambio).toFixed(1)} ${unit}`;
}

export async function generarReporteMensualPDF(evaluacionId: string): Promise<string> {
  const evaluacion = await Evaluacion.findById(evaluacionId);
  if (!evaluacion) throw new Error('Evaluación no encontrada');

  const clienteDoc = await Cliente.findById(evaluacion.clienteId);
  if (!clienteDoc) throw new Error('Cliente no encontrado');
  const cliente = clienteConAntecedentesDescifrados(clienteDoc);

  const entrenador = await Entrenador.findById(evaluacion.entrenadorId).select('nombre');
  const anterior = await Evaluacion.obtenerAnterior(evaluacion.clienteId, evaluacion.fecha);
  const comparison = compareEvaluations(
    anterior
      ? (anterior.toObject() as Parameters<typeof compareEvaluations>[0])
      : null,
    evaluacion.toObject() as Parameters<typeof compareEvaluations>[1]
  );

  const pesoActual = evaluacion.antropometria?.peso;
  const pesoAnterior = anterior?.antropometria?.peso;
  const estaturaCm = evaluacion.antropometria?.estatura
    ? Math.round(evaluacion.antropometria.estatura * 100)
    : null;

  const medidasRows = (
    [
      ['Cuello', comparison.medidas.cuelloCm],
      ['Torso', comparison.medidas.toraxCm],
      ['Bíceps', comparison.medidas.bicepsCm],
      ['Cintura', comparison.medidas.cinturaCm],
      ['Glúteos', comparison.medidas.gluteosCm],
      ['Cuádriceps', comparison.medidas.cuadricepsCm],
      ['Pantorrillas', comparison.medidas.pantorrillaCm],
    ] as const
  )
    .map(([label, m]) => {
      const met = m;
      return `
      <tr>
        <td>${label}</td>
        <td>${met?.anterior != null ? met.anterior.toFixed(1) : '—'}</td>
        <td>${met?.actual != null ? met.actual.toFixed(1) : '—'}</td>
        <td class="delta">${fmtDelta(met?.cambio, 'cm')}</td>
      </tr>`;
    })
    .join('');

  const score = evaluacion.scoreFisico;
  const puntos = (evaluacion.puntosAMejorar || [])
    .map((p) => `<li>${escapeHtml(p)}</li>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #05070C;
    color: #f0f4fa;
    padding: 28px;
    font-size: 11px;
  }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .brand { font-size: 14px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
  .brand span { color: #0c83f4; }
  .title { font-size: 22px; font-weight: 800; font-style: italic; letter-spacing: 0.04em; text-align: center; flex: 1; }
  .badge { border: 1px solid #176ea4; border-radius: 10px; padding: 8px 12px; background: rgba(12,131,244,0.1); text-align: center; }
  .badge small { display: block; color: #8aa0b8; font-size: 9px; margin-bottom: 2px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .card {
    background: rgba(11,18,32,0.92);
    border: 1px solid rgba(23,110,164,0.45);
    border-radius: 14px;
    padding: 14px;
    box-shadow: 0 0 18px rgba(12,131,244,0.12);
  }
  .card h3 { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #8aa0b8; margin-bottom: 10px; }
  .name { font-size: 16px; font-weight: 700; }
  .meta { color: #8aa0b8; margin-top: 4px; }
  .peso-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .peso-val { font-size: 20px; font-weight: 800; }
  .circle {
    width: 90px; height: 90px; border-radius: 50%;
    border: 3px solid #0c83f4;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: rgba(12,131,244,0.12);
    text-align: center; font-weight: 800; font-size: 12px; color: #4f9cff;
  }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 6px 4px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); }
  th { color: #8aa0b8; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; }
  .delta { color: #4f9cff; font-weight: 700; }
  .sum-row { background: rgba(12,131,244,0.12); font-weight: 700; }
  .score { font-size: 28px; font-weight: 800; color: #0c83f4; }
  .celeb {
    margin-top: 10px; padding: 12px; border-radius: 12px;
    border: 1px solid #0c83f4; background: rgba(12,131,244,0.15);
    font-weight: 700; color: #4f9cff;
  }
  ul { padding-left: 16px; }
  li { margin-bottom: 4px; }
  .footer {
    margin-top: 18px; display: flex; justify-content: space-between; align-items: center;
    color: #8aa0b8; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">CANELA <span>COACH</span>®</div>
    <div class="title">REPORTE MENSUAL DE AVANCES</div>
    <div class="badge">
      <small>FECHA DE EVALUACIÓN</small>
      <strong>${escapeHtml(fmtDate(evaluacion.fecha))}</strong>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Cliente</h3>
      <div class="name">${escapeHtml(cliente.nombre)}</div>
      <div class="meta">${escapeHtml(cliente.edad)} años · ${estaturaCm ? estaturaCm + ' cm' : '—'} · ${escapeHtml(cliente.sexo)}</div>
      <div class="meta" style="margin-top:8px">Score físico</div>
      <div class="score">${escapeHtml(score?.valor ?? '—')}%</div>
      <div class="meta">${escapeHtml(score?.motivo || '')}</div>
    </div>
    <div class="card">
      <h3>Resumen de peso</h3>
      <div class="peso-row">
        <div>
          <div class="meta">${escapeHtml(fmtDate(comparison.fechaAnterior as string))}</div>
          <div class="peso-val">${pesoAnterior != null ? kgToLb(pesoAnterior) + ' LB' : '—'}</div>
          <div class="meta">${pesoAnterior != null ? pesoAnterior.toFixed(1) + ' kg' : ''}</div>
        </div>
        <div class="circle">
          ${
            comparison.pesoLb.cambio != null
              ? `${comparison.pesoLb.cambio < 0 ? '↓' : '↑'} ${Math.abs(kgToLb(Math.abs(comparison.pesoKg.cambio || 0))).toFixed(1)} LB`
              : '1ª eval'
          }
        </div>
        <div style="text-align:right">
          <div class="meta">${escapeHtml(fmtDate(evaluacion.fecha))}</div>
          <div class="peso-val">${pesoActual != null ? kgToLb(pesoActual) + ' LB' : '—'}</div>
          <div class="meta">${pesoActual != null ? pesoActual.toFixed(1) + ' kg' : ''}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Medidas corporales (cm)</h3>
      <table>
        <thead>
          <tr>
            <th>Medida</th>
            <th>${escapeHtml(fmtDate(comparison.fechaAnterior as string))}</th>
            <th>${escapeHtml(fmtDate(evaluacion.fecha))}</th>
            <th>Cambio</th>
          </tr>
        </thead>
        <tbody>
          ${medidasRows}
          <tr class="sum-row">
            <td>Suma de medidas</td>
            <td>${comparison.sumaMedidasCm.anterior ?? '—'}</td>
            <td>${comparison.sumaMedidasCm.actual ?? '—'}</td>
            <td class="delta">${fmtDelta(comparison.sumaMedidasCm.cambio, 'cm')}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="card">
      <h3>Composición</h3>
      <p><strong>% Grasa:</strong> ${comparison.porcentajeGrasaCorporal.anterior ?? '—'} → ${comparison.porcentajeGrasaCorporal.actual ?? '—'}
        <span class="delta"> ${fmtDelta(comparison.porcentajeGrasaCorporal.cambio, 'pp')}</span></p>
      <p style="margin-top:8px"><strong>Masa muscular:</strong> ${comparison.masaMuscularKg.anterior ?? '—'} → ${comparison.masaMuscularKg.actual ?? '—'} kg
        <span class="delta"> ${fmtDelta(comparison.masaMuscularKg.cambio, 'kg')}</span></p>
      <div class="celeb">${escapeHtml(score?.celebracion ? '¡EXCELENTE PROGRESO!' : score?.motivo || 'Sigue con disciplina.')}</div>
      <h3 style="margin-top:14px">Puntos a mejorar</h3>
      <ul>${puntos || '<li>Sin puntos registrados</li>'}</ul>
    </div>
  </div>

  <div class="footer">
    <div>Disciplina | Constancia | Transformación</div>
    <div>Coach: ${escapeHtml(entrenador?.nombre || 'Abraham Canela')} · Canela Coach®</div>
  </div>
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const pdfBuffer = Buffer.from(
      await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' },
      })
    );

    const subida = await uploadBuffer(pdfBuffer, {
      folder: `canela-coach/reportes/${cliente._id}`,
      public_id: `reporte-mensual-${evaluacion._id}`,
      resource_type: 'raw',
    });

    evaluacion.reporte = {
      ...(evaluacion.reporte || {}),
      mensualPdfUrl: subida.secure_url,
      generadoEn: evaluacion.reporte?.generadoEn || new Date(),
      enviado: evaluacion.reporte?.enviado || false,
    };
    await evaluacion.save();
    return subida.secure_url;
  } finally {
    await browser.close();
  }
}

import puppeteer from 'puppeteer';
import { Protocol } from '../models/Protocol.js';
import { Cliente } from '../models/Cliente.js';
import { Entrenador } from '../models/Entrenador.js';
import { SupplementCatalog } from '../models/SupplementCatalog.js';
import { canelaCoachTokens as T } from '../theme/canelaCoach.tokens.js';
import { escapeHtml } from '../utils/escapeHtml.js';

function pend(v: unknown): string {
  if (v == null || v === '') return 'Pendiente';
  return escapeHtml(String(v));
}

const DAYS = [
  ['monday', 'Lunes'],
  ['tuesday', 'Martes'],
  ['wednesday', 'Miércoles'],
  ['thursday', 'Jueves'],
  ['friday', 'Viernes'],
  ['saturday', 'Sábado'],
  ['sunday', 'Domingo'],
] as const;

export async function generarProtocoloPDF(
  protocolId: string
): Promise<{ buffer: Buffer; filename: string }> {
  const protocol = await Protocol.findById(protocolId);
  if (!protocol) throw new Error('Protocolo no encontrado');

  const [cliente, entrenador] = await Promise.all([
    Cliente.findById(protocol.clienteId),
    Entrenador.findById(protocol.entrenadorId).select('nombre'),
  ]);
  if (!cliente) throw new Error('Cliente no encontrado');

  const skus = (protocol.supplementation || [])
    .map((s) => s.catalogSku)
    .filter(Boolean) as string[];
  const catalog = skus.length
    ? await SupplementCatalog.find({ sku: { $in: skus } }).lean()
    : [];
  const bySku = Object.fromEntries(catalog.map((c) => [c.sku, c]));

  const dayMap =
    protocol.weeklyMenu?.patternDayMap instanceof Map
      ? Object.fromEntries(protocol.weeklyMenu.patternDayMap)
      : (protocol.weeklyMenu?.patternDayMap as Record<string, string>) || {};

  const A = protocol.weeklyMenu?.mealPatternA || {};
  const B = protocol.weeklyMenu?.mealPatternB || {};

  const mealsRows = DAYS.map(([key, label]) => {
    const pat = dayMap[key] || dayMap[label.toLowerCase()] || 'A';
    const m = pat === 'B' ? B : A;
    return `<tr>
      <td>${label}</td>
      <td>${pend(m.meal1)}</td>
      <td>${pend(m.meal2)}</td>
      <td>${pend(m.meal3)}</td>
      <td>Patrón ${pat}</td>
    </tr>`;
  }).join('');

  const supplements = (protocol.supplementation || [])
    .map((s) => {
      const cat = s.catalogSku ? bySku[s.catalogSku] : null;
      return `<div class="supp">
        <h4>${pend(s.productLabel || cat?.name)}</h4>
        <p><strong>Dosis:</strong> ${pend(s.dose)} · ${pend(s.instruction)}</p>
        ${cat ? `<p class="muted">${escapeHtml((cat.benefits || []).slice(0, 6).join(' · '))}</p>` : ''}
      </div>`;
    })
    .join('');

  const yes = (protocol.biohacking?.yes || [])
    .map((x) => `<li class="yes">${escapeHtml(x)}</li>`)
    .join('');
  const no = (protocol.biohacking?.no || [])
    .map((x) => `<li class="no">${escapeHtml(x)}</li>`)
    .join('');

  const goals = (protocol.objective?.goals || []).map((g) => escapeHtml(g)).join(' · ') || 'Pendiente';

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: ${T.fonts.body}; color: ${T.navy}; margin: 0; }
  h1 { font-family: ${T.fonts.display}; letter-spacing: 0.14em; font-size: 28px; margin: 0; }
  h2 { font-family: ${T.fonts.display}; letter-spacing: 0.1em; color: ${T.accent}; font-size: 14px; border-bottom: 2px solid ${T.accent}; padding-bottom: 6px; }
  .header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 20px; }
  .brand { font-weight: 800; letter-spacing: 0.16em; color: ${T.navy}; }
  .meta { font-size: 12px; color: ${T.silver}; }
  .cover { text-align: center; padding: 40px 0; }
  .cover .name { font-family: ${T.fonts.display}; font-size: 36px; letter-spacing: 0.18em; }
  .kv { display:flex; justify-content:space-between; border-bottom:1px solid #eef2f6; padding:8px 0; font-size:13px; }
  table { width:100%; border-collapse:collapse; font-size:11px; margin-top:8px; }
  th { background:${T.navy}; color:#fff; padding:8px; text-align:left; }
  td { padding:8px; border-bottom:1px solid #e5eaf0; vertical-align:top; }
  .supp { background:#fff; border:1px solid #e5eaf0; border-radius:10px; padding:12px; margin:8px 0; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  li.yes::marker { content: "✅ "; }
  li.no::marker { content: "❌ "; }
  .muted { color:${T.silver}; font-size:11px; }
  .footer { margin-top:24px; font-size:10px; color:${T.silver}; border-top:1px solid #e5eaf0; padding-top:8px; }
</style></head>
<body>
  <div class="header">
    <div class="brand">CANELA COACH®</div>
    <div class="meta">Protocolo v${protocol.version} · ${protocol.status}</div>
  </div>
  <section class="cover">
    <div class="name">${escapeHtml(cliente.nombre.toUpperCase())}</div>
    <p>PROTOCOLO</p>
    <div class="kv"><span>Edad</span><span>${cliente.edad} años</span></div>
    <div class="kv"><span>Estatura</span><span>${cliente.estaturaInicial ? `${(cliente.estaturaInicial * 100).toFixed(0)} cm` : 'Pendiente'}</span></div>
    <div class="kv"><span>Peso inicial</span><span>${pend(protocol.objective?.initialWeightLb)}${protocol.objective?.initialWeightLb != null ? ' lb' : ''}</span></div>
    <div class="kv"><span>Peso actual</span><span>${pend(protocol.objective?.currentWeightLb)}${protocol.objective?.currentWeightLb != null ? ' lb' : ''}</span></div>
    <div class="kv"><span>Objetivo</span><span>${goals}</span></div>
  </section>

  <h2>MENÚ SEMANAL (2 patrones rotativos)</h2>
  <table>
    <thead><tr><th>Día</th><th>Comida 1</th><th>Comida 2</th><th>Comida 3</th><th>Patrón</th></tr></thead>
    <tbody>${mealsRows}</tbody>
  </table>
  ${(protocol.weeklyMenu?.snacksOptional || []).length
    ? `<p class="muted">Snacks opcionales: ${(protocol.weeklyMenu!.snacksOptional || []).map(escapeHtml).join(' · ')}</p>`
    : ''}

  <h2>SUPLEMENTACIÓN</h2>
  ${supplements || '<p class="muted">Pendiente</p>'}

  <h2>BIOHACKING</h2>
  <div class="grid2">
    <div><h3>Sí</h3><ul>${yes || '<li>Pendiente</li>'}</ul></div>
    <div><h3>No</h3><ul>${no || '<li>Pendiente</li>'}</ul></div>
  </div>

  <div class="footer">
    Generado ${new Date().toLocaleString('es-DO')} · Coach: ${escapeHtml(entrenador?.nombre || 'Abraham Canela')} · Confidencial
  </div>
</body></html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const buffer = Buffer.from(
      await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '12mm', left: '10mm', right: '10mm' } })
    );
    return {
      buffer,
      filename: `protocolo-${cliente.nombre.replace(/\s+/g, '-').toLowerCase()}-v${protocol.version}.pdf`,
    };
  } finally {
    await browser.close();
  }
}

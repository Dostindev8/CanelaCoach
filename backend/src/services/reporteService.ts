import puppeteer from 'puppeteer';
import { Evaluacion } from '../models/Evaluacion.js';
import { Cliente, clienteConAntecedentesDescifrados } from '../models/Cliente.js';
import { Entrenador } from '../models/Entrenador.js';
import { generarReporteMensualFromDocs } from './calculos.js';
import { renderizarPlantillaReporte } from './pdfReporte.js';
import { uploadBuffer } from '../config/cloudinary.js';
import { ReporteJob, encolarDLQ, QUEUE_REPORTES } from './reporteQueue.js';
import { getCache } from '../config/redis.js';

export type SocketEmitter = (entrenadorId: string, event: string, payload: unknown) => void;

export async function generarReportePDF(evaluacionId: string): Promise<string> {
  const evaluacion = await Evaluacion.findById(evaluacionId);
  if (!evaluacion) throw new Error('Evaluación no encontrada');

  const clienteDoc = await Cliente.findById(evaluacion.clienteId);
  if (!clienteDoc) throw new Error('Cliente no encontrado');
  const cliente = clienteConAntecedentesDescifrados(clienteDoc) as typeof clienteDoc & {
    antecedentes?: Record<string, string>;
  };

  const entrenador = await Entrenador.findById(evaluacion.entrenadorId).select('nombre');
  const historial = await Evaluacion.find({
    clienteId: evaluacion.clienteId,
    activo: { $ne: false },
  })
    .sort({ fecha: 1 })
    .select('fecha antropometria composicionCorporal')
    .lean();
  const comparativa = generarReporteMensualFromDocs(historial);

  const html = renderizarPlantillaReporte({
    evaluacion,
    cliente,
    entrenadorNombre: entrenador?.nombre || 'Entrenador',
    comparativa,
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
    const pdfBuffer = Buffer.from(
      await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
      })
    );

    const subida = await uploadBuffer(pdfBuffer, {
      folder: `canela-coach/reportes/${cliente._id}`,
      public_id: `reporte-${evaluacion._id}`,
      resource_type: 'raw',
    });

    evaluacion.reporte = {
      ...(evaluacion.reporte || {}),
      pdfUrl: subida.secure_url,
      generadoEn: new Date(),
      enviado: evaluacion.reporte?.enviado || false,
    };
    await evaluacion.save();
    return subida.secure_url;
  } finally {
    await browser.close();
  }
}

export async function procesarJobReporte(job: ReporteJob, emit?: SocketEmitter): Promise<void> {
  const attempts = (job.attempts || 0) + 1;
  try {
    const url = await generarReportePDF(job.evaluacionId);
    emit?.(job.entrenadorId, 'reporte:listo', {
      evaluacionId: job.evaluacionId,
      clienteId: job.clienteId,
      pdfUrl: url,
    });
  } catch (err) {
    console.error(`[worker-reportes] intento ${attempts} falló:`, (err as Error).message);
    if (attempts >= 3) {
      await encolarDLQ({ ...job, attempts }, (err as Error).message);
      emit?.(job.entrenadorId, 'reporte:error', {
        evaluacionId: job.evaluacionId,
        error: 'Falló tras 3 intentos',
      });
      return;
    }
    // Exponential backoff then requeue
    const delay = Math.pow(2, attempts) * 1000;
    await new Promise((r) => setTimeout(r, delay));
    await getCache().lpush(QUEUE_REPORTES, JSON.stringify({ ...job, attempts }));
  }
}

import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { ICliente } from '../models/Cliente.js';
import { escapeHtml } from '../utils/escapeHtml.js';

function createTransport() {
  if (!env.smtp.host || !env.smtp.user) {
    return null;
  }
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    tls: { minVersion: 'TLSv1.2' },
  });
}

function safeHttpsUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    // Block javascript:/data: etc.
    return u.toString();
  } catch {
    return null;
  }
}

export async function enviarReporteCliente(opts: {
  cliente: ICliente;
  pdfUrl: string;
  entrenadorId: string;
}): Promise<{ email?: string; whatsapp?: boolean; simulated: boolean }> {
  const result: { email?: string; whatsapp?: boolean; simulated: boolean } = { simulated: false };
  const transport = createTransport();
  const pdfUrl = safeHttpsUrl(opts.pdfUrl);
  const nombre = escapeHtml(opts.cliente.nombre);
  const codigo = escapeHtml(opts.cliente.codigoCliente);

  if (opts.cliente.email && transport && pdfUrl) {
    await transport.sendMail({
      from: env.smtp.from,
      to: opts.cliente.email,
      subject: `Tu reporte Canela Coach® — ${String(opts.cliente.nombre).replace(/[\r\n]/g, '')}`,
      html: `
        <div style="font-family:sans-serif;background:#F4F7FA;padding:24px">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
            <div style="background:#0B1220;color:#fff;padding:24px">
              <h1 style="margin:0;font-size:20px;letter-spacing:0.08em">CANELA COACH®</h1>
            </div>
            <div style="padding:24px;color:#0B1220">
              <p>Hola <strong>${nombre}</strong>,</p>
              <p>Tu reporte de evaluación física está listo.</p>
              <p><a href="${escapeHtml(pdfUrl)}" style="display:inline-block;background:#2E9BE6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Descargar reporte PDF</a></p>
              <p style="color:#9AA5B1;font-size:13px">Código: ${codigo}</p>
            </div>
          </div>
        </div>
      `,
    });
    result.email = opts.cliente.email;
  } else {
    result.simulated = true;
    result.email = opts.cliente.email || 'sin-email';
    console.log(`[mail] simulado → ${result.email} | ${opts.pdfUrl}`);
  }

  if (opts.cliente.telefono && env.whatsapp.token && env.whatsapp.phoneId && pdfUrl) {
    try {
      await fetch(
        `https://graph.facebook.com/v19.0/${env.whatsapp.phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.whatsapp.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: opts.cliente.telefono.replace(/\D/g, ''),
            type: 'text',
            text: {
              body: `Hola ${String(opts.cliente.nombre).slice(0, 80)}, tu reporte Canela Coach® está listo: ${pdfUrl}`,
            },
          }),
        }
      );
      result.whatsapp = true;
    } catch (err) {
      console.warn('[whatsapp] fallo:', (err as Error).message);
      result.whatsapp = false;
    }
  }

  return result;
}

export async function enviarRecordatorio(opts: {
  email?: string;
  telefono?: string;
  nombre: string;
  dias: number;
}): Promise<void> {
  const transport = createTransport();
  if (opts.email && transport) {
    await transport.sendMail({
      from: env.smtp.from,
      to: opts.email,
      subject: `Recordatorio de reevaluación — Canela Coach®`,
      text: `Hola ${opts.nombre}, han pasado ${opts.dias} días desde tu última evaluación. Agenda tu reevaluación con tu entrenador.`,
    });
  } else {
    console.log(`[recordatorio] simulado → ${opts.nombre} (${opts.dias} días)`);
  }
}

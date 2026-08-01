import { env } from '../config/env.js';

const WA_API_VERSION = 'v20.0';

type WaResult = { ok: boolean; simulated: boolean; error?: string };

function digitsPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const d = String(phone).replace(/\D/g, '');
  return d.length >= 10 ? d : null;
}

async function sendTemplate(opts: {
  to: string;
  template: string;
  language?: string;
  bodyParams: string[];
}): Promise<WaResult> {
  if (!env.whatsapp.token || !env.whatsapp.phoneId) {
    console.log(
      `[whatsapp] simulado template=${opts.template} → ${opts.to} | ${opts.bodyParams.join(' | ')}`
    );
    return { ok: true, simulated: true };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${WA_API_VERSION}/${env.whatsapp.phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.whatsapp.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: opts.to,
          type: 'template',
          template: {
            name: opts.template,
            language: { code: opts.language || 'es_DO' },
            components: [
              {
                type: 'body',
                parameters: opts.bodyParams.map((text) => ({ type: 'text', text: text.slice(0, 60) })),
              },
            ],
          },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[whatsapp] HTTP', res.status, body.slice(0, 200));
      return { ok: false, simulated: false, error: `HTTP ${res.status}` };
    }
    return { ok: true, simulated: false };
  } catch (err) {
    console.warn('[whatsapp] fallo:', (err as Error).message);
    return { ok: false, simulated: false, error: (err as Error).message };
  }
}

/** Plantilla Meta: evaluacion_recordatorio — {{1}} nombre, {{2}} fecha */
export async function notifyUpcomingEvaluation(client: {
  nombre: string;
  telefono?: string | null;
  nextEvaluationDate?: Date | string | null;
}): Promise<WaResult> {
  const to = digitsPhone(client.telefono);
  if (!to) return { ok: false, simulated: false, error: 'sin teléfono' };
  const fecha = client.nextEvaluationDate
    ? new Intl.DateTimeFormat('es-DO', { dateStyle: 'full' }).format(new Date(client.nextEvaluationDate))
    : 'próximamente';
  const firstName = String(client.nombre || 'Cliente').split(/\s+/)[0];
  return sendTemplate({
    to,
    template: process.env.WHATSAPP_TEMPLATE_EVAL || 'evaluacion_recordatorio',
    bodyParams: [firstName, fecha],
  });
}

/** Plantilla Meta: membresia_vencida — {{1}} nombre */
export async function notifyPaymentOverdue(client: {
  nombre: string;
  telefono?: string | null;
}): Promise<WaResult> {
  const to = digitsPhone(client.telefono);
  if (!to) return { ok: false, simulated: false, error: 'sin teléfono' };
  const firstName = String(client.nombre || 'Cliente').split(/\s+/)[0];
  return sendTemplate({
    to,
    template: process.env.WHATSAPP_TEMPLATE_MEMBERSHIP || 'membresia_vencida',
    bodyParams: [firstName],
  });
}

/** Texto libre solo dentro de ventana 24h (cliente escribió primero). */
export async function sendFreeTextWhatsApp(toPhone: string, body: string): Promise<WaResult> {
  const to = digitsPhone(toPhone);
  if (!to) return { ok: false, simulated: false, error: 'sin teléfono' };
  if (!env.whatsapp.token || !env.whatsapp.phoneId) {
    console.log(`[whatsapp] simulado texto → ${to}: ${body.slice(0, 120)}`);
    return { ok: true, simulated: true };
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/${WA_API_VERSION}/${env.whatsapp.phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.whatsapp.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: body.slice(0, 900) },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    return { ok: res.ok, simulated: false, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, simulated: false, error: (err as Error).message };
  }
}

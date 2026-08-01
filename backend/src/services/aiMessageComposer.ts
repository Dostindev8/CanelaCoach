import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';

/**
 * Redacción de seguimiento solo para ventana 24h WhatsApp (texto libre).
 * Si no hay API key → plantilla local segura.
 */
export async function composeEvaluationFollowUp(
  client: { nombre: string; nextEvaluationDate?: Date | string | null },
  latestSummary?: string | null
): Promise<string> {
  const first = String(client.nombre || 'atleta').split(/\s+/)[0];
  const fecha = client.nextEvaluationDate
    ? new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium' }).format(new Date(client.nextEvaluationDate))
    : 'pronto';
  const fallback = `Hola ${first}, te recuerdo tu evaluación Canela Coach el ${fecha}. Si necesitas remarcar, avísame.`;

  if (!env.anthropic?.apiKey && !process.env.ANTHROPIC_API_KEY) {
    return fallback;
  }

  try {
    const anthropic = new Anthropic({
      apiKey: env.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY,
    });
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system:
        'Eres el asistente de Canela Coach. Escribe SOLO el mensaje de WhatsApp, ' +
        'tono motivador y profesional, máximo 3 líneas, máximo 1 emoji, español dominicano natural.',
      messages: [
        {
          role: 'user',
          content:
            `Cliente: ${client.nombre}. Próxima evaluación: ${fecha}. ` +
            `Última evaluación: ${latestSummary || 'primera evaluación'}.`,
        },
      ],
    });
    const text = msg.content.find((b) => b.type === 'text');
    return (text && 'text' in text ? text.text : fallback).trim() || fallback;
  } catch (err) {
    console.warn('[aiMessageComposer]', (err as Error).message);
    return fallback;
  }
}

import type { ScheduledTask } from 'node-cron';
import cron from 'node-cron';
import { Cliente } from '../models/Cliente.js';
import { notifyUpcomingEvaluation } from '../services/whatsappService.js';
import { env } from '../config/env.js';

const REMINDER_WINDOW_DAYS = 2;
let task: ScheduledTask | null = null;

export async function sendEvaluationReminders(): Promise<{ sent: number }> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const dueClients = await Cliente.find({
    activo: true,
    membershipStatus: 'active',
    nextEvaluationDate: { $gte: now, $lte: windowEnd },
    $or: [{ lastReminderSentAt: null }, { lastReminderSentAt: { $lt: startOfDay } }],
  });

  let sent = 0;
  for (const client of dueClients) {
    try {
      const result = await notifyUpcomingEvaluation(client);
      if (result.ok) {
        client.lastReminderSentAt = new Date();
        await client.save();
        sent += 1;
      }
    } catch (err) {
      console.error(`[evaluationReminderJob] ${client._id}:`, (err as Error).message);
    }
  }

  console.log(`[evaluationReminderJob] sent=${sent}`);
  return { sent };
}

/** Cron isolated: failures never crash the HTTP process. */
export function registerEvaluationReminderJob(): void {
  if (env.nodeEnv === 'test') return;
  try {
    task = cron.schedule(
      '0 9 * * *',
      () => {
        sendEvaluationReminders().catch((err) =>
          console.error('[evaluationReminderJob]', (err as Error).message)
        );
      },
      { timezone: 'America/Santo_Domingo' }
    );
    console.log('[cron] evaluationReminderJob → 09:00 America/Santo_Domingo');
  } catch (err) {
    console.error('[cron] evaluationReminderJob failed to register:', (err as Error).message);
  }
}

export function stopEvaluationReminderJob(): void {
  try {
    task?.stop();
    task = null;
  } catch (err) {
    console.error('[cron] evaluationReminderJob stop:', (err as Error).message);
  }
}

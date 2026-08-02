import type { ScheduledTask } from 'node-cron';
import cron from 'node-cron';
import { Cliente } from '../models/Cliente.js';
import { computeMembershipStatus } from '../services/membership.js';
import { notifyPaymentOverdue } from '../services/whatsappService.js';
import { env } from '../config/env.js';

let task: ScheduledTask | null = null;

export async function recalculateMembershipStatuses(): Promise<{ updated: number; notified: number }> {
  const clients = await Cliente.find({
    activo: true,
    membershipStatus: { $in: ['active', 'inactive'] },
  });

  let updated = 0;
  let notified = 0;

  for (const client of clients) {
    const computed = computeMembershipStatus({
      membershipStatus: client.membershipStatus,
      currentPeriodEnd: client.currentPeriodEnd,
      gracePeriodDays: client.gracePeriodDays,
    });
    if (computed !== client.membershipStatus) {
      const wasActive = client.membershipStatus === 'active';
      client.membershipStatus = computed;
      await client.save();
      updated += 1;

      if (wasActive && computed === 'inactive') {
        notifyPaymentOverdue(client).catch((err) =>
          console.error(`[membershipStatusJob] WA ${client._id}:`, (err as Error).message)
        );
        notified += 1;
      }
    }
  }

  console.log(`[membershipStatusJob] updated=${updated} notified=${notified}`);
  return { updated, notified };
}

/** Cron isolated: failures never crash the HTTP process. */
export function registerMembershipStatusJob(): void {
  if (env.nodeEnv === 'test') return;
  try {
    task = cron.schedule(
      '0 6 * * *',
      () => {
        recalculateMembershipStatuses().catch((err) =>
          console.error('[membershipStatusJob]', (err as Error).message)
        );
      },
      { timezone: 'America/Santo_Domingo' }
    );
    console.log('[cron] membershipStatusJob → 06:00 America/Santo_Domingo');
  } catch (err) {
    console.error('[cron] membershipStatusJob failed to register:', (err as Error).message);
  }
}

export function stopMembershipStatusJob(): void {
  try {
    task?.stop();
    task = null;
  } catch (err) {
    console.error('[cron] membershipStatusJob stop:', (err as Error).message);
  }
}

import cron from 'node-cron';
import { Cliente } from '../models/Cliente.js';
import { computeMembershipStatus } from '../services/membership.js';
import { notifyPaymentOverdue } from '../services/whatsappService.js';
import { env } from '../config/env.js';

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

export function registerMembershipStatusJob(): void {
  if (env.nodeEnv === 'test') return;
  cron.schedule('0 6 * * *', () => {
    recalculateMembershipStatuses().catch((err) =>
      console.error('[membershipStatusJob]', (err as Error).message)
    );
  }, { timezone: 'America/Santo_Domingo' });
  console.log('[cron] membershipStatusJob → 06:00 America/Santo_Domingo');
}

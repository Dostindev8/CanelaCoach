import { Types } from 'mongoose';

export type MembershipStatus = 'active' | 'inactive' | 'paused' | 'cancelled';

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'other';

export interface IPaymentHistoryEntry {
  _id?: Types.ObjectId;
  amount: number;
  currency: 'DOP' | 'USD';
  paidAt: Date;
  method: PaymentMethod;
  periodStart: Date;
  periodEnd: Date;
  registeredBy: Types.ObjectId;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Virtual-style computation — grace period after currentPeriodEnd → inactive. */
export function computeMembershipStatus(input: {
  membershipStatus?: MembershipStatus | null;
  currentPeriodEnd?: Date | string | null;
  gracePeriodDays?: number | null;
}): MembershipStatus {
  const stored = input.membershipStatus || 'active';
  if (stored === 'cancelled' || stored === 'paused') return stored;
  if (!input.currentPeriodEnd) return stored === 'inactive' ? 'inactive' : 'active';
  const graceDays = typeof input.gracePeriodDays === 'number' ? input.gracePeriodDays : 5;
  const graceMs = graceDays * 24 * 60 * 60 * 1000;
  const end = new Date(input.currentPeriodEnd).getTime();
  if (!Number.isFinite(end)) return stored;
  const overdue = Date.now() > end + graceMs;
  return overdue ? 'inactive' : 'active';
}

export function defaultPeriodEnd(from = new Date(), days = 30): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

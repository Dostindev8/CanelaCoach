import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ClientStatusBadge } from './ClientStatusBadge';

type Props = {
  clienteId: string;
  cliente: {
    membershipStatus?: string;
    computedStatus?: string;
    currentPeriodEnd?: string;
    gracePeriodDays?: number;
    paymentHistory?: Array<{ amount: number; currency: string; paidAt: string; method: string }>;
  };
  onDone: () => void;
};

export function MembresiaPanel({ clienteId, cliente, onDone }: Props) {
  const [amount, setAmount] = useState('2500');
  const [method, setMethod] = useState<'cash' | 'transfer' | 'card' | 'other'>('transfer');
  const [days, setDays] = useState('30');

  const pagoMut = useMutation({
    mutationFn: async () => {
      const start = new Date();
      const end = new Date(start.getTime() + Number(days) * 86400000);
      return (
        await api.post(`/clientes/${clienteId}/pagos`, {
          amount: Number(amount),
          currency: 'DOP',
          method,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          notes: 'Pago registrado desde ficha',
        })
      ).data;
    },
    onSuccess: onDone,
  });

  return (
    <section className="card-panel space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="panel-text font-display text-lg tracking-wider">MEMBRESÍA Y PAGOS</h2>
        <ClientStatusBadge status={cliente.computedStatus || cliente.membershipStatus} />
      </div>
      <p className="panel-muted text-sm">
        Vence:{' '}
        {cliente.currentPeriodEnd
          ? new Date(cliente.currentPeriodEnd).toLocaleDateString('es-DO')
          : '—'}
        {cliente.gracePeriodDays != null ? ` · gracia ${cliente.gracePeriodDays} días` : ''}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Monto (DOP)</label>
          <input
            className="input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Método</label>
          <select
            className="input"
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
          >
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
            <option value="card">Tarjeta</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div>
          <label className="label">Días de periodo</label>
          <input
            className="input"
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={pagoMut.isPending}
        onClick={() => pagoMut.mutate()}
      >
        {pagoMut.isPending ? 'Registrando…' : 'Registrar pago y reactivar'}
      </button>
      {(cliente.paymentHistory || []).length > 0 && (
        <ul className="space-y-1 border-t border-[var(--cc-panel-border)] pt-3">
          {[...(cliente.paymentHistory || [])]
            .reverse()
            .slice(0, 5)
            .map((p, i) => (
              <li key={i} className="panel-muted text-xs">
                {new Date(p.paidAt).toLocaleDateString('es-DO')} · {p.amount} {p.currency} · {p.method}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

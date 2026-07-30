import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { pendiente } from '../theme/canelaCoach.tokens';

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
] as const;

type Step = 0 | 1 | 2 | 3;

export function ProtocolBuilderPage() {
  const { id: clienteId } = useParams();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>(0);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    initialWeightLb: '' as string | number,
    currentWeightLb: '' as string | number,
    goalsText: 'Bajar de peso\nBajar % de grasa\nRealizar recomposición corporal',
    patternDayMap: {
      monday: 'A',
      tuesday: 'B',
      wednesday: 'A',
      thursday: 'B',
      friday: 'A',
      saturday: 'B',
      sunday: 'A',
    } as Record<string, string>,
    mealPatternA: {
      meal1: '5 huevos + aguacate',
      meal2: 'Pollo horneado + ensalada verde',
      meal3: 'Lomo de cerdo a la plancha + vegetales salteados + plátano maduro',
    },
    mealPatternB: {
      meal1: 'Tuna encebollada + vegetales',
      meal2: 'Fajitas de pollo + vegetales salteados',
      meal3: 'Carne molida + ensalada verde + papas salteadas',
    },
    snacksOptional: 'Café sin azúcar, Yogurt griego, Frutos secos',
    supplementation: [
      { catalogSku: null as string | null, productLabel: 'Vitamina D3 + K2', dose: '5,000 UI', instruction: '3 cápsulas con la primera comida' },
      { catalogSku: null, productLabel: 'Creatina', dose: '5 g', instruction: '2 scoop diarios' },
      { catalogSku: 'vitalage-collagen', productLabel: 'VitalAge Collagen', dose: '1 scoop', instruction: 'Antes de dormir' },
      { catalogSku: 'v-omega-3', productLabel: 'V-Omega 3', dose: '2 cápsulas', instruction: 'Con comida 1 y 2' },
      { catalogSku: 'v-daily', productLabel: 'V-Daily', dose: '1 scoop', instruction: 'En ayunas' },
    ],
    bioYes:
      'Tomar 2-3 L de agua al día. 1 litro con media cucharada de sal marina.\nDormir mínimo 7 horas al día y antes de las 10:00 PM.\nHacer 30-40 min de ejercicio 3-4 veces por semana.',
    bioNo:
      'Aceites refinados usados para freír.\nAlcohol: cerveza, ron, vino.\nAzúcar, refrescos, dulces, comidas procesadas.\nUso de pantallas después de las 9:00 PM.\nComer sin hambre.',
  });

  const { data: catalog } = useQuery({
    queryKey: ['supplement-catalog'],
    queryFn: async () => (await api.get('/supplement-catalog')).data.data,
  });

  const { data: versions, isLoading } = useQuery({
    queryKey: ['protocols', clienteId],
    queryFn: async () => (await api.get(`/clientes/${clienteId}/protocols`)).data.data,
    enabled: !!clienteId,
  });

  const { data: active } = useQuery({
    queryKey: ['protocols-active', clienteId],
    queryFn: async () => (await api.get(`/clientes/${clienteId}/protocols/active`)).data.data,
    enabled: !!clienteId,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const payload = {
        objective: {
          initialWeightLb: form.initialWeightLb === '' ? null : Number(form.initialWeightLb),
          currentWeightLb: form.currentWeightLb === '' ? null : Number(form.currentWeightLb),
          goals: form.goalsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        weeklyMenu: {
          patternDayMap: form.patternDayMap,
          mealPatternA: form.mealPatternA,
          mealPatternB: form.mealPatternB,
          snacksOptional: form.snacksOptional
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        supplementation: form.supplementation,
        biohacking: {
          yes: form.bioYes
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          no: form.bioNo
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      };
      return (await api.post(`/clientes/${clienteId}/protocols`, payload)).data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['protocols', clienteId] });
      setMsg('Protocolo draft creado.');
    },
  });

  const publishMut = useMutation({
    mutationFn: async (id: string) => api.post(`/clientes/${clienteId}/protocols/${id}/publish`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['protocols', clienteId] });
      qc.invalidateQueries({ queryKey: ['protocols-active', clienteId] });
      setMsg('Protocolo publicado.');
    },
  });

  const exportPdf = async (id: string) => {
    const res = await api.get(`/clientes/${clienteId}/protocols/${id}/export.pdf`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `protocolo-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const steps = useMemo(() => ['Objetivo', 'Menú', 'Suplementos', 'Biohacking'], []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24">
      <div>
        <Link to={`/clientes/${clienteId}`} className="text-sm text-accent">
          ← Cliente
        </Link>
        <h1 className="panel-text mt-1 font-display text-fluid-xl tracking-wider">PROTOCOLO</h1>
        <p className="panel-muted text-sm">
          Activo: {active ? `v${active.version}` : 'ninguno'} · Versionado (nunca sobrescribe activo)
        </p>
      </div>

      {msg && (
        <p className="rounded-xl bg-accent/10 px-4 py-3 text-sm" role="status">
          {msg}
        </p>
      )}

      <ol className="flex gap-2 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              className={`panel-step-pill ${step === i ? 'is-active' : ''}`}
              onClick={() => setStep(i as Step)}
            >
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="card-panel space-y-4">
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Peso inicial (lb)</label>
              <input
                className="input"
                type="number"
                value={form.initialWeightLb}
                onChange={(e) => setForm((f) => ({ ...f, initialWeightLb: e.target.value }))}
                placeholder="Pendiente"
              />
            </div>
            <div>
              <label className="label">Peso actual (lb)</label>
              <input
                className="input"
                type="number"
                value={form.currentWeightLb}
                onChange={(e) => setForm((f) => ({ ...f, currentWeightLb: e.target.value }))}
                placeholder="Pendiente"
              />
              <p className="panel-muted mt-1 text-xs">
                Vacío = {pendiente(null)} (no se guarda como 0)
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Objetivos (uno por línea)</label>
              <textarea
                className="input min-h-[100px]"
                value={form.goalsText}
                onChange={(e) => setForm((f) => ({ ...f, goalsText: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {DAYS.map((d) => (
                <div key={d.key}>
                  <label className="label">{d.label}</label>
                  <select
                    className="input"
                    value={form.patternDayMap[d.key]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        patternDayMap: { ...f.patternDayMap, [d.key]: e.target.value },
                      }))
                    }
                  >
                    <option value="A">Patrón A</option>
                    <option value="B">Patrón B</option>
                  </select>
                </div>
              ))}
            </div>
            {(['mealPatternA', 'mealPatternB'] as const).map((pat) => (
              <div key={pat} className="grid gap-2 sm:grid-cols-3">
                <p className="panel-text sm:col-span-3 font-semibold">
                  {pat === 'mealPatternA' ? 'Patrón A' : 'Patrón B'}
                </p>
                {(['meal1', 'meal2', 'meal3'] as const).map((m) => (
                  <div key={m}>
                    <label className="label capitalize">{m}</label>
                    <input
                      className="input"
                      value={form[pat][m]}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          [pat]: { ...f[pat], [m]: e.target.value },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            ))}
            <div>
              <label className="label">Snacks opcionales (coma)</label>
              <input
                className="input"
                value={form.snacksOptional}
                onChange={(e) => setForm((f) => ({ ...f, snacksOptional: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {form.supplementation.map((s, i) => (
              <div key={i} className="grid gap-2 rounded-xl border border-[var(--cc-panel-border)] p-3 sm:grid-cols-2">
                <div>
                  <label className="label">Producto</label>
                  <input
                    className="input"
                    value={s.productLabel}
                    onChange={(e) => {
                      const next = [...form.supplementation];
                      next[i] = { ...next[i], productLabel: e.target.value };
                      setForm((f) => ({ ...f, supplementation: next }));
                    }}
                  />
                </div>
                <div>
                  <label className="label">Catálogo (opcional)</label>
                  <select
                    className="input"
                    value={s.catalogSku || ''}
                    onChange={(e) => {
                      const sku = e.target.value || null;
                      const cat = (catalog || []).find((c: { sku: string }) => c.sku === sku);
                      const next = [...form.supplementation];
                      next[i] = {
                        ...next[i],
                        catalogSku: sku,
                        productLabel: cat?.name || next[i].productLabel,
                      };
                      setForm((f) => ({ ...f, supplementation: next }));
                    }}
                  >
                    <option value="">Sin ficha (label libre)</option>
                    {(catalog || []).map((c: { sku: string; name: string }) => (
                      <option key={c.sku} value={c.sku}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Dosis</label>
                  <input
                    className="input"
                    value={s.dose}
                    onChange={(e) => {
                      const next = [...form.supplementation];
                      next[i] = { ...next[i], dose: e.target.value };
                      setForm((f) => ({ ...f, supplementation: next }));
                    }}
                  />
                </div>
                <div>
                  <label className="label">Instrucción</label>
                  <input
                    className="input"
                    value={s.instruction}
                    onChange={(e) => {
                      const next = [...form.supplementation];
                      next[i] = { ...next[i], instruction: e.target.value };
                      setForm((f) => ({ ...f, supplementation: next }));
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="label">Sí (✅)</label>
              <textarea
                className="input min-h-[160px]"
                value={form.bioYes}
                onChange={(e) => setForm((f) => ({ ...f, bioYes: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">No (❌)</label>
              <textarea
                className="input min-h-[160px]"
                value={form.bioNo}
                onChange={(e) => setForm((f) => ({ ...f, bioNo: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-[var(--cc-panel-border)] bg-[var(--cc-panel-bg-app)]/95 p-4 sm:flex-row sm:justify-between">
        <button
          type="button"
          className="btn-ghost"
          disabled={step === 0}
          onClick={() => setStep((s) => (s - 1) as Step)}
        >
          Anterior
        </button>
        {step < 3 ? (
          <button type="button" className="btn-primary" onClick={() => setStep((s) => (s + 1) as Step)}>
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            disabled={createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? 'Guardando…' : 'Crear borrador'}
          </button>
        )}
      </div>

      <section className="card-panel">
        <h2 className="panel-text mb-3 font-display text-lg tracking-wider">HISTORIAL DE VERSIONES</h2>
        {isLoading ? (
          <div className="h-16 animate-pulse rounded-xl bg-silver/20" />
        ) : (
          <ul className="space-y-3">
            {(versions || []).map(
              (p: { _id: string; version: number; status: string; updatedAt: string }) => (
                <li
                  key={p._id}
                  className="flex flex-col gap-2 border-b border-[var(--cc-panel-border)] pb-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="panel-text font-semibold">
                      v{p.version} · <span className="capitalize">{p.status}</span>
                    </p>
                    <p className="panel-muted text-xs">
                      {new Date(p.updatedAt).toLocaleString('es-DO')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.status === 'draft' && (
                      <button
                        type="button"
                        className="btn-primary text-sm"
                        onClick={() => publishMut.mutate(p._id)}
                      >
                        Publicar
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-ghost text-sm"
                      onClick={() => void exportPdf(p._id)}
                    >
                      Exportar PDF
                    </button>
                  </div>
                </li>
              )
            )}
            {(versions || []).length === 0 && (
              <p className="panel-muted text-sm">Sin protocolos aún.</p>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

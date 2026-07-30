import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { SubidaFoto } from '../components/ui/SubidaFoto';
import { CelebrationOverlay } from '../components/ui/CelebrationOverlay';
import { SmartScaleDiscrepancyBanner } from '../components/evaluacion/SmartScaleDiscrepancyBanner';
import { useQuery } from '@tanstack/react-query';

const STEPS = [
  'Antropometría',
  'Pliegues',
  'Diámetros óseos',
  'Composición',
  'Báscula inteligente',
  'Postural',
  'Funcional',
  'Condición física',
  'Fotografías',
  'Diagnóstico',
  'Plan y score',
];

const PUNTOS_CATALOGO = [
  'Continuar reduciendo el % de grasa',
  'Seguir aumentando fuerza y masa muscular',
  'Mejorar cumplimiento de dieta y cardio',
  'Tomar suplementos recomendados',
  'Mejorar calidad del descanso',
  'Hidratación constante',
  'Manejo del estrés',
  'Seguimiento y disciplina',
];

const ANTROPO_LABELS: Record<string, string> = {
  peso: 'Peso (kg)',
  estatura: 'Estatura (m)',
  cuello: 'Cuello (cm)',
  torax: 'Torso (cm)',
  hombros: 'Hombros (cm)',
  pecho: 'Pecho (cm)',
  biceps: 'Bíceps (cm)',
  brazoDerecho: 'Brazo derecho (cm)',
  brazoIzquierdo: 'Brazo izquierdo (cm)',
  antebrazo: 'Antebrazo (cm)',
  cintura: 'Cintura (cm)',
  abdomen: 'Abdomen (cm)',
  cadera: 'Cadera (cm)',
  gluteos: 'Glúteos (cm)',
  cuadriceps: 'Cuádriceps (cm)',
  musloDerecho: 'Muslo derecho (cm)',
  musloIzquierdo: 'Muslo izquierdo (cm)',
  pantorrilla: 'Pantorrilla (cm)',
};

const PLIEGUES_LABELS: Record<string, string> = {
  tricipital: 'Tricipital (mm)',
  pectoral: 'Pectoral (mm)',
  escapular: 'Escapular (mm)',
  abdominal: 'Abdominal (mm)',
  suprailiaco: 'Suprailíaco (mm)',
  muslo: 'Muslo (mm)',
  pantorrilla: 'Pantorrilla (mm)',
};

const DIAMETROS_LABELS: Record<string, string> = {
  codo: 'Codo (cm)',
  rodilla: 'Rodilla (cm)',
  muneca: 'Muñeca (cm)',
};

type FormState = Record<string, unknown>;

const empty: FormState = {
  antropometria: {
    peso: '',
    estatura: '',
    cintura: '',
    gluteos: '',
    cuello: '',
    torax: '',
    hombros: '',
    pecho: '',
    biceps: '',
    brazoDerecho: '',
    brazoIzquierdo: '',
    antebrazo: '',
    abdomen: '',
    cadera: '',
    cuadriceps: '',
    musloDerecho: '',
    musloIzquierdo: '',
    pantorrilla: '',
  },
  pliegues: {
    tricipital: '',
    pectoral: '',
    escapular: '',
    abdominal: '',
    suprailiaco: '',
    muslo: '',
    pantorrilla: '',
  },
  diametrosOseos: { codo: '', rodilla: '', muneca: '' },
  composicionCorporal: { grasaCorporalPct: '', masaMuscular: '', aguaCorporalPct: '', grasaVisceral: '' },
  weightLb: '',
  observacionesDesdeUltima: '',
  smartScale: {
    status: '',
    weightKg: '',
    bmi: '',
    bodyFatPercent: '',
    muscleMassKg: '',
    waterPercent: '',
    visceralFat: '',
    metabolismKcalDay: '',
    heightCmDevice: '',
    ageDeviceEstimate: '',
  },
  evaluacionPostural: { cabeza: '', hombros: '', columna: '', pelvis: '', rodillas: '' },
  evaluacionFuncional: { movilidadHombros: '', sentadilla: '', equilibrio: '', dolorActual: '', limitaciones: '' },
  condicionFisica: { frecuenciaCardiaca: '', plank: '', flexiones: '', sentadillas: '', fuerzaGeneral: '' },
  fotografias: { frenteUrl: '', perfilDerechoUrl: '', espaldaUrl: '' },
  diagnostico: { resumen: '', potencial: '', composicionCorporalTexto: '' },
  planAccion: { focoPrincipal: '', itemsText: '' },
  notasEntrenador: '',
  objetivosProximoMes: '',
  pesoObjetivoEditable: '',
  puntosAMejorar: [] as string[],
  puntoLibre: '',
};

function num(v: unknown): number | undefined {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function WizardEvaluacionPage() {
  const { id: clienteId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(empty);
  const [evaluacionId, setEvaluacionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftMsg, setDraftMsg] = useState('');
  const [error, setError] = useState('');
  const [offerDraft, setOfferDraft] = useState<FormState | null>(null);
  const [prevAntropo, setPrevAntropo] = useState<Record<string, number>>({});
  const [celebration, setCelebration] = useState<{
    score: number;
    delta: number;
    motivo: string;
  } | null>(null);
  const [savedEvalId, setSavedEvalId] = useState<string | null>(null);

  const { data: clienteData } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: async () => (await api.get(`/clientes/${clienteId}`)).data.data,
    enabled: !!clienteId,
  });
  const clienteEdad = clienteData?.edad as number | undefined;

  useEffect(() => {
    if (!clienteId) return;
    api.get(`/clientes/${clienteId}/borrador`).then(({ data }) => {
      if (data.data) setOfferDraft(data.data as FormState);
    });
    api.get(`/clientes/${clienteId}/evaluaciones/latest`).then(({ data }) => {
      const ant = data.data?.antropometria;
      if (ant) setPrevAntropo(ant);
    }).catch(() => undefined);
  }, [clienteId]);

  const autosave = useCallback(async () => {
    if (!clienteId) return;
    setSaving(true);
    try {
      await api.put(`/clientes/${clienteId}/borrador`, form);
      setDraftMsg(`Borrador guardado ${new Date().toLocaleTimeString()}`);
    } catch {
      setDraftMsg('No se pudo guardar borrador');
    } finally {
      setSaving(false);
    }
  }, [clienteId, form]);

  useEffect(() => {
    if (!clienteId || offerDraft) return;
    const t = setInterval(() => void autosave(), 10000);
    return () => clearInterval(t);
  }, [autosave, clienteId, offerDraft]);

  const setNested = (section: string, key: string, value: string) => {
    setForm((f) => ({
      ...f,
      [section]: { ...(f[section] as object), [key]: value },
    }));
  };

  const togglePunto = (p: string) => {
    setForm((f) => {
      const list = (f.puntosAMejorar as string[]) || [];
      const next = list.includes(p) ? list.filter((x) => x !== p) : [...list, p];
      return { ...f, puntosAMejorar: next };
    });
  };

  const submit = async () => {
    setError('');
    try {
      const ant = form.antropometria as Record<string, string>;
      const comp = form.composicionCorporal as Record<string, string>;
      const cond = form.condicionFisica as Record<string, string>;
      const plan = form.planAccion as { focoPrincipal: string; itemsText: string };
      const puntos = [...((form.puntosAMejorar as string[]) || [])];
      const libre = String(form.puntoLibre || '').trim();
      if (libre) puntos.push(libre);

      const payload = {
        antropometria: {
          peso: num(ant.peso),
          estatura: num(ant.estatura),
          cintura: num(ant.cintura),
          gluteos: num(ant.gluteos),
          cuello: num(ant.cuello),
          torax: num(ant.torax),
          hombros: num(ant.hombros),
          pecho: num(ant.pecho),
          biceps: num(ant.biceps),
          brazoDerecho: num(ant.brazoDerecho),
          brazoIzquierdo: num(ant.brazoIzquierdo),
          antebrazo: num(ant.antebrazo),
          abdomen: num(ant.abdomen),
          cadera: num(ant.cadera),
          cuadriceps: num(ant.cuadriceps),
          musloDerecho: num(ant.musloDerecho),
          musloIzquierdo: num(ant.musloIzquierdo),
          pantorrilla: num(ant.pantorrilla),
        },
        pliegues: Object.fromEntries(
          Object.entries(form.pliegues as Record<string, string>).map(([k, v]) => [k, num(v)])
        ),
        diametrosOseos: Object.fromEntries(
          Object.entries(form.diametrosOseos as Record<string, string>).map(([k, v]) => [k, num(v)])
        ),
        composicionCorporal: {
          grasaCorporalPct: num(comp.grasaCorporalPct),
          masaMuscular: num(comp.masaMuscular),
          aguaCorporalPct: num(comp.aguaCorporalPct),
          grasaVisceral: num(comp.grasaVisceral),
        },
        weightLb: num(form.weightLb),
        observacionesDesdeUltima: String(form.observacionesDesdeUltima || '') || null,
        smartScale: (() => {
          const ss = form.smartScale as Record<string, string>;
          const status = ss.status as '' | 'Bajo' | 'Saludable' | 'Alto' | 'Obeso';
          return {
            status: status || null,
            weightKg: num(ss.weightKg) ?? null,
            bmi: num(ss.bmi) ?? null,
            bodyFatPercent: num(ss.bodyFatPercent) ?? null,
            muscleMassKg: num(ss.muscleMassKg) ?? null,
            waterPercent: num(ss.waterPercent) ?? null,
            visceralFat: num(ss.visceralFat) ?? null,
            metabolismKcalDay: num(ss.metabolismKcalDay) ?? null,
            heightCmDevice: num(ss.heightCmDevice) ?? null,
            ageDeviceEstimate: num(ss.ageDeviceEstimate) ?? null,
          };
        })(),
        evaluacionPostural: form.evaluacionPostural,
        evaluacionFuncional: form.evaluacionFuncional,
        condicionFisica: {
          frecuenciaCardiaca: num(cond.frecuenciaCardiaca),
          plank: num(cond.plank),
          flexiones: num(cond.flexiones),
          sentadillas: num(cond.sentadillas),
          fuerzaGeneral: cond.fuerzaGeneral || undefined,
        },
        fotografias: form.fotografias,
        diagnostico: form.diagnostico,
        planAccion: {
          focoPrincipal: plan.focoPrincipal,
          items: (plan.itemsText || '')
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        notasEntrenador: String(form.notasEntrenador || '') || undefined,
        objetivosProximoMes: String(form.objetivosProximoMes || '') || undefined,
        pesoObjetivoEditable: num(form.pesoObjetivoEditable),
        puntosAMejorar: puntos,
      };

      let evalId = evaluacionId;
      let saved;
      if (!evalId) {
        const { data } = await api.post(`/clientes/${clienteId}/evaluaciones`, payload);
        saved = data.data;
        evalId = saved._id;
        setEvaluacionId(evalId);
      } else {
        const { data } = await api.put(`/evaluaciones/${evalId}`, payload);
        saved = data.data;
      }

      await api.delete(`/clientes/${clienteId}/borrador`);
      setSavedEvalId(evalId);

      if (saved?.scoreFisico?.celebracion) {
        setCelebration({
          score: saved.scoreFisico.valor,
          delta: saved.scoreFisico.delta,
          motivo: saved.scoreFisico.motivo,
        });
      } else {
        navigate(`/clientes/${clienteId}/evaluaciones/${evalId}/reporte`);
      }
    } catch (err: unknown) {
      const m =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        'Error al guardar';
      setError(m);
    }
  };

  if (offerDraft) {
    return (
      <div className="card-panel mx-auto max-w-lg space-y-4">
        <h2 className="panel-text font-display text-xl tracking-wider">BORRADOR ENCONTRADO</h2>
        <p className="panel-muted text-sm">Hay un borrador de evaluación sin terminar. ¿Deseas recuperarlo?</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => {
              setForm({ ...empty, ...offerDraft });
              setOfferDraft(null);
            }}
          >
            Recuperar
          </button>
          <button
            type="button"
            className="btn-ghost flex-1"
            onClick={async () => {
              await api.delete(`/clientes/${clienteId}/borrador`);
              setOfferDraft(null);
            }}
          >
            Descartar
          </button>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24 sm:pb-0">
      <CelebrationOverlay
        open={!!celebration}
        score={celebration?.score || 0}
        delta={celebration?.delta || 0}
        motivo={celebration?.motivo || ''}
        onClose={() => {
          setCelebration(null);
          if (savedEvalId) navigate(`/clientes/${clienteId}/evaluaciones/${savedEvalId}/reporte`);
          else navigate(`/clientes/${clienteId}`);
        }}
      />

      <div>
        <h1 className="panel-text font-display text-fluid-lg tracking-wider">WIZARD DE EVALUACIÓN</h1>
        <p className="panel-muted text-sm">
          Paso {step + 1} de {STEPS.length}: {STEPS[step]}
        </p>

        <ol
          className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Progreso del wizard"
        >
          {STEPS.map((name, index) => (
            <li
              key={name}
              className={`panel-step-pill ${index === step ? 'is-active' : index < step ? 'is-done' : ''}`}
              aria-current={index === step ? 'step' : undefined}
            >
              {index + 1}. {name}
            </li>
          ))}
        </ol>

        <div
          className="panel-progress-track mt-4"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="panel-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="panel-muted mt-2 text-xs" aria-live="polite">
          {saving ? 'Guardando…' : draftMsg}
        </p>
      </div>

      <div className="card-panel">
        {step === 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Object.keys(form.antropometria as object).map((k) => (
              <div key={k}>
                <label className="label">{ANTROPO_LABELS[k] || k}</label>
                <input
                  className="input"
                  inputMode="decimal"
                  type="number"
                  step="any"
                  value={(form.antropometria as Record<string, string>)[k]}
                  onChange={(e) => setNested('antropometria', k, e.target.value)}
                />
                {typeof prevAntropo[k] === 'number' && (
                  <p className="panel-muted mt-1 text-xs">
                    Anterior: {prevAntropo[k]}{' '}
                    {k === 'peso' ? 'kg' : k === 'estatura' ? 'm' : 'cm'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {step === 1 && (
          <div className="space-y-3">
            <p className="panel-muted text-xs">
              Pliegues en mm (Jackson-Pollock 7 sitios). Se usan para % grasa automático.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {Object.keys(form.pliegues as object).map((k) => (
                <div key={k}>
                  <label className="label">{PLIEGUES_LABELS[k] || k}</label>
                  <input
                    className="input"
                    inputMode="decimal"
                    type="number"
                    step="any"
                    value={(form.pliegues as Record<string, string>)[k]}
                    onChange={(e) => setNested('pliegues', k, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <p className="panel-muted text-xs">Diámetros óseos (cm) — masa ósea Von Döbeln.</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {Object.keys(form.diametrosOseos as object).map((k) => (
                <div key={k}>
                  <label className="label">{DIAMETROS_LABELS[k] || k}</label>
                  <input
                    className="input"
                    inputMode="decimal"
                    type="number"
                    step="any"
                    value={(form.diametrosOseos as Record<string, string>)[k]}
                    onChange={(e) => setNested('diametrosOseos', k, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <p className="panel-muted col-span-full text-xs">
              Opcional si ya capturaste pliegues — el motor calculará automáticamente al guardar.
            </p>
            <div>
              <label className="label">Peso (lb)</label>
              <input
                className="input"
                type="number"
                step="any"
                value={String(form.weightLb || '')}
                onChange={(e) => setForm((f) => ({ ...f, weightLb: e.target.value }))}
                placeholder="Pendiente"
              />
            </div>
            {Object.keys(form.composicionCorporal as object).map((k) => (
              <div key={k}>
                <label className="label capitalize">{k}</label>
                <input
                  className="input"
                  inputMode="decimal"
                  type="number"
                  step="any"
                  value={(form.composicionCorporal as Record<string, string>)[k]}
                  onChange={(e) => setNested('composicionCorporal', k, e.target.value)}
                  placeholder="Pendiente"
                />
              </div>
            ))}
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4">
            <SmartScaleDiscrepancyBanner
              heightCmDevice={num((form.smartScale as Record<string, string>).heightCmDevice)}
              heightCmProfile={
                num((form.antropometria as Record<string, string>).estatura)
                  ? (num((form.antropometria as Record<string, string>).estatura)! > 3
                      ? num((form.antropometria as Record<string, string>).estatura)
                      : num((form.antropometria as Record<string, string>).estatura)! * 100)
                  : undefined
              }
              ageDeviceEstimate={num((form.smartScale as Record<string, string>).ageDeviceEstimate)}
              ageProfile={clienteEdad}
            />
            <p className="panel-muted text-xs">
              Datos del dispositivo — nunca se fusionan con el perfil del cliente.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="label">Estado</label>
                <select
                  className="input"
                  value={(form.smartScale as Record<string, string>).status}
                  onChange={(e) => setNested('smartScale', 'status', e.target.value)}
                >
                  <option value="">Pendiente</option>
                  <option value="Bajo">Bajo</option>
                  <option value="Saludable">Saludable</option>
                  <option value="Alto">Alto</option>
                  <option value="Obeso">Obeso</option>
                </select>
              </div>
              {Object.keys(form.smartScale as object)
                .filter((k) => k !== 'status')
                .map((k) => (
                  <div key={k}>
                    <label className="label capitalize">{k}</label>
                    <input
                      className="input"
                      type="number"
                      step="any"
                      value={(form.smartScale as Record<string, string>)[k]}
                      onChange={(e) => setNested('smartScale', k, e.target.value)}
                      placeholder="Pendiente"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}
        {step === 5 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Object.keys(form.evaluacionPostural as object).map((k) => (
              <div key={k}>
                <label className="label capitalize">{k}</label>
                <input
                  className="input"
                  value={(form.evaluacionPostural as Record<string, string>)[k]}
                  onChange={(e) => setNested('evaluacionPostural', k, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
        {step === 6 && (
          <div className="grid grid-cols-1 gap-3">
            {Object.keys(form.evaluacionFuncional as object).map((k) => (
              <div key={k}>
                <label className="label capitalize">{k}</label>
                <input
                  className="input"
                  value={(form.evaluacionFuncional as Record<string, string>)[k]}
                  onChange={(e) => setNested('evaluacionFuncional', k, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
        {step === 7 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Object.keys(form.condicionFisica as object).map((k) => (
              <div key={k}>
                <label className="label capitalize">{k}</label>
                <input
                  className="input"
                  value={(form.condicionFisica as Record<string, string>)[k]}
                  onChange={(e) => setNested('condicionFisica', k, e.target.value)}
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="label">Observaciones desde última medición</label>
              <textarea
                className="input min-h-[80px]"
                value={String(form.observacionesDesdeUltima || '')}
                onChange={(e) => setForm((f) => ({ ...f, observacionesDesdeUltima: e.target.value }))}
                placeholder="Pendiente"
              />
            </div>
          </div>
        )}
        {step === 8 && (
          <div className="space-y-4">
            <p className="panel-muted text-sm">
              Guarda primero la evaluación para subir fotos, o continúa y súbelas después desde la ficha.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                if (evaluacionId) return;
                const { data } = await api.post(`/clientes/${clienteId}/evaluaciones`, {
                  antropometria: {
                    peso: num((form.antropometria as Record<string, string>).peso),
                    estatura: num((form.antropometria as Record<string, string>).estatura),
                  },
                });
                setEvaluacionId(data.data._id);
              }}
            >
              {evaluacionId ? `Eval ${evaluacionId.slice(-6)}` : 'Crear borrador para fotos'}
            </button>
            {evaluacionId && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {(['frente', 'perfilDerecho', 'espalda'] as const).map((tipo) => (
                  <SubidaFoto
                    key={tipo}
                    evaluacionId={evaluacionId}
                    tipo={tipo}
                    url={
                      (form.fotografias as Record<string, string>)[
                        `${tipo === 'frente' ? 'frente' : tipo === 'espalda' ? 'espalda' : 'perfilDerecho'}Url`
                      ]
                    }
                    onUploaded={(url) => {
                      const field =
                        tipo === 'frente' ? 'frenteUrl' : tipo === 'espalda' ? 'espaldaUrl' : 'perfilDerechoUrl';
                      setNested('fotografias', field, url);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {step === 9 && (
          <div className="space-y-3">
            {Object.keys(form.diagnostico as object).map((k) => (
              <div key={k}>
                <label className="label capitalize">{k}</label>
                <textarea
                  className="input min-h-[88px]"
                  value={(form.diagnostico as Record<string, string>)[k]}
                  onChange={(e) => setNested('diagnostico', k, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
        {step === 10 && (
          <div className="space-y-4">
            <div>
              <label className="label">Foco principal</label>
              <input
                className="input"
                value={(form.planAccion as { focoPrincipal: string }).focoPrincipal}
                onChange={(e) => setNested('planAccion', 'focoPrincipal', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Acciones (una por línea)</label>
              <textarea
                className="input min-h-[100px]"
                value={(form.planAccion as { itemsText: string }).itemsText}
                onChange={(e) => setNested('planAccion', 'itemsText', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Notas del entrenador</label>
              <textarea
                className="input min-h-[80px]"
                value={String(form.notasEntrenador || '')}
                onChange={(e) => setForm((f) => ({ ...f, notasEntrenador: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Objetivos próximo mes</label>
              <textarea
                className="input min-h-[80px]"
                value={String(form.objetivosProximoMes || '')}
                onChange={(e) => setForm((f) => ({ ...f, objetivosProximoMes: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Peso objetivo (kg, editable)</label>
              <input
                className="input"
                inputMode="decimal"
                type="number"
                step="any"
                value={String(form.pesoObjetivoEditable || '')}
                onChange={(e) => setForm((f) => ({ ...f, pesoObjetivoEditable: e.target.value }))}
              />
            </div>
            <div>
              <p className="label mb-2">Puntos a mejorar próximo mes</p>
              <div className="flex flex-wrap gap-2">
                {PUNTOS_CATALOGO.map((p) => {
                  const selected = ((form.puntosAMejorar as string[]) || []).includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      className={`rounded-lg border px-3 py-1.5 text-left text-xs ${
                        selected
                          ? 'border-accent bg-accent/15 text-accent'
                          : 'border-[var(--cc-panel-border)] panel-muted'
                      }`}
                      onClick={() => togglePunto(p)}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <input
                className="input mt-3"
                placeholder="Texto libre adicional…"
                value={String(form.puntoLibre || '')}
                onChange={(e) => setForm((f) => ({ ...f, puntoLibre: e.target.value }))}
              />
            </div>
            <p className="panel-muted text-xs italic">
              Estimación basada en métodos antropométricos estándar — no constituye diagnóstico médico.
            </p>
          </div>
        )}
      </div>

      {error && <p className="panel-negative text-sm">{error}</p>}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-3 border-t border-[var(--cc-panel-border)] bg-[var(--cc-panel-bg-app)]/95 px-4 py-4 backdrop-blur-sm sm:static sm:mx-0 sm:flex-row sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button
          type="button"
          className="btn-ghost w-full sm:w-auto"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          Atrás
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => setStep((s) => s + 1)}>
            Siguiente
          </button>
        ) : (
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => void submit()}>
            Finalizar evaluación
          </button>
        )}
      </div>
    </div>
  );
}

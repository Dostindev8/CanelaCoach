import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const STEPS = [
  'Datos personales',
  'Objetivo',
  'Historial médico',
  'Actividad física',
  'Nutrición',
  'Estilo de vida',
  'Disponibilidad',
  'Consentimiento',
] as const;

const OBJETIVOS = [
  'pérdida de grasa',
  'ganancia muscular',
  'tonificación',
  'salud general',
  'preparación deportiva',
  'otro',
] as const;

const CONDICIONES = [
  'Diabetes',
  'Hipertensión',
  'Problemas cardíacos',
  'Tiroides',
  'Asma',
  'Otro',
];

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const CONSENT_TEXT = `CONSENTIMIENTO INFORMADO — EVALUACIONES FÍSICAS Y TRATAMIENTO DE DATOS DE SALUD

En cumplimiento de la Ley 172-13 sobre Protección de Datos de Carácter Personal de la República Dominicana, declaro que:

1. Autorizo a Canela Coach® y a mi entrenador asignado a recopilar, almacenar y procesar mis datos personales y de salud relacionados con evaluaciones físicas, medidas corporales, composición corporal y hábitos, con fines exclusivos de seguimiento deportivo y elaboración de planes de entrenamiento.

2. Entiendo que las evaluaciones físicas NO constituyen diagnóstico médico ni sustituyen atención clínica profesional.

3. Puedo solicitar acceso, rectificación o eliminación de mis datos contactando a mi entrenador o a soporte@canelacoach.com.

4. Mis datos no serán compartidos con terceros ajenos al servicio sin mi autorización, salvo obligación legal.

Al firmar digitalmente y marcar las casillas de aceptación, confirmo haber leído y comprendido este consentimiento.`;

type IntakeForm = {
  datosPersonales: {
    ocupacion: string;
    telefono: string;
    contactoEmergenciaNombre: string;
    contactoEmergenciaTelefono: string;
  };
  objetivoPrincipal: (typeof OBJETIVOS)[number] | '';
  objetivoDetalle: string;
  historialMedico: {
    condicionesDiagnosticadas: string[];
    medicamentosActuales: string;
    cirugiasLesiones: string;
    restriccionesFisicas: string;
    autorizacionMedica: boolean;
  };
  historialActividadFisica: {
    entrenoAntes: boolean;
    tiempoEntrenando: string;
    actividadActual: string;
    nivelActividad: 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy activo' | '';
  };
  nutricion: {
    dietaActual: string;
    alergiasIntolerancias: string;
    comidasPorDia: string;
    consumoAguaLitros: string;
  };
  estiloDeVida: {
    horasSueno: string;
    nivelEstres: 'bajo' | 'moderado' | 'alto' | '';
    consumoAlcohol: 'nunca' | 'ocasional' | 'frecuente' | '';
    consumoTabaco: boolean;
    ocupacionSedentaria: boolean;
  };
  disponibilidad: {
    diasDisponibles: string[];
    horarioPreferido: string;
    accesoGimnasio: boolean;
    equipoDisponible: string;
  };
  consentimientoInformado: {
    aceptaTerminos: boolean;
    aceptaEvaluacionesFisicas: boolean;
    firmaDigital: string;
  };
};

const emptyForm = (): IntakeForm => ({
  datosPersonales: {
    ocupacion: '',
    telefono: '',
    contactoEmergenciaNombre: '',
    contactoEmergenciaTelefono: '',
  },
  objetivoPrincipal: '',
  objetivoDetalle: '',
  historialMedico: {
    condicionesDiagnosticadas: [],
    medicamentosActuales: '',
    cirugiasLesiones: '',
    restriccionesFisicas: '',
    autorizacionMedica: false,
  },
  historialActividadFisica: {
    entrenoAntes: false,
    tiempoEntrenando: '',
    actividadActual: '',
    nivelActividad: '',
  },
  nutricion: {
    dietaActual: '',
    alergiasIntolerancias: '',
    comidasPorDia: '3',
    consumoAguaLitros: '2',
  },
  estiloDeVida: {
    horasSueno: '7',
    nivelEstres: '',
    consumoAlcohol: '',
    consumoTabaco: false,
    ocupacionSedentaria: false,
  },
  disponibilidad: {
    diasDisponibles: [],
    horarioPreferido: '',
    accesoGimnasio: true,
    equipoDisponible: '',
  },
  consentimientoInformado: {
    aceptaTerminos: false,
    aceptaEvaluacionesFisicas: false,
    firmaDigital: '',
  },
});

function validateStep(step: number, form: IntakeForm): string | null {
  if (step === 0) {
    if (form.datosPersonales.telefono.trim().length < 7) return 'Teléfono requerido (mín. 7 caracteres)';
  }
  if (step === 1) {
    if (!form.objetivoPrincipal) return 'Selecciona un objetivo principal';
  }
  if (step === 3) {
    if (!form.historialActividadFisica.nivelActividad) return 'Selecciona nivel de actividad';
  }
  if (step === 7) {
    if (!form.consentimientoInformado.aceptaTerminos) return 'Debes aceptar los términos';
    if (!form.consentimientoInformado.aceptaEvaluacionesFisicas) return 'Debes aceptar las evaluaciones físicas';
    if (form.consentimientoInformado.firmaDigital.trim().length < 2) return 'Firma digital requerida';
  }
  return null;
}

export function IntakeQuestionnairePage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<IntakeForm>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [stepError, setStepError] = useState('');
  const [done, setDone] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['cuestionario', id],
    queryFn: async () => (await api.get(`/clientes/${id}/cuestionario-ingreso`)).data.data,
    enabled: !!id,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      ...emptyForm(),
      ...existing,
      datosPersonales: { ...emptyForm().datosPersonales, ...existing.datosPersonales },
      historialMedico: { ...emptyForm().historialMedico, ...existing.historialMedico },
      historialActividadFisica: {
        ...emptyForm().historialActividadFisica,
        ...existing.historialActividadFisica,
      },
      nutricion: {
        ...emptyForm().nutricion,
        ...existing.nutricion,
        comidasPorDia: String(existing.nutricion?.comidasPorDia ?? 3),
        consumoAguaLitros: String(existing.nutricion?.consumoAguaLitros ?? 2),
      },
      estiloDeVida: {
        ...emptyForm().estiloDeVida,
        ...existing.estiloDeVida,
        horasSueno: String(existing.estiloDeVida?.horasSueno ?? 7),
      },
      disponibilidad: { ...emptyForm().disponibilidad, ...existing.disponibilidad },
      consentimientoInformado: {
        ...emptyForm().consentimientoInformado,
        ...existing.consentimientoInformado,
        firmaDigital: existing.consentimientoInformado?.firmaDigital || '',
      },
      objetivoPrincipal: existing.objetivoPrincipal || '',
      objetivoDetalle: existing.objetivoDetalle || '',
    });
  }, [existing]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        nutricion: {
          ...form.nutricion,
          comidasPorDia: Number(form.nutricion.comidasPorDia) || undefined,
          consumoAguaLitros: Number(form.nutricion.consumoAguaLitros) || undefined,
        },
        estiloDeVida: {
          ...form.estiloDeVida,
          horasSueno: Number(form.estiloDeVida.horasSueno) || undefined,
        },
        consentimientoInformado: {
          ...form.consentimientoInformado,
          fechaConsentimiento: new Date().toISOString(),
        },
      };
      if (existing && editing) {
        return (await api.put(`/clientes/${id}/cuestionario-ingreso`, payload)).data;
      }
      return (await api.post(`/clientes/${id}/cuestionario-ingreso`, payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cuestionario', id] });
      qc.invalidateQueries({ queryKey: ['cliente', id] });
      setDone(true);
      setEditing(false);
    },
  });

  const next = () => {
    const err = validateStep(step, form);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError('');
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else saveMut.mutate();
  };

  const toggleCond = (c: string) => {
    setForm((f) => {
      const list = f.historialMedico.condicionesDiagnosticadas;
      const nextList = list.includes(c) ? list.filter((x) => x !== c) : [...list, c];
      return { ...f, historialMedico: { ...f.historialMedico, condicionesDiagnosticadas: nextList } };
    });
  };

  const toggleDia = (d: string) => {
    setForm((f) => {
      const list = f.disponibilidad.diasDisponibles;
      const nextList = list.includes(d) ? list.filter((x) => x !== d) : [...list, d];
      return { ...f, disponibilidad: { ...f.disponibilidad, diasDisponibles: nextList } };
    });
  };

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-silver/20" />;
  }

  if (done) {
    return (
      <div className="card-panel mx-auto max-w-lg space-y-4 text-center">
        <h1 className="panel-text font-display text-xl tracking-wider">PERFIL LISTO</h1>
        <p className="panel-muted text-sm">
          El cuestionario de ingreso quedó guardado. Tu entrenador realizará la primera evaluación física
          cuando corresponda.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to={`/clientes/${id}`} className="btn-primary">
            Volver al cliente
          </Link>
          <Link to={`/clientes/${id}/evaluacion/nueva`} className="btn-ghost">
            Nueva evaluación
          </Link>
        </div>
      </div>
    );
  }

  if (existing && !editing) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link to={`/clientes/${id}`} className="text-sm text-accent">
          ← Cliente
        </Link>
        <h1 className="panel-text font-display text-fluid-xl tracking-wider">CUESTIONARIO DE INGRESO</h1>
        <div className="card-panel space-y-3 text-sm">
          <p className="panel-text">
            <strong>Objetivo:</strong> {existing.objetivoPrincipal || '—'}
          </p>
          <p className="panel-muted">{existing.objetivoDetalle}</p>
          <p className="panel-text">
            <strong>Teléfono:</strong> {existing.datosPersonales?.telefono || '—'}
          </p>
          <p className="panel-text">
            <strong>Nivel actividad:</strong> {existing.historialActividadFisica?.nivelActividad || '—'}
          </p>
          <p className="panel-muted text-xs">
            Actualizado: {existing.updatedAt ? new Date(existing.updatedAt).toLocaleString('es-DO') : '—'}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing(true)}>
          Solicitar actualización
        </button>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to={`/clientes/${id}`} className="text-sm text-accent">
            ← Cliente
          </Link>
          <h1 className="panel-text mt-1 font-display text-fluid-xl tracking-wider">CUESTIONARIO DE INGRESO</h1>
          <p className="panel-muted text-sm">
            Paso {step + 1} de {STEPS.length}: {STEPS[step]}
          </p>
        </div>
      </div>

      <div className="panel-progress-track h-2 overflow-hidden rounded-full">
        <div className="panel-progress-fill h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`panel-step-pill shrink-0 text-[10px] ${i <= step ? 'opacity-100' : 'opacity-40'}`}
          >
            {i + 1}. {s}
          </span>
        ))}
      </div>

      <div className="card-panel space-y-4">
        {step === 0 && (
          <>
            <Field label="Ocupación">
              <input
                className="input"
                value={form.datosPersonales.ocupacion}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    datosPersonales: { ...f.datosPersonales, ocupacion: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Teléfono *">
              <input
                className="input"
                value={form.datosPersonales.telefono}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    datosPersonales: { ...f.datosPersonales, telefono: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Contacto de emergencia">
              <input
                className="input"
                value={form.datosPersonales.contactoEmergenciaNombre}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    datosPersonales: { ...f.datosPersonales, contactoEmergenciaNombre: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Teléfono de emergencia">
              <input
                className="input"
                value={form.datosPersonales.contactoEmergenciaTelefono}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    datosPersonales: { ...f.datosPersonales, contactoEmergenciaTelefono: e.target.value },
                  }))
                }
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Objetivo principal *">
              <select
                className="input"
                value={form.objetivoPrincipal}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    objetivoPrincipal: e.target.value as IntakeForm['objetivoPrincipal'],
                  }))
                }
              >
                <option value="">Seleccionar…</option>
                {OBJETIVOS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Detalle del objetivo">
              <textarea
                className="input min-h-[100px]"
                value={form.objetivoDetalle}
                onChange={(e) => setForm((f) => ({ ...f, objetivoDetalle: e.target.value }))}
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <p className="panel-muted text-xs">Condiciones diagnosticadas</p>
            <div className="flex flex-wrap gap-2">
              {CONDICIONES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    form.historialMedico.condicionesDiagnosticadas.includes(c)
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-[var(--cc-panel-border)] panel-muted'
                  }`}
                  onClick={() => toggleCond(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <Field label="Medicamentos actuales">
              <textarea
                className="input min-h-[80px]"
                value={form.historialMedico.medicamentosActuales}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    historialMedico: { ...f.historialMedico, medicamentosActuales: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Cirugías / lesiones">
              <textarea
                className="input min-h-[80px]"
                value={form.historialMedico.cirugiasLesiones}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    historialMedico: { ...f.historialMedico, cirugiasLesiones: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Restricciones físicas">
              <textarea
                className="input min-h-[80px]"
                value={form.historialMedico.restriccionesFisicas}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    historialMedico: { ...f.historialMedico, restriccionesFisicas: e.target.value },
                  }))
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm panel-text">
              <input
                type="checkbox"
                checked={form.historialMedico.autorizacionMedica}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    historialMedico: { ...f.historialMedico, autorizacionMedica: e.target.checked },
                  }))
                }
              />
              Cuenta con autorización médica si aplica
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <label className="flex items-center gap-2 text-sm panel-text">
              <input
                type="checkbox"
                checked={form.historialActividadFisica.entrenoAntes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    historialActividadFisica: {
                      ...f.historialActividadFisica,
                      entrenoAntes: e.target.checked,
                    },
                  }))
                }
              />
              Ha entrenado antes
            </label>
            <Field label="Tiempo entrenando">
              <input
                className="input"
                value={form.historialActividadFisica.tiempoEntrenando}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    historialActividadFisica: {
                      ...f.historialActividadFisica,
                      tiempoEntrenando: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Actividad actual">
              <input
                className="input"
                value={form.historialActividadFisica.actividadActual}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    historialActividadFisica: {
                      ...f.historialActividadFisica,
                      actividadActual: e.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Nivel de actividad *">
              <select
                className="input"
                value={form.historialActividadFisica.nivelActividad}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    historialActividadFisica: {
                      ...f.historialActividadFisica,
                      nivelActividad: e.target.value as IntakeForm['historialActividadFisica']['nivelActividad'],
                    },
                  }))
                }
              >
                <option value="">Seleccionar…</option>
                <option value="sedentario">Sedentario</option>
                <option value="ligero">Ligero</option>
                <option value="moderado">Moderado</option>
                <option value="activo">Activo</option>
                <option value="muy activo">Muy activo</option>
              </select>
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <Field label="Dieta actual">
              <textarea
                className="input min-h-[80px]"
                value={form.nutricion.dietaActual}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nutricion: { ...f.nutricion, dietaActual: e.target.value } }))
                }
              />
            </Field>
            <Field label="Alergias / intolerancias">
              <input
                className="input"
                value={form.nutricion.alergiasIntolerancias}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    nutricion: { ...f.nutricion, alergiasIntolerancias: e.target.value },
                  }))
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Comidas por día">
                <input
                  className="input"
                  type="number"
                  value={form.nutricion.comidasPorDia}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nutricion: { ...f.nutricion, comidasPorDia: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Agua (litros/día)">
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  value={form.nutricion.consumoAguaLitros}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      nutricion: { ...f.nutricion, consumoAguaLitros: e.target.value },
                    }))
                  }
                />
              </Field>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <Field label="Horas de sueño">
              <input
                className="input"
                type="number"
                step="0.5"
                value={form.estiloDeVida.horasSueno}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    estiloDeVida: { ...f.estiloDeVida, horasSueno: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Nivel de estrés">
              <select
                className="input"
                value={form.estiloDeVida.nivelEstres}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    estiloDeVida: {
                      ...f.estiloDeVida,
                      nivelEstres: e.target.value as IntakeForm['estiloDeVida']['nivelEstres'],
                    },
                  }))
                }
              >
                <option value="">Seleccionar…</option>
                <option value="bajo">Bajo</option>
                <option value="moderado">Moderado</option>
                <option value="alto">Alto</option>
              </select>
            </Field>
            <Field label="Consumo de alcohol">
              <select
                className="input"
                value={form.estiloDeVida.consumoAlcohol}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    estiloDeVida: {
                      ...f.estiloDeVida,
                      consumoAlcohol: e.target.value as IntakeForm['estiloDeVida']['consumoAlcohol'],
                    },
                  }))
                }
              >
                <option value="">Seleccionar…</option>
                <option value="nunca">Nunca</option>
                <option value="ocasional">Ocasional</option>
                <option value="frecuente">Frecuente</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm panel-text">
              <input
                type="checkbox"
                checked={form.estiloDeVida.consumoTabaco}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    estiloDeVida: { ...f.estiloDeVida, consumoTabaco: e.target.checked },
                  }))
                }
              />
              Consume tabaco
            </label>
            <label className="flex items-center gap-2 text-sm panel-text">
              <input
                type="checkbox"
                checked={form.estiloDeVida.ocupacionSedentaria}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    estiloDeVida: { ...f.estiloDeVida, ocupacionSedentaria: e.target.checked },
                  }))
                }
              />
              Ocupación sedentaria
            </label>
          </>
        )}

        {step === 6 && (
          <>
            <p className="panel-muted text-xs">Días disponibles</p>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`rounded-lg border px-3 py-1.5 text-xs capitalize ${
                    form.disponibilidad.diasDisponibles.includes(d)
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-[var(--cc-panel-border)] panel-muted'
                  }`}
                  onClick={() => toggleDia(d)}
                >
                  {d}
                </button>
              ))}
            </div>
            <Field label="Horario preferido">
              <input
                className="input"
                value={form.disponibilidad.horarioPreferido}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    disponibilidad: { ...f.disponibilidad, horarioPreferido: e.target.value },
                  }))
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm panel-text">
              <input
                type="checkbox"
                checked={form.disponibilidad.accesoGimnasio}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    disponibilidad: { ...f.disponibilidad, accesoGimnasio: e.target.checked },
                  }))
                }
              />
              Acceso a gimnasio
            </label>
            <Field label="Equipo disponible">
              <input
                className="input"
                value={form.disponibilidad.equipoDisponible}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    disponibilidad: { ...f.disponibilidad, equipoDisponible: e.target.value },
                  }))
                }
              />
            </Field>
          </>
        )}

        {step === 7 && (
          <>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--cc-panel-border)] bg-black/30 p-3 text-xs leading-relaxed panel-muted whitespace-pre-wrap">
              {CONSENT_TEXT}
            </div>
            <label className="flex items-start gap-2 text-sm panel-text">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.consentimientoInformado.aceptaTerminos}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    consentimientoInformado: {
                      ...f.consentimientoInformado,
                      aceptaTerminos: e.target.checked,
                    },
                  }))
                }
              />
              Acepto los términos y el tratamiento de datos de salud *
            </label>
            <label className="flex items-start gap-2 text-sm panel-text">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.consentimientoInformado.aceptaEvaluacionesFisicas}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    consentimientoInformado: {
                      ...f.consentimientoInformado,
                      aceptaEvaluacionesFisicas: e.target.checked,
                    },
                  }))
                }
              />
              Autorizo evaluaciones físicas no médicas *
            </label>
            <Field label="Firma digital (nombre completo) *">
              <input
                className="input"
                value={form.consentimientoInformado.firmaDigital}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    consentimientoInformado: {
                      ...f.consentimientoInformado,
                      firmaDigital: e.target.value,
                    },
                  }))
                }
              />
            </Field>
          </>
        )}

        {(stepError || saveMut.isError) && (
          <p className="text-sm text-danger" role="alert">
            {stepError || 'No se pudo guardar. Revisa los datos e intenta de nuevo.'}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            className="btn-ghost"
            disabled={step === 0}
            onClick={() => {
              setStepError('');
              setStep((s) => Math.max(0, s - 1));
            }}
          >
            Atrás
          </button>
          <button type="button" className="btn-primary" disabled={saveMut.isPending} onClick={next}>
            {step === STEPS.length - 1
              ? saveMut.isPending
                ? 'Enviando…'
                : 'Finalizar y enviar'
              : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

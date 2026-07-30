import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';

const SUGGESTIONS = [
  '¿Cómo interpretar la grasa corporal?',
  'Resumen de progreso del cliente',
  'Recomendaciones de entrenamiento',
];

export function AgenteWidget() {
  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [streaming, setStreaming] = useState('');
  const [historial, setHistorial] = useState<Array<{ rol: string; contenido: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [historial, streaming]);

  const enviar = async () => {
    if (!mensaje.trim() || loading) return;
    const userMsg = mensaje.trim();
    setMensaje('');
    setHistorial((h) => [...h, { rol: 'usuario', contenido: userMsg }]);
    setStreaming('');
    setLoading(true);

    try {
      const res = await fetch('/api/agente/mensaje', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: userMsg, clienteId: clienteId || undefined }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          for (const part of parts) {
            const lines = part.split('\n');
            let event = 'message';
            let data = '';
            for (const line of lines) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              if (line.startsWith('data:')) data += line.slice(5).trim();
            }
            if (event === 'token') {
              const token = JSON.parse(data);
              acc += token;
              setStreaming(acc);
            }
          }
        }
      }
      setHistorial((h) => [...h, { rol: 'agente', contenido: acc }]);
      setStreaming('');
    } catch {
      setHistorial((h) => [...h, { rol: 'agente', contenido: 'Error de conexión con el agente.' }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoz = async () => {
    if (recording) {
      mediaRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('audio', blob, 'voz.webm');
        if (clienteId) fd.append('clienteId', clienteId);
        setLoading(true);
        try {
          const { data } = await api.post('/agente/voz', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setHistorial((h) => [
            ...h,
            { rol: 'usuario', contenido: data.data.transcripcion || '[voz]' },
            { rol: 'agente', contenido: data.data.respuesta },
          ]);
        } catch {
          setHistorial((h) => [...h, { rol: 'agente', contenido: 'No pude procesar el audio. ¿Repites?' }]);
        } finally {
          setLoading(false);
          stream.getTracks().forEach((t) => t.stop());
        }
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setHistorial((h) => [...h, { rol: 'agente', contenido: 'No hay permiso de micrófono.' }]);
    }
  };

  const empty = historial.length === 0 && !streaming;

  return (
    <>
      <button
        type="button"
        aria-label="Abrir agente IA Canela Coach"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="group fixed bottom-4 right-4 z-50 flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-full border border-accent/40 bg-[#0B1220]/95 px-4 py-3 shadow-[0_0_24px_rgba(12,131,244,0.45)] backdrop-blur-md transition-all duration-micro hover:-translate-y-0.5 hover:shadow-[0_0_32px_rgba(12,131,244,0.55)] sm:bottom-5 sm:right-5"
      >
        <img
          src="/Canelalogo.webp"
          alt=""
          className="h-8 w-8 object-contain"
          decoding="async"
        />
        <span className="hidden font-display text-sm tracking-wider text-text-primary sm:inline">AGENTE IA</span>
      </button>

      {open && (
        <div
          className="fixed inset-x-3 bottom-[4.5rem] z-50 flex max-h-[min(78dvh,640px)] flex-col overflow-hidden rounded-2xl border border-[var(--cc-panel-border)] bg-[rgba(8,14,26,0.96)] shadow-[0_8px_40px_rgba(0,0,0,0.55),0_0_28px_rgba(12,131,244,0.18)] backdrop-blur-xl sm:inset-x-auto sm:bottom-20 sm:right-4 sm:w-[min(100vw-2rem,420px)]"
          role="dialog"
          aria-label="Agente Canela Coach"
        >
          <header className="relative border-b border-[var(--cc-panel-border)] bg-gradient-to-r from-[#05070C] via-[#0B1220] to-[#0B1220] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-white/[0.04] p-1.5">
                  <img src="/Canelalogo.webp" alt="Canela Coach" className="h-full w-full object-contain" decoding="async" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold uppercase tracking-[0.12em] text-text-primary sm:text-base">
                    Agente Canela
                  </p>
                  <p className="panel-muted truncate text-xs">Asistente de Abraham Canela · Coach profesional</p>
                </div>
              </div>
              <button
                type="button"
                className="min-h-touch min-w-touch rounded-lg border border-[var(--cc-panel-border)] text-text-secondary transition hover:text-text-primary"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                Texto y voz
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-text-secondary">
                Sin diagnóstico médico
              </span>
            </div>
          </header>

          <div className="border-b border-[var(--cc-panel-border)]/60 px-4 py-2.5">
            <label htmlFor="agente-cliente-id" className="panel-muted mb-1 block text-[11px] font-semibold uppercase tracking-wide">
              Contexto de cliente (opcional)
            </label>
            <input
              id="agente-cliente-id"
              className="input text-sm"
              placeholder="ID o código de cliente"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3" aria-live="polite">
            {empty && (
              <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-4 px-2 text-center">
                <img src="/Canelalogo.webp" alt="" className="h-14 w-14 object-contain opacity-80" decoding="async" />
                <div>
                  <p className="panel-text font-display text-sm tracking-wider">BIENVENIDO AL AGENTE CANELA</p>
                  <p className="panel-muted mt-1 max-w-[18rem] text-xs leading-relaxed">
                    Consulta métricas, interpreta evaluaciones y recibe orientación profesional para tus clientes.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="rounded-xl border border-[var(--cc-panel-border)] bg-white/[0.03] px-3 py-2 text-left text-xs panel-text transition hover:border-accent/40 hover:bg-accent/5"
                      onClick={() => setMensaje(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {historial.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${m.rol === 'usuario' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {m.rol === 'agente' && (
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-white/[0.04] p-1">
                      <img src="/Canelalogo.webp" alt="" className="h-full w-full object-contain" decoding="async" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                      m.rol === 'usuario'
                        ? 'bg-accent/20 text-text-primary'
                        : 'border border-[var(--cc-panel-border)] bg-white/[0.04] panel-text'
                    }`}
                  >
                    {m.contenido}
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex gap-2">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-white/[0.04] p-1">
                    <img src="/Canelalogo.webp" alt="" className="h-full w-full object-contain" decoding="async" />
                  </div>
                  <div className="panel-text max-w-[85%] rounded-2xl border border-accent/20 bg-white/[0.04] px-3 py-2.5 text-sm">
                    {streaming}
                    <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-accent" aria-hidden="true" />
                  </div>
                </div>
              )}
            </div>
            <div ref={bottomRef} />
          </div>

          <footer className="border-t border-[var(--cc-panel-border)] bg-[#05070C]/80 p-3">
            <div className="flex items-end gap-2">
              <button
                type="button"
                className={`flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl border transition ${
                  recording
                    ? 'border-danger bg-danger text-white'
                    : 'border-[var(--cc-panel-border)] bg-white/[0.04] text-text-primary hover:border-accent/40'
                }`}
                onClick={() => void toggleVoz()}
                aria-label={recording ? 'Detener grabación' : 'Grabar voz'}
              >
                {recording ? (
                  <span className="text-xs font-bold">REC</span>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
                  </svg>
                )}
              </button>
              <input
                className="input min-h-touch flex-1"
                placeholder="Escribe un mensaje…"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void enviar()}
                disabled={loading}
              />
              <button
                type="button"
                className="btn-primary flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl px-4 disabled:opacity-50"
                onClick={() => void enviar()}
                disabled={loading || !mensaje.trim()}
                aria-label="Enviar mensaje"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          </footer>
        </div>
      )}
    </>
  );
}

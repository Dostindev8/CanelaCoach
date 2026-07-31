import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Prevents a blank white screen when a render tree throws. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[CanelaCoach] UI crash:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-screen place-items-center bg-[#05070C] px-6 text-center text-white">
          <div className="max-w-md space-y-4">
            <p className="font-display text-xl tracking-widest">CANELA COACH®</p>
            <p className="text-sm text-white/70">
              Ocurrió un error al cargar la interfaz. Recarga la página para continuar.
            </p>
            <button
              type="button"
              className="rounded-field bg-[#2E9BE6] px-5 py-2.5 text-sm font-semibold text-white"
              onClick={() => window.location.assign('/login')}
            >
              Ir al login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('TurnoFly render error:', error, errorInfo);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900 dark:bg-slate-950 dark:text-white flex items-center justify-center">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
            TurnoFly
          </p>
          <h1 className="mt-2 text-xl font-black">No pudimos mostrar esta pantalla</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Tus datos guardados no se eliminaron. Recarga la aplicación para continuar.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Recargar TurnoFly
          </button>
        </section>
      </main>
    );
  }
}

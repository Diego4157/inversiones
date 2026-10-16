import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('>> [ERROR BOUNDARY]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
          await caches.delete(key);
        }
      }
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = window.location.origin + '?t=' + Date.now();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-1">Aviso del Sistema</h2>
              <p className="text-xs text-slate-400">
                Se detectó un desfase con la memoria caché anterior en tu dispositivo.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left">
                <p className="text-[11px] text-red-300 font-mono break-all line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl flex items-center justify-center space-x-2 text-sm transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reintentar / Recargar</span>
              </button>

              <button
                onClick={this.handleResetCache}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-xl flex items-center justify-center space-x-2 text-xs border border-slate-700 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpiar Caché y Restablecer</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

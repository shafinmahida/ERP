import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal, CheckCircle2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught Application Startup Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
              <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  Dayar-E-Habib ERP — Startup Diagnostic Alert
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  A subsystem initialization exception was caught safely by the Error Boundary.
                </p>
              </div>
            </div>

            {/* Error Details Box */}
            <div className="rounded-2xl border border-rose-900/50 bg-rose-950/20 p-4 space-y-2 text-xs font-mono text-rose-200">
              <div className="flex items-center gap-2 text-rose-400 font-semibold uppercase tracking-wider text-[10px]">
                <Terminal className="h-3.5 w-3.5" /> Exception Summary
              </div>
              <p className="font-bold">{this.state.error?.name}: {this.state.error?.message || 'Unknown Exception'}</p>
              {this.state.errorInfo?.componentStack && (
                <div className="max-h-40 overflow-y-auto text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 font-mono mt-2">
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </div>

            {/* System Status Indicators */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">React Renderer</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Online (Protected)
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Desktop Container</span>
                <span className="text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                  Tauri Webview 2.0
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500">
                Contact system administrator if issues persist.
              </p>
              <button
                onClick={this.handleRetry}
                className="h-10 px-5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

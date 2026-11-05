/**
 * ==============================================================================
 * TACTICAL ERROR BOUNDARY (C4ISR FAIL-SAFE TERMINAL)
 * ==============================================================================
 * Captura excepciones no controladas en el árbol React para evitar la caída
 * en pantalla negra o blanca ("crash"). Renderiza una terminal militar diegética
 * con diagnóstico del fallo, registro de telemetría y botones de reinicio seguro.
 * ==============================================================================
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut, Terminal, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class TacticalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[TacticalErrorBoundary] ALERTA DE FALLO NO CONTROLADO:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('[TacticalErrorBoundary] Error al cerrar sesión:', e);
    } finally {
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'Excepción no identificada en el subsistema de mando';
      const stack = this.state.error?.stack || this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-screen w-full bg-[#12130e] text-[#F2E8D5] flex items-center justify-center p-4 sm:p-6 font-mono select-none">
          <div className="max-w-2xl w-full bg-[#1c1d17] border-4 border-[#C46A3A] rounded-[16px_4px_16px_4px] shadow-[10px_10px_0px_#0A0B08] p-6 space-y-5">
            {/* Cabecera DEFCON-1 */}
            <div className="flex items-center justify-between border-b-2 border-[#C46A3A]/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px_2px_8px_2px] bg-[#C46A3A] text-black flex items-center justify-center font-black">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-sm sm:text-base font-black tracking-widest uppercase text-[#F2E8D5]">
                    {this.props.fallbackTitle || 'DEFCON-1 // INTERRUPCIÓN CRÍTICA DEL SISTEMA'}
                  </h1>
                  <p className="text-[10px] text-[#A2A790]">
                    PROTOCOLO DE CONTENCIÓN C4ISR ACTIVADO • DATOS PERSISTENTES PROTEGIDOS
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-700 text-[10px] font-bold">
                ESTADO: ALERTA
              </span>
            </div>

            {/* Diagnóstico del Error */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase font-bold text-[#C46A3A] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>Diagnóstico del Subsistema:</span>
              </span>
              <div className="p-3 bg-[#12130e] border-2 border-[#0A0B08] rounded-[6px_2px_6px_2px] text-red-300 text-xs font-bold break-words">
                {errorMsg}
              </div>
            </div>

            {/* Pila de Llamadas Táctica (Trace) */}
            {stack && (
              <details className="text-[10px] bg-[#141510] border border-[#0A0B08] rounded p-2 text-[#A2A790] max-h-48 overflow-y-auto">
                <summary className="cursor-pointer font-bold text-amber-300/80 hover:text-amber-300 select-none">
                  Desplegar Telemetría de Pila de Error (Stack Trace)
                </summary>
                <pre className="mt-2 text-[9px] text-[#A2A790] whitespace-pre-wrap leading-relaxed font-mono">
                  {stack}
                </pre>
              </details>
            )}

            {/* Botones de Acción de Recuperación */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="py-2.5 px-3 bg-[#46521F] hover:bg-[#5a6b28] text-[#F2E8D5] border-2 border-[#0A0B08] text-xs font-black uppercase rounded shadow-[3px_3px_0px_#0A0B08] cursor-pointer flex items-center justify-center gap-2 transition-transform active:translate-y-0.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reintentar Mando</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="py-2.5 px-3 bg-[#E65100] hover:bg-amber-400 text-black border-2 border-[#0A0B08] text-xs font-black uppercase rounded shadow-[3px_3px_0px_#0A0B08] cursor-pointer flex items-center justify-center gap-2 transition-transform active:translate-y-0.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recargar Radar</span>
              </button>

              <button
                type="button"
                onClick={this.handleSignOut}
                className="py-2.5 px-3 bg-[#2B2C24] hover:bg-red-900 text-red-200 border-2 border-[#0A0B08] text-xs font-black uppercase rounded shadow-[3px_3px_0px_#0A0B08] cursor-pointer flex items-center justify-center gap-2 transition-transform active:translate-y-0.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

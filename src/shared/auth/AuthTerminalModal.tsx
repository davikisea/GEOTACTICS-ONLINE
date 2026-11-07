import React, { useState } from 'react';
import { Shield, Lock, User, Terminal, AlertTriangle, ArrowRight, X } from 'lucide-react';

interface AuthTerminalModalProps {
  onSignIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  onSignUp: (email: string, pass: string, name: string) => Promise<{ success: boolean; error?: string }>;
  error: string | null;
  onClose?: () => void;
  customNotice?: string | null;
}

export const AuthTerminalModal: React.FC<AuthTerminalModalProps> = ({
  onSignIn,
  onSignUp,
  error: authError,
  onClose,
  customNotice,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const res = await onSignIn(email, password);
        if (!res.success) {
          setLocalError(res.error || 'Fallo de autenticación táctica');
        }
      } else {
        if (!username) {
          setLocalError('El indicativo de llamada (username) es obligatorio');
          setIsSubmitting(false);
          return;
        }
        const res = await onSignUp(email, password, username);
        if (!res.success) {
          setLocalError(res.error || 'Fallo en registro de nuevo oficial');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevQuickConnect = async () => {
    setEmail('commander1@tactical.local');
    setPassword('Commander123!');
    setIsSubmitting(true);
    setLocalError(null);
    try {
      const res = await onSignIn('commander1@tactical.local', 'Commander123!');
      if (!res.success) {
        setLocalError(res.error || 'Error al conectar con credencial de prueba');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-emerald-500/50 rounded-lg shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-hidden font-mono text-slate-200">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-emerald-500/30">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
              C4ISR // ENLACE DE SEGURIDAD SOBERANA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-700/50 px-2 py-0.5 rounded">
              SYS: ACTIVE
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cerrar y volver al Mapa Mundial [ESC]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {customNotice && (
            <div className="flex items-start gap-2 p-3 bg-amber-950/70 border border-amber-500/60 rounded text-amber-300 text-xs font-sans">
              <Shield className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>{customNotice}</span>
            </div>
          )}

          <div className="space-y-1 text-center">
            <h2 className="text-lg font-bold text-white tracking-widest uppercase">
              {mode === 'signin' ? 'IDENTIFICACIÓN DE COMANDANTE' : 'REGISTRO DE NUEVA MATRÍCULA'}
            </h2>
            <p className="text-xs text-slate-400">
              Acceso restringido a personal militar autorizado por el Alto Mando.
            </p>
          </div>

          {(localError || authError) && (
            <div className="flex items-start gap-2 p-3 bg-rose-950/60 border border-rose-500/60 rounded text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 flex items-center gap-1.5 uppercase">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  Indicativo de Llamada
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. Commander_Viper"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 flex items-center gap-1.5 uppercase">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Frecuencia Militar (Email)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="commander@tactical.local"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 flex items-center gap-1.5 uppercase">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Clave Criptográfica
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold uppercase text-xs rounded tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>DESCRIPTANDO ENLACE...</span>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'CONECTAR TERMINAL' : 'CREAR MATRÍCULA'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Dev Connect */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleDevQuickConnect}
              disabled={isSubmitting}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-400 text-xs rounded uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Conexión Rápida de Prueba (Alpha Commander)</span>
            </button>
          </div>

          {/* Toggle Mode */}
          <div className="text-center text-xs text-slate-400">
            {mode === 'signin' ? (
              <span>
                ¿No posees matrícula operativa?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setLocalError(null);
                  }}
                  className="text-emerald-400 hover:underline cursor-pointer font-bold"
                >
                  Registrarse aquí
                </button>
              </span>
            ) : (
              <span>
                ¿Ya posees credenciales tácticas?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setLocalError(null);
                  }}
                  className="text-emerald-400 hover:underline cursor-pointer font-bold"
                >
                  Iniciar sesión
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

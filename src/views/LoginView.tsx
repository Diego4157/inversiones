import React, { useState } from 'react';
import { TrendingUp, Lock, Mail, Loader2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { authService } from '../services/api';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authService.login({ email, password });
      if (response.user) {
        onLoginSuccess(response.user);
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-slate-100">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-2xl shadow-lg shadow-emerald-500/20 mb-2">
            <TrendingUp className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">JD Inversiones</h1>
          <p className="text-xs text-slate-400">Sistema de Control de Cobranza y Administración</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center space-x-3 text-red-200 text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <p className="text-xs leading-relaxed">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Correo Electrónico / Usuario</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@inversiones.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all text-sm"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Contraseña</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-5 h-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" />
                <span>Verificando acceso...</span>
              </>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Tip / Access note */}
        <div className="pt-4 border-t border-slate-800/80 text-center">
          <div className="inline-flex items-center text-xs text-slate-500 space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500/70" />
            <span>Acceso seguro protegido por JWT y Bcrypt</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;

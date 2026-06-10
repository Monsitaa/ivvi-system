import React, { useState } from 'react';
import { Mail, Lock, ShieldAlert } from 'lucide-react';
import type { Usuario } from '../types';

interface LoginProps {
  onLoginSuccess: (user: Usuario) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, complete todos los campos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'Credenciales inválidas. Intente nuevamente.');
      }
    } catch (err) {
      setError('Error de conexión con el servidor. Verifique si el servicio Flask está activo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-ivvi-teal-dark/30 via-ivvi-dark to-ivvi-dark px-4">
      {/* Background ambient lights */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-ivvi-teal/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-ivvi-amber/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Top glowing bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal via-ivvi-amber to-ivvi-teal-light"></div>
        
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <img src="/logo_transparent.png" alt="Inversiones IVVI S.A." className="h-28 w-auto object-contain mb-2" />
          <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-semibold text-ivvi-teal-light">
            Sistema de Control de Planta & Ventas
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-start gap-3 text-sm animate-shake">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-950/40 rounded-xl border border-white/5 text-white placeholder-slate-500 focus:outline-none focus:border-ivvi-teal focus:ring-1 focus:ring-ivvi-teal/30 transition-all text-sm"
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Contraseña de Acceso
              </label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-950/40 rounded-xl border border-white/5 text-white placeholder-slate-500 focus:outline-none focus:border-ivvi-teal focus:ring-1 focus:ring-ivvi-teal/30 transition-all text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ivvi-teal/50 shadow-lg shadow-ivvi-teal/20 active:translate-y-0.5 cursor-pointer mt-6 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Iniciando Sesión...</span>
              </>
            ) : (
              <span>Acceder al Panel</span>
            )}
          </button>
        </form>

        <div className="text-center mt-8 text-xs text-slate-500 border-t border-white/5 pt-6">
          IVVI Sistema de Inventario &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}

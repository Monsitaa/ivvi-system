import { useState, useEffect } from 'react';
import { Factory, AlertCircle, Plus, X } from 'lucide-react';
import type { Receta, Usuario } from '../types';

interface EnvasadoProps { currentUser: Usuario | null; }

interface BulkProd { id: number; nombre: string; stock_actual: number; factor_conversion: number; }
interface VacioProd { id: number; nombre: string; stock_actual: number; }
interface TermProd { id: number; nombre: string; stock_actual: number; }
interface HistItem { id: number; fecha: string; cantidad: number; documento_id: string; }

export default function Envasado({ currentUser: _currentUser }: EnvasadoProps) {
  const [bulkProds, setBulkProds] = useState<BulkProd[]>([]);
  const [vacioProds, setVacioProds] = useState<VacioProd[]>([]);
  const [terminadoProds, setTerminadoProds] = useState<TermProd[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [historial, setHistorial] = useState<HistItem[]>([]);
  
  // Form states
  const [recetaCodigo, setRecetaCodigo] = useState('');
  const [envCantidad, setEnvCantidad] = useState('');
  const [envMermaAceite, setEnvMermaAceite] = useState('');
  const [envMermaEnvase, setEnvMermaEnvase] = useState('');
  
  // Modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => { loadData(); }, []);
  const showToast = (type: 'success' | 'error', message: string) => { setNotification({ type, message }); setTimeout(() => setNotification(null), 4000); };

  const loadData = async () => {
    try { 
      const res = await fetch('/api/produccion/envasado'); 
      const data = await res.json();
      if (data.success) { 
        setBulkProds(data.bulk || []); 
        setVacioProds(data.vacio || []); 
        setTerminadoProds(data.terminados || []); 
        setRecetas(data.recetas || []); 
        setHistorial(data.historial || []); 
      }
    } catch { 
      showToast('error', 'Error al cargar datos de producción.'); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recetaCodigo) { showToast('error', 'Seleccione un combo de envasado.'); return; }
    const cant = parseInt(envCantidad);
    if (isNaN(cant) || cant <= 0) { showToast('error', 'La cantidad debe ser un entero positivo.'); return; }
    try {
      const res = await fetch('/api/produccion/envasado', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tipo_combo: recetaCodigo, 
          cantidad: cant, 
          merma_aceite: parseFloat(envMermaAceite) || 0, 
          merma_envase: parseInt(envMermaEnvase) || 0 
        }) 
      });
      const data = await res.json();
      if (res.ok && data.success) { 
        showToast('success', data.message); 
        setRecetaCodigo(''); 
        setEnvCantidad(''); 
        setEnvMermaAceite(''); 
        setEnvMermaEnvase(''); 
        setFormModalOpen(false);
        loadData(); 
      }
      else showToast('error', data.error || 'Error de producción.');
    } catch { showToast('error', 'Error de conexión.'); }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 animate-fadeIn max-w-[1400px] mx-auto">
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border text-sm max-w-md animate-slideIn bg-slate-900 border-ivvi-teal/30 text-ivvi-teal-light`}>
          <AlertCircle size={20} />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/50 dark:border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Orden de Envasado
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Producción de aceite envasado desde materia prima.
          </p>
        </div>
        <button
          onClick={() => setFormModalOpen(true)}
          className="py-2.5 px-5 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-ivvi-teal/10 hover:shadow-lg"
        >
          <Plus size={14} /> Registrar Orden de Envasado
        </button>
      </div>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-ivvi-teal/5 rounded-full blur-xl pointer-events-none"></div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-3 border-b border-slate-200/50 dark:border-white/5 pb-2">
            Aceite a Granel (Bulk)
          </h4>
          <div className="space-y-2">{bulkProds.map(b => (
            <div key={b.id} className="flex justify-between items-center">
              <span className="text-slate-700 dark:text-slate-200 font-medium text-xs">{b.nombre}</span>
              <span className="font-mono font-bold text-ivvi-teal text-xs">{b.stock_actual.toLocaleString('es-NI')} L</span>
            </div>
          ))}{bulkProds.length === 0 && <p className="text-xs text-slate-500">Sin stock de aceite a granel.</p>}</div>
        </div>

        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-ivvi-amber/5 rounded-full blur-xl pointer-events-none"></div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-455 dark:text-slate-400 mb-3 border-b border-slate-200/50 dark:border-white/5 pb-2">
            Envases Vacíos
          </h4>
          <div className="space-y-2">{vacioProds.map(v => (
            <div key={v.id} className="flex justify-between items-center">
              <span className="text-slate-700 dark:text-slate-200 font-medium text-xs">{v.nombre}</span>
              <span className="font-mono font-bold text-ivvi-amber text-xs">{v.stock_actual.toLocaleString('es-NI')} UND</span>
            </div>
          ))}{vacioProds.length === 0 && <p className="text-xs text-slate-500">Sin envases vacíos.</p>}</div>
        </div>

        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-455 dark:text-slate-400 mb-3 border-b border-slate-200/50 dark:border-white/5 pb-2">
            Producto Terminado
          </h4>
          <div className="space-y-2">{terminadoProds.map(t => (
            <div key={t.id} className="flex justify-between items-center">
              <span className="text-slate-700 dark:text-slate-200 font-medium text-xs">{t.nombre}</span>
              <span className="font-mono font-bold text-emerald-450 dark:text-emerald-400 text-xs">{t.stock_actual.toLocaleString('es-NI')} UND</span>
            </div>
          ))}{terminadoProds.length === 0 && <p className="text-xs text-slate-500">Sin producto terminado.</p>}</div>
        </div>
      </div>

      {/* Main View: Full-width Table */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
        <h3 className="font-heading font-bold text-base text-slate-800 dark:text-white mb-6">
          Historial de Producción
        </h3>

        <div className="overflow-x-auto border border-slate-200/50 dark:border-white/5 rounded-2xl bg-slate-50/30 dark:bg-black/10">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 font-semibold bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="p-4">Orden ID</th>
                <th className="p-4">Fecha / Hora</th>
                <th className="p-4 text-right">Cantidad Final Producida</th>
                <th className="p-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {historial.length > 0 ? (
                historial.map(h => (
                  <tr key={h.id} className="text-slate-600 dark:text-slate-300 hover:bg-slate-100/30 dark:hover:bg-white/[0.01] transition-all">
                    <td className="p-4 font-mono whitespace-nowrap">
                      <span className="bg-slate-100 dark:bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-white/5 font-semibold text-slate-800 dark:text-slate-200">
                        {h.documento_id}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-450 dark:text-slate-400 font-mono text-[10px]">{h.fecha}</td>
                    <td className="p-4 text-right font-black font-mono text-emerald-500">
                      +{h.cantidad.toLocaleString('es-NI')} unidades
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Completado
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Sin producción registrada en el historial.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Form Modal */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white my-8 animate-fadeIn">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-base flex items-center gap-2">
                <Factory size={18} className="text-ivvi-teal" /> Registrar Orden de Envasado (Producción)
              </h3>
              <button 
                onClick={() => setFormModalOpen(false)} 
                className="text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Combo de Envasado (Receta)</label>
                <select 
                  required 
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs" 
                  value={recetaCodigo} 
                  onChange={(e) => setRecetaCodigo(e.target.value)}
                >
                  <option value="">Seleccionar receta...</option>
                  {recetas.map(r => (
                    <option key={r.id} value={r.codigo}>{r.nombre} ({r.codigo}) - {r.litros_aceite}L aceite</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cantidad Final a Producir (Unidades)</label>
                <input 
                  type="number" 
                  required 
                  min="1" 
                  placeholder="Cantidad de botellas/bidones terminados" 
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs font-mono" 
                  value={envCantidad} 
                  onChange={(e) => setEnvCantidad(e.target.value)} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Merma Aceite (L)</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="any"
                    placeholder="0" 
                    className="w-full px-3 py-2.5 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs font-mono" 
                    value={envMermaAceite} 
                    onChange={(e) => setEnvMermaAceite(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Merma Envase (Unidades)</label>
                  <input 
                    type="number" 
                    min="0" 
                    placeholder="0" 
                    className="w-full px-3 py-2.5 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs font-mono" 
                    value={envMermaEnvase} 
                    onChange={(e) => setEnvMermaEnvase(e.target.value)} 
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setFormModalOpen(false)}
                  className="py-2.5 px-5 bg-white/5 hover:bg-white/10 rounded-xl text-white text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="py-2.5 px-6 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl font-bold text-xs shadow-md shadow-ivvi-teal/10 hover:shadow-lg cursor-pointer active:translate-y-0.5 transition-all"
                >
                  Ejecutar Orden de Envasado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

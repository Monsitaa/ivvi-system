import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, AlertCircle, Truck } from 'lucide-react';
import type { Proveedor, Usuario } from '../types';

interface ProveedoresProps { currentUser: Usuario | null; }

export default function Proveedores({ currentUser }: ProveedoresProps) {
  const isAdmin = currentUser?.rol === 'Administrador';
  const canEdit = isAdmin || currentUser?.rol === 'Operador de Almacén';
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ razon_social: '', ruc: '', telefono: '', email: '' });

  useEffect(() => { loadData(); }, []);

  const showToast = (type: 'success' | 'error', message: string) => { setNotification({ type, message }); setTimeout(() => setNotification(null), 4000); };

  const loadData = async () => {
    setLoading(true);
    try { const res = await fetch('/api/proveedores'); const data = await res.json(); if (data.success) setItems(data.items || []); }
    catch { showToast('error', 'Error al cargar proveedores.'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Desactivar este proveedor?')) return;
    try { const res = await fetch(`/api/entidad/eliminar/proveedor/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }); const data = await res.json();
      if (data.success) { showToast('success', data.message); loadData(); } else showToast('error', data.error); } catch { showToast('error', 'Error de conexión.'); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try { const res = await fetch('/api/proveedores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: editingId }) }); const data = await res.json();
      if (data.success) { showToast('success', data.message); setFormOpen(false); resetForm(); loadData(); } else showToast('error', data.error); } catch { showToast('error', 'Error de conexión.'); }
  };

  const startEdit = (p: Proveedor) => { setEditingId(p.id); setForm({ razon_social: p.razon_social, ruc: p.ruc || '', telefono: p.telefono || '', email: p.email || '' }); setFormOpen(true); };
  const resetForm = () => { setEditingId(null); setForm({ razon_social: '', ruc: '', telefono: '', email: '' }); };
  const filtered = items.filter(p => p.razon_social.toLowerCase().includes(searchQuery.toLowerCase()) || (p.ruc || '').includes(searchQuery));

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6 animate-fadeIn">
      {notification && (<div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border text-sm max-w-md animate-slideIn ${notification.type === 'success' ? 'bg-slate-900 border-ivvi-teal/30 text-ivvi-teal-light' : 'bg-slate-900 border-red-500/30 text-red-400'}`}><AlertCircle size={20} /><span>{notification.message}</span></div>)}
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">Proveedores</h1><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Registro de proveedores de materia prima e insumos.</p></div>
        {canEdit && (<button onClick={() => { resetForm(); setFormOpen(true); }} className="py-2.5 px-5 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-ivvi-teal/10 cursor-pointer active:translate-y-0.5 transition-all"><Plus size={14} /> Nuevo Proveedor</button>)}
      </div>
      <div className="relative max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Buscar por razón social o RUC..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-sm" /></div>
      <div className="glass-card rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr className="border-b border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider"><th className="p-4">Razón Social</th><th className="p-4">RUC</th><th className="p-4">Teléfono</th><th className="p-4">Email</th><th className="p-4 text-center">Estado</th>{canEdit && <th className="p-4 text-center">Acciones</th>}</tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {loading ? <tr><td colSpan={6} className="p-8 text-center"><div className="w-6 h-6 border-2 border-ivvi-teal/30 border-t-ivvi-teal rounded-full animate-spin mx-auto"></div></td></tr>
          : filtered.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-500 text-xs">Sin proveedores.</td></tr>
          : filtered.map(p => (
            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
              <td className="p-4 font-medium text-slate-800 dark:text-white">{p.razon_social}</td>
              <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">{p.ruc || 'N/A'}</td>
              <td className="p-4 text-xs text-slate-600 dark:text-slate-400">{p.telefono || '-'}</td>
              <td className="p-4 text-xs text-slate-600 dark:text-slate-400">{p.email || '-'}</td>
              <td className="p-4 text-center"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>{p.estado}</span></td>
              {canEdit && <td className="p-4 text-center"><div className="flex items-center justify-center gap-1.5">
                <button onClick={() => startEdit(p)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-ivvi-teal transition-all cursor-pointer"><Edit2 size={14} /></button>
                {isAdmin && <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all cursor-pointer"><Trash2 size={14} /></button>}
              </div></td>}
            </tr>
          ))}
        </tbody>
      </table></div></div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2"><Truck size={16} className="text-ivvi-teal" />{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button onClick={() => { setFormOpen(false); resetForm(); }} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-slate-400 mb-1">Razón Social</label><input required type="text" value={form.razon_social} onChange={(e) => setForm({ ...form, razon_social: e.target.value })} className="w-full px-3 py-2 bg-slate-950/40 rounded-xl border border-white/5 text-white focus:outline-none focus:border-ivvi-teal text-xs" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-400 mb-1">RUC</label><input type="text" value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} className="w-full px-3 py-2 bg-slate-950/40 rounded-xl border border-white/5 text-white focus:outline-none focus:border-ivvi-teal text-xs" /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1">Teléfono</label><input type="text" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full px-3 py-2 bg-slate-950/40 rounded-xl border border-white/5 text-white focus:outline-none focus:border-ivvi-teal text-xs" /></div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-400 mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 bg-slate-950/40 rounded-xl border border-white/5 text-white focus:outline-none focus:border-ivvi-teal text-xs" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={() => { setFormOpen(false); resetForm(); }} className="py-2 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold cursor-pointer transition-all">Cancelar</button>
                <button type="submit" className="py-2 px-5 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:translate-y-0.5 transition-all">{editingId ? 'Actualizar' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

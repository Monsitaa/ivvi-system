import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Package,
  Store,
  Factory
} from 'lucide-react';
import type {
  Producto,
  Categoria,
  Unidad,
  Usuario
} from '../types';

interface ProductosProps {
  currentUser: Usuario | null;
}

export default function Productos({ currentUser }: ProductosProps) {
  const isAdmin = currentUser?.rol === 'Administrador';
  const canEdit = currentUser?.rol === 'Administrador' || currentUser?.rol === 'Operador de Almacén';

  const [searchQuery, setSearchQuery] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Views and Registration Types
  const [vista, setVista] = useState<'ventas' | 'planta'>('ventas');
  const [typeSelectionOpen, setTypeSelectionOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<'venta' | 'planta'>('venta');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    sku: '',
    nombre: '',
    descripcion: '',
    categoria_id: '',
    unidad_id: '',
    precio_venta: '0',
    stock_minimo: '5'
  });

  useEffect(() => { loadData(); }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/productos');
      const data = await res.json();
      if (data.success) {
        setProductos(data.items || []);
        setCategorias(data.categorias || []);
        setUnidades(data.unidades || []);
      }
    } catch { showToast('error', 'Error al cargar productos.'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Desactivar este producto?')) return;
    try {
      const res = await fetch(`/api/entidad/eliminar/producto/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.success) { showToast('success', data.message); loadData(); }
      else showToast('error', data.error);
    } catch { showToast('error', 'Error de conexión.'); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/productos/gestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...form, 
          precio_venta: parseFloat(form.precio_venta) || 0.0,
          stock_minimo: parseInt(form.stock_minimo) || 0,
          id: editingId 
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        setFormOpen(false);
        resetForm();
        loadData();
      }
      else showToast('error', data.error);
    } catch { showToast('error', 'Error de conexión.'); }
  };

  const startEdit = (p: Producto) => {
    const type: 'venta' | 'planta' = p.categoria === 'Producto Terminado' ? 'venta' : 'planta';
    setFormType(type);
    setEditingId(p.id);
    setForm({
      sku: p.sku,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      categoria_id: String(p.categoria_id),
      unidad_id: String(p.unidad_id),
      precio_venta: String(p.precio_venta),
      stock_minimo: String(p.stock_minimo)
    });
    setFormOpen(true);
  };

  const openNewProductForm = (type: 'venta' | 'planta') => {
    resetForm();
    setFormType(type);
    if (type === 'venta') {
      const termCat = categorias.find(c => c.nombre === 'Producto Terminado');
      setForm({
        sku: '',
        nombre: '',
        descripcion: '',
        categoria_id: termCat ? String(termCat.id) : '',
        unidad_id: '',
        precio_venta: '0.0',
        stock_minimo: '5'
      });
    } else {
      setForm({
        sku: '',
        nombre: '',
        descripcion: '',
        categoria_id: '',
        unidad_id: '',
        precio_venta: '0.0',
        stock_minimo: '5'
      });
    }
    setTypeSelectionOpen(false);
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      sku: '',
      nombre: '',
      descripcion: '',
      categoria_id: '',
      unidad_id: '',
      precio_venta: '0',
      stock_minimo: '5'
    });
  };

  const filtered = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (vista === 'ventas') {
      return p.categoria === 'Producto Terminado';
    } else {
      return p.categoria !== 'Producto Terminado';
    }
  });

  const availableCategorias = categorias.filter(c => {
    if (formType === 'venta') {
      return c.nombre === 'Producto Terminado';
    } else {
      return c.nombre !== 'Producto Terminado';
    }
  });

  const colSpan = canEdit ? 8 : 7;

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto space-y-6 animate-fadeIn">
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border text-sm max-w-md animate-slideIn ${
          notification.type === 'success' ? 'bg-slate-900 border-ivvi-teal/30 text-ivvi-teal-light' : 'bg-slate-900 border-red-500/30 text-red-400'
        }`}>
          <AlertCircle size={20} />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Catálogo General
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Maestro de materiales, insumos y productos terminados.</p>
        </div>
        {canEdit && (
          <button onClick={() => setTypeSelectionOpen(true)}
            className="py-2.5 px-5 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-ivvi-teal/10 cursor-pointer active:translate-y-0.5 transition-all w-fit self-start sm:self-auto">
            <Plus size={14} /> Nuevo Registro
          </button>
        )}
      </div>

      {/* View Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1 scrollbar-none">
        <button
          onClick={() => setVista('ventas')}
          className={`shrink-0 py-2 px-4 rounded-full font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            vista === 'ventas'
              ? 'bg-ivvi-teal text-white shadow-md shadow-ivvi-teal/15'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Store size={14} /> Catálogo de Ventas
        </button>
        <button
          onClick={() => setVista('planta')}
          className={`shrink-0 py-2 px-4 rounded-full font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            vista === 'planta'
              ? 'bg-ivvi-teal text-white shadow-md shadow-ivvi-teal/15'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Factory size={14} /> Materiales de Planta
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Buscar por nombre o SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-sm" />
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">
                <th className="p-4">SKU</th>
                <th className="p-4">{vista === 'ventas' ? 'Producto' : 'Material / Insumo'}</th>
                <th className="p-4">Categoría</th>
                {vista === 'ventas' ? null : <th className="p-4">Unidad</th>}
                {vista === 'ventas' && <th className="p-4 text-right">Precio</th>}
                <th className="p-4 text-center">{vista === 'ventas' ? 'Stock Actual' : 'Stock Actual en Planta'}</th>
                <th className="p-4 text-center">{vista === 'ventas' ? 'Mín' : 'Alerta (Mín)'}</th>
                <th className="p-4 text-center">Estado</th>
                {canEdit && <th className="p-4 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="p-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-ivvi-teal/30 border-t-ivvi-teal rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="p-8 text-center text-slate-500 text-xs">
                    No se encontraron productos en este catálogo.
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors whitespace-nowrap">
                  <td className="p-4 font-mono text-xs text-ivvi-teal font-bold">{p.sku}</td>
                  <td className="p-4 font-medium text-slate-800 dark:text-white whitespace-normal">
                    {vista === 'ventas' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{p.nombre}</span>
                    ) : (
                      <span>{p.nombre}</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">
                    {vista === 'ventas' ? (
                      <span className="flex items-center gap-1.5"><Store size={12} className="text-emerald-500" /> Terminado</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><Factory size={12} className="text-sky-500" /> {p.categoria}</span>
                    )}
                  </td>
                  {vista === 'ventas' ? null : (
                    <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">{p.unidad}</td>
                  )}
                  {vista === 'ventas' && (
                    <td className="p-4 text-right font-mono text-xs text-slate-700 dark:text-slate-300 font-bold">
                      C$ {p.precio_venta.toFixed(2)}
                    </td>
                  )}
                  <td className="p-4 text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${p.stock_actual <= p.stock_minimo ? 'bg-red-500/10 text-red-400' : (vista === 'ventas' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-sky-500/10 text-sky-400')}`}>
                      {p.stock_actual} {vista === 'ventas' ? 'UND' : p.unidad}
                    </span>
                  </td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400 font-semibold">
                    {p.stock_minimo}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>
                      {p.estado}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => startEdit(p)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-ivvi-teal transition-all cursor-pointer" title="Editar"><Edit2 size={14} /></button>
                        {isAdmin && <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all cursor-pointer" title="Desactivar"><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selection Modal */}
      {typeSelectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-slate-800 dark:text-white animate-fadeIn">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm text-slate-800 dark:text-white">¿Qué deseas registrar?</h3>
              <button onClick={() => setTypeSelectionOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Selecciona el tipo de registro correspondiente para cargar la ficha técnica adecuada.</p>
              
              <div className="space-y-3">
                {/* Opción Ventas */}
                <button
                  onClick={() => openNewProductForm('venta')}
                  className="w-full flex items-center p-4 border border-slate-200 dark:border-white/5 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 rounded-2xl transition-all text-left cursor-pointer group"
                >
                  <div className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 w-12 h-12 rounded-xl flex items-center justify-center text-xl mr-4 shrink-0 transition-transform group-hover:scale-105">
                    <Store size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white">Producto Público (Ventas)</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Aceites envasados listos para comercialización. (Requiere precio de venta).</p>
                  </div>
                </button>

                {/* Opción Planta */}
                <button
                  onClick={() => openNewProductForm('planta')}
                  className="w-full flex items-center p-4 border border-slate-200 dark:border-white/5 hover:border-sky-500/50 dark:hover:border-sky-500/50 hover:bg-sky-50/20 dark:hover:bg-sky-950/10 rounded-2xl transition-all text-left cursor-pointer group"
                >
                  <div className="bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 w-12 h-12 rounded-xl flex items-center justify-center text-xl mr-4 shrink-0 transition-transform group-hover:scale-105">
                    <Factory size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white">Material de Planta / Insumo</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Bidones, tapas o aceites crudos a granel. (Sin precio de venta público).</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-white/5 flex justify-end">
              <button
                onClick={() => setTypeSelectionOpen(false)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-slate-800 dark:text-white">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                <Package size={16} className="text-ivvi-teal" />
                {editingId
                  ? `Editar ${formType === 'venta' ? 'Producto Terminado' : 'Material / Insumo'}`
                  : `Nuevo ${formType === 'venta' ? 'Producto Terminado' : 'Material / Insumo'}`}
              </h3>
              <button onClick={() => { setFormOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">SKU / Código Único</label>
                  <input required type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nombre del Registro</label>
                  <input required type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Descripción</label>
                <textarea rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Categoría</label>
                  <select required disabled={formType === 'venta'} value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs disabled:opacity-60">
                    {formType === 'venta' ? (
                      <option value={form.categoria_id}>Producto Terminado</option>
                    ) : (
                      <>
                        <option value="">Seleccionar...</option>
                        {availableCategorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Unidad de Medida</label>
                  <select required value={form.unidad_id} onChange={(e) => setForm({ ...form, unidad_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs">
                    <option value="">Seleccionar...</option>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {formType === 'venta' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Precio Venta (C$)</label>
                    <input required type="number" step="any" min="0" value={form.precio_venta} onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs" />
                  </div>
                )}
                <div className={formType === 'venta' ? "" : "col-span-2"}>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Stock Mínimo (Alerta)</label>
                  <input required type="number" min="0" step="1" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <button type="button" onClick={() => { setFormOpen(false); resetForm(); }} className="py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition-all">Cancelar</button>
                <button type="submit" className="py-2 px-5 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:translate-y-0.5 transition-all">
                  {editingId ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

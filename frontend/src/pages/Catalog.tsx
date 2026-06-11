import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  FileCheck, 
  Tag,
  AlertCircle
} from 'lucide-react';
import type { 
  Categoria, 
  Unidad, 
  Usuario 
} from '../types';

interface CatalogProps {
  currentUser: Usuario | null;
  initialTab?: 'productos' | 'clientes' | 'proveedores' | 'maestros' | 'colaboradores';
}

export default function Catalog({ currentUser, initialTab = 'productos' }: CatalogProps) {
  const isAdmin = currentUser?.rol === 'Administrador';
  
  // Tabs: 'productos' | 'clientes' | 'proveedores' | 'maestros' | 'colaboradores'
  const [activeTab, setActiveTab] = useState<'productos' | 'clientes' | 'proveedores' | 'maestros' | 'colaboradores'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState('');
  
  // Data States
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states (Universal Modal/Form)
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [maestroSubtype, setMaestroSubtype] = useState<'categoria' | 'unidad' | null>(null);
  
  // Specific Form Fields
  const [catForm, setCatForm] = useState({ nombre: '', descripcion: '' });
  const [uniForm, setUniForm] = useState({ nombre: '', abreviatura: '' });
  const [userForm, setUserForm] = useState({ nombre: '', email: '', rol: 'Vendedor', telefono: '', direccion: '', cargo: '', password: '' });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'maestros') {
        // Load categories & units
        const res1 = await fetch('/api/categorias');
        const data1 = await res1.json();
        const res2 = await fetch('/api/unidades');
        const data2 = await res2.json();
        if (data1.success) setCategorias(data1.items);
        if (data2.success) setUnidades(data2.items);
      } else if (activeTab === 'colaboradores' && isAdmin) {
        const res = await fetch('/api/usuarios');
        const data = await res.json();
        if (data.success) setUsuarios(data.items);
      }
    } catch (err) {
      showToast('error', 'Error al cargar datos del catálogo.');
    } finally {
      setLoading(false);
    }
  };

  // --- DELETE / DEACTIVATE HANDLER ---
  const handleDelete = async (type: string, id: number) => {
    if (!window.confirm(`¿Está seguro de eliminar o desactivar este registro?`)) return;
    
    try {
      const res = await fetch(`/api/entidad/eliminar/${type}/${id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message || 'Registro procesado.');
        loadData();
      } else {
        showToast('error', data.error || 'No se pudo eliminar el registro.');
      }
    } catch (err) {
      showToast('error', 'Error de conexión.');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...catForm })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message);
        setFormOpen(false);
        loadData();
      } else {
        showToast('error', data.error || 'Error al guardar.');
      }
    } catch (err) {
      showToast('error', 'Error de conexión.');
    }
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/unidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...uniForm })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message);
        setFormOpen(false);
        loadData();
      } else {
        showToast('error', data.error || 'Error al guardar.');
      }
    } catch (err) {
      showToast('error', 'Error de conexión.');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        id: editingId,
        ...userForm,
        email: userForm.rol === 'Sin Acceso' ? '' : userForm.email,
        password: userForm.rol === 'Sin Acceso' ? '' : userForm.password
      };
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message);
        setFormOpen(false);
        loadData();
      } else {
        showToast('error', data.error || 'Error al guardar.');
      }
    } catch (err) {
      showToast('error', 'Error de conexión.');
    }
  };

  // Open Form for Adding
  const handleOpenAdd = () => {
    setEditingId(null);
    setCatForm({ nombre: '', descripcion: '' });
    setUniForm({ nombre: '', abreviatura: '' });
    setUserForm({ nombre: '', email: '', rol: '', telefono: '', direccion: '', cargo: '', password: '' });
    setFormOpen(true);
  };

  const handleAddCategory = () => {
    setEditingId(null);
    setMaestroSubtype('categoria');
    setCatForm({ nombre: '', descripcion: '' });
    setFormOpen(true);
  };

  const handleAddUnit = () => {
    setEditingId(null);
    setMaestroSubtype('unidad');
    setUniForm({ nombre: '', abreviatura: '' });
    setFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    if (activeTab === 'maestros') {
      // Determines whether item is unit or category
      if (item.abreviatura !== undefined) {
        setMaestroSubtype('unidad');
        setUniForm({ nombre: item.nombre, abreviatura: item.abreviatura });
      } else {
        setMaestroSubtype('categoria');
        setCatForm({ nombre: item.nombre, descripcion: item.descripcion || '' });
      }
    } else if (activeTab === 'colaboradores') {
      setUserForm({
        nombre: item.nombre,
        email: item.email || '',
        rol: item.rol,
        telefono: item.telefono || '',
        direccion: item.direccion || '',
        cargo: item.cargo || '',
        password: ''
      });
    }
    setFormOpen(true);
  };



  const filteredUsers = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.rol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 w-full p-4 sm:p-6 md:p-8 overflow-y-auto max-w-[1400px] mx-auto space-y-8 animate-fadeIn">
      {/* Toast Notifications */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border text-sm max-w-md animate-slideIn ${
          notification.type === 'success' 
            ? 'bg-slate-900 border-ivvi-teal/30 text-ivvi-teal-light' 
            : 'bg-slate-900 border-red-500/30 text-red-400'
        }`}>
          <AlertCircle size={20} className={notification.type === 'success' ? 'text-ivvi-teal-light' : 'text-red-400'} />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header & View switch Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            {activeTab === 'maestros' ? 'Categorías y Unidades' : 'Personal y Accesos'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeTab === 'maestros' 
              ? 'Definición de familias de producto y unidades de medida del inventario.' 
              : 'Gestión de colaboradores, perfiles de seguridad y accesos al sistema.'}
          </p>
        </div>
        {activeTab === 'colaboradores' && isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="py-2.5 px-4 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl font-medium text-xs shadow-lg shadow-ivvi-teal/20 transition-all flex items-center gap-2 cursor-pointer active:translate-y-0.5"
          >
            <Plus size={16} />
            <span>Registrar Nuevo Colaborador</span>
          </button>
        )}
      </div>

      {/* Control bar (Search query filter) */}
      {activeTab !== 'maestros' && (
        <div className="max-w-md relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-900 dark:hover:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:border-ivvi-teal focus:ring-1 focus:ring-ivvi-teal/30 transition-all"
            placeholder={`Filtrar ${activeTab === 'productos' ? 'por Nombre o SKU...' : activeTab === 'clientes' || activeTab === 'proveedores' ? 'por Razón o RUC...' : 'por Nombre o Rol...'}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Main Table / Grid Content */}
      <div className="glass-card rounded-2xl p-6 overflow-hidden">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-ivvi-teal/30 border-t-ivvi-teal animate-spin"></div>
            <span className="text-xs text-slate-400">Cargando base de datos...</span>
          </div>
        ) : (
          <div>


            {/* 4. CATEGORIES & UNITS DOUBLE GRIDS */}
            {activeTab === 'maestros' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Categories */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center h-10">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Tag size={16} className="text-ivvi-teal" />
                      Categorías de Producto
                    </h3>
                    {isAdmin && (
                      <button
                        onClick={handleAddCategory}
                        className="py-1 px-3 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-lg font-medium text-[11px] shadow-sm flex items-center gap-1 cursor-pointer transition-all active:translate-y-0.5"
                      >
                        <Plus size={12} />
                        <span>Nueva Categoría</span>
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto border border-slate-200 dark:border-white/5 rounded-xl p-4">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 font-semibold pb-2">
                          <th className="pb-2 whitespace-nowrap">Categoría</th>
                          <th className="pb-2 whitespace-nowrap">Descripción</th>
                          <th className="pb-2 text-right whitespace-nowrap">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {categorias.map(cat => (
                          <tr key={cat.id} className="text-slate-600 dark:text-slate-300">
                            <td className="py-2.5 font-semibold text-slate-800 dark:text-white">{cat.nombre}</td>
                            <td className="py-2.5">{cat.descripcion || 'Sin descripción'}</td>
                            <td className="py-2.5 text-right space-x-1">
                              {isAdmin && (
                                <>
                                  <button 
                                    onClick={() => handleOpenEdit(cat)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded text-slate-400 hover:text-ivvi-teal transition-all cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete('categoria', cat.id)}
                                    className="p-1 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Units */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center h-10">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <FileCheck size={16} className="text-ivvi-amber" />
                      Unidades de Medida
                    </h3>
                    {isAdmin && (
                      <button
                        onClick={handleAddUnit}
                        className="py-1 px-3 bg-gradient-to-r from-ivvi-amber to-ivvi-amber-dark hover:from-ivvi-amber-light hover:to-ivvi-amber text-slate-900 rounded-lg font-medium text-[11px] shadow-sm flex items-center gap-1 cursor-pointer transition-all active:translate-y-0.5"
                      >
                        <Plus size={12} />
                        <span>Nueva Unidad</span>
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto border border-slate-200 dark:border-white/5 rounded-xl p-4">
                    <table className="w-full text-left text-xs min-w-[400px]">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 font-semibold pb-2">
                          <th className="pb-2 whitespace-nowrap">Nombre</th>
                          <th className="pb-2 whitespace-nowrap">Abreviación</th>
                          <th className="pb-2 text-right whitespace-nowrap">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {unidades.map(u => (
                          <tr key={u.id} className="text-slate-600 dark:text-slate-300">
                            <td className="py-2.5 font-semibold text-slate-800 dark:text-white">{u.nombre}</td>
                            <td className="py-2.5 font-mono font-medium">{u.abreviatura}</td>
                            <td className="py-2.5 text-right space-x-1">
                              {isAdmin && (
                                <>
                                  <button 
                                    onClick={() => handleOpenEdit(u)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded text-slate-400 hover:text-ivvi-teal transition-all cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete('unidad', u.id)}
                                    className="p-1 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. COLABORADORES TABLE */}
            {activeTab === 'colaboradores' && isAdmin && (
              <div className="overflow-x-auto border border-slate-200 dark:border-white/5 rounded-xl">
                <table className="w-full text-left text-xs min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 font-semibold pb-3">
                      <th className="pb-3 whitespace-nowrap">Nombre Colaborador</th>
                      <th className="pb-3 whitespace-nowrap">Rol Corporativo</th>
                      <th className="pb-3 whitespace-nowrap">Cargo</th>
                      <th className="pb-3 whitespace-nowrap">Email de Acceso</th>
                      <th className="pb-3 whitespace-nowrap">Teléfono</th>
                      <th className="pb-3 text-center whitespace-nowrap">Acceso Web</th>
                      <th className="pb-3 text-center whitespace-nowrap">Estado</th>
                      <th className="pb-3 text-right whitespace-nowrap">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="text-slate-600 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all">
                        <td className="py-3 font-semibold text-slate-800 dark:text-white whitespace-nowrap">{u.nombre}</td>
                        <td className="py-3 font-medium text-ivvi-teal whitespace-nowrap">{u.rol}</td>
                        <td className="py-3 whitespace-nowrap">{u.cargo || 'N/A'}</td>
                        <td className="py-3 whitespace-nowrap">{u.email || 'N/A'}</td>
                        <td className="py-3 whitespace-nowrap">{u.telefono || 'N/A'}</td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center justify-center p-1 rounded-lg ${
                            u.tiene_acceso_web ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'
                          }`}>
                            {u.tiene_acceso_web ? <Check size={14} /> : <X size={14} />}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'
                          }`}>
                            {u.estado}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-1">
                          <button 
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-ivvi-teal transition-all cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDelete('usuario', u.id)}
                            className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* UNIVERSAL MODAL / FORM CONTAINER */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-slate-800 dark:text-white">
            {/* Glow bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm text-slate-800 dark:text-white">
                {editingId ? 'Actualizar Ficha' : 'Registrar Ficha'} &mdash; {
                  activeTab === 'maestros' 
                    ? (maestroSubtype === 'categoria' ? 'Categoría' : 'Unidad de Medida')
                    : 'Colaborador'
                }
              </h3>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* CATEGORY FORM */}
              {activeTab === 'maestros' && maestroSubtype === 'categoria' && (
                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nombre de la Categoría</label>
                    <input
                      type="text" required placeholder="Aceites, Insumos, Envases..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs"
                      value={catForm.nombre} onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Descripción</label>
                    <textarea
                      placeholder="Breve descripción de uso dentro de la producción..." rows={3}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs resize-none"
                      value={catForm.descripcion} onChange={(e) => setCatForm({ ...catForm, descripcion: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                    <button type="button" onClick={() => setFormOpen(false)} className="py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition-all">Cancelar</button>
                    <button type="submit" className="py-2 px-5 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:translate-y-0.5 transition-all">
                      {editingId ? 'Actualizar' : 'Registrar'}
                    </button>
                  </div>
                </form>
              )}

              {/* UNIT FORM */}
              {activeTab === 'maestros' && maestroSubtype === 'unidad' && (
                <form onSubmit={handleSaveUnit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nombre de la Unidad</label>
                      <input
                        type="text" required placeholder="Litros, Galones, Toneladas..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs"
                        value={uniForm.nombre} onChange={(e) => setUniForm({ ...uniForm, nombre: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Abreviación</label>
                      <input
                        type="text" required placeholder="L, gal, TM..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs"
                        value={uniForm.abreviatura} onChange={(e) => setUniForm({ ...uniForm, abreviatura: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                    <button type="button" onClick={() => setFormOpen(false)} className="py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition-all">Cancelar</button>
                    <button type="submit" className="py-2 px-5 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:translate-y-0.5 transition-all">
                      {editingId ? 'Actualizar' : 'Registrar'}
                    </button>
                  </div>
                </form>
              )}

              {/* USER FORM */}
              {activeTab === 'colaboradores' && isAdmin && (
                <form onSubmit={handleSaveUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nombre Completo</label>
                      <input
                        type="text" required placeholder="Juan Pérez"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs"
                        value={userForm.nombre} onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Rol Corporativo</label>
                      <select 
                        required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs"
                        value={userForm.rol} onChange={(e) => {
                          const val = e.target.value;
                          setUserForm(prev => {
                            const updated = { ...prev, rol: val };
                            if (val === 'Sin Acceso') {
                              updated.email = '';
                              updated.password = '';
                            }
                            return updated;
                          });
                        }}
                      >
                        <option value="" disabled>Seleccione rol...</option>
                        <optgroup label="Personal Administrativo (Requiere Credenciales)">
                          <option value="Administrador">Administrador</option>
                          <option value="Gerencia">Gerencia</option>
                          <option value="Vendedor">Vendedor</option>
                          <option value="Operador de Almacén">Operador de Almacén</option>
                        </optgroup>
                        <optgroup label="Personal Operativo">
                          <option value="Sin Acceso">Sin Acceso Web (Solo Planilla)</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Email Acceso Web</label>
                      <input
                        type="email" placeholder={userForm.rol === 'Sin Acceso' ? "No aplicable" : "correo@ivvi.com"}
                        required={userForm.rol !== 'Sin Acceso'}
                        disabled={userForm.rol === 'Sin Acceso'}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs disabled:opacity-50"
                        value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Cargo</label>
                      <input
                        type="text" placeholder="Ej. Supervisor de Planta"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs"
                        value={userForm.cargo} onChange={(e) => setUserForm({ ...userForm, cargo: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Teléfono</label>
                      <input
                        type="text" placeholder="+505 8888 8888"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs"
                        value={userForm.telefono} onChange={(e) => setUserForm({ ...userForm, telefono: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Contraseña {userForm.rol === 'Sin Acceso' ? 'No aplicable' : (editingId && '(Opcional)')}
                      </label>
                      <input
                        type="password" placeholder={userForm.rol === 'Sin Acceso' ? "No aplicable" : "••••••••"}
                        required={userForm.rol !== 'Sin Acceso' && !editingId}
                        disabled={userForm.rol === 'Sin Acceso'}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs disabled:opacity-50"
                        value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Dirección de Residencia</label>
                    <textarea
                      placeholder="Dirección domiciliar completa..." rows={2}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs resize-none"
                      value={userForm.direccion} onChange={(e) => setUserForm({ ...userForm, direccion: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                    <button type="button" onClick={() => setFormOpen(false)} className="py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition-all">Cancelar</button>
                    <button type="submit" className="py-2 px-5 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:translate-y-0.5 transition-all">
                      {editingId ? 'Actualizar' : 'Registrar'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { 
  Settings2, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Plus, 
  ClipboardList, 
  TrendingUp, 
  Package,
  RefreshCw,
  X
} from 'lucide-react';
import type { Producto, Usuario } from '../types';

interface ClienteReturnable {
  id: number;
  nombre: string;
  ruc: string;
  envases_pendientes: number;
}

interface RetornoLog {
  id: number;
  fecha: string;
  cliente: string;
  cantidad_total: number;
  cantidad_buenos: number;
  cantidad_danados: number;
  autorizado_por: string;
  observaciones: string;
}

interface AjustesProps {
  currentUser: Usuario | null;
}

interface AjusteReciente {
  id: number;
  producto_id: number;
  producto: string;
  sku: string;
  tipo_movimiento: 'ENTRADA' | 'SALIDA';
  cantidad: number;
  fecha: string;
  observacion: string;
  autorizado_por: string;
}

export default function Ajustes({ currentUser }: AjustesProps) {
  const isAlmacen = currentUser?.rol === 'Operador de Almacén' || currentUser?.rol === 'Administrador';

  const [productos, setProductos] = useState<Producto[]>([]);
  const [ajustesRecientes, setAjustesRecientes] = useState<AjusteReciente[]>([]);
  const [emptyBidonStock, setEmptyBidonStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Manual Adjustment Form states
  const [ajusteProductoId, setAjusteProductoId] = useState('');
  const [ajusteTipo, setAjusteTipo] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [ajusteCantidad, setAjusteCantidad] = useState('');
  const [ajusteObs, setAjusteObs] = useState('');
  
  // Modals state
  const [ajusteModalOpen, setAjusteModalOpen] = useState(false);
  const [retornoModalOpen, setRetornoModalOpen] = useState(false);

  // Tab selector: 'ajustes' | 'retornos'
  const [activeTab, setActiveTab] = useState<'ajustes' | 'retornos'>('ajustes');

  // Retorno states
  const [clientes, setClientes] = useState<ClienteReturnable[]>([]);
  const [retornos, setRetornos] = useState<RetornoLog[]>([]);

  // Retorno Form states
  const [retornoClienteId, setRetornoClienteId] = useState('');
  const [retornoCantidadTotal, setRetornoCantidadTotal] = useState('');
  const [retornoCantidadDanados, setRetornoCantidadDanados] = useState('');
  const [retornoObs, setRetornoObs] = useState('');
  
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [resProd, resAjuste, resRetornos] = await Promise.all([
        fetch('/api/productos'),
        fetch('/api/inventario/ajuste'),
        fetch('/api/inventario/retornos')
      ]);

      const dataProd = await resProd.json();
      const dataAjuste = await resAjuste.json();
      const dataRetornos = await resRetornos.json();

      if (dataProd.success) {
        setProductos(dataProd.items || []);
      }
      if (dataAjuste.success) {
        setAjustesRecientes(dataAjuste.ajustes_recientes || []);
        if (dataAjuste.bidon) {
          setEmptyBidonStock(dataAjuste.bidon.stock_actual);
        }
      }
      if (dataRetornos.success) {
        setClientes(dataRetornos.clientes || []);
        setRetornos(dataRetornos.retornos || []);
      }
    } catch (err) {
      showToast('error', 'Error al sincronizar datos de ajustes y retornos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegisterAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ajusteProductoId) {
      showToast('error', 'Seleccione un producto.');
      return;
    }
    const cant = parseFloat(ajusteCantidad);
    if (isNaN(cant) || cant <= 0) {
      showToast('error', 'La cantidad debe ser mayor que cero.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inventario/ajuste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: parseInt(ajusteProductoId),
          tipo_movimiento: ajusteTipo,
          cantidad: cant,
          observacion: ajusteObs
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message || 'Ajuste de inventario aplicado con éxito.');
        setAjusteProductoId('');
        setAjusteCantidad('');
        setAjusteObs('');
        setAjusteModalOpen(false);
        loadData();
      } else {
        showToast('error', data.error || 'No se pudo aplicar el ajuste.');
      }
    } catch (err) {
      showToast('error', 'Error de conexión con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retornoClienteId) {
      showToast('error', 'Seleccione un cliente.');
      return;
    }
    const total = parseInt(retornoCantidadTotal);
    const danados = parseInt(retornoCantidadDanados || '0');
    
    if (isNaN(total) || total <= 0) {
      showToast('error', 'La cantidad total devuelta debe ser un número entero mayor que cero.');
      return;
    }
    if (isNaN(danados) || danados < 0) {
      showToast('error', 'La cantidad de envases dañados no puede ser negativa.');
      return;
    }
    if (danados > total) {
      showToast('error', 'La cantidad de envases dañados no puede ser mayor que la cantidad total devuelta.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inventario/retornos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: parseInt(retornoClienteId),
          cantidad_total: total,
          cantidad_danados: danados,
          observacion: retornoObs
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message || 'Retorno de envases registrado con éxito.');
        setRetornoClienteId('');
        setRetornoCantidadTotal('');
        setRetornoCantidadDanados('');
        setRetornoObs('');
        setRetornoModalOpen(false);
        loadData();
      } else {
        showToast('error', data.error || 'No se pudo registrar el retorno.');
      }
    } catch (err) {
      showToast('error', 'Error de conexión con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculation
  const totalEntradas = ajustesRecientes
    .filter(a => a.tipo_movimiento === 'ENTRADA')
    .reduce((sum, a) => sum + a.cantidad, 0);

  const totalSalidas = ajustesRecientes
    .filter(a => a.tipo_movimiento === 'SALIDA')
    .reduce((sum, a) => sum + a.cantidad, 0);

  const totalRetornosReg = retornos.length;
  const totalRecuperados = retornos.reduce((sum, r) => sum + r.cantidad_buenos, 0);
  const totalPerdidasRetorno = retornos.reduce((sum, r) => sum + r.cantidad_danados, 0);

  const filteredAjustes = ajustesRecientes.filter(a => {
    const term = searchTerm.toLowerCase();
    return (
      a.producto.toLowerCase().includes(term) ||
      a.sku.toLowerCase().includes(term) ||
      a.observacion.toLowerCase().includes(term) ||
      a.autorizado_por.toLowerCase().includes(term)
    );
  });

  const filteredRetornos = retornos.filter(r => {
    const term = searchTerm.toLowerCase();
    return (
      r.cliente.toLowerCase().includes(term) ||
      r.observaciones.toLowerCase().includes(term) ||
      r.autorizado_por.toLowerCase().includes(term)
    );
  });

  if (!isAlmacen) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle size={48} className="mx-auto text-red-500" />
          <h2 className="text-xl font-bold">Acceso Denegado</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No tiene los permisos necesarios para acceder al módulo de ajustes de inventario.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full p-4 sm:p-6 md:p-8 overflow-y-auto max-w-[1400px] mx-auto space-y-8 animate-fadeIn">
      {/* Toast Notification */}
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/50 dark:border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Ajustes de Inventario y Envases
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Realice incrementos manuales de existencias o registre retornos de envases y pérdidas operacionales.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 text-slate-700 dark:text-slate-300"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            <span>Sincronizar</span>
          </button>
        </div>
      </div>

      {/* Navigation subtabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-white/5 pb-px overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => { setActiveTab('ajustes'); setSearchTerm(''); }}
          className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'ajustes' 
              ? 'border-ivvi-teal text-ivvi-teal' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'
          }`}
        >
          <Settings2 size={14} />
          <span>Ajustes de Stock Manuales</span>
        </button>

        <button
          onClick={() => { setActiveTab('retornos'); setSearchTerm(''); }}
          className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'retornos' 
              ? 'border-ivvi-teal text-ivvi-teal' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'
          }`}
        >
          <Package size={14} />
          <span>Retorno de Envases 19L</span>
        </button>
      </div>

      {/* Stats Cards & Log Tab Content */}
      {activeTab === 'ajustes' ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex items-center justify-between">
              <div className="absolute right-0 top-0 w-32 h-32 bg-ivvi-teal/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ajustes Registrados</span>
                <h2 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                  {ajustesRecientes.length}
                </h2>
                <span className="text-[10px] text-slate-500 block">Movimientos en el kárdex</span>
              </div>
              <div className="p-3 bg-ivvi-teal/10 rounded-xl">
                <ClipboardList size={22} className="text-ivvi-teal" />
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex items-center justify-between">
              <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ingresos Manuales</span>
                <h2 className="text-2xl font-bold font-mono text-emerald-505 dark:text-emerald-400">
                  +{totalEntradas.toLocaleString('es-NI')}
                </h2>
                <span className="text-[10px] text-slate-500 block">Aumentos de existencias</span>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <TrendingUp size={22} className="text-emerald-500" />
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex items-center justify-between">
              <div className="absolute right-0 top-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mermas y Pérdidas</span>
                <h2 className="text-2xl font-bold font-mono text-red-500">
                  -{totalSalidas.toLocaleString('es-NI')}
                </h2>
                <span className="text-[10px] text-slate-500 block">Disminuciones en auditorías</span>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl">
                <ArrowDownRight size={22} className="text-red-500" />
              </div>
            </div>
          </div>

          {/* Full-width Log Card */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="font-heading font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <ClipboardList size={18} className="text-ivvi-teal" />
                <span>Historial de Ajustes Recientes</span>
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar ajuste..."
                    className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setAjusteModalOpen(true)}
                  className="py-2 px-4 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-ivvi-teal/10"
                >
                  <Plus size={12} /> Registrar Ajuste
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-ivvi-teal/30 border-t-ivvi-teal animate-spin"></div>
                <span className="text-xs text-slate-400">Consultando movimientos de ajuste...</span>
              </div>
            ) : filteredAjustes.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200/50 dark:border-white/5 rounded-2xl bg-slate-50/30 dark:bg-black/10">
                <table className="w-full text-left text-xs min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 font-semibold bg-slate-50/50 dark:bg-white/[0.02]">
                      <th className="p-4 pl-6 whitespace-nowrap">Fecha</th>
                      <th className="p-4 whitespace-nowrap">SKU</th>
                      <th className="p-4 whitespace-nowrap">Producto</th>
                      <th className="p-4 text-center whitespace-nowrap">Tipo</th>
                      <th className="p-4 text-center whitespace-nowrap">Cantidad</th>
                      <th className="p-4 pl-6 whitespace-nowrap">Justificación / Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredAjustes.map((a) => (
                      <tr key={a.id} className="text-slate-600 dark:text-slate-300 hover:bg-slate-100/30 dark:hover:bg-white/[0.01] transition-all">
                        <td className="p-4 pl-6 text-slate-450 dark:text-slate-400 font-mono text-[10px] whitespace-nowrap">{a.fecha}</td>
                        <td className="p-4 font-bold font-mono text-slate-800 dark:text-white whitespace-nowrap">{a.sku}</td>
                        <td className="p-4 font-medium whitespace-nowrap" title={a.producto}>{a.producto}</td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 border ${
                            a.tipo_movimiento === 'ENTRADA'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {a.tipo_movimiento === 'ENTRADA' ? (
                              <ArrowUpRight size={10} />
                            ) : (
                              <ArrowDownRight size={10} />
                            )}
                            {a.tipo_movimiento}
                          </span>
                        </td>
                        <td className={`p-4 text-center font-black font-mono text-sm whitespace-nowrap ${
                          a.tipo_movimiento === 'ENTRADA' ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {a.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{a.cantidad.toLocaleString('es-NI')}
                        </td>
                        <td className="p-4 pl-6 min-w-[200px]">
                          <div className="font-medium text-slate-800 dark:text-white" title={a.observacion}>
                            {a.observacion}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5 whitespace-nowrap">
                            Autorizado por: <span className="text-slate-500 dark:text-slate-300 font-bold">{a.autorizado_por}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01]">
                <Package size={28} className="text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No se encontraron ajustes que coincidan con la búsqueda.</p>
              </div>
            )}
          </div>

          {/* Ajuste Form Modal */}
          {ajusteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
              <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white my-8">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
                
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <h3 className="font-heading font-bold text-base flex items-center gap-2">
                    <Settings2 size={18} className="text-ivvi-teal" />
                    <span>Registrar Ajuste Manual de Stock</span>
                  </h3>
                  <button onClick={() => setAjusteModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
                </div>

                <form onSubmit={handleRegisterAdjustment} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Producto a Ajustar</label>
                    <select 
                      required 
                      className="w-full px-3 py-2.5 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs"
                      value={ajusteProductoId} 
                      onChange={(e) => setAjusteProductoId(e.target.value)}
                    >
                      <option value="">Seleccione del maestro...</option>
                      {productos.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.sku}) &mdash; Stock: {p.stock_actual} {p.unidad}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo de Movimiento</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAjusteTipo('ENTRADA')}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          ajusteTipo === 'ENTRADA'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                            : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        Aumento (+ ENTRADA)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAjusteTipo('SALIDA')}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          ajusteTipo === 'SALIDA'
                            ? 'bg-red-500/10 border-red-500/30 text-red-500'
                            : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        Merma (- SALIDA)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cantidad Física</label>
                    <input
                      type="text" 
                      required 
                      placeholder={
                        productos.find(p => p.id === parseInt(ajusteProductoId))?.unidad_abr === 'UND'
                          ? "Ej. 10"
                          : "Ej. 10.5"
                      }
                      className="w-full px-3 py-2.5 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs font-mono"
                      value={ajusteCantidad} 
                      onChange={(e) => {
                        const val = e.target.value;
                        const selProd = productos.find(p => p.id === parseInt(ajusteProductoId));
                        const isUnd = selProd?.unidad_abr === 'UND';
                        const regex = isUnd ? /^\d*$/ : /^\d*\.?\d*$/;
                        if (val === '' || regex.test(val)) {
                          setAjusteCantidad(val);
                        }
                      }}
                    />
                    {ajusteProductoId && (
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        {productos.find(p => p.id === parseInt(ajusteProductoId))?.unidad_abr === 'UND'
                          ? "⚠️ Solo se permiten números enteros (Unidades)."
                          : "💡 Se permiten decimales (Litros)."}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Justificación de Auditoría / Observación
                    </label>
                    <textarea
                      required 
                      placeholder="Detalle el por qué se realiza el ajuste..." 
                      rows={4}
                      className="w-full px-3 py-2.5 bg-slate-800 rounded-xl border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs"
                      value={ajusteObs} 
                      onChange={(e) => setAjusteObs(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-6">
                    <button 
                      type="button" 
                      onClick={() => setAjusteModalOpen(false)}
                      className="py-2.5 px-5 bg-white/5 hover:bg-white/10 rounded-xl text-white text-xs font-semibold cursor-pointer transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={submitting}
                      className="py-2.5 px-6 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-ivvi-teal/10 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                          <span>Aplicando...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>Aplicar Ajuste</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          {/* Stats Cards (Retornos) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex items-center justify-between">
              <div className="absolute right-0 top-0 w-32 h-32 bg-ivvi-teal/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Retornos Registrados</span>
                <h2 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                  {totalRetornosReg}
                </h2>
                <span className="text-[10px] text-slate-500 block">De devoluciones de clientes</span>
              </div>
              <div className="p-3 bg-ivvi-teal/10 rounded-xl">
                <ClipboardList size={22} className="text-ivvi-teal" />
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex items-center justify-between">
              <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Envases Recuperados (Buenos)</span>
                <h2 className="text-2xl font-bold font-mono text-emerald-500">
                  +{totalRecuperados.toLocaleString('es-NI')}
                </h2>
                <span className="text-[10px] text-slate-500 block">Reingresados limpios a stock</span>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <TrendingUp size={22} className="text-emerald-500" />
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex items-center justify-between">
              <div className="absolute right-0 top-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Envases Dañados (Pérdidas)</span>
                <h2 className="text-2xl font-bold font-mono text-red-500">
                  {totalPerdidasRetorno.toLocaleString('es-NI')}
                </h2>
                <span className="text-[10px] text-slate-500 block">Absorbidos como descarte</span>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl">
                <ArrowDownRight size={22} className="text-red-500" />
              </div>
            </div>
          </div>

          {/* Full-width Log Card (Retornos) */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="font-heading font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <ClipboardList size={18} className="text-ivvi-teal" />
                <span>Historial de Retornos Recientes</span>
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar retorno..."
                    className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setRetornoModalOpen(true)}
                  className="py-2 px-4 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-ivvi-teal/10"
                >
                  <Plus size={12} /> Registrar Retorno
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-ivvi-teal/30 border-t-ivvi-teal animate-spin"></div>
                <span className="text-xs text-slate-400">Consultando movimientos de retorno...</span>
              </div>
            ) : filteredRetornos.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200/50 dark:border-white/5 rounded-2xl bg-slate-50/30 dark:bg-black/10">
                <table className="w-full text-left text-xs min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 font-semibold bg-slate-50/50 dark:bg-white/[0.02]">
                      <th className="p-4 pl-6 whitespace-nowrap">Fecha</th>
                      <th className="p-4 whitespace-nowrap">Cliente</th>
                      <th className="p-4 text-center whitespace-nowrap">Total Devuelto</th>
                      <th className="p-4 text-center whitespace-nowrap">Buenos (+Stock)</th>
                      <th className="p-4 text-center whitespace-nowrap">Dañados (Pérdidas)</th>
                      <th className="p-4 pl-6 whitespace-nowrap">Observaciones / Autor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredRetornos.map((r) => (
                      <tr key={r.id} className="text-slate-600 dark:text-slate-300 hover:bg-slate-100/30 dark:hover:bg-white/[0.01] transition-all">
                        <td className="p-4 pl-6 text-slate-450 dark:text-slate-400 font-mono text-[10px] whitespace-nowrap">{r.fecha}</td>
                        <td className="p-4 font-bold text-slate-800 dark:text-white whitespace-nowrap" title={r.cliente}>{r.cliente}</td>
                        <td className="p-4 text-center font-bold font-mono text-slate-800 dark:text-white whitespace-nowrap">{r.cantidad_total.toLocaleString('es-NI')}</td>
                        <td className="p-4 text-center font-bold font-mono text-emerald-500 whitespace-nowrap">+{r.cantidad_buenos.toLocaleString('es-NI')}</td>
                        <td className="p-4 text-center font-bold font-mono text-red-500 whitespace-nowrap">-{r.cantidad_danados.toLocaleString('es-NI')}</td>
                        <td className="p-4 pl-6 min-w-[200px]">
                          <div className="font-medium text-slate-800 dark:text-white" title={r.observaciones}>
                            {r.observaciones}
                          </div>
                          <div className="text-[10px] text-slate-455 dark:text-slate-400 font-semibold mt-0.5 whitespace-nowrap">
                            Recibido por: <span className="text-slate-500 dark:text-slate-300 font-bold">{r.autorizado_por}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01]">
                <Package size={28} className="text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No se encontraron retornos que coincidan con la búsqueda.</p>
              </div>
            )}
          </div>

          {/* Retorno Form Modal */}
          {retornoModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
              <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white my-8">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
                
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <h3 className="font-heading font-bold text-base flex items-center gap-2">
                    <Package size={18} className="text-ivvi-teal" />
                    <span>Registrar Retorno de Envases 19L</span>
                  </h3>
                  {emptyBidonStock !== null && (
                    <span className="px-2.5 py-0.5 bg-white/5 rounded-lg text-[9px] font-semibold text-slate-400 border border-white/10">
                      Stock Bodega: <strong className="text-ivvi-teal font-mono">{emptyBidonStock}</strong>
                    </span>
                  )}
                </div>

                <form onSubmit={handleRegisterReturn} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cliente</label>
                    <select 
                      required 
                      className="w-full px-3 py-2.5 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs"
                      value={retornoClienteId} 
                      onChange={(e) => setRetornoClienteId(e.target.value)}
                    >
                      <option value="">Seleccione el cliente...</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} &mdash; Pendientes: {c.envases_pendientes} envases
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cantidad Total Recibida (Física)</label>
                    <input
                      type="number" 
                      required 
                      min="1"
                      placeholder="Total de envases devueltos"
                      className="w-full px-3 py-2.5 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs font-mono"
                      value={retornoCantidadTotal} 
                      onChange={(e) => setRetornoCantidadTotal(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cantidad Dañados / Pérdidas (Rotos, sin tapa)</label>
                    <input
                      type="number" 
                      required 
                      min="0"
                      placeholder="Envases inservibles (mermas)"
                      className="w-full px-3 py-2.5 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs font-mono"
                      value={retornoCantidadDanados} 
                      onChange={(e) => setRetornoCantidadDanados(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Se registrará una merma por descarte automático en el Kárdex para estas unidades.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Observaciones de Entrega
                    </label>
                    <textarea
                      required 
                      placeholder="Detalle de la recepción del material..." 
                      rows={4}
                      className="w-full px-3 py-2.5 bg-slate-800 rounded-xl border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs"
                      value={retornoObs} 
                      onChange={(e) => setRetornoObs(e.target.value)}
                    />
                  </div>

                  {/* Live Calculations Preview */}
                  {retornoClienteId && (
                    <div className="p-4 rounded-xl border border-white/10 bg-slate-950/20 space-y-3 text-xs animate-fadeIn mt-4">
                      <h4 className="font-semibold text-slate-350 border-b border-white/5 pb-1.5 flex items-center gap-1.5">
                        <TrendingUp size={12} className="text-ivvi-teal" />
                        <span>Vista Previa del Impacto</span>
                      </h4>
                      <div className="space-y-1.5 font-medium">
                        <div className="flex justify-between text-slate-400">
                          <span>Deuda de envases actual:</span>
                          <span className="font-mono text-slate-300 font-bold">
                            {clientes.find(c => c.id === parseInt(retornoClienteId))?.envases_pendientes || 0} UND
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Ingresan limpios a stock:</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            +{Math.max(0, (parseInt(retornoCantidadTotal) || 0) - (parseInt(retornoCantidadDanados) || 0))} UND
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Descarte automático (merma):</span>
                          <span className="font-mono text-red-405 dark:text-red-400 font-bold">
                            -{parseInt(retornoCantidadDanados) || 0} UND
                          </span>
                        </div>
                        <div className="border-t border-dashed border-white/10 pt-1.5 flex justify-between font-semibold text-white">
                          <span>Deuda de envases nueva:</span>
                          <span className="font-mono text-ivvi-teal font-bold">
                            {Math.max(0, (clientes.find(c => c.id === parseInt(retornoClienteId))?.envases_pendientes || 0) - (parseInt(retornoCantidadTotal) || 0))} UND
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-6">
                    <button 
                      type="button" 
                      onClick={() => setRetornoModalOpen(false)}
                      className="py-2.5 px-5 bg-white/5 hover:bg-white/10 rounded-xl text-white text-xs font-semibold cursor-pointer transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={submitting}
                      className="py-2.5 px-6 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-ivvi-teal/10 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                          <span>Registrando...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>Registrar Retorno</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

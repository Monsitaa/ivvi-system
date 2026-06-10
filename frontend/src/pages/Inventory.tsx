import { useState, useEffect } from 'react';
import { 
  Scale, 
  TrendingUp, 
  AlertCircle,
  Search,
  RefreshCw,
  Droplet,
  Package,
  Layers
} from 'lucide-react';
import type { 
  Usuario 
} from '../types';

interface InventoryProps {
  currentUser: Usuario | null;
}

interface StockItem {
  id: number;
  nombre: string;
  stock_actual: number;
  unidad?: string;
  factor_conversion?: number;
}

interface ValorizacionItem {
  producto: string;
  sku: string;
  stock: number;
  unidad: string;
  ultimo_costo: number;
  valor_total: number;
}

export default function Inventory({ currentUser }: InventoryProps) {
  const isGerencia = currentUser?.rol === 'Gerencia' || currentUser?.rol === 'Administrador';

  // Subtabs: 'existencias' | 'valoracion'
  const [activeSubTab, setActiveSubTab] = useState<'existencias' | 'valoracion'>('existencias');
  
  // Existencias states
  const [bulkProds, setBulkProds] = useState<StockItem[]>([]);
  const [vacioProds, setVacioProds] = useState<StockItem[]>([]);
  const [terminadoProds, setTerminadoProds] = useState<StockItem[]>([]);
  
  // Valuation states
  const [valoracionItems, setValoracionItems] = useState<ValorizacionItem[]>([]);
  const [totalValo, setTotalValo] = useState(0);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'existencias') {
        const res = await fetch('/api/produccion/envasado');
        const data = await res.json();
        if (data.success) {
          setBulkProds(data.bulk || []);
          setVacioProds(data.vacio || []);
          setTerminadoProds(data.terminados || []);
        } else {
          showToast('error', data.error || 'No se pudieron obtener existencias.');
        }
      } else if (activeSubTab === 'valoracion') {
        const res = await fetch('/api/inventario/valorizacion');
        const data = await res.json();
        if (res.ok) {
          setValoracionItems(data.items || []);
          setTotalValo(data.total_general || 0);
        } else {
          showToast('error', 'Error al cargar valoración financiera.');
        }
      }
    } catch (err) {
      showToast('error', 'Error de conexión al sincronizar inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab]);

  // Filters for stocks based on search term
  const filterStock = (items: StockItem[]) => {
    return items.filter(item => 
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filterValuation = (items: ValorizacionItem[]) => {
    return items.filter(item => 
      item.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-[1400px] mx-auto space-y-8 animate-fadeIn">
      {/* Toast notifications */}
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Existencias e Inventario Real
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visualización en tiempo real de aceites a granel, envases vacíos, productos terminados y valoración de activos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar material..."
              className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button 
            onClick={loadData}
            className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/5 transition-all cursor-pointer text-slate-500 dark:text-slate-400"
            title="Actualizar datos"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Navigation subtabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-white/5 pb-px overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => { setActiveSubTab('existencias'); setSearchTerm(''); }}
          className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'existencias' 
              ? 'border-ivvi-teal text-ivvi-teal' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'
          }`}
        >
          <Layers size={14} />
          <span>Existencias Físicas</span>
        </button>

        {isGerencia && (
          <button
            onClick={() => { setActiveSubTab('valoracion'); setSearchTerm(''); }}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'valoracion' 
                ? 'border-ivvi-teal text-ivvi-teal' 
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'
            }`}
          >
            <Scale size={14} />
            <span>Valoración Financiera</span>
          </button>
        )}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-ivvi-teal/30 border-t-ivvi-teal animate-spin"></div>
          <span className="text-xs text-slate-400">Cargando datos del almacén...</span>
        </div>
      ) : (
        <div>
          {/* TAB 1: EXISTENCIAS FISICAS */}
          {activeSubTab === 'existencias' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Card 1: Aceite a Granel (Bulk) */}
              <div className="glass-card rounded-2xl p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-ivvi-teal/10 rounded-xl">
                    <Droplet size={18} className="text-ivvi-teal" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-slate-800 dark:text-white leading-tight">
                      Aceites a Granel
                    </h3>
                    <span className="text-[10px] text-slate-400">Materia prima en tanques</span>
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  {filterStock(bulkProds).length > 0 ? (
                    filterStock(bulkProds).map(b => (
                      <div key={b.id} className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                          {b.nombre}
                        </span>
                        <div className="text-right">
                          <span className="font-bold font-mono text-slate-900 dark:text-white block">
                            {b.stock_actual.toLocaleString()} L
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-white/5 rounded-xl">
                      Sin registros.
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Envases Vacíos */}
              <div className="glass-card rounded-2xl p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-ivvi-amber/10 rounded-xl">
                    <Layers size={18} className="text-ivvi-amber" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-slate-800 dark:text-white leading-tight">
                      Envases Vacíos
                    </h3>
                    <span className="text-[10px] text-slate-400">Suministros de empaque</span>
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  {filterStock(vacioProds).length > 0 ? (
                    filterStock(vacioProds).map(v => (
                      <div key={v.id} className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                          {v.nombre}
                        </span>
                        <div className="text-right">
                          <span className="font-bold font-mono text-slate-900 dark:text-white block">
                            {v.stock_actual.toLocaleString()} unidades
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-white/5 rounded-xl">
                      Sin registros.
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Producto Terminado */}
              <div className="glass-card rounded-2xl p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                    <Package size={18} className="text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-slate-800 dark:text-white leading-tight">
                      Producto Terminado (PT)
                    </h3>
                    <span className="text-[10px] text-slate-400">Listo para facturación y despacho</span>
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  {filterStock(terminadoProds).length > 0 ? (
                    filterStock(terminadoProds).map(t => (
                      <div key={t.id} className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                          {t.nombre}
                        </span>
                        <div className="text-right">
                          <span className="font-bold font-mono text-slate-900 dark:text-white block">
                            {t.stock_actual.toLocaleString()} unidades
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-white/5 rounded-xl">
                      Sin registros.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: VALORACION FINANCIERA */}
          {activeSubTab === 'valoracion' && isGerencia && (
            <div className="space-y-6">
              {/* Valuation indicator card */}
              <div className="glass-card rounded-2xl p-6 relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-950 text-white flex justify-between items-center border border-white/5">
                <div className="absolute right-0 top-0 w-64 h-64 bg-ivvi-teal/10 rounded-full blur-3xl pointer-events-none"></div>
                <div>
                  <span className="text-xs font-semibold text-ivvi-teal-light uppercase tracking-wider">Valor Monetario de Activos</span>
                  <h2 className="text-3xl font-black font-heading tracking-tight mt-1 text-white">
                    C$ {totalValo.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                  <span className="text-[10px] text-slate-400 block mt-2">
                    Basado en el Método del Último Costo de Compra de Suministros
                  </span>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <TrendingUp size={28} className="text-ivvi-teal" />
                </div>
              </div>

              {/* Valuation items Table */}
              <div className="glass-card rounded-2xl p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 font-semibold pb-3">
                        <th className="pb-3 pl-2 whitespace-nowrap">SKU</th>
                        <th className="pb-3 whitespace-nowrap">Material / Producto Terminado</th>
                        <th className="pb-3 text-center whitespace-nowrap">Existencias</th>
                        <th className="pb-3 text-right whitespace-nowrap">Último Costo de Factura (NIO)</th>
                        <th className="pb-3 text-right whitespace-nowrap">Valor Total Estimado (NIO)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {filterValuation(valoracionItems).map((item, index) => (
                        <tr key={index} className="text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 pl-2 font-semibold font-mono text-slate-800 dark:text-white whitespace-nowrap">{item.sku}</td>
                          <td className="py-3 font-medium whitespace-nowrap">{item.producto}</td>
                          <td className="py-3 text-center font-bold font-mono whitespace-nowrap">
                            {item.stock} <span className="text-[10px] text-slate-400 font-normal">{item.unidad}</span>
                          </td>
                          <td className="py-3 text-right font-semibold font-mono whitespace-nowrap">C$ {item.ultimo_costo.toFixed(2)}</td>
                          <td className="py-3 text-right font-black font-mono text-slate-800 dark:text-white whitespace-nowrap">
                            C$ {item.valor_total.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {filterValuation(valoracionItems).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No se encontraron registros.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

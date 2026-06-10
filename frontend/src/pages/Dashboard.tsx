import { useState, useEffect } from 'react';
import { 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  Boxes, 
  AlertTriangle, 
  Activity,
  DollarSign
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart, 
  Pie, 
  Cell
} from 'recharts';

interface BajoStock {
  id: number;
  nombre: string;
  sku: string;
  stock_actual: number;
  stock_minimo: number;
}

interface UltimaVenta {
  id: number;
  numero_factura: string;
  fecha: string;
  cliente: string;
  vendedor: string;
  total: number;
}

interface DashboardData {
  tp: number;
  tc: number;
  vm: number;
  cm: number;
  valor_inv: number;
  grafico: {
    labels: string[];
    ventas: number[];
    compras: number[];
  };
  stock: {
    premium: number;
    estandar: number;
    pt: number;
  };
  bajo_stock: BajoStock[];
  ultimas_ventas: UltimaVenta[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Error de comunicación con la API.');
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || 'Ocurrió un error al cargar datos.');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4 min-h-[500px]">
        <div className="w-12 h-12 rounded-full border-4 border-ivvi-teal/30 border-t-ivvi-teal animate-spin"></div>
        <p className="text-slate-400 text-sm animate-pulse">Cargando métricas en tiempo real...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 p-8">
        <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl max-w-xl flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} />
            <h3 className="font-bold text-lg">Error de Carga</h3>
          </div>
          <p className="text-sm">{error || 'No se pudieron recuperar las métricas de rendimiento.'}</p>
          <button 
            onClick={fetchData} 
            className="w-fit py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Reintentar Conexión
          </button>
        </div>
      </div>
    );
  }

  // Convert graphical arrays to Recharts format
  const chartData = data.grafico.labels.map((label, index) => ({
    name: label,
    Ventas: data.grafico.ventas[index],
    Compras: data.grafico.compras[index],
  }));

  // Pie chart data
  const pieData = [
    { name: 'Aceite Premium (L)', value: data.stock.premium, color: '#f59e0b' },
    { name: 'Aceite Estándar (L)', value: data.stock.estandar, color: '#0d9488' },
    { name: 'Producto Terminado (Bidones)', value: data.stock.pt, color: '#10b981' }
  ].filter(p => p.value > 0);

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-[1400px] mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Resumen General de Operaciones
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            IVVI S.A. &mdash; Monitoreo de Almacén e Inventario
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl transition-all cursor-pointer"
          title="Actualizar Datos"
        >
          <Activity size={18} className="text-ivvi-teal animate-pulse" />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-ivvi-teal/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Productos en Catálogo</p>
              <h3 className="text-3xl font-bold font-heading text-slate-800 dark:text-white mt-2">{data.tp}</h3>
            </div>
            <div className="p-3 bg-ivvi-teal/10 rounded-xl text-ivvi-teal border border-ivvi-teal/20">
              <Boxes size={20} />
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-4 flex items-center gap-1.5">
            <span className="text-ivvi-teal font-semibold">Materiales activos</span>
            <span>en el inventario maestro</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-ivvi-amber/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cartera de Clientes</p>
              <h3 className="text-3xl font-bold font-heading text-slate-800 dark:text-white mt-2">{data.tc}</h3>
            </div>
            <div className="p-3 bg-ivvi-amber/10 rounded-xl text-ivvi-amber border border-ivvi-amber/20">
              <Users size={20} />
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-4 flex items-center gap-1.5">
            <span className="text-ivvi-amber font-semibold">Clientes registrados</span>
            <span>para distribución</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ventas del Mes (NIO)</p>
              <h3 className="text-2xl font-bold font-heading text-slate-800 dark:text-white mt-2.5">
                C$ {data.vm.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-4 flex items-center gap-1.5">
            <span className="text-emerald-500 font-semibold">Facturación corriente</span>
            <span>nacional</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Compras del Mes (NIO)</p>
              <h3 className="text-2xl font-bold font-heading text-slate-800 dark:text-white mt-2.5">
                C$ {data.cm.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl text-red-400 border border-red-500/20">
              <ArrowDownRight size={20} />
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-4 flex items-center gap-1.5">
            <span className="text-red-400 font-semibold">Inversión en granel</span>
            <span>y suministros base</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Stock Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales vs Purchases Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <h3 className="text-base font-bold font-heading text-slate-800 dark:text-white mb-4">
            Historial de Ventas vs Compras (Últimos 15 días)
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorCompras" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(9, 13, 22, 0.85)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    color: '#fff'
                  }} 
                />
                <Legend verticalAlign="top" height={36} />
                <Area type="monotone" dataKey="Ventas" name="Ventas (C$)" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorVentas)" />
                <Area type="monotone" dataKey="Compras" name="Compras (C$)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorCompras)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Distribution */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold font-heading text-slate-800 dark:text-white">
              Distribución Física de Stock
            </h3>
            <p className="text-xs text-slate-400 mt-1">Saldos volumétricos y bidonería</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center relative my-4">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(9, 13, 22, 0.85)', 
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      color: '#fff'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">Sin stock registrado.</p>
            )}
            <div className="absolute text-center">
              <span className="block text-2xl font-bold font-heading text-slate-800 dark:text-white">
                C$ {data.valor_inv.toLocaleString('es-NI', { maximumFractionDigits: 0 })}
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">
                Valor Total (NIO)
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {pieData.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-white">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Warnings & Recent Sales list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Low Stock Alerts */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold font-heading text-slate-800 dark:text-white flex items-center gap-2">
                <AlertTriangle size={18} className="text-ivvi-amber" />
                Alertas de Stock Crítico
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 bg-ivvi-amber/10 text-ivvi-amber rounded-full">
                {data.bajo_stock.length}
              </span>
            </div>
            
            {data.bajo_stock.length > 0 ? (
              <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                {data.bajo_stock.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-xs text-slate-800 dark:text-white">{p.nombre}</span>
                      <span className="text-[10px] text-slate-400 font-mono font-medium">{p.sku}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <div className="text-slate-400">
                        Stock: <span className="font-bold text-red-500">{p.stock_actual}</span>
                      </div>
                      <div className="text-slate-400">
                        Mínimo: <span className="font-semibold text-slate-600 dark:text-slate-300">{p.stock_minimo}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Boxes size={36} className="text-slate-300 dark:text-slate-800" />
                <p className="text-xs text-center">No hay alertas críticas de existencias.</p>
              </div>
            )}
          </div>
          
          <div className="text-[11px] text-slate-400 border-t border-slate-200 dark:border-white/5 pt-4 mt-4">
            Recuerde emitir solicitudes de compra a proveedores aprobados.
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold font-heading text-slate-800 dark:text-white flex items-center gap-2">
              <DollarSign size={18} className="text-ivvi-teal" />
              Últimas Ventas Emitidas (POS)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 font-semibold">
                  <th className="pb-3 whitespace-nowrap">Factura</th>
                  <th className="pb-3 whitespace-nowrap">Fecha</th>
                  <th className="pb-3 whitespace-nowrap">Cliente</th>
                  <th className="pb-3 whitespace-nowrap">Vendedor</th>
                  <th className="pb-3 text-right whitespace-nowrap">Monto (C$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {data.ultimas_ventas.length > 0 ? (
                  data.ultimas_ventas.map((v) => (
                    <tr key={v.id} className="text-slate-600 dark:text-slate-300">
                      <td className="py-3.5 font-semibold font-mono text-slate-800 dark:text-white whitespace-nowrap">{v.numero_factura}</td>
                      <td className="py-3.5 whitespace-nowrap">{v.fecha}</td>
                      <td className="py-3.5 truncate max-w-[150px] whitespace-nowrap">{v.cliente}</td>
                      <td className="py-3.5 whitespace-nowrap">{v.vendedor}</td>
                      <td className="py-3.5 text-right font-bold text-slate-800 dark:text-white">
                        {v.total.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No se han registrado transacciones de venta en este periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

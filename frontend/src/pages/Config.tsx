import { useState, useEffect } from 'react';
import { 
  Building, 
  Download, 
  FileSpreadsheet,
  AlertCircle,
  DatabaseZap,
  ShieldCheck
} from 'lucide-react';

export default function Config() {
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [ruc, setRuc] = useState('');
  const [tasaCambio, setTasaCambio] = useState<string>('36.0');
  const [tasaCambioMax, setTasaCambioMax] = useState<string>('40.0');
  const [skuBidon, setSkuBidon] = useState<string>('BID-VACIO-19L');
  
  const [loading, setLoading] = useState(false);
  const [mantLoading, setMantLoading] = useState(false);
  const [mantResult, setMantResult] = useState<{success: boolean; message?: string; error?: string; wal_kb_antes?: number; wal_kb_despues?: number} | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => { loadConfig(); }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/configuracion', { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (data.success && data.conf) {
        setNombreEmpresa(data.conf.nombre_empresa || 'IVVI S.A.');
        setRuc(data.conf.ruc || '');
        setTasaCambio(data.conf.tasa_cambio !== undefined ? String(data.conf.tasa_cambio) : '36.0');
        setTasaCambioMax(data.conf.tasa_cambio_max !== undefined ? String(data.conf.tasa_cambio_max) : '40.0');
        setSkuBidon(data.conf.sku_bidon_vacio || 'BID-VACIO-19L');
      }
    } catch { showToast('error', 'Error al consultar configuración corporativa.'); }
    finally { setLoading(false); }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_empresa: nombreEmpresa,
          ruc,
          tasa_cambio: parseFloat(tasaCambio) || 36.0,
          tasa_cambio_max: parseFloat(tasaCambioMax) || 40.0,
          sku_bidon_vacio: skuBidon.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) { showToast('success', data.message); loadConfig(); }
      else showToast('error', data.error || 'Error al actualizar configuración.');
    } catch { showToast('error', 'Error de conexión.'); }
    finally { setLoading(false); }
  };

  const handleMantenimiento = async () => {
    if (!window.confirm('¿Ejecutar mantenimiento de base de datos? Esto hará un checkpoint WAL y un backup del archivo.')) return;
    setMantLoading(true);
    setMantResult(null);
    try {
      const res = await fetch('/api/admin/mantenimiento', { method: 'POST', headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      setMantResult(data);
    } catch { setMantResult({ success: false, error: 'Error de conexión al ejecutar mantenimiento.' }); }
    finally { setMantLoading(false); }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-[1400px] mx-auto space-y-8 animate-fadeIn">
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border text-sm max-w-md animate-slideIn ${
          notification.type === 'success' ? 'bg-slate-900 border-ivvi-teal/30 text-ivvi-teal-light' : 'bg-slate-900 border-red-500/30 text-red-400'
        }`}>
          <AlertCircle size={20} />
          <span>{notification.message}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          Configuración Global y Auditoría de Datos
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ajustes fiscales de la empresa, controles de inventario y exportadores de reportes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Config Form */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
          <h3 className="font-heading font-bold text-base text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Building size={18} className="text-ivvi-teal" />
            Parámetros Fiscales y de Control
          </h3>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Razón Social Empresa</label>
              <input type="text" required placeholder="IVVI S.A."
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs"
                value={nombreEmpresa} onChange={(e) => setNombreEmpresa(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">RUC Corporativo</label>
                <input type="text" required placeholder="J0310000..."
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs font-mono"
                  value={ruc} onChange={(e) => setRuc(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tasa Oficial USD/NIO</label>
                <input type="number" step="any" required min="0.0001"
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs font-mono"
                  value={tasaCambio} onChange={(e) => setTasaCambio(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Tasa Máxima Permitida
                  <span className="ml-1 text-slate-500 font-normal">(límite de control)</span>
                </label>
                <input type="number" step="any" required min="0.0001"
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-amber text-xs font-mono"
                  value={tasaCambioMax} onChange={(e) => setTasaCambioMax(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  SKU Envase Retornable 19L
                  <span className="ml-1 text-slate-500 font-normal">(retornos)</span>
                </label>
                <input type="text" required placeholder="BID-VACIO-19L"
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs font-mono"
                  value={skuBidon} onChange={(e) => setSkuBidon(e.target.value)} />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="py-2.5 px-6 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-ivvi-teal/10 cursor-pointer active:translate-y-0.5 mt-2 disabled:opacity-50">
              {loading ? 'Sincronizando...' : 'Actualizar Datos Corporativos'}
            </button>
          </form>
        </div>

        {/* Right: Excel Reports */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-amber to-ivvi-teal"></div>
          <div>
            <h3 className="font-heading font-bold text-base text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-ivvi-amber" />
              Consolidación y Auditoría (Libros en Excel)
            </h3>
            <p className="text-xs text-slate-400 mb-6">Descargue libros de control en formato XLSX procesados directamente desde la base de datos.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a href="/reportes/ventas/excel" className="p-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 rounded-xl flex flex-col gap-2 transition-all text-slate-700 dark:text-white">
                <div className="flex justify-between items-center"><span className="font-semibold text-xs">Libro de Ventas</span><Download size={14} className="text-ivvi-teal" /></div>
                <p className="text-[10px] text-slate-400">Total acumulado de facturas POS</p>
              </a>
              <a href="/reportes/compras/excel" className="p-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 rounded-xl flex flex-col gap-2 transition-all text-slate-700 dark:text-white">
                <div className="flex justify-between items-center"><span className="font-semibold text-xs">Libro de Compras</span><Download size={14} className="text-ivvi-teal" /></div>
                <p className="text-[10px] text-slate-400">Costos a granel e insumos</p>
              </a>
              <a href="/reportes/inventario/excel" className="p-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 rounded-xl flex flex-col gap-2 transition-all text-slate-700 dark:text-white">
                <div className="flex justify-between items-center"><span className="font-semibold text-xs">Libro de Inventario</span><Download size={14} className="text-ivvi-teal" /></div>
                <p className="text-[10px] text-slate-400">Existencias físicas y mermas</p>
              </a>
              <a href="/reportes/kardex/excel" className="p-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 rounded-xl flex flex-col gap-2 transition-all text-slate-700 dark:text-white">
                <div className="flex justify-between items-center"><span className="font-semibold text-xs">Libro de Kárdex</span><Download size={14} className="text-ivvi-amber" /></div>
                <p className="text-[10px] text-slate-400">Kárdex de auditoría inalterable</p>
              </a>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-6 pt-4 border-t border-slate-200 dark:border-white/5">
            Los libros contienen marcas de tiempo de auditoría y autoría de colaboradores.
          </div>
        </div>
      </div>

      {/* WAL Maintenance Card */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-500 to-slate-700"></div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl">
              <DatabaseZap size={22} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                Mantenimiento de Base de Datos
                <ShieldCheck size={14} className="text-ivvi-teal" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg">
                Fuerza un <strong className="text-slate-700 dark:text-slate-300">WAL Checkpoint</strong> (vacía el archivo de transacciones pendientes al archivo principal) 
                y genera un <strong className="text-slate-700 dark:text-slate-300">backup</strong> en <code className="text-ivvi-teal font-mono">database.db.bak</code>.
                El sistema hace esto automáticamente cada 50 operaciones y al iniciar si el backup tiene más de 24 horas.
              </p>
              {mantResult && (
                <div className={`mt-3 p-3 rounded-xl border text-xs ${mantResult.success ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
                  {mantResult.success ? (
                    <span>
                      ✅ {mantResult.message}
                      {mantResult.wal_kb_antes !== undefined && (
                        <span className="ml-2 text-slate-400">· WAL: <strong>{mantResult.wal_kb_antes} KB</strong> → <strong>{mantResult.wal_kb_despues} KB</strong></span>
                      )}
                    </span>
                  ) : (
                    <span>❌ {mantResult.error}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleMantenimiento}
            disabled={mantLoading}
            className="shrink-0 py-2.5 px-6 bg-slate-700 hover:bg-slate-600 dark:bg-white/10 dark:hover:bg-white/15 text-white rounded-xl font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <DatabaseZap size={14} />
            {mantLoading ? 'Ejecutando...' : 'Ejecutar Mantenimiento'}
          </button>
        </div>
      </div>
    </div>
  );
}

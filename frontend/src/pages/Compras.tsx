import { useState, useEffect } from 'react';
import { Plus, Trash, Eye, X, Ban, AlertCircle } from 'lucide-react';
import type { Producto, Proveedor, CompraItem, Usuario } from '../types';

interface ComprasProps { currentUser: Usuario | null; }
interface ItemLinea { producto_id: string; cantidad: string; costo: string; }

export default function Compras({ currentUser }: ComprasProps) {
  const isGerencia = currentUser?.rol === 'Gerencia' || currentUser?.rol === 'Administrador';
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [compras, setCompras] = useState<CompraItem[]>([]);
  const [tasaCambioConf, setTasaCambioConf] = useState(36.0);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const getLocalDateTimeString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - offset * 60 * 1000);
    return localNow.toISOString().slice(0, 16);
  };

  // Form states
  const [provId, setProvId] = useState('');
  const [numFactura, setNumFactura] = useState('');
  const [moneda, setMoneda] = useState('NIO');
  const [tasaCambio, setTasaCambio] = useState(36.0);
  const [fechaFactura, setFechaFactura] = useState(getLocalDateTimeString());
  const [lineas, setLineas] = useState<ItemLinea[]>([{ producto_id: '', cantidad: '1', costo: '' }]);
  
  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeDetail, setActiveDetail] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const showToast = (type: 'success' | 'error', message: string) => { 
    setNotification({ type, message }); 
    setTimeout(() => setNotification(null), 4000); 
  };

  const loadData = async () => {
    try {
      const res = await fetch('/compras', { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (data.success) {
        setProductos(data.productos || []); 
        setProveedores(data.proveedores || []); 
        setCompras(data.items || []);
        if (data.conf) { 
          setTasaCambioConf(data.conf.tasa_cambio); 
          setTasaCambio(data.conf.tasa_cambio); 
        }
      }
    } catch { 
      showToast('error', 'Error al sincronizar datos.'); 
    }
  };

  const getFilteredProducts = () => {
    if (!provId) return [];
    const providerObj = proveedores.find(p => String(p.id) === provId);
    if (!providerObj) return [];

    const name = providerObj.razon_social.toLowerCase();
    if (name.includes('olmeca')) {
      return productos.filter(p => p.sku === 'ACE-PRE-BULK');
    } else if (name.includes('inducaribe')) {
      return productos.filter(p => p.sku === 'ACE-EST-BULK');
    } else if (name.includes('envase')) {
      return productos.filter(p => p.sku.startsWith('BID-') || p.sku.startsWith('BOT-'));
    }
    return productos;
  };

  const handleProviderChange = (selectedId: string) => {
    setProvId(selectedId);
    
    const providerObj = proveedores.find(p => String(p.id) === selectedId);
    let targetMoneda = 'NIO';
    let targetTasa = 1.0;
    
    let filteredProds: Producto[] = [];
    if (providerObj) {
      const name = providerObj.razon_social.toLowerCase();
      if (name.includes('olmeca') || name.includes('inducaribe')) {
        targetMoneda = 'USD';
        targetTasa = tasaCambioConf;
      }
      
      if (name.includes('olmeca')) {
        filteredProds = productos.filter(p => p.sku === 'ACE-PRE-BULK');
      } else if (name.includes('inducaribe')) {
        filteredProds = productos.filter(p => p.sku === 'ACE-EST-BULK');
      } else if (name.includes('envase')) {
        filteredProds = productos.filter(p => p.sku.startsWith('BID-') || p.sku.startsWith('BOT-'));
      } else {
        filteredProds = productos;
      }
    } else {
      filteredProds = productos;
    }
    
    setMoneda(targetMoneda);
    setTasaCambio(targetTasa);
    
    const singleProduct = filteredProds.length === 1 ? filteredProds[0] : null;
    
    const updatedLineas = lineas.map(line => {
      if (singleProduct) {
        return { ...line, producto_id: String(singleProduct.id) };
      }
      const isProductStillValid = filteredProds.some(p => String(p.id) === line.producto_id);
      if (!isProductStillValid) {
        return { ...line, producto_id: '' };
      }
      return line;
    });
    setLineas(updatedLineas);
  };

  const addLinea = () => {
    const filteredProds = getFilteredProducts();
    const defaultProductId = filteredProds.length === 1 ? String(filteredProds[0].id) : '';
    setLineas([...lineas, { producto_id: defaultProductId, cantidad: '1', costo: '' }]);
  };

  const removeLinea = (i: number) => { if (lineas.length === 1) return; setLineas(lineas.filter((_, idx) => idx !== i)); };

  const updateLinea = (i: number, field: keyof ItemLinea, value: string) => {
    const upd = [...lineas];
    if (field === 'producto_id') upd[i].producto_id = value;
    else if (field === 'cantidad') {
      upd[i].cantidad = value;
    } else if (field === 'costo') {
      upd[i].costo = value;
    }
    setLineas(upd);
  };

  const getSubtotal = (l: ItemLinea) => (parseFloat(l.cantidad) || 0) * (parseFloat(l.costo) || 0);
  const getTotal = () => lineas.reduce((s, l) => s + getSubtotal(l), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provId) { showToast('error', 'Seleccione un proveedor.'); return; }
    if (lineas.some(l => !l.producto_id || !l.cantidad || !l.costo || parseFloat(l.cantidad) <= 0 || parseFloat(l.costo) <= 0)) {
      showToast('error', 'Complete todas las líneas con valores válidos mayores a cero.');
      return;
    }
    try {
      const res = await fetch('/compras', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          proveedor_id: parseInt(provId), 
          numero_factura: numFactura, 
          moneda, 
          tasa_cambio: parseFloat(String(tasaCambio)), 
          fecha_factura: fechaFactura || undefined,
          productos: lineas.map(l => ({ 
            producto_id: parseInt(l.producto_id), 
            cantidad: parseFloat(l.cantidad), 
            costo: parseFloat(l.costo) 
          })) 
        }) 
      });
      const data = await res.json();
      if (res.ok && data.success) { 
        showToast('success', data.message); 
        setProvId(''); 
        setNumFactura(''); 
        setFechaFactura(getLocalDateTimeString());
        setLineas([{ producto_id: '', cantidad: '1', costo: '' }]); 
        setFormModalOpen(false);
        loadData(); 
      }
      else showToast('error', data.error || 'Error al procesar.');
    } catch { showToast('error', 'Error de conexión.'); }
  };

  const handleAnular = async (id: number) => {
    if (!window.confirm('¿Anular esta compra? El stock se revertirá.')) return;
    try { 
      const res = await fetch(`/compras/${id}/anular`, { method: 'POST', headers: { 'Accept': 'application/json' } }); 
      const data = await res.json();
      if (res.ok && data.success) { showToast('success', data.message); loadData(); } 
      else showToast('error', data.error || 'No se pudo anular.');
    } catch { showToast('error', 'Error de conexión.'); }
  };

  const handleShowDetail = async (id: number) => {
    try { 
      const res = await fetch(`/api/compras/${id}`); 
      const data = await res.json(); 
      if (res.ok) { setActiveDetail(data); setDetailModalOpen(true); }
    } catch { showToast('error', 'Error al obtener detalles.'); }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto space-y-8 animate-fadeIn max-w-[1400px] mx-auto">
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
            Entradas (Compras)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ingreso de suministros y materias primas multimoneda.
          </p>
        </div>
        <button
          onClick={() => setFormModalOpen(true)}
          className="py-2.5 px-5 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-ivvi-teal/10 hover:shadow-lg"
        >
          <Plus size={14} /> Registrar Compra
        </button>
      </div>

      {/* Main View: Full-width Table */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
        <h3 className="font-heading font-bold text-base text-slate-800 dark:text-white mb-6">
          Historial de Compras
        </h3>

        <div className="overflow-x-auto border border-slate-200/50 dark:border-white/5 rounded-2xl bg-slate-50/30 dark:bg-black/10">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 font-semibold bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="p-4 whitespace-nowrap">Nº Factura</th>
                <th className="p-4 whitespace-nowrap">Fecha / Hora</th>
                <th className="p-4 whitespace-nowrap">Proveedor</th>
                <th className="p-4 text-right whitespace-nowrap">Monto Total</th>
                <th className="p-4 text-center whitespace-nowrap">Tasa Cambio</th>
                <th className="p-4 text-center whitespace-nowrap">Estado</th>
                <th className="p-4 text-center whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {compras.length > 0 ? (
                compras.map(c => (
                  <tr key={c.id} className="text-slate-600 dark:text-slate-300 hover:bg-slate-100/30 dark:hover:bg-white/[0.01] transition-all">
                    <td className="p-4 font-mono whitespace-nowrap">
                      <span className="bg-slate-100 dark:bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-white/5 font-semibold text-slate-800 dark:text-slate-200">
                        {c.numero_factura}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-450 dark:text-slate-400 font-mono text-[10px]">{c.fecha}</td>
                    <td className="p-4 font-medium text-slate-800 dark:text-white whitespace-nowrap">{c.proveedor}</td>
                    <td className="p-4 text-right font-black font-mono text-slate-800 dark:text-white whitespace-nowrap">
                      {c.moneda} {c.total.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center font-mono text-slate-500 font-bold whitespace-nowrap">{c.moneda === 'NIO' ? 'N/A' : `C$ ${(c.total_base / c.total).toFixed(4)}`}</td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                        c.estado === 'Completada'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleShowDetail(c.id)}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                          title="Ver Detalle"
                        >
                          <Eye size={14} />
                        </button>
                        {isGerencia && c.estado === 'Completada' && (
                          <button
                            onClick={() => handleAnular(c.id)}
                            className="p-1.5 hover:bg-red-500/15 rounded-lg text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                            title="Anular Adquisición"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    No hay compras ingresadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Registration Modal */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white my-8 animate-fadeIn">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-base">Registrar Adquisición de Suministros</h3>
              <button 
                onClick={() => setFormModalOpen(false)} 
                className="text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Proveedor</label>
                  <select 
                    required 
                    className="w-full px-3 py-2 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs" 
                    value={provId} 
                    onChange={(e) => handleProviderChange(e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.razon_social} (RUC: {p.ruc || 'N/A'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Número de Factura</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="001-002-..." 
                    className="w-full px-3 py-2 bg-slate-800 rounded-xl border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs font-mono" 
                    value={numFactura} 
                    onChange={(e) => setNumFactura(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Fecha Factura (Opcional)</label>
                  <input 
                    type="datetime-local" 
                    className="w-full px-3 py-2 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs" 
                    value={fechaFactura} 
                    onChange={(e) => setFechaFactura(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Moneda</label>
                  <select 
                    required 
                    className="w-full px-3 py-2 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs" 
                    value={moneda} 
                    onChange={(e) => { 
                      setMoneda(e.target.value); 
                      if (e.target.value === 'NIO') setTasaCambio(1.0); 
                      else setTasaCambio(tasaCambioConf); 
                    }}
                  >
                    <option value="NIO">Córdobas (NIO)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tasa de Cambio</label>
                  <input 
                    type="number" 
                    step="0.0001" 
                    required 
                    min="0.0001" 
                    disabled={moneda === 'NIO'} 
                    className="w-full px-3 py-2 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs disabled:opacity-50 font-mono" 
                    value={tasaCambio} 
                    onChange={(e) => setTasaCambio(parseFloat(e.target.value) || 1.0)} 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Detalle de Productos</span>
                  <button 
                    type="button" 
                    onClick={addLinea} 
                    className="py-1 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={12} /> Añadir Fila
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {lineas.map((l, i) => {
                    const selectedProd = productos.find(p => String(p.id) === l.producto_id);
                    const isBulk = selectedProd && (selectedProd.factor_conversion ?? 1) > 1;
                    const unitText = selectedProd 
                      ? (isBulk ? 'TM' : (selectedProd.unidad || 'UND')) 
                      : '-';

                    return (
                      <div key={i} className="space-y-1.5 p-3 rounded-xl bg-slate-800/40 border border-white/5">
                        <div className="flex gap-3 items-center flex-wrap md:flex-nowrap">
                          {/* Select Product */}
                          <div className="flex-1 min-w-[200px]">
                            <select 
                              required 
                              disabled={!provId}
                              className="w-full px-3 py-2 bg-slate-850 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs disabled:opacity-50" 
                              value={l.producto_id} 
                              onChange={(e) => updateLinea(i, 'producto_id', e.target.value)}
                            >
                              <option value="">{provId ? 'Seleccione Material...' : 'Seleccione el proveedor primero...'}</option>
                              {getFilteredProducts().map(p => (
                                <option key={p.id} value={p.id}>{p.nombre} ({p.sku})</option>
                              ))}
                            </select>
                          </div>

                          {/* Unit Badge */}
                          <div className="w-16 shrink-0 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              isBulk 
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                : 'bg-white/5 text-slate-400 border border-white/10'
                            }`}>
                              {unitText}
                            </span>
                          </div>

                          {/* Quantity */}
                          <div className="w-24 shrink-0">
                            <input 
                              type="number" 
                              required 
                              placeholder="Cant." 
                              min="0.0001" 
                              step="any"
                              className="w-full px-3 py-2 bg-slate-850 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs font-mono" 
                              value={l.cantidad} 
                              onChange={(e) => updateLinea(i, 'cantidad', e.target.value)} 
                            />
                          </div>

                          {/* Currency symbol + Cost Input */}
                          <div className="w-32 shrink-0 relative flex items-center">
                            <span className="absolute left-3 text-xs font-bold text-slate-500">
                              {moneda === 'USD' ? '$' : 'C$'}
                            </span>
                            <input 
                              type="number" 
                              required 
                              placeholder="Costo Unit." 
                              step="any" 
                              min="0.0001" 
                              className="w-full pl-8 pr-3 py-2 bg-slate-850 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs font-mono" 
                              value={l.costo} 
                              onChange={(e) => updateLinea(i, 'costo', e.target.value)} 
                            />
                          </div>

                          {/* Subtotal */}
                          <div className="w-28 shrink-0 text-right text-xs font-bold text-white font-mono">
                            {moneda === 'USD' ? '$' : 'C$'} {getSubtotal(l).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                          </div>

                          {/* Remove Button */}
                          <button 
                            type="button" 
                            onClick={() => removeLinea(i)} 
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash size={14} />
                          </button>
                        </div>

                        {/* Conversion message */}
                        {isBulk && Number(l.cantidad) > 0 && selectedProd && (
                          <div className="text-[10px] text-emerald-400 font-semibold pl-1 flex items-center gap-1.5 animate-fadeIn">
                            <span>📦</span>
                            <span>Entrarán {(Number(l.cantidad) * (selectedProd.factor_conversion ?? 1)).toLocaleString('es-NI')} L a inventario</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total and Actions */}
              <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-6">
                <div className="text-sm">
                  <span className="text-slate-400 font-medium">Total:</span>
                  <span className="ml-2 font-black text-ivvi-teal font-mono text-base">
                    {moneda} {getTotal().toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setFormModalOpen(false)}
                    className="py-2.5 px-5 bg-white/5 hover:bg-white/10 rounded-xl text-white text-xs font-semibold cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="py-2.5 px-6 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-ivvi-teal/10 cursor-pointer active:translate-y-0.5"
                  >
                    Registrar Compra
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModalOpen && activeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white animate-fadeIn">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm">Detalle Factura # {activeDetail.factura || activeDetail.numero_factura}</h3>
              <button onClick={() => setDetailModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
                <div><span className="text-slate-400 font-semibold block">Proveedor:</span><span className="font-bold text-white">{activeDetail.proveedor}</span></div>
                <div><span className="text-slate-400 font-semibold block">Fecha:</span><span className="font-bold text-white">{activeDetail.fecha}</span></div>
                <div><span className="text-slate-400 font-semibold block">Estado:</span><span className={`font-bold inline-block px-2 py-0.5 rounded text-[10px] mt-0.5 ${activeDetail.estado === 'Completada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>{activeDetail.estado}</span></div>
                <div><span className="text-slate-400 font-semibold block">Monto:</span><span className="font-bold text-ivvi-amber">{activeDetail.moneda || 'NIO'} {activeDetail.total?.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span></div>
              </div>
              <div className="border border-white/5 rounded-xl p-3 bg-black/25">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400">
                      <th className="pb-2">Producto</th>
                      <th className="pb-2 text-center">Cant.</th>
                      <th className="pb-2 text-right">Costo</th>
                      <th className="pb-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {activeDetail.detalles?.map((d: any, i: number) => (
                      <tr key={i} className="text-slate-300">
                        <td className="py-2.5 font-medium">{d.producto}</td>
                        <td className="py-2.5 text-center">{d.cantidad}</td>
                        <td className="py-2.5 text-right font-mono">{(d.costo_unitario || d.precio_unitario)?.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2.5 text-right font-bold font-mono text-white">{d.subtotal?.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

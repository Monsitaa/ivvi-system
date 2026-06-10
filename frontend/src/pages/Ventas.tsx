import { useState, useEffect } from 'react';
import { Plus, Trash, Eye, X, Printer, Ban, UserPlus, AlertCircle } from 'lucide-react';
import type { Producto, Cliente, VentaItem, Usuario } from '../types';

interface VentasProps { currentUser: Usuario | null; }
interface ItemLinea { producto_id: string; cantidad: string; costo: string; }

export default function Ventas({ currentUser }: VentasProps) {
  // Solo Administrador y Gerencia pueden anular (el vendedor no puede borrar sus propias ventas)
  const canAnular = currentUser?.rol === 'Administrador' || currentUser?.rol === 'Gerencia';
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ventas, setVentas] = useState<VentaItem[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cliId, setCliId] = useState('');
  const [lineas, setLineas] = useState<ItemLinea[]>([{ producto_id: '', cantidad: '1', costo: '' }]);
  
  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeDetail, setActiveDetail] = useState<any>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({ nombre: '', ruc: '', telefono: '', email: '', direccion: '' });

  useEffect(() => { loadData(); }, []);
  const showToast = (type: 'success' | 'error', message: string) => { setNotification({ type, message }); setTimeout(() => setNotification(null), 4000); };

  const loadData = async () => {
    try { 
      const res = await fetch('/ventas', { headers: { 'Accept': 'application/json' } }); 
      const data = await res.json();
      if (data.success) { 
        setProductos(data.productos || []); 
        setClientes(data.clientes || []); 
        setVentas(data.items || []); 
      }
    } catch { 
      showToast('error', 'Error al sincronizar datos.'); 
    }
  };

  const addLinea = () => setLineas([...lineas, { producto_id: '', cantidad: '1', costo: '' }]);
  const removeLinea = (i: number) => { if (lineas.length === 1) return; setLineas(lineas.filter((_, idx) => idx !== i)); };
  
  const updateLinea = (i: number, field: keyof ItemLinea, value: string) => {
    const upd = [...lineas];
    if (field === 'producto_id') { 
      upd[i].producto_id = value; 
      const sp = productos.find(p => p.id === parseInt(value)); 
      if (sp) upd[i].costo = String(sp.precio_venta || 0); 
    }
    else if (field === 'cantidad') {
      upd[i].cantidad = value;
    }
    else if (field === 'costo') {
      upd[i].costo = value;
    }
    setLineas(upd);
  };
  
  const getSubtotal = (l: ItemLinea) => (parseFloat(l.cantidad) || 0) * (parseFloat(l.costo) || 0);
  const getTotal = () => lineas.reduce((s, l) => s + getSubtotal(l), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliId) { showToast('error', 'Seleccione un cliente.'); return; }
    if (lineas.some(l => !l.producto_id || !l.cantidad || parseFloat(l.cantidad) <= 0)) { 
      showToast('error', 'Verifique los productos y cantidades.'); 
      return; 
    }
    try {
      const res = await fetch('/ventas', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cliente_id: parseInt(cliId), 
          productos: lineas.map(l => ({ 
            producto_id: parseInt(l.producto_id), 
            cantidad: parseFloat(l.cantidad) || 0 
          })) 
        }) 
      });
      const data = await res.json();
      if (res.ok && data.success) { 
        showToast('success', data.message); 
        setCliId(''); 
        setLineas([{ producto_id: '', cantidad: '1', costo: '' }]); 
        setFormModalOpen(false);
        loadData();
        if (window.confirm('¿Desea descargar la factura en PDF?')) window.open(`/ventas/pdf/${data.id}`, '_blank');
      } else showToast('error', data.error || 'Error al procesar.');
    } catch { showToast('error', 'Error de conexión.'); }
  };

  const handleAnular = async (id: number) => {
    if (!window.confirm('¿Anular esta venta? El stock se revertirá.')) return;
    try { 
      const res = await fetch(`/ventas/${id}/anular`, { method: 'POST', headers: { 'Accept': 'application/json' } }); 
      const data = await res.json();
      if (res.ok && data.success) { showToast('success', data.message); loadData(); } 
      else showToast('error', data.error || 'No se pudo anular.');
    } catch { showToast('error', 'Error de conexión.'); }
  };

  const handleShowDetail = async (id: number) => {
    try { 
      const res = await fetch(`/api/ventas/${id}`); 
      const data = await res.json(); 
      if (res.ok) { setActiveDetail(data); setDetailModalOpen(true); }
    } catch { showToast('error', 'Error al obtener detalles.'); }
  };

  const handleRegisterClientExpress = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newClient.nombre) return;
    try { 
      const res = await fetch('/api/clientes/registrar', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(newClient) 
      }); 
      const data = await res.json();
      if (res.ok && data.success) { 
        showToast('success', 'Cliente express registrado.'); 
        setClientModalOpen(false); 
        setCliId(String(data.id)); 
        setNewClient({ nombre: '', ruc: '', telefono: '', email: '', direccion: '' }); 
        loadData(); 
      }
      else showToast('error', data.error || 'Error al guardar.');
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
            Salidas (Ventas)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Punto de venta y facturación POS.
          </p>
        </div>
        <button
          onClick={() => setFormModalOpen(true)}
          className="py-2.5 px-5 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-ivvi-teal/10 hover:shadow-lg"
        >
          <Plus size={14} /> Nueva Venta POS
        </button>
      </div>

      {/* Main View: Full-width Table */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
        <h3 className="font-heading font-bold text-base text-slate-800 dark:text-white mb-6">
          Historial de Ventas
        </h3>

        <div className="overflow-x-auto border border-slate-200/50 dark:border-white/5 rounded-2xl bg-slate-50/30 dark:bg-black/10">
          <table className="w-full text-left text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 font-semibold bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="p-4">Nº Factura</th>
                <th className="p-4">Fecha / Hora</th>
                <th className="p-4">Cliente</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {ventas.length > 0 ? (
                ventas.map(v => (
                  <tr key={v.id} className="text-slate-600 dark:text-slate-300 hover:bg-slate-100/30 dark:hover:bg-white/[0.01] transition-all">
                    <td className="p-4 font-mono whitespace-nowrap">
                      <span className="bg-slate-100 dark:bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-white/5 font-semibold text-slate-800 dark:text-slate-200">
                        {v.numero_factura}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-450 dark:text-slate-400 font-mono text-[10px]">{v.fecha}</td>
                    <td className="p-4 font-medium text-slate-800 dark:text-white">{v.cliente}</td>
                    <td className="p-4 text-right font-black font-mono text-slate-800 dark:text-white">
                      C$ {v.total.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                        v.estado === 'Completada'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {v.estado}
                      </span>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleShowDetail(v.id)}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                          title="Ver Detalle"
                        >
                          <Eye size={14} />
                        </button>
                        <a
                          href={`/ventas/pdf/${v.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-ivvi-amber transition-all flex items-center justify-center"
                          title="Imprimir Factura PDF"
                        >
                          <Printer size={14} />
                        </a>
                        {canAnular && v.estado === 'Completada' && (
                          <button
                            onClick={() => handleAnular(v.id)}
                            className="p-1.5 hover:bg-red-500/15 rounded-lg text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                            title="Anular Venta"
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
                  <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    No hay ventas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POS Sale Creation Modal */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white my-8">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-base">Facturar Venta POS</h3>
              <button 
                onClick={() => setFormModalOpen(false)} 
                className="text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex justify-between items-center">
                    <span>Cliente Factura</span>
                    <button 
                      type="button" 
                      onClick={() => setClientModalOpen(true)} 
                      className="text-[10px] text-ivvi-teal hover:text-ivvi-teal-light font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus size={10} /> Cliente Express
                    </button>
                  </label>
                  <select 
                    required 
                    className="w-full px-3 py-2 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs" 
                    value={cliId} 
                    onChange={(e) => setCliId(e.target.value)}
                  >
                    <option value="">Seleccionar Cliente...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} (RUC: {c.ruc || 'N/A'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Detalle de Facturación</span>
                  <button 
                    type="button" 
                    onClick={addLinea} 
                    className="py-1 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={12} /> Añadir Fila
                  </button>
                </div>
                
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {lineas.map((l, i) => {
                    const sp = productos.find(p => p.id === parseInt(l.producto_id));
                    return (
                      <div key={i} className="flex gap-3 items-center">
                        <select 
                          required 
                          className="flex-1 px-3 py-2 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs" 
                          value={l.producto_id} 
                          onChange={(e) => updateLinea(i, 'producto_id', e.target.value)}
                        >
                          <option value="">Seleccione Producto...</option>
                          {productos.map(p => (
                            <option key={p.id} value={p.id} disabled={p.stock_actual <= 0}>
                              {p.nombre} — (Stock: {p.stock_actual} {p.unidad})
                            </option>
                          ))}
                        </select>
                        <input 
                          type="number" 
                          required 
                          placeholder="Cant." 
                          min="0.0001" 
                          step="any" 
                          max={sp ? sp.stock_actual : undefined} 
                          className="w-24 px-3 py-2 bg-slate-800 rounded-xl border border-white/10 text-white focus:outline-none focus:border-ivvi-teal text-xs font-mono" 
                          value={l.cantidad} 
                          onChange={(e) => {
                            const val = e.target.value;
                            const selProd = productos.find(p => p.id === parseInt(l.producto_id));
                            const isUnd = selProd?.unidad_abr === 'UND';
                            const regex = isUnd ? /^\d*$/ : /^\d*\.?\d*$/;
                            if (val === '' || regex.test(val)) {
                              updateLinea(i, 'cantidad', val);
                            }
                          }} 
                        />
                        <input 
                          type="text" 
                          disabled 
                          className="w-28 px-3 py-2 bg-slate-850 rounded-xl border border-white/5 text-slate-400 font-mono text-xs" 
                          value={l.producto_id ? `C$ ${Number(l.costo).toFixed(2)}` : ''} 
                        />
                        <span className="w-28 text-right text-xs font-bold text-white font-mono">
                          C$ {getSubtotal(l).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </span>
                        <button 
                          type="button" 
                          onClick={() => removeLinea(i)} 
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash size={14} />
                        </button>
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
                    C$ {getTotal().toLocaleString('es-NI', { minimumFractionDigits: 2 })}
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
                    Procesar Venta POS
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
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm">Detalle Factura # {activeDetail.factura || activeDetail.numero_factura}</h3>
              <button onClick={() => setDetailModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
                <div><span className="text-slate-400 font-semibold block">Cliente:</span><span className="font-bold text-white">{activeDetail.cliente}</span></div>
                <div><span className="text-slate-400 font-semibold block">Fecha:</span><span className="font-bold text-white">{activeDetail.fecha}</span></div>
                <div><span className="text-slate-400 font-semibold block">Estado:</span><span className={`font-bold inline-block px-2 py-0.5 rounded text-[10px] ${activeDetail.estado === 'Completada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>{activeDetail.estado}</span></div>
                <div><span className="text-slate-400 font-semibold block">Total:</span><span className="font-bold text-ivvi-amber">C$ {activeDetail.total?.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span></div>
                {activeDetail.estado === 'Anulada' && activeDetail.anulado_por && (
                  <div className="col-span-2 mt-1 p-2 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <span className="text-red-400 font-semibold block text-[10px] uppercase tracking-wider mb-1">Registro de Anulación</span>
                    <span className="text-slate-300">Anulada por <strong className="text-white">{activeDetail.anulado_por}</strong> el {activeDetail.fecha_anulacion}</span>
                  </div>
                )}
              </div>
              <div className="border border-white/5 rounded-xl p-3 bg-black/25">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400">
                      <th className="pb-2">Producto</th>
                      <th className="pb-2 text-center">Cant.</th>
                      <th className="pb-2 text-right">Precio</th>
                      <th className="pb-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {activeDetail.detalles?.map((d: any, i: number) => (
                      <tr key={i} className="text-slate-300">
                        <td className="py-2.5 font-medium">{d.producto}</td>
                        <td className="py-2.5 text-center">{d.cantidad}</td>
                        <td className="py-2.5 text-right font-mono">{(d.precio_unitario || d.costo_unitario)?.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
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

      {/* Express Client Modal (Higher z-index so it stays on top of create sale modal) */}
      {clientModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm">Registro de Cliente Express</h3>
              <button onClick={() => setClientModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleRegisterClientExpress} className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo</label><input type="text" required placeholder="Nombre del cliente" className="w-full px-3 py-2 bg-slate-950/40 rounded-xl border border-white/5 text-white focus:outline-none focus:border-ivvi-teal text-xs" value={newClient.nombre} onChange={(e) => setNewClient({ ...newClient, nombre: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-400 mb-1">RUC (Opcional)</label><input type="text" placeholder="RUC" className="w-full px-3 py-2 bg-slate-950/40 rounded-xl border border-white/5 text-white focus:outline-none focus:border-ivvi-teal text-xs" value={newClient.ruc} onChange={(e) => setNewClient({ ...newClient, ruc: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1">Teléfono (Opcional)</label><input type="text" placeholder="+505..." className="w-full px-3 py-2 bg-slate-950/40 rounded-xl border border-white/5 text-white focus:outline-none focus:border-ivvi-teal text-xs" value={newClient.telefono} onChange={(e) => setNewClient({ ...newClient, telefono: e.target.value })} /></div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-ivvi-teal hover:bg-ivvi-teal-light rounded-xl font-semibold text-xs transition-all cursor-pointer">Registrar Cliente Express</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  BadgeDollarSign, 
  Plus, 
  Trash, 
  Eye, 
  X, 
  Printer, 
  Ban, 
  UserPlus,
  AlertCircle
} from 'lucide-react';
import type { 
  Producto, 
  Proveedor, 
  Cliente, 
  CompraItem, 
  VentaItem, 
  Usuario 
} from '../types';

interface TransactionsProps {
  currentUser: Usuario | null;
}

interface ItemLinea {
  producto_id: string;
  cantidad: number;
  costo: number; // or price
}

export default function Transactions({ currentUser }: TransactionsProps) {
  const isVendedor = currentUser?.rol === 'Vendedor' || currentUser?.rol === 'Administrador';
  const isAlmacen = currentUser?.rol === 'Operador de Almacén' || currentUser?.rol === 'Administrador';
  const isGerencia = currentUser?.rol === 'Gerencia' || currentUser?.rol === 'Administrador';
  
  // Tabs: 'compras' | 'ventas'
  const [activeSubTab, setActiveSubTab] = useState<'compras' | 'ventas'>('compras');
  
  // Data lists
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [compras, setCompras] = useState<CompraItem[]>([]);
  const [ventas, setVentas] = useState<VentaItem[]>([]);
  const [tasaCambioConf, setTasaCambioConf] = useState(36.0);
  
  const [, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Forms
  const [provId, setProvId] = useState('');
  const [numFactura, setNumFactura] = useState('');
  const [moneda, setMoneda] = useState('NIO');
  const [tasaCambio, setTasaCambio] = useState(36.0);
  const [fechaFactura, setFechaFactura] = useState('');
  
  const [cliId, setCliId] = useState('');

  // Rows for transactions
  const [lineas, setLineas] = useState<ItemLinea[]>([{ producto_id: '', cantidad: 1, costo: 0 }]);
  
  // Detailed Modals
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeDetail, setActiveDetail] = useState<any>(null);
  
  // Client express modal
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({ nombre: '', ruc: '', telefono: '', email: '', direccion: '' });

  useEffect(() => {
    // Reset form inputs when tab changes
    setProvId('');
    setCliId('');
    setNumFactura('');
    setLineas([{ producto_id: '', cantidad: 1, costo: 0 }]);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'compras') {
        const res = await fetch('/compras', {
          headers: { 'Accept': 'application/json' }
        });
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
      } else {
        const res = await fetch('/ventas', {
          headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
          setProductos(data.productos || []);
          setClientes(data.clientes || []);
          setVentas(data.items || []);
        }
      }
    } catch (err) {
      showToast('error', 'Error al sincronizar datos transaccionales.');
    } finally {
      setLoading(false);
    }
  };

  // --- Dynamic line items handlers ---
  const addLinea = () => {
    setLineas([...lineas, { producto_id: '', cantidad: 1, costo: 0 }]);
  };

  const removeLinea = (index: number) => {
    if (lineas.length === 1) return;
    setLineas(lineas.filter((_, i) => i !== index));
  };

  const updateLinea = (index: number, field: keyof ItemLinea, value: any) => {
    const updated = [...lineas];
    if (field === 'producto_id') {
      updated[index].producto_id = value;
      // If we are selling, pre-fill the sales price from catalog
      if (activeSubTab === 'ventas') {
        const selectedProd = productos.find(p => p.id === parseInt(value));
        if (selectedProd) {
          updated[index].costo = selectedProd.precio_venta || 0;
        }
      }
    } else if (field === 'cantidad') {
      updated[index].cantidad = Math.max(1, parseInt(value) || 1);
    } else if (field === 'costo') {
      updated[index].costo = Math.max(0, parseFloat(value) || 0);
    }
    setLineas(updated);
  };

  const getSubtotalLinea = (l: ItemLinea) => {
    return l.cantidad * l.costo;
  };

  const getGrandTotal = () => {
    return lineas.reduce((sum, l) => sum + getSubtotalLinea(l), 0);
  };

  // --- FORM SUBMIT: REGISTER PURCHASE ---
  const handleRegisterPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provId) {
      showToast('error', 'Seleccione un proveedor.');
      return;
    }
    if (lineas.some(l => !l.producto_id || l.cantidad <= 0 || l.costo <= 0)) {
      showToast('error', 'Todas las líneas de compra deben tener producto, cantidad y costo positivo.');
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
            cantidad: l.cantidad,
            costo: l.costo
          }))
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message);
        setProvId('');
        setNumFactura('');
        setLineas([{ producto_id: '', cantidad: 1, costo: 0 }]);
        loadData();
      } else {
        showToast('error', data.error || 'No se pudo procesar la compra.');
      }
    } catch (err) {
      showToast('error', 'Error de conexión.');
    }
  };

  // --- FORM SUBMIT: REGISTER SALE ---
  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliId) {
      showToast('error', 'Seleccione un cliente.');
      return;
    }
    if (lineas.some(l => !l.producto_id || l.cantidad <= 0)) {
      showToast('error', 'Verifique los productos y cantidades en las líneas de venta.');
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
            cantidad: l.cantidad
          }))
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message);
        setCliId('');
        setLineas([{ producto_id: '', cantidad: 1, costo: 0 }]);
        loadData();
        // Option to download PDF directly
        if (window.confirm('¿Desea descargar la factura en PDF?')) {
          window.open(`/ventas/pdf/${data.id}`, '_blank');
        }
      } else {
        showToast('error', data.error || 'No se pudo procesar la venta.');
      }
    } catch (err) {
      showToast('error', 'Error de conexión.');
    }
  };

  // --- REGISTER CLIENT EXPRESS ---
  const handleRegisterClientExpress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.nombre) return;
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
      } else {
        showToast('error', data.error || 'Error al guardar.');
      }
    } catch (err) {
      showToast('error', 'Error de conexión.');
    }
  };

  // --- VOID/ANULAR TRANSACTION ---
  const handleAnular = async (id: number) => {
    const action = activeSubTab === 'compras' ? 'compras' : 'ventas';
    if (!window.confirm(`¿Está seguro de ANULAR esta transacción? El stock se revertirá de manera inmediata.`)) return;

    try {
      const res = await fetch(`/${action}/${id}/anular`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message);
        loadData();
      } else {
        showToast('error', data.error || 'No se pudo anular.');
      }
    } catch (err) {
      showToast('error', 'Error de conexión.');
    }
  };

  // --- FETCH DETAIL TO MODAL ---
  const handleShowDetail = async (id: number) => {
    const action = activeSubTab === 'compras' ? 'compras' : 'ventas';
    try {
      const res = await fetch(`/api/${action}/${id}`);
      const data = await res.json();
      if (res.ok) {
        setActiveDetail(data);
        setDetailModalOpen(true);
      } else {
        showToast('error', 'No se pudieron recuperar los detalles de la factura.');
      }
    } catch (err) {
      showToast('error', 'Error de conexión.');
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-[1400px] mx-auto space-y-8 animate-fadeIn">
      {/* Notifications */}
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
      <div>
        <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          Módulo de Facturación y Compras
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          POS e Ingreso de suministros industriales multimoneda.
        </p>
      </div>

      {/* Subtab selection */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-white/5 pb-px">
        {isAlmacen && (
          <button
            onClick={() => setActiveSubTab('compras')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'compras' 
                ? 'border-ivvi-teal text-ivvi-teal' 
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'
            }`}
          >
            <ShoppingBag size={14} />
            <span>Ingreso de Compras</span>
          </button>
        )}
        {isVendedor && (
          <button
            onClick={() => setActiveSubTab('ventas')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'ventas' 
                ? 'border-ivvi-teal text-ivvi-teal' 
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'
            }`}
          >
            <BadgeDollarSign size={14} />
            <span>Punto de Venta (POS)</span>
          </button>
        )}
      </div>

      {/* Grid: Form (Left) & Recent Logs (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            
            <h3 className="font-heading font-bold text-base text-slate-800 dark:text-white mb-6">
              {activeSubTab === 'compras' ? 'Registrar Adquisición de Suministros' : 'Facturar Venta POS'}
            </h3>

            {activeSubTab === 'compras' && isAlmacen && (
              <form onSubmit={handleRegisterPurchase} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Provider */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Proveedor</label>
                    <select 
                      required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs"
                      value={provId} onChange={(e) => setProvId(e.target.value)}
                    >
                      <option value="">Seleccionar...</option>
                      {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social} (RUC: {p.ruc || 'N/A'})</option>)}
                    </select>
                  </div>
                  {/* Invoice number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Número de Factura</label>
                    <input
                      type="text" required placeholder="001-002-..."
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs"
                      value={numFactura} onChange={(e) => setNumFactura(e.target.value)}
                    />
                  </div>
                  {/* Invoice Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Fecha Factura (Opcional)</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs"
                      value={fechaFactura} onChange={(e) => setFechaFactura(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Currency */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Moneda</label>
                    <select 
                      required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs"
                      value={moneda} onChange={(e) => {
                        setMoneda(e.target.value);
                        if (e.target.value === 'NIO') setTasaCambio(1.0);
                        else setTasaCambio(tasaCambioConf);
                      }}
                    >
                      <option value="NIO">Córdobas (NIO)</option>
                      <option value="USD">Dólares (USD)</option>
                    </select>
                  </div>
                  {/* Exchange rate */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tasa de Cambio</label>
                    <input
                      type="number" step="0.0001" required min="0.0001" disabled={moneda === 'NIO'}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs disabled:opacity-50"
                      value={tasaCambio} onChange={(e) => setTasaCambio(parseFloat(e.target.value) || 1.0)}
                    />
                  </div>
                </div>

                {/* Line Items Grid */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Detalle de Productos</span>
                    <button 
                      type="button" onClick={addLinea}
                      className="py-1 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg text-slate-700 dark:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={12} />
                      Añadir Fila
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {lineas.map((linea, index) => (
                      <div key={index} className="flex gap-3 items-center">
                        <select 
                          required className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-950/85 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs"
                          value={linea.producto_id} onChange={(e) => updateLinea(index, 'producto_id', e.target.value)}
                        >
                          <option value="">Seleccione Material...</option>
                          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.sku})</option>)}
                        </select>
                        
                        <input
                          type="number" required placeholder="Cant." min="1"
                          className="w-20 px-3 py-2 bg-slate-100 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs"
                          value={linea.cantidad} onChange={(e) => updateLinea(index, 'cantidad', e.target.value)}
                        />
                        
                        <input
                          type="number" required placeholder="Costo Unit." step="0.01" min="0.01"
                          className="w-28 px-3 py-2 bg-slate-100 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs"
                          value={linea.costo} onChange={(e) => updateLinea(index, 'costo', e.target.value)}
                        />

                        <span className="w-24 text-right text-xs font-bold text-slate-700 dark:text-white font-mono">
                          {(getSubtotalLinea(linea)).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </span>

                        <button 
                          type="button" onClick={() => removeLinea(index)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-200 dark:border-white/5 pt-4 mt-6">
                  <div className="text-sm">
                    <span className="text-slate-400 font-medium">Monto Total Estimado:</span>
                    <span className="ml-2 font-black text-ivvi-teal font-mono text-base">
                      {moneda} {getGrandTotal().toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <button 
                    type="submit"
                    className="py-2.5 px-6 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-ivvi-teal/10 cursor-pointer active:translate-y-0.5"
                  >
                    Registrar Compra
                  </button>
                </div>
              </form>
            )}

            {activeSubTab === 'ventas' && isVendedor && (
              <form onSubmit={handleRegisterSale} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client with express button */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex justify-between items-center">
                      <span>Cliente Factura</span>
                      <button 
                        type="button" onClick={() => setClientModalOpen(true)}
                        className="text-[10px] text-ivvi-teal hover:text-ivvi-teal-light font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus size={10} />
                        Cliente Express
                      </button>
                    </label>
                    <select 
                      required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs"
                      value={cliId} onChange={(e) => setCliId(e.target.value)}
                    >
                      <option value="">Seleccionar Cliente...</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} (RUC: {c.ruc || 'N/A'})</option>)}
                    </select>
                  </div>
                </div>

                {/* Sales Line Items */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Detalle de Facturación</span>
                    <button 
                      type="button" onClick={addLinea}
                      className="py-1 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg text-slate-700 dark:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={12} />
                      Añadir Fila
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {lineas.map((linea, index) => {
                      const selectedProd = productos.find(p => p.id === parseInt(linea.producto_id));
                      return (
                        <div key={index} className="flex gap-3 items-center">
                          <select 
                            required className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-950/85 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs"
                            value={linea.producto_id} onChange={(e) => updateLinea(index, 'producto_id', e.target.value)}
                          >
                            <option value="">Seleccione Producto Terminado...</option>
                            {productos.map(p => (
                              <option key={p.id} value={p.id} disabled={p.stock_actual <= 0}>
                                {p.nombre} &mdash; (Stock: {p.stock_actual})
                              </option>
                            ))}
                          </select>
                          
                          <input
                            type="number" required placeholder="Cant." min="1"
                            max={selectedProd ? selectedProd.stock_actual : undefined}
                            className="w-24 px-3 py-2 bg-slate-100 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-ivvi-teal text-xs"
                            value={linea.cantidad} onChange={(e) => updateLinea(index, 'cantidad', e.target.value)}
                          />
                          
                          <input
                            type="text" disabled placeholder="Precio"
                            className="w-28 px-3 py-2 bg-slate-100 dark:bg-slate-950/20 rounded-xl border border-slate-200 dark:border-white/5 text-slate-400 font-mono focus:outline-none text-xs"
                            value={linea.producto_id ? `C$ ${linea.costo.toFixed(2)}` : ''}
                          />

                          <span className="w-28 text-right text-xs font-bold text-slate-700 dark:text-white font-mono">
                            C$ {(getSubtotalLinea(linea)).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                          </span>

                          <button 
                            type="button" onClick={() => removeLinea(index)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-200 dark:border-white/5 pt-4 mt-6">
                  <div className="text-sm">
                    <span className="text-slate-400 font-medium">Monto Total Factura:</span>
                    <span className="ml-2 font-black text-ivvi-teal font-mono text-base">
                      C$ {getGrandTotal().toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <button 
                    type="submit"
                    className="py-2.5 px-6 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-ivvi-teal/10 cursor-pointer active:translate-y-0.5"
                  >
                    Procesar Venta POS
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Recent logs */}
        <div className="xl:col-span-1 glass-card rounded-2xl p-6 h-fit">
          <h3 className="font-heading font-bold text-base text-slate-800 dark:text-white mb-6">
            Historial de Operaciones Recientes
          </h3>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {activeSubTab === 'compras' && isAlmacen ? (
              compras.length > 0 ? (
                compras.map(c => (
                  <div key={c.id} className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-mono font-bold text-xs text-slate-800 dark:text-white">{c.numero_factura}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        c.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'
                      }`}>{c.estado}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">Prov: {c.proveedor}</p>
                    <div className="flex justify-between items-center mt-1 border-t border-slate-200 dark:border-white/5 pt-2 text-[11px]">
                      <span className="font-bold text-slate-700 dark:text-white font-mono">
                        {c.moneda} {c.total.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => handleShowDetail(c.id)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
                        >
                          <Eye size={12} />
                        </button>
                        {isGerencia && c.estado === 'Activo' && (
                          <button 
                            onClick={() => handleAnular(c.id)}
                            className="p-1 hover:bg-red-500/15 rounded text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                          >
                            <Ban size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No hay compras ingresadas.</p>
              )
            ) : (
              ventas.length > 0 ? (
                ventas.map(v => (
                  <div key={v.id} className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-mono font-bold text-xs text-slate-800 dark:text-white">{v.numero_factura}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        v.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'
                      }`}>{v.estado}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">Clie: {v.cliente}</p>
                    <div className="flex justify-between items-center mt-1 border-t border-slate-200 dark:border-white/5 pt-2 text-[11px]">
                      <span className="font-bold text-slate-700 dark:text-white font-mono">
                        C$ {v.total.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleShowDetail(v.id)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
                          title="Ver Detalle"
                        >
                          <Eye size={12} />
                        </button>
                        <a 
                          href={`/ventas/pdf/${v.id}`} target="_blank" rel="noreferrer"
                          className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-400 hover:text-ivvi-amber transition-all flex items-center justify-center"
                          title="Imprimir Factura"
                        >
                          <Printer size={12} />
                        </a>
                        {isVendedor && v.estado === 'Activo' && (
                          <button 
                            onClick={() => handleAnular(v.id)}
                            className="p-1 hover:bg-red-500/15 rounded text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                            title="Anular/Corregir"
                          >
                            <Ban size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No hay ventas registradas.</p>
              )
            )}
          </div>
        </div>
      </div>

      {/* DETAIL DIALOG MODAL */}
      {detailModalOpen && activeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm">
                Detalle de Factura # {activeDetail.factura || activeDetail.numero_factura}
              </h3>
              <button onClick={() => setDetailModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
                <div>
                  <span className="text-slate-400 font-semibold block">Socio Comercial:</span>
                  <span className="font-bold text-white text-xs">{activeDetail.proveedor || activeDetail.cliente}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Fecha:</span>
                  <span className="font-bold text-white text-xs">{activeDetail.fecha}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Estado:</span>
                  <span className={`font-bold inline-block px-2 py-0.5 rounded text-[10px] mt-0.5 ${
                    activeDetail.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'
                  }`}>{activeDetail.estado}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Monto total:</span>
                  <span className="font-bold text-ivvi-amber text-xs">
                    {activeDetail.moneda || 'NIO'} {activeDetail.total.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Items details table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Líneas de Compra/Venta</span>
                <div className="border border-white/5 rounded-xl p-3 bg-black/25">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 pb-2">
                        <th className="pb-2">Producto</th>
                        <th className="pb-2 text-center">Cant.</th>
                        <th className="pb-2 text-right">Costo Unit.</th>
                        <th className="pb-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {activeDetail.detalles.map((d: any, i: number) => (
                        <tr key={i} className="text-slate-300">
                          <td className="py-2.5 font-medium">{d.producto}</td>
                          <td className="py-2.5 text-center">{d.cantidad} <span className="text-[10px] text-slate-500">{d.unidad}</span></td>
                          <td className="py-2.5 text-right font-mono">{(d.costo_unitario || d.precio_unitario).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 text-right font-bold font-mono text-white">{d.subtotal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPRESS CLIENT MODAL */}
      {clientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm">
                Registro de Cliente Express
              </h3>
              <button onClick={() => setClientModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterClientExpress} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo</label>
                <input
                  type="text" required placeholder="Nombre del cliente"
                  className="w-full px-3 py-2 bg-slate-950/40 rounded-xl border border-white/5 text-white focus:outline-none focus:border-ivvi-teal text-xs"
                  value={newClient.nombre} onChange={(e) => setNewClient({ ...newClient, nombre: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">RUC (Opcional)</label>
                  <input
                    type="text" placeholder="RUC"
                    className="w-full px-3 py-2 bg-slate-950/40 rounded-xl border border-white/5 text-white focus:outline-none focus:border-ivvi-teal text-xs"
                    value={newClient.ruc} onChange={(e) => setNewClient({ ...newClient, ruc: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Teléfono (Opcional)</label>
                  <input
                    type="text" placeholder="+505 ..."
                    className="w-full px-3 py-2 bg-slate-950/40 rounded-xl border border-white/5 text-white focus:outline-none focus:border-ivvi-teal text-xs"
                    value={newClient.telefono} onChange={(e) => setNewClient({ ...newClient, telefono: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-ivvi-teal hover:bg-ivvi-teal-light rounded-xl font-semibold text-xs transition-all cursor-pointer">
                Registrar Cliente Express
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

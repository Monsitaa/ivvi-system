import { useState, useEffect } from 'react';
import { 
  History, 
  Printer, 
  Download, 
  Search, 
  Clock, 
  User, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCcw, 
  AlertCircle,
  X,
  Eye,
  FileText
} from 'lucide-react';
import type { KardexItem } from '../types';

export default function Kardex() {
  const [items, setItems] = useState<KardexItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'TODO' | 'ENTRADA' | 'VENTA' | 'AJUSTE'>('TODO');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Kardex Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KardexItem | null>(null);

  // Venta Detail Modal
  const [ventaModalOpen, setVentaModalOpen] = useState(false);
  const [activeVentaDetail, setActiveVentaDetail] = useState<any>(null);

  // Compra Detail Modal
  const [compraModalOpen, setCompraModalOpen] = useState(false);
  const [activeCompraDetail, setActiveCompraDetail] = useState<any>(null);

  // Document Log Detail Modal (for Production, Adjustments, etc.)
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [activeDocDetail, setActiveDocDetail] = useState<any>(null);

  useEffect(() => {
    loadKardex();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadKardex = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kardex', { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      } else {
        showToast('error', data.error || 'Error al cargar el kárdex.');
      }
    } catch {
      showToast('error', 'Error al sincronizar datos del kárdex.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredItems = () => {
    return items.filter(item => {
      // 1. Search Query Filter
      const matchesSearch = 
        item.producto.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.documento_id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Quick Filter Category
      const doc = item.documento_id.toUpperCase();
      if (filterType === 'ENTRADA') {
        return item.tipo_movimiento === 'ENTRADA';
      } else if (filterType === 'VENTA') {
        return doc.includes('VENTA');
      } else if (filterType === 'AJUSTE') {
        return doc.includes('AJUSTE');
      }

      return true;
    });
  };

  const getFlowBadge = (item: KardexItem) => {
    const doc = item.documento_id.toUpperCase();
    if (item.tipo_movimiento === 'ENTRADA') {
      if (doc.startsWith('COMPRA')) {
        return {
          label: 'ENT - COMPRA',
          classes: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
          icon: <ArrowUpRight size={12} />
        };
      } else if (doc.startsWith('PLANTA')) {
        return {
          label: 'ENT - PRODUCCIÓN',
          classes: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
          icon: <ArrowUpRight size={12} />
        };
      } else if (doc.includes('AJUSTE-VENTA')) {
        return {
          label: 'ENT - ANULACIÓN',
          classes: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
          icon: <RefreshCcw size={12} />
        };
      } else {
        return {
          label: 'ENTRADA',
          classes: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
          icon: <ArrowUpRight size={12} />
        };
      }
    } else {
      if (doc.startsWith('VENTA')) {
        return {
          label: 'SAL - VENTA',
          classes: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
          icon: <ArrowDownRight size={12} />
        };
      } else if (doc.includes('AJUSTE-COMPRA')) {
        return {
          label: 'SAL - ANULACIÓN',
          classes: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
          icon: <RefreshCcw size={12} />
        };
      } else if (doc.startsWith('AJUSTE')) {
        return {
          label: 'SAL - MERMA',
          classes: 'bg-red-500/10 text-red-500 border border-red-500/20',
          icon: <ArrowDownRight size={12} />
        };
      } else {
        return {
          label: 'SALIDA',
          classes: 'bg-red-500/10 text-red-500 border border-red-500/20',
          icon: <ArrowDownRight size={12} />
        };
      }
    }
  };

  const handleShowVentaDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/ventas/${id}`);
      const data = await res.json();
      if (res.ok) {
        setActiveVentaDetail(data);
        setVentaModalOpen(true);
      } else {
        showToast('error', 'No se pudo cargar la factura de venta.');
      }
    } catch {
      showToast('error', 'Error al conectar con el servidor.');
    }
  };

  const handleShowCompraDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/compras/${id}`);
      const data = await res.json();
      if (res.ok) {
        setActiveCompraDetail(data);
        setCompraModalOpen(true);
      } else {
        showToast('error', 'No se pudo cargar el documento de compra.');
      }
    } catch {
      showToast('error', 'Error al conectar con el servidor.');
    }
  };

  const handleShowDocDetail = async (docId: string) => {
    try {
      const res = await fetch(`/api/kardex/documento/${encodeURIComponent(docId)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveDocDetail(data);
        setDocModalOpen(true);
      } else {
        showToast('error', 'No se pudieron cargar los detalles del movimiento.');
      }
    } catch {
      showToast('error', 'Error al conectar con el servidor.');
    }
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto space-y-6 animate-fadeIn max-w-[1400px] mx-auto">
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border text-sm max-w-md animate-slideIn bg-slate-900 border-red-500/30 text-red-400`}>
          <AlertCircle size={20} />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header with print/download buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/50 dark:border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Libro de Movimientos (Kárdex Auditor)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Historial inmutable de auditoría para trazabilidad física del inventario.
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <button 
            onClick={() => window.print()}
            className="flex-1 sm:flex-initial py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-white/5 transition-all"
          >
            <Printer size={14} /> Imprimir Vista
          </button>
          <a 
            href="/reportes/kardex/excel"
            className="flex-1 sm:flex-initial py-2 px-4 bg-gradient-to-r from-ivvi-teal to-ivvi-teal-dark hover:from-ivvi-teal-light hover:to-ivvi-teal text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-ivvi-teal/10"
          >
            <Download size={14} /> Descargar Excel
          </a>
          <a 
            href="/reportes/kardex/pdf"
            className="flex-1 sm:flex-initial py-2 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-650 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-red-600/10 hover:shadow-lg"
          >
            <Download size={14} /> Descargar PDF
          </a>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 relative overflow-hidden space-y-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>

        {/* Filter bar and search input */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="font-heading font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
            <History size={18} className="text-ivvi-teal" />
            Trazabilidad Inmutable de Inventario
          </h3>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar por producto, SKU, ref..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-ivvi-teal text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Quick Category Filters */}
            <div className="flex bg-slate-100 dark:bg-slate-950/50 p-1 rounded-xl border border-slate-200/50 dark:border-white/5 overflow-x-auto gap-0.5 shrink-0 whitespace-nowrap scrollbar-none">
              <button 
                onClick={() => setFilterType('TODO')}
                className={`py-1 px-3 text-[10px] uppercase font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filterType === 'TODO'
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-655 dark:hover:text-slate-350'
                }`}
              >
                Ver Todo
              </button>
              <button 
                onClick={() => setFilterType('ENTRADA')}
                className={`py-1 px-3 text-[10px] uppercase font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filterType === 'ENTRADA'
                    ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 shadow-sm border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-655 dark:hover:text-slate-300'
                }`}
              >
                Entradas
              </button>
              <button 
                onClick={() => setFilterType('VENTA')}
                className={`py-1 px-3 text-[10px] uppercase font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filterType === 'VENTA'
                    ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400 shadow-sm border border-blue-500/20'
                    : 'text-slate-400 hover:text-slate-655 dark:hover:text-slate-300'
                }`}
              >
                Solo Ventas
              </button>
              <button 
                onClick={() => setFilterType('AJUSTE')}
                className={`py-1 px-3 text-[10px] uppercase font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filterType === 'AJUSTE'
                    ? 'bg-red-500/10 text-red-500 dark:text-red-400 shadow-sm border border-red-500/20'
                    : 'text-slate-400 hover:text-slate-655 dark:hover:text-slate-300'
                }`}
              >
                Mermas / Ajustes
              </button>
            </div>
          </div>
        </div>

        {/* Table representation */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-ivvi-teal/30 border-t-ivvi-teal animate-spin"></div>
            <span className="text-xs text-slate-400 animate-pulse">Sincronizando movimientos del kárdex...</span>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200/50 dark:border-white/5 rounded-2xl bg-slate-50/30 dark:bg-black/10">
            <table className="w-full text-left text-xs min-w-[980px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 text-slate-455 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-white/[0.02]">
                  <th className="py-3 px-4 whitespace-nowrap">Fecha / Hora</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Tipo de Flujo</th>
                  <th className="py-3 px-4 whitespace-nowrap">Documento / REF</th>
                  <th className="py-3 px-4 whitespace-nowrap">Producto / Material</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Variación</th>
                  <th className="py-3 px-4 whitespace-nowrap">Responsable</th>
                  <th className="py-3 px-4 whitespace-nowrap">Observaciones Técnicas</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => {
                    const badge = getFlowBadge(item);
                    const isEntrada = item.tipo_movimiento === 'ENTRADA';
                    const docIdStr = String(item.documento_id);
                    const isVenta = docIdStr.toUpperCase().startsWith('VENTA-');
                    const isCompra = docIdStr.toUpperCase().startsWith('COMPRA-');
                    const isAnuladaVenta = docIdStr.toUpperCase().startsWith('AJUSTE-VENTA-');
                    const isAnuladaCompra = docIdStr.toUpperCase().startsWith('AJUSTE-COMPRA-');

                    return (
                      <tr key={item.id} className="text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors duration-200">
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Clock size={12} className="text-slate-400" />
                            {item.fecha}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${badge.classes}`}>
                            {badge.icon}
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono whitespace-nowrap">
                          <span className="bg-slate-100 dark:bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-white/5 font-semibold text-slate-800 dark:text-slate-200">
                            REF-{item.documento_id}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <div>
                            <strong className="text-slate-800 dark:text-white block font-heading whitespace-nowrap">{item.producto}</strong>
                            <span className="text-[10px] text-slate-455 dark:text-slate-500 font-semibold whitespace-nowrap">{item.sku}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <span className={`text-sm font-black font-mono ${
                            isEntrada ? 'text-emerald-500' : 'text-red-500'
                          }`}>
                            {isEntrada ? '+' : '-'}{item.cantidad.toLocaleString('es-NI', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                            <User size={12} className="text-slate-400" />
                            {item.autorizado_por}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="max-w-[200px] truncate text-slate-400 dark:text-slate-455" title={item.observacion}>
                            {item.observacion || 'Procesado por el sistema'}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Eye icon: Shows general log observations in modal */}
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setDetailModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-250 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                              title="Ver Bitácora de Auditoría"
                            >
                              <Eye size={14} />
                            </button>
                            
                            {/* FileText icon: Loads the invoice, purchase, or general document detail */}
                            {isVenta && (
                              <button
                                onClick={() => {
                                  const saleId = parseInt(docIdStr.replace(/VENTA-/i, ''));
                                  if (!isNaN(saleId)) handleShowVentaDetail(saleId);
                                }}
                                className="p-1.5 hover:bg-blue-500/10 rounded-lg text-blue-500/60 hover:text-blue-550 transition-all cursor-pointer"
                                title="Ver Factura de Venta Original"
                              >
                                <FileText size={14} />
                              </button>
                            )}

                            {isAnuladaVenta && (
                              <button
                                onClick={() => {
                                  const saleId = parseInt(docIdStr.replace(/AJUSTE-VENTA-/i, ''));
                                  if (!isNaN(saleId)) handleShowVentaDetail(saleId);
                                }}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500/60 hover:text-red-500 transition-all cursor-pointer"
                                title="Ver Factura de Venta Anulada"
                              >
                                <FileText size={14} />
                              </button>
                            )}

                            {isCompra && (
                              <button
                                onClick={() => {
                                  const purchaseId = parseInt(docIdStr.replace(/COMPRA-/i, ''));
                                  if (!isNaN(purchaseId)) handleShowCompraDetail(purchaseId);
                                }}
                                className="p-1.5 hover:bg-amber-500/10 rounded-lg text-amber-500/60 hover:text-amber-550 transition-all cursor-pointer"
                                title="Ver Comprobante de Compra Original"
                              >
                                <FileText size={14} />
                              </button>
                            )}

                            {isAnuladaCompra && (
                              <button
                                onClick={() => {
                                  const purchaseId = parseInt(docIdStr.replace(/AJUSTE-COMPRA-/i, ''));
                                  if (!isNaN(purchaseId)) handleShowCompraDetail(purchaseId);
                                }}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500/60 hover:text-red-500 transition-all cursor-pointer"
                                title="Ver Comprobante de Compra Anulado"
                              >
                                <FileText size={14} />
                              </button>
                            )}

                            {!isVenta && !isCompra && !isAnuladaVenta && !isAnuladaCompra && (
                              <button
                                onClick={() => handleShowDocDetail(item.documento_id)}
                                className="p-1.5 hover:bg-ivvi-teal/10 rounded-lg text-ivvi-teal/60 hover:text-ivvi-teal transition-all cursor-pointer"
                                title="Ver Detalles de la Transacción / Lote"
                              >
                                <FileText size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      No se encontraron movimientos registrados en el kárdex.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Kardex Audit Log Detail Modal */}
      {detailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm">Detalle de Movimiento de Kárdex</h3>
              <button 
                onClick={() => {
                  setDetailModalOpen(false);
                  setSelectedItem(null);
                }} 
                className="text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Fecha y Hora:</span>
                  <span className="font-bold text-white font-mono">{selectedItem.fecha}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Tipo de Movimiento:</span>
                  <span className="font-bold text-white">{selectedItem.tipo_movimiento}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Documento de Referencia:</span>
                  <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-white/5 text-slate-200">
                    REF-{selectedItem.documento_id}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Autorizado / Procesado por:</span>
                  <span className="font-bold text-white">{selectedItem.autorizado_por}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-2">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Producto / Material</span>
                    <span className="font-bold text-white block text-sm">{selectedItem.producto}</span>
                    <span className="text-[10px] text-slate-500 font-mono font-bold block mt-0.5">SKU: {selectedItem.sku}</span>
                  </div>
                  <div className="border-t border-white/5 pt-2 flex justify-between items-center">
                    <span className="text-slate-400 font-semibold text-[10px] uppercase">Variación de Stock</span>
                    <span className={`text-base font-black font-mono ${
                      selectedItem.tipo_movimiento === 'ENTRADA' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {selectedItem.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{selectedItem.cantidad.toLocaleString('es-NI', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase mb-1">Justificación / Observación Técnica</span>
                  <p className="text-slate-200 leading-relaxed break-words font-medium">
                    {selectedItem.observacion || 'Ninguna observación cargada en el registro.'}
                  </p>
                </div>
                
                {/* Dynamic redirection help text */}
                {(selectedItem.documento_id.toUpperCase().startsWith('VENTA-') || selectedItem.documento_id.toUpperCase().startsWith('COMPRA-')) && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => {
                        setDetailModalOpen(false);
                        const docIdStr = String(selectedItem.documento_id);
                        if (docIdStr.toUpperCase().startsWith('VENTA-')) {
                          const saleId = parseInt(docIdStr.replace(/VENTA-/i, ''));
                          handleShowVentaDetail(saleId);
                        } else {
                          const purchaseId = parseInt(docIdStr.replace(/COMPRA-/i, ''));
                          handleShowCompraDetail(purchaseId);
                        }
                        setSelectedItem(null);
                      }}
                      className="text-[10px] font-bold text-ivvi-teal hover:text-ivvi-teal-light flex items-center gap-1 justify-center mx-auto border border-ivvi-teal/20 px-3 py-1.5 rounded-lg bg-ivvi-teal/5 hover:bg-ivvi-teal/10 cursor-pointer transition-all"
                    >
                      <FileText size={12} />
                      Ver factura / comprobante original completo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sale Invoice Detail Modal */}
      {ventaModalOpen && activeVentaDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white animate-fadeIn">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm">Detalle Factura # {activeVentaDetail.factura || activeVentaDetail.numero_factura}</h3>
              <button onClick={() => setVentaModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
                <div><span className="text-slate-400 font-semibold block">Cliente:</span><span className="font-bold text-white">{activeVentaDetail.cliente}</span></div>
                <div><span className="text-slate-400 font-semibold block">Fecha:</span><span className="font-bold text-white">{activeVentaDetail.fecha}</span></div>
                <div><span className="text-slate-400 font-semibold block">Estado:</span><span className={`font-bold inline-block px-2 py-0.5 rounded text-[10px] ${activeVentaDetail.estado === 'Completada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>{activeVentaDetail.estado}</span></div>
                <div><span className="text-slate-400 font-semibold block">Total:</span><span className="font-bold text-ivvi-amber">C$ {activeVentaDetail.total?.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span></div>
                {activeVentaDetail.estado === 'Anulada' && activeVentaDetail.anulado_por && (
                  <div className="col-span-2 mt-1 p-2 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <span className="text-red-400 font-semibold block text-[10px] uppercase tracking-wider mb-1">Registro de Anulación</span>
                    <span className="text-slate-300">Anulada por <strong className="text-white">{activeVentaDetail.anulado_por}</strong> el {activeVentaDetail.fecha_anulacion}</span>
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
                    {activeVentaDetail.detalles?.map((d: any, i: number) => (
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

      {/* Purchase Detail Modal */}
      {compraModalOpen && activeCompraDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white animate-fadeIn">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm">Detalle Factura # {activeCompraDetail.factura || activeCompraDetail.numero_factura}</h3>
              <button onClick={() => setCompraModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
                <div><span className="text-slate-400 font-semibold block">Proveedor:</span><span className="font-bold text-white">{activeCompraDetail.proveedor}</span></div>
                <div><span className="text-slate-400 font-semibold block">Fecha:</span><span className="font-bold text-white">{activeCompraDetail.fecha}</span></div>
                <div><span className="text-slate-400 font-semibold block">Estado:</span><span className={`font-bold inline-block px-2 py-0.5 rounded text-[10px] mt-0.5 ${activeCompraDetail.estado === 'Completada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>{activeCompraDetail.estado}</span></div>
                <div><span className="text-slate-400 font-semibold block">Monto:</span><span className="font-bold text-ivvi-amber">{activeCompraDetail.moneda || 'NIO'} {activeCompraDetail.total?.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span></div>
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
                    {activeCompraDetail.detalles?.map((d: any, i: number) => (
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

      {/* Transaction / Document Log Details Modal */}
      {docModalOpen && activeDocDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden text-white">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ivvi-teal to-ivvi-amber"></div>
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="font-heading font-bold text-sm">Detalles de la Transacción</h3>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">REF: {activeDocDetail.documento_id}</span>
              </div>
              <button 
                onClick={() => {
                  setDocModalOpen(false);
                  setActiveDocDetail(null);
                }} 
                className="text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Fecha y Hora de Registro:</span>
                  <span className="font-bold text-white font-mono">{activeDocDetail.fecha}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Autorizado / Procesado por:</span>
                  <span className="font-bold text-white">{activeDocDetail.autorizado_por}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                  Movimientos Físicos del Inventario Relacionados
                </span>
                
                <div className="border border-white/5 rounded-xl overflow-hidden bg-black/25">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 bg-white/[0.02] text-[10px] font-bold uppercase">
                        <th className="py-2 px-3">Producto / SKU</th>
                        <th className="py-2 px-3 text-center">Tipo</th>
                        <th className="py-2 px-3 text-right">Cantidad</th>
                        <th className="py-2 px-3">Observación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {activeDocDetail.movimientos?.map((m: any, idx: number) => {
                        const isEnt = m.tipo_movimiento === 'ENTRADA';
                        return (
                          <tr key={idx} className="text-slate-350 hover:bg-white/[0.01]">
                            <td className="py-2.5 px-3">
                              <strong className="text-white block font-medium">{m.producto}</strong>
                              <span className="text-[9px] text-slate-500 font-mono font-bold">{m.sku}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                isEnt ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                {m.tipo_movimiento}
                              </span>
                            </td>
                            <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                              isEnt ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {isEnt ? '+' : '-'}{m.cantidad.toLocaleString('es-NI', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {m.unidad}
                            </td>
                            <td className="py-2.5 px-3 text-[10px] text-slate-400 italic">
                              {m.observacion || 'Sin comentarios adicionales'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

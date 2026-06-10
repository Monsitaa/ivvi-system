export interface Usuario {
  id: number;
  nombre: string;
  email: string | null;
  rol: string;
  telefono?: string;
  direccion?: string;
  cargo?: string;
  estado?: string;
  tiene_acceso_web?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: Usuario | null;
  loading: boolean;
}

export interface Producto {
  id: number;
  sku: string;
  nombre: string;
  descripcion: string;
  categoria_id?: number;
  categoria: string;
  unidad_id?: number;
  unidad: string;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  estado: string;
  factor_conversion?: number;
  unidad_abr?: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string;
}

export interface Unidad {
  id: number;
  nombre: string;
  abreviatura: string;
}

export interface Proveedor {
  id: number;
  razon_social: string;
  ruc: string;
  telefono: string;
  email: string;
  estado: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  ruc: string;
  telefono: string;
  email: string;
  direccion: string;
  estado: string;
}

export interface CompraItem {
  id: number;
  numero_factura: string;
  fecha: string;
  proveedor: string;
  moneda: string;
  total: number;
  total_base: number;
  estado: string;
}

export interface VentaItem {
  id: number;
  numero_factura: string;
  fecha: string;
  cliente: string;
  vendedor: string;
  total: number;
  estado: string;
}

export interface KardexItem {
  id: number;
  fecha: string;
  producto_id: number;
  producto: string;
  sku: string;
  tipo_movimiento: 'ENTRADA' | 'SALIDA';
  cantidad: number;
  documento_id: string;
  autorizado_por: string;
  observacion: string;
}

export interface Receta {
  id: number;
  codigo: string;
  nombre: string;
  litros_aceite: number;
}

export interface EnvasadoHistorial {
  id: number;
  fecha: string;
  cantidad: number;
  documento_id: string;
}

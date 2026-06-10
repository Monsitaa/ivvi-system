import datetime
from flask import Blueprint, jsonify
from sqlalchemy import func
from db import db
from models import Producto, Cliente, Venta, Compra, DetalleCompra, Categoria
from routes.auth_utils import login_required

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('')
@login_required
def index():
    # ── KPIs BÁSICOS ────────────────────────────────────────────────
    total_productos = db.session.query(Producto).filter_by(estado='Activo').count()
    total_clientes = db.session.query(Cliente).filter_by(estado='Activo').count()
    
    hoy = datetime.datetime.now()
    inicio_mes = datetime.datetime(hoy.year, hoy.month, 1)
    
    ventas_mes = db.session.query(func.sum(Venta.total)).filter(
        Venta.fecha >= inicio_mes,
        Venta.estado != 'Anulada'
    ).scalar() or 0.0
    compras_mes = db.session.query(func.sum(Compra.total_base)).filter(
        Compra.fecha >= inicio_mes,
        Compra.estado != 'Anulada'
    ).scalar() or 0.0
    
    # ── VALOR DEL INVENTARIO (Estimado) ──────────────────────────────
    valor_inventario = 0.0
    for p in db.session.query(Producto).filter_by(estado='Activo').all():
        ultimo_detalle = db.session.query(DetalleCompra).filter_by(producto_id=p.id).order_by(DetalleCompra.id.desc()).first()
        costo_original = ultimo_detalle.costo_unitario if ultimo_detalle else 0.0
        tc = 1.0
        if ultimo_detalle and ultimo_detalle.compra:
            tc = ultimo_detalle.compra.tasa_cambio or 1.0
        costo_nio = costo_original * tc
        valor_inventario += (p.stock_actual * costo_nio)

    # ── DATOS PARA GRÁFICOS (Últimos 15 días) ────────────────────────
    labels_dias = []
    data_ventas = []
    data_compras = []
    
    for i in range(14, -1, -1):
        fecha_d = hoy - datetime.timedelta(days=i)
        fecha_str = fecha_d.strftime('%d %b')
        labels_dias.append(fecha_str)
        
        # Suma ventas del día
        v_dia = db.session.query(func.sum(Venta.total)).filter(
            func.date(Venta.fecha) == fecha_d.date(),
            Venta.estado != 'Anulada'
        ).scalar() or 0.0
        data_ventas.append(v_dia)
        
        # Suma compras del día
        c_dia = db.session.query(func.sum(Compra.total_base)).filter(
            func.date(Compra.fecha) == fecha_d.date(),
            Compra.estado != 'Anulada'
        ).scalar() or 0.0
        data_compras.append(c_dia)

    # ── DISTRIBUCIÓN DE STOCK (Doughnut Chart) ──────────────────────
    p_premium = db.session.query(Producto).filter_by(sku='ACE-PRE-BULK').first()
    p_estandar = db.session.query(Producto).filter_by(sku='ACE-EST-BULK').first()
    
    stock_premium = p_premium.stock_actual if p_premium else 0
    stock_estandar = p_estandar.stock_actual if p_estandar else 0
    
    # Producto Terminado (Envasados)
    pt_count = db.session.query(func.sum(Producto.stock_actual)).join(Categoria).filter(
        Categoria.nombre == 'Producto Terminado',
        Producto.estado == 'Activo'
    ).scalar() or 0

    productos_bajo_stock = db.session.query(Producto).filter(
        Producto.stock_actual <= Producto.stock_minimo,
        Producto.estado == 'Activo'
    ).all()
    
    ultimas_ventas = db.session.query(Venta).order_by(Venta.id.desc()).limit(5).all()
    
    bajo_stock_list = [{
        'id': p.id,
        'nombre': p.nombre,
        'sku': p.sku,
        'stock_actual': p.stock_actual,
        'stock_minimo': p.stock_minimo
    } for p in productos_bajo_stock]

    ventas_list = [{
        'id': v.id,
        'numero_factura': v.numero_factura,
        'fecha': v.fecha.strftime('%d/%m/%Y %H:%M'),
        'cliente': v.cliente.nombre,
        'vendedor': v.usuario.nombre if v.usuario else 'Sistema',
        'total': v.total
    } for v in ultimas_ventas]

    return jsonify({
        'success': True,
        'tp': total_productos,
        'tc': total_clientes,
        'vm': ventas_mes,
        'cm': compras_mes,
        'valor_inv': valor_inventario,
        'grafico': {
            'labels': labels_dias,
            'ventas': data_ventas,
            'compras': data_compras
        },
        'stock': {
            'premium': stock_premium,
            'estandar': stock_estandar,
            'pt': pt_count
        },
        'bajo_stock': bajo_stock_list,
        'ultimas_ventas': ventas_list
    })

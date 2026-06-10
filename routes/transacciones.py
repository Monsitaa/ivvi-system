import datetime
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session, send_file
from sqlalchemy import func
from db import db
from models import Producto, Categoria, Proveedor, Cliente, Compra, DetalleCompra, Venta, DetalleVenta, InventarioService, ConfiguracionGlobal
from routes.auth_utils import login_required, role_required, get_current_user
from utils.pdf_generator import InvoiceGenerator
from utils.report_generator import ReportGenerator

transacciones_bp = Blueprint('transacciones', __name__)

@transacciones_bp.route('/compras', methods=['GET', 'POST'])
@login_required
@role_required('Administrador', 'Operador de Almacén')
def compras():
    if request.method == 'POST':
        def handle_error(msg):
            if request.is_json:
                return jsonify({'success': False, 'error': msg}), 400
            else:
                flash(msg, 'error')
                return redirect(url_for('transacciones.compras'))

        if request.is_json:
            data = request.get_json() or {}
            prov_id_val = data.get('proveedor_id')
            prov_id = int(prov_id_val) if prov_id_val else None
            n_factura = data.get('numero_factura')
            moneda = data.get('moneda', 'NIO')
            tasa_cambio = float(data.get('tasa_cambio', 1.0))
            fecha_str = data.get('fecha_factura')
            
            if 'productos' in data:
                nums_prod = [p.get('producto_id') for p in data['productos']]
                cants = [p.get('cantidad') for p in data['productos']]
                costos = [p.get('costo') for p in data['productos']]
            else:
                nums_prod = data.get('producto_id[]', [])
                cants = data.get('cantidad[]', [])
                costos = data.get('costo[]', [])
        else:
            prov_id = int(request.form['proveedor_id'])
            nums_prod = request.form.getlist('producto_id[]')
            cants = request.form.getlist('cantidad[]')
            costos = request.form.getlist('costo[]')
            n_factura = request.form['numero_factura']
            moneda = request.form.get('moneda', 'NIO')
            tasa_cambio = float(request.form.get('tasa_cambio', 1.0))
            fecha_str = request.form.get('fecha_factura')
            
        usr_id = get_current_user().id

        if not prov_id:
            return handle_error('Error: Debe seleccionar un proveedor.')

        prov = db.session.get(Proveedor, prov_id)
        if not prov or prov.estado != 'Activo':
            return handle_error('Error: El proveedor seleccionado no existe o está inactivo.')

        # Validar tasa de cambio contra el límite máximo del sistema
        if moneda == 'NIO':
            tasa_cambio = 1.0  # NIO siempre es 1:1, no tiene sentido otra tasa
        else:
            conf = db.session.query(ConfiguracionGlobal).first()
            tasa_max = conf.tasa_cambio_max if conf else 50.0
            if tasa_cambio <= 0:
                return handle_error('Error: La tasa de cambio debe ser mayor a cero.')
            if tasa_cambio > tasa_max:
                return handle_error(f'Error: La tasa de cambio ingresada ({tasa_cambio}) supera el límite máximo permitido ({tasa_max}). Verifique el valor o ajuste el límite en Configuración.')

        if not nums_prod:
            return handle_error('Error: Debe seleccionar al menos un producto para registrar la compra.')
        
        # Validar bloqueo oficial, productos activos y valores positivos
        for pid, cant, cost in zip(nums_prod, cants, costos):
            prod = db.session.get(Producto, pid)
            if not prod or prod.estado != 'Activo':
                return handle_error('Error: Uno de los productos seleccionados no existe o está inactivo.')
            
            try:
                if float(cant) <= 0 or float(cost) <= 0:
                    raise ValueError()
            except ValueError:
                return handle_error('Error: Las cantidades y costos deben ser números positivos mayores que cero.')
            
            if prod.sku == 'ACE-EST-BULK' and 'Inducaribe' not in prov.razon_social:
                return handle_error('Error: El Aceite Estándar solo puede comprarse a Inducaribe S.A.')
            if prod.sku == 'ACE-PRE-BULK' and 'Olmeca' not in prov.razon_social:
                return handle_error('Error: El Aceite Premium solo puede comprarse a Olmeca')

        try:
            fecha_doc = datetime.datetime.fromisoformat(fecha_str) if fecha_str else datetime.datetime.now()
        except Exception:
            fecha_doc = datetime.datetime.now()

        nueva_compra = Compra(proveedor_id=prov_id, numero_factura=n_factura, moneda=moneda, tasa_cambio=tasa_cambio, fecha=fecha_doc)
        db.session.add(nueva_compra)
        db.session.flush()
        
        total_compra = 0.0
        for pid, cant, cost in zip(nums_prod, cants, costos):
            p_obj = db.session.get(Producto, pid)
            cant_compra = float(cant)
            costo_factura = float(cost)
            
            factor = p_obj.factor_conversion or 1.0
            cantidad_inventario = cant_compra * factor
            costo_inventario = costo_factura / factor if factor > 0 else costo_factura
            
            subtot = cant_compra * costo_factura
            total_compra += subtot
            
            det = DetalleCompra(compra_id=nueva_compra.id, producto_id=pid, cantidad=cantidad_inventario, costo_unitario=costo_inventario, subtotal=subtot)
            db.session.add(det)
            
            obs_kardex = f"Compra fact #{n_factura}"
            if factor > 1:
                obs_kardex += f" (Conv: {cant_compra} TM -> {cantidad_inventario} L)"
            
            InventarioService.registrar_entrada(pid, cantidad_inventario, f"COMPRA-{nueva_compra.id}", usr_id, obs_kardex)
            
        nueva_compra.total = total_compra
        nueva_compra.total_base = total_compra * tasa_cambio
        
        db.session.commit()
        
        if request.is_json:
            return jsonify({
                'success': True,
                'message': 'Compra Multimoneda registrada con éxito y Kárdex actualizado',
                'id': nueva_compra.id
            })
        else:
            flash('Compra Multimoneda registrada con éxito y Kárdex actualizado', 'success')
            return redirect(url_for('transacciones.compras'))

    conf = db.session.query(ConfiguracionGlobal).first()
    
    # Filtrar solo materiales/insumos activos para la compra
    prods = db.session.query(Producto).join(Categoria).filter(
        Categoria.nombre != 'Producto Terminado',
        Producto.estado == 'Activo'
    ).all()
    provs = db.session.query(Proveedor).filter_by(estado='Activo').all()
    cmps = db.session.query(Compra).order_by(Compra.fecha.desc()).all()

    if request.is_json or request.args.get('json') == 'true' or request.headers.get('Accept') == 'application/json':
        return jsonify({
            'success': True,
            'productos': [{
                'id': p.id,
                'sku': p.sku,
                'nombre': p.nombre,
                'unidad': p.unidad.nombre if p.unidad else '',
                'factor_conversion': p.factor_conversion
            } for p in prods],
            'proveedores': [{
                'id': pr.id,
                'razon_social': pr.razon_social,
                'ruc': pr.ruc
            } for pr in provs],
            'items': [{
                'id': c.id,
                'numero_factura': c.numero_factura,
                'fecha': c.fecha.strftime('%d/%m/%Y %H:%M'),
                'proveedor': c.proveedor.razon_social if c.proveedor else 'N/A',
                'moneda': c.moneda,
                'total': c.total,
                'total_base': c.total_base,
                'estado': c.estado
            } for c in cmps],
            'conf': {
                'tasa_cambio': conf.tasa_cambio if conf else 36.0
            }
        })

    return render_template('compras.html', productos=prods, proveedores=provs, items=cmps[:10], conf=conf)

@transacciones_bp.route('/compras/<int:id>/anular', methods=['POST'])
@login_required
@role_required('Administrador', 'Gerencia')
def anular_compra(id):
    def handle_error(msg):
        if request.is_json or request.headers.get('Accept') == 'application/json':
            return jsonify({'success': False, 'error': msg}), 400
        else:
            flash(msg, 'error')
            return redirect(url_for('transacciones.compras'))

    compra = db.session.get(Compra, id)
    if not compra:
        return handle_error('Compra no encontrada')
        
    if compra.estado == 'Anulada':
        return handle_error('Esta compra ya se encuentra anulada.')
        
    usr_id = get_current_user().id
    
    # Validar stock antes de restar
    for det in compra.detalles:
        if det.producto.stock_actual < det.cantidad:
            return handle_error(f'No se puede anular: Stock insuficiente para devolver {det.producto.nombre}.')
            
    compra.estado = 'Anulada'
    for det in compra.detalles:
        # Registrar salida de ajuste
        InventarioService.registrar_salida(det.producto_id, det.cantidad, f"AJUSTE-COMPRA-{compra.id}", usr_id, "Anulación de Compra")
        
    db.session.commit()
    
    if request.is_json or request.headers.get('Accept') == 'application/json':
        return jsonify({'success': True, 'message': 'Compra anulada correctamente y stock revertido.'})
    else:
        flash('Compra anulada correctamente y stock revertido.', 'success')
        return redirect(url_for('transacciones.compras'))

@transacciones_bp.route('/ventas', methods=['GET', 'POST'])
@login_required
@role_required('Administrador', 'Vendedor')
def ventas():
    if request.method == 'POST':
        def handle_error(msg):
            if request.is_json:
                return jsonify({'success': False, 'error': msg}), 400
            else:
                flash(msg, 'error')
                return redirect(url_for('transacciones.ventas'))

        if request.is_json:
            data = request.get_json() or {}
            cliente_id_val = data.get('cliente_id')
            cliente_id = int(cliente_id_val) if cliente_id_val else None
            
            if 'productos' in data:
                nums_prod = [p.get('producto_id') for p in data['productos']]
                cants = [p.get('cantidad') for p in data['productos']]
            else:
                nums_prod = data.get('producto_id[]', [])
                cants = data.get('cantidad[]', [])
        else:
            cliente_id_val = request.form.get('cliente_id')
            cliente_id = int(cliente_id_val) if cliente_id_val else None
            nums_prod = request.form.getlist('producto_id[]')
            cants = request.form.getlist('cantidad[]')
            
        vendedor_id = get_current_user().id

        if not cliente_id:
            return handle_error('Error: Debe seleccionar un cliente.')
            
        cli = db.session.get(Cliente, cliente_id)
        if not cli or cli.estado != 'Activo':
            return handle_error('Error: El cliente seleccionado no existe o está inactivo.')
            
        if not nums_prod:
            return handle_error('Error: Debe seleccionar al menos un producto para registrar la venta.')
            
        # Validar productos activos y cantidades mayores a cero antes de comenzar
        for pid, cant in zip(nums_prod, cants):
            prod = db.session.get(Producto, pid)
            if not prod or prod.estado != 'Activo':
                return handle_error('Error: Uno de los productos seleccionados no existe o está inactivo.')
            try:
                val_float = float(cant)
                if val_float <= 0:
                    raise ValueError()
                # Exigir entero si la unidad es Unidades (UND)
                is_und = prod.unidad and prod.unidad.abreviatura == 'UND'
                if is_und and not val_float.is_integer():
                    return handle_error(f"Error: La cantidad para '{prod.nombre}' debe ser un número entero.")
            except ValueError:
                return handle_error('Error: Las cantidades de venta deben ser números válidos mayores que cero.')
        
        # Generar número de factura automático
        ultimo_id = db.session.query(func.max(Venta.id)).scalar() or 0
        numero_factura = f"001-001-{(ultimo_id + 1):06d}"
        nueva_venta = Venta(cliente_id=cliente_id, vendedor_id=vendedor_id, numero_factura=numero_factura, total=0.0)
        db.session.add(nueva_venta)
        db.session.flush()
        
        total_acumulado = 0
        for pid, cant in zip(nums_prod, cants):
            prod = db.session.get(Producto, pid)
            cantidad = float(cant)
            if InventarioService.registrar_salida(pid, cantidad, f"VENTA-{nueva_venta.id}", vendedor_id, "Venta POS"):
                sub = (prod.precio_venta or 0) * cantidad
                det = DetalleVenta(venta_id=nueva_venta.id, producto_id=pid, cantidad=cantidad, precio_unitario=prod.precio_venta or 0, subtotal=sub)
                db.session.add(det)
                total_acumulado += sub
                if prod.sku and '-19L' in prod.sku:
                    cli.envases_pendientes += int(cantidad)
            else:
                db.session.rollback()
                return handle_error(f'Stock insuficiente para {prod.nombre}')
        
        nueva_venta.total = total_acumulado
        db.session.commit()
        
        if request.is_json:
            return jsonify({
                'success': True,
                'message': 'Venta nacional procesada correctamente',
                'id': nueva_venta.id
            })
        else:
            flash('Venta nacional procesada correctamente', 'success')
            return redirect(url_for('transacciones.ventas'))

    vnts = db.session.query(Venta).order_by(Venta.fecha.desc()).all()
    
    # Filtrar solo productos terminados y clientes activos
    prods = db.session.query(Producto).join(Categoria).filter(
        Categoria.nombre == 'Producto Terminado',
        Producto.estado == 'Activo'
    ).all()
    clis = db.session.query(Cliente).filter_by(estado='Activo').all()
    
    if request.is_json or request.args.get('json') == 'true' or request.headers.get('Accept') == 'application/json':
        return jsonify({
            'success': True,
            'productos': [{
                'id': p.id,
                'sku': p.sku,
                'nombre': p.nombre,
                'precio_venta': p.precio_venta,
                'stock_actual': p.stock_actual
            } for p in prods],
            'clientes': [{
                'id': cl.id,
                'nombre': cl.nombre,
                'ruc': cl.ruc
            } for cl in clis],
            'items': [{
                'id': v.id,
                'numero_factura': v.numero_factura,
                'fecha': v.fecha.strftime('%d/%m/%Y %H:%M'),
                'cliente': v.cliente.nombre if v.cliente else 'N/A',
                'total': v.total,
                'estado': v.estado
            } for v in vnts]
        })

    return render_template('ventas.html', items=vnts[:10], productos=prods, clientes=clis)

@transacciones_bp.route('/ventas/<int:id>/anular', methods=['POST'])
@login_required
@role_required('Administrador', 'Gerencia')
def anular_venta(id):
    def handle_error(msg):
        if request.is_json or request.headers.get('Accept') == 'application/json':
            return jsonify({'success': False, 'error': msg}), 400
        else:
            flash(msg, 'error')
            return redirect(url_for('transacciones.ventas'))

    venta = db.session.get(Venta, id)
    if not venta:
        return handle_error('Venta no encontrada')
        
    if venta.estado == 'Anulada':
        return handle_error('Esta venta ya se encuentra anulada.')
        
    usr = get_current_user()
    usr_id = usr.id
    ahora = datetime.datetime.now(datetime.timezone.utc)

    # Registrar quién y cuándo anuló — trazabilidad de auditoría
    venta.estado = 'Anulada'
    venta.anulado_por_usuario_id = usr_id
    venta.fecha_anulacion = ahora
    
    for det in venta.detalles:
        InventarioService.registrar_entrada(det.producto_id, det.cantidad, f"AJUSTE-VENTA-{venta.id}", usr_id, f"Anulación de venta #{venta.numero_factura} por {usr.nombre}")
        if det.producto.sku and '-19L' in det.producto.sku:
            if venta.cliente:
                venta.cliente.envases_pendientes = max(0, venta.cliente.envases_pendientes - det.cantidad)
        
    db.session.commit()
    
    if request.is_json or request.headers.get('Accept') == 'application/json':
        return jsonify({'success': True, 'message': f'Venta {venta.numero_factura} anulada por {usr.nombre}. Productos devueltos al almacén.'})
    else:
        flash(f'Venta {venta.numero_factura} anulada correctamente y productos devueltos al almacén.', 'success')
        return redirect(url_for('transacciones.ventas'))

@transacciones_bp.route('/ventas/pdf/<int:id>')
@login_required
def generar_factura_pdf(id):
    venta = db.session.get(Venta, id)
    if not venta:
        flash('Venta no encontrada', 'error')
        return redirect(url_for('transacciones.ventas'))
    pdf_buffer = InvoiceGenerator.generate_invoice(venta)
    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f'Factura_IVVI_{venta.id}.pdf',
        mimetype='application/pdf'
    )

@transacciones_bp.route('/api/compras/<int:id>')
@login_required
def get_compra_detalle(id):
    c = db.session.get(Compra, id)
    if not c:
        return jsonify({'error': 'Compra no encontrada'}), 404
    detalles = []
    for d in c.detalles:
        detalles.append({
            'producto': d.producto.nombre if d.producto else 'Desconocido',
            'sku': d.producto.sku if d.producto else 'N/A',
            'cantidad': d.cantidad,
            'unidad': d.producto.unidad.abreviatura if (d.producto and d.producto.unidad) else 'N/A',
            'costo_unitario': d.costo_unitario,
            'subtotal': d.subtotal
        })
    return jsonify({
        'id': c.id,
        'proveedor': c.proveedor.razon_social if c.proveedor else 'N/A',
        'fecha': c.fecha.strftime('%d/%m/%Y %H:%M'),
        'factura': c.numero_factura,
        'moneda': c.moneda,
        'total': c.total,
        'estado': c.estado,
        'anulado_por': c.anulado_por_usuario.nombre if (hasattr(c, 'anulado_por_usuario') and c.anulado_por_usuario) else None,
        'fecha_anulacion': c.fecha_anulacion.strftime('%d/%m/%Y %H:%M') if c.fecha_anulacion else None,
        'detalles': detalles
    })

@transacciones_bp.route('/api/ventas/<int:id>')
@login_required
def get_venta_detalle(id):
    v = db.session.get(Venta, id)
    if not v:
        return jsonify({'error': 'Venta no encontrada'}), 404
    detalles = []
    for d in v.detalles:
        detalles.append({
            'producto': d.producto.nombre if d.producto else 'Desconocido',
            'sku': d.producto.sku if d.producto else 'N/A',
            'cantidad': d.cantidad,
            'unidad': d.producto.unidad.abreviatura if (d.producto and d.producto.unidad) else 'N/A',
            'precio_unitario': d.precio_unitario,
            'subtotal': d.subtotal
        })
    return jsonify({
        'id': v.id,
        'cliente': v.cliente.nombre if v.cliente else 'N/A',
        'fecha': v.fecha.strftime('%d/%m/%Y %H:%M'),
        'factura': v.numero_factura,
        'total': v.total,
        'estado': v.estado,
        'anulado_por': v.anulado_por_usuario.nombre if (hasattr(v, 'anulado_por_usuario') and v.anulado_por_usuario) else None,
        'fecha_anulacion': v.fecha_anulacion.strftime('%d/%m/%Y %H:%M') if v.fecha_anulacion else None,
        'detalles': detalles
    })

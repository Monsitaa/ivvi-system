from flask import Blueprint, request, jsonify
from datetime import datetime
from db import db
from models import Producto, Categoria, Kardex, InventarioService, DetalleCompra, RecetaEnvasado, RetornoEnvase, Cliente, ConfiguracionGlobal
from routes.auth_utils import login_required, role_required, get_current_user

inventario_bp = Blueprint('inventario', __name__, url_prefix='/api')

@inventario_bp.route('/inventario', methods=['GET'])
@login_required
def inventario():
    prods = db.session.query(Producto).all()
    return jsonify({
        'success': True,
        'items': [{
            'id': p.id,
            'sku': p.sku,
            'nombre': p.nombre,
            'categoria': p.categoria.nombre if p.categoria else 'N/A',
            'unidad': p.unidad.nombre if p.unidad else 'N/A',
            'stock_actual': p.stock_actual,
            'stock_minimo': p.stock_minimo,
            'estado': p.estado
        } for p in prods]
    })

@inventario_bp.route('/kardex', methods=['GET'])
@login_required
def kardex():
    movs = db.session.query(Kardex).order_by(Kardex.fecha.desc()).all()
    return jsonify({
        'success': True,
        'items': [{
            'id': m.id,
            'fecha': m.fecha.strftime('%d/%m/%Y %H:%M:%S'),
            'producto_id': m.producto_id,
            'producto': m.producto.nombre if m.producto else 'N/A',
            'sku': m.producto.sku if m.producto else 'N/A',
            'tipo_movimiento': m.tipo_movimiento,
            'cantidad': m.cantidad,
            'documento_id': m.documento_id,
            'autorizado_por': m.usuario.nombre if m.usuario else 'Sistema',
            'observacion': m.observacion or ''
        } for m in movs]
    })

@inventario_bp.route('/api/kardex/documento/<string:doc_id>', methods=['GET'])
@login_required
def get_kardex_documento_detalle(doc_id):
    movs = db.session.query(Kardex).filter_by(documento_id=doc_id).order_by(Kardex.tipo_movimiento.desc()).all()
    if not movs:
        return jsonify({'error': 'Movimiento no encontrado'}), 404
    
    return jsonify({
        'success': True,
        'documento_id': doc_id,
        'fecha': movs[0].fecha.strftime('%d/%m/%Y %H:%M:%S') if movs[0].fecha else 'N/A',
        'autorizado_por': movs[0].usuario.nombre if movs[0].usuario else 'Sistema',
        'movimientos': [{
            'id': m.id,
            'producto': m.producto.nombre if m.producto else 'N/A',
            'sku': m.producto.sku if m.producto else 'N/A',
            'unidad': m.producto.unidad.abreviatura if (m.producto and m.producto.unidad) else 'N/A',
            'tipo_movimiento': m.tipo_movimiento,
            'cantidad': m.cantidad,
            'observacion': m.observacion or ''
        } for m in movs]
    })

@inventario_bp.route('/inventario/ajuste', methods=['GET', 'POST'])
@login_required
@role_required('Administrador', 'Operador de Almacén')
def ajuste_inventario():
    if request.method == 'POST':
        data = request.get_json() or {}
        raw_id = data.get('producto_id')
        if not raw_id:
            return jsonify({'success': False, 'error': 'Debe seleccionar un producto válido.'}), 400
            
        producto_id = int(raw_id)
        prod_obj = db.session.get(Producto, producto_id)
        if not prod_obj:
            return jsonify({'success': False, 'error': 'El producto seleccionado no existe.'}), 400
            
        tipo = data.get('tipo_movimiento')
        try:
            cantidad = float(data.get('cantidad', 0))
            if cantidad <= 0:
                raise ValueError()
            # Si el producto se mide en Unidades (UND), exigir que sea entero
            is_und = prod_obj.unidad and prod_obj.unidad.abreviatura == 'UND'
            if is_und and not cantidad.is_integer():
                return jsonify({'success': False, 'error': f"La cantidad física del ajuste para '{prod_obj.nombre}' debe ser un número entero."}), 400
        except ValueError:
            return jsonify({'success': False, 'error': 'La cantidad física del ajuste debe ser un número positivo mayor que cero.'}), 400
            
        obs = data.get('observacion', '')
        usr_id = get_current_user().id
        
        if tipo == 'ENTRADA':
            InventarioService.registrar_entrada(producto_id, cantidad, "AJUSTE-MANUAL", usr_id, obs)
            message = 'Entrada de ajuste registrada'
        elif tipo == 'SALIDA':
            if InventarioService.registrar_salida(producto_id, cantidad, "AJUSTE-MANUAL", usr_id, obs):
                message = 'Salida de ajuste registrada (Merma)'
            else:
                return jsonify({'success': False, 'error': 'Stock insuficiente.'}), 400
        else:
            return jsonify({'success': False, 'error': 'Tipo de movimiento inválido.'}), 400
        
        try:
            db.session.commit()
            return jsonify({'success': True, 'message': message})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
        
    bidon_obj = db.session.query(Producto).filter(
        Producto.nombre.like('%Bidón 19L%'),
        Producto.estado == 'Activo'
    ).first()
    
    ajustes = db.session.query(Kardex).filter_by(documento_id='AJUSTE-MANUAL').order_by(Kardex.fecha.desc()).limit(10).all()
    
    return jsonify({
        'success': True,
        'bidon': {
            'id': bidon_obj.id,
            'nombre': bidon_obj.nombre,
            'sku': bidon_obj.sku,
            'stock_actual': bidon_obj.stock_actual
        } if bidon_obj else None,
        'ajustes_recientes': [{
            'id': a.id,
            'fecha': a.fecha.strftime('%d/%m/%Y %H:%M'),
            'producto': a.producto.nombre if a.producto else 'N/A',
            'tipo_movimiento': a.tipo_movimiento,
            'cantidad': a.shadow_cantidad if hasattr(a, 'shadow_cantidad') else a.cantidad,
            'observacion': a.observacion
        } for a in ajustes]
    })

@inventario_bp.route('/produccion/envasado', methods=['GET', 'POST'])
@login_required
@role_required('Administrador', 'Operador de Almacén')
def envasado():
    if request.method == 'POST':
        data = request.get_json() or {}
        tipo_combo = data.get('tipo_combo')
        try:
            cantidad = int(data.get('cantidad', 0))
            merma_aceite = float(data.get('merma_aceite', 0) or 0.0)
            merma_envase = int(data.get('merma_envase', 0) or 0)
            if cantidad <= 0 or merma_aceite < 0 or merma_envase < 0:
                raise ValueError()
        except ValueError:
            return jsonify({'success': False, 'error': 'Las cantidades de producción deben ser mayores a cero, y las mermas no pueden ser negativas.'}), 400
            
        usr_id = get_current_user().id
        
        success, message = InventarioService.registrar_produccion(
            tipo_combo, cantidad, usr_id, 
            merma_aceite=merma_aceite, 
            merma_envase=merma_envase
        )
        if success:
            try:
                db.session.commit()
                return jsonify({'success': True, 'message': message})
            except Exception as e:
                db.session.rollback()
                return jsonify({'success': False, 'error': str(e)}), 500
        else:
            return jsonify({'success': False, 'error': message}), 400

    bolk_prods = db.session.query(Producto).filter(
        Producto.sku.like('ACE-%-BULK'),
        Producto.estado == 'Activo'
    ).all()
    envase_prods = db.session.query(Producto).join(Categoria).filter(
        Categoria.nombre == 'Insumos y Envases',
        Producto.estado == 'Activo'
    ).all()
    terminado_prods = db.session.query(Producto).filter(
        Producto.sku.like('PRO-%'),
        Producto.estado == 'Activo'
    ).all()
    
    recetas = db.session.query(RecetaEnvasado).filter_by(estado='Activo').all()
    
    historial = db.session.query(Kardex).filter(
        Kardex.documento_id.like('PLANTA-%'),
        Kardex.tipo_movimiento == 'ENTRADA'
    ).order_by(Kardex.fecha.desc()).limit(10).all()
    
    return jsonify({
        'success': True,
        'bulk': [{
            'id': b.id,
            'nombre': b.nombre,
            'stock_actual': b.stock_actual,
            'factor_conversion': b.factor_conversion
        } for b in bolk_prods],
        'vacio': [{
            'id': v.id,
            'nombre': v.nombre,
            'stock_actual': v.stock_actual
        } for v in envase_prods],
        'terminados': [{
            'id': t.id,
            'nombre': t.nombre,
            'stock_actual': t.stock_actual
        } for t in terminado_prods],
        'recetas': [{
            'id': r.id,
            'codigo': r.codigo,
            'nombre': r.nombre,
            'litros_aceite': r.litros_aceite
        } for r in recetas],
        'historial': [{
            'id': h.id,
            'fecha': h.fecha.strftime('%d/%m/%Y %H:%M'),
            'cantidad': h.cantidad,
            'documento_id': h.documento_id
        } for h in historial]
    })

@inventario_bp.route('/inventario/valorizacion', methods=['GET'])
@login_required
def get_valorizacion_detalle():
    prods = db.session.query(Producto).all()
    items = []
    total_general = 0
    
    for p in prods:
        ultimo_detalle = db.session.query(DetalleCompra).filter_by(producto_id=p.id).order_by(DetalleCompra.id.desc()).first()
        costo_original = ultimo_detalle.costo_unitario if ultimo_detalle else 0.0
        tc = 1.0
        if ultimo_detalle and ultimo_detalle.compra:
            tc = ultimo_detalle.compra.tasa_cambio or 1.0
        costo_nio = costo_original * tc
        valor = p.stock_actual * costo_nio
        total_general += valor
        
        if p.stock_actual > 0:
            items.append({
                'producto': p.nombre,
                'sku': p.sku,
                'stock': p.stock_actual,
                'unidad': p.unidad.abreviatura if p.unidad else '',
                'ultimo_costo': costo_nio,
                'valor_total': valor
            })
            
    return jsonify({
        'total_general': total_general,
        'items': sorted(items, key=lambda x: x['valor_total'], reverse=True)
    })

@inventario_bp.route('/inventario/retornos', methods=['GET', 'POST'])
@login_required
@role_required('Administrador', 'Operador de Almacén')
def retornos_envases():
    if request.method == 'POST':
        data = request.get_json() or {}
        cliente_id_val = data.get('cliente_id')
        if not cliente_id_val:
            return jsonify({'success': False, 'error': 'Debe seleccionar un cliente válido.'}), 400
            
        cliente_id = int(cliente_id_val)
        cli = db.session.get(Cliente, cliente_id)
        if not cli:
            return jsonify({'success': False, 'error': 'El cliente seleccionado no existe.'}), 400
            
        try:
            total_devuelto = int(data.get('cantidad_total', 0))
            dañados = int(data.get('cantidad_danados', 0) or 0)
            if total_devuelto <= 0 or dañados < 0:
                raise ValueError()
            if dañados > total_devuelto:
                return jsonify({'success': False, 'error': 'La cantidad de envases dañados no puede superar la cantidad total devuelta.'}), 400
        except ValueError:
            return jsonify({'success': False, 'error': 'Las cantidades deben ser números enteros válidos y positivos.'}), 400
            
        obs = data.get('observacion', '')
        usr_id = get_current_user().id
        
        # 1. Leer el SKU del envase retornable desde la Configuración Global (evitar hardcoding)
        conf = db.session.query(ConfiguracionGlobal).first()
        sku_bidon = conf.sku_bidon_vacio if (conf and conf.sku_bidon_vacio) else 'BID-VACIO-19L'
        bidon_vacio = db.session.query(Producto).filter_by(sku=sku_bidon).first()
        if not bidon_vacio:
            # Fallback: buscar por nombre si el SKU no coincide exactamente
            bidon_vacio = db.session.query(Producto).filter(
                Producto.nombre.like('%Bidón 19L%'), Producto.sku.like('%VACIO%')
            ).first()
            if not bidon_vacio:
                return jsonify({'success': False, 'error': f"No se encontró el envase retornable (SKU configurado: '{sku_bidon}'). Verifique el catálogo o actualice el SKU en Configuración."}), 500
        
        try:
            doc_id = f"RET-{datetime.now().strftime('%m%d%H%M')}"
            
            # Restar del cliente (descontar de su saldo)
            cli.envases_pendientes = max(0, cli.envases_pendientes - total_devuelto)
            
            # Registrar entrada del TOTAL devuelto
            InventarioService.registrar_entrada(
                bidon_vacio.id, 
                total_devuelto, 
                doc_id, 
                usr_id, 
                f"Retorno de envases cliente: {cli.nombre}"
            )
            
            # Si hay dañados, registrar salida por merma (PÉRDIDA)
            if dañados > 0:
                InventarioService.registrar_salida(
                    bidon_vacio.id, 
                    dañados, 
                    f"AJUSTE-{doc_id}", 
                    usr_id, 
                    f"Descarte: Envases dañados de retorno {cli.nombre}"
                )
                
            # Registrar log en RetornoEnvase
            retorno = RetornoEnvase(
                cliente_id=cliente_id,
                usuario_id=usr_id,
                cantidad_total=total_devuelto,
                cantidad_buenos=total_devuelto - dañados,
                cantidad_danados=dañados,
                observaciones=obs
            )
            db.session.add(retorno)
            db.session.commit()
            
            return jsonify({'success': True, 'message': 'Retorno de envases registrado con éxito.'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
            
    # GET method
    retornos = db.session.query(RetornoEnvase).order_by(RetornoEnvase.fecha.desc()).all()
    clientes = db.session.query(Cliente).filter_by(estado='Activo').all()
    
    return jsonify({
        'success': True,
        'retornos': [{
            'id': r.id,
            'fecha': r.fecha.strftime('%d/%m/%Y %H:%M'),
            'cliente': r.cliente.nombre if r.cliente else 'N/A',
            'cantidad_total': r.cantidad_total,
            'cantidad_buenos': r.cantidad_buenos,
            'cantidad_danados': r.cantidad_danados,
            'autorizado_por': r.usuario.nombre if r.usuario else 'Sistema',
            'observaciones': r.observaciones or ''
        } for r in retornos],
        'clientes': [{
            'id': c.id,
            'nombre': c.nombre,
            'ruc': c.ruc,
            'envases_pendientes': c.envases_pendientes
        } for c in clientes]
    })

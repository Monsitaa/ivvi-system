from flask import Blueprint, request, jsonify
from db import db
from models import Producto, Categoria, UnidadMedida, Cliente, Proveedor, Usuario, Venta, Compra
from routes.auth_utils import login_required, role_required

maestros_bp = Blueprint('maestros', __name__, url_prefix='/api')

@maestros_bp.route('/productos', methods=['GET'])
@login_required
def productos():
    prods = db.session.query(Producto).all()
    cats = db.session.query(Categoria).all()
    unis = db.session.query(UnidadMedida).all()
    
    return jsonify({
        'success': True,
        'items': [{
            'id': p.id,
            'sku': p.sku,
            'nombre': p.nombre,
            'descripcion': p.descripcion or '',
            'categoria_id': p.categoria_id,
            'categoria': p.categoria.nombre if p.categoria else 'N/A',
            'unidad_id': p.unidad_id,
            'unidad': p.unidad.nombre if p.unidad else 'N/A',
            'unidad_abr': p.unidad.abreviatura if p.unidad else 'N/A',
            'precio_venta': p.precio_venta,
            'stock_actual': p.stock_actual,
            'stock_minimo': p.stock_minimo,
            'estado': p.estado
        } for p in prods],
        'categorias': [{
            'id': c.id,
            'nombre': c.nombre,
            'descripcion': c.descripcion or ''
        } for c in cats],
        'unidades': [{
            'id': u.id,
            'nombre': u.nombre,
            'abreviatura': u.abreviatura
        } for u in unis]
    })

@maestros_bp.route('/productos/gestion', methods=['POST'])
@login_required
@role_required('Administrador', 'Operador de Almacén')
def gestion_producto():
    data = request.get_json() or {}
    id_prod = data.get('id')
    sku = data.get('sku')
    nombre = data.get('nombre')
    desc = data.get('descripcion', '')
    cat_id = data.get('categoria_id')
    uni_id = data.get('unidad_id')
    precio = float(data.get('precio_venta', 0.0) or 0.0)
    stock_min = int(data.get('stock_minimo', 0) or 0)
    
    if not sku or not nombre or not cat_id or not uni_id:
        return jsonify({'success': False, 'error': 'Campos obligatorios faltantes.'}), 400
        
    if id_prod:
        p = db.session.get(Producto, id_prod)
        if not p:
            return jsonify({'success': False, 'error': 'Producto no encontrado.'}), 404
        p.sku = sku
        p.nombre = nombre
        p.descripcion = desc
        p.categoria_id = int(cat_id)
        p.unidad_id = int(uni_id)
        p.precio_venta = precio
        p.stock_minimo = stock_min
        p.estado = 'Activo'
        message = 'Referencia de material actualizada'
    else:
        p = Producto(sku=sku, nombre=nombre, descripcion=desc, categoria_id=int(cat_id), unidad_id=int(uni_id), precio_venta=precio, stock_minimo=stock_min)
        db.session.add(p)
        message = 'Nuevo Material/Producto añadido al Maestro'
        
    try:
        db.session.commit()
        return jsonify({'success': True, 'message': message, 'id': p.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@maestros_bp.route('/categorias', methods=['GET', 'POST'])
@login_required
@role_required('Administrador')
def categorias():
    if request.method == 'POST':
        data = request.get_json() or {}
        cid = data.get('id')
        nombre = data.get('nombre')
        desc = data.get('descripcion', '')
        
        if not nombre:
            return jsonify({'success': False, 'error': 'El nombre es obligatorio.'}), 400
            
        if cid:
            c = db.session.get(Categoria, cid)
            if not c:
                return jsonify({'success': False, 'error': 'Categoría no encontrada.'}), 404
            c.nombre = nombre
            c.descripcion = desc
            message = 'Categoría actualizada'
        else:
            c = Categoria(nombre=nombre, descripcion=desc)
            db.session.add(c)
            message = 'Categoría creada'
        
        try:
            db.session.commit()
            return jsonify({'success': True, 'message': message, 'id': c.id})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
            
    cats = db.session.query(Categoria).all()
    return jsonify({
        'success': True,
        'items': [{
            'id': c.id,
            'nombre': c.nombre,
            'descripcion': c.descripcion or ''
        } for c in cats]
    })

@maestros_bp.route('/unidades', methods=['GET', 'POST'])
@login_required
@role_required('Administrador')
def unidades():
    if request.method == 'POST':
        data = request.get_json() or {}
        uid = data.get('id')
        nombre = data.get('nombre')
        abr = data.get('abreviatura')
        
        if not nombre or not abr:
            return jsonify({'success': False, 'error': 'Nombre y abreviatura obligatorios.'}), 400
            
        if uid:
            u = db.session.get(UnidadMedida, uid)
            if not u:
                return jsonify({'success': False, 'error': 'Unidad no encontrada.'}), 404
            u.nombre = nombre
            u.abreviatura = abr
            message = 'Unidad actualizada'
        else:
            u = UnidadMedida(nombre=nombre, abreviatura=abr)
            db.session.add(u)
            message = 'Unidad de medida creada'
            
        try:
            db.session.commit()
            return jsonify({'success': True, 'message': message, 'id': u.id})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
            
    unis = db.session.query(UnidadMedida).all()
    return jsonify({
        'success': True,
        'items': [{
            'id': u.id,
            'nombre': u.nombre,
            'abreviatura': u.abreviatura
        } for u in unis]
    })

@maestros_bp.route('/clientes', methods=['GET', 'POST'])
@login_required
@role_required('Administrador', 'Vendedor')
def clientes():
    if request.method == 'POST':
        data = request.get_json() or {}
        cid = data.get('id')
        nombre = data.get('nombre')
        ruc = data.get('ruc')
        tel = data.get('telefono')
        email = data.get('email')
        dir = data.get('direccion')
        
        if not nombre:
            return jsonify({'success': False, 'error': 'El nombre es obligatorio.'}), 400
            
        if cid:
            c = db.session.get(Cliente, cid)
            if not c:
                return jsonify({'success': False, 'error': 'Cliente no encontrado.'}), 404
            c.nombre = nombre
            c.ruc = ruc
            c.telefono = tel
            c.email = email
            c.direccion = dir
            c.estado = 'Activo'
            message = 'Cliente actualizado'
        else:
            c = Cliente(nombre=nombre, ruc=ruc, telefono=tel, email=email, direccion=dir)
            db.session.add(c)
            message = 'Cliente registrado'
            
        try:
            db.session.commit()
            return jsonify({'success': True, 'message': message, 'id': c.id})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
            
    items = db.session.query(Cliente).all()
    return jsonify({
        'success': True,
        'items': [{
            'id': c.id,
            'nombre': c.nombre,
            'ruc': c.ruc or '',
            'telefono': c.telefono or '',
            'email': c.email or '',
            'direccion': c.direccion or '',
            'estado': c.estado
        } for c in items]
    })

@maestros_bp.route('/proveedores', methods=['GET', 'POST'])
@login_required
@role_required('Administrador', 'Operador de Almacén')
def proveedores():
    if request.method == 'POST':
        data = request.get_json() or {}
        pid = data.get('id')
        rs = data.get('razon_social')
        ruc = data.get('ruc')
        tel = data.get('telefono')
        email = data.get('email')
        
        if not rs:
            return jsonify({'success': False, 'error': 'La razón social es obligatoria.'}), 400
            
        if pid:
            p = db.session.get(Proveedor, pid)
            if not p:
                return jsonify({'success': False, 'error': 'Proveedor no encontrado.'}), 404
            p.razon_social = rs
            p.ruc = ruc
            p.telefono = tel
            p.email = email
            p.estado = 'Activo'
            message = 'Proveedor actualizado'
        else:
            p = Proveedor(razon_social=rs, ruc=ruc, telefono=tel, email=email)
            db.session.add(p)
            message = 'Proveedor registrado'
            
        try:
            db.session.commit()
            return jsonify({'success': True, 'message': message, 'id': p.id})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
            
    items = db.session.query(Proveedor).all()
    return jsonify({
        'success': True,
        'items': [{
            'id': p.id,
            'razon_social': p.razon_social,
            'ruc': p.ruc or '',
            'telefono': p.telefono or '',
            'email': p.email or '',
            'estado': p.estado
        } for p in items]
    })

@maestros_bp.route('/usuarios', methods=['GET', 'POST'])
@login_required
@role_required('Administrador')
def usuarios():
    if request.method == 'POST':
        data = request.get_json() or {}
        uid = data.get('id')
        nombre = data.get('nombre')
        email = data.get('email')
        rol = data.get('rol')
        telefono = data.get('telefono')
        direccion = data.get('direccion')
        cargo = data.get('cargo')
        pwd = data.get('password')
        
        if not nombre or not rol:
            return jsonify({'success': False, 'error': 'Nombre y rol obligatorios.'}), 400
            
        if not email or email.strip() == '':
            email = None
            
        if not pwd or pwd.strip() == '':
            pwd = None

        if uid:
            u = db.session.get(Usuario, uid)
            if not u:
                return jsonify({'success': False, 'error': 'Colaborador no encontrado.'}), 404
            u.nombre = nombre
            u.email = email
            u.rol = rol
            u.telefono = telefono
            u.direccion = direccion
            u.cargo = cargo
            u.estado = 'Activo'
            if pwd is not None:
                u.password = pwd
            message = 'Colaborador actualizado'
        else:
            u = Usuario(
                nombre=nombre, 
                email=email, 
                rol=rol, 
                telefono=telefono, 
                direccion=direccion, 
                cargo=cargo, 
                password=pwd
            )
            db.session.add(u)
            message = 'Colaborador registrado exitosamente'
            
        try:
            db.session.commit()
            return jsonify({'success': True, 'message': message, 'id': u.id})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
            
    items = db.session.query(Usuario).all()
    return jsonify({
        'success': True,
        'items': [{
            'id': u.id,
            'nombre': u.nombre,
            'email': u.email or '',
            'rol': u.rol,
            'telefono': u.telefono or '',
            'direccion': u.direccion or '',
            'cargo': u.cargo or '',
            'estado': u.estado,
            'tiene_acceso_web': u.password_hash is not None
        } for u in items]
    })

@maestros_bp.route('/entidad/eliminar/<string:tipo>/<int:id>', methods=['POST', 'DELETE', 'GET'])
@login_required
@role_required('Administrador')
def eliminar_entidad(tipo, id):
    model_map = {
        'producto': Producto, 'categoria': Categoria, 'unidad': UnidadMedida,
        'cliente': Cliente, 'proveedor': Proveedor, 'usuario': Usuario
    }
    if tipo not in model_map:
        return jsonify({'success': False, 'error': 'Tipo de entidad no válido'}), 400
    
    if tipo == 'categoria':
        if db.session.query(Producto).filter_by(categoria_id=id, estado='Activo').first():
            return jsonify({'success': False, 'error': 'Restricción: Esta categoría tiene productos asociados y no puede eliminarse.'}), 400
    
    elif tipo == 'unidad':
        if db.session.query(Producto).filter_by(unidad_id=id, estado='Activo').first():
            return jsonify({'success': False, 'error': 'Restricción: Esta unidad de medida está en uso por productos del catálogo.'}), 400

    elif tipo == 'cliente':
        if db.session.query(Venta).filter_by(cliente_id=id).first():
            return jsonify({'success': False, 'error': 'Restricción: Este cliente tiene facturas de venta asociadas.'}), 400
            
    elif tipo == 'proveedor':
        if db.session.query(Compra).filter_by(proveedor_id=id).first():
            return jsonify({'success': False, 'error': 'Restricción: Este proveedor tiene facturas de compra registradas.'}), 400

    obj = db.session.get(model_map[tipo], id)
    if not obj:
        return jsonify({'success': False, 'error': 'Registro no encontrado.'}), 404
        
    try:
        if hasattr(obj, 'estado'):
            obj.estado = 'Inactivo'
            db.session.commit()
            return jsonify({'success': True, 'message': f'{tipo.capitalize()} desactivado correctamente (Soft Delete)'})
        else:
            db.session.delete(obj)
            db.session.commit()
            return jsonify({'success': True, 'message': f'{tipo.capitalize()} eliminado correctamente'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'No se puede eliminar: el registro está siendo utilizado en otras operaciones.'}), 400

@maestros_bp.route('/api/clientes/registrar', methods=['POST'])
@login_required
@role_required('Administrador', 'Vendedor')
def registrar_cliente_express():
    data = request.get_json() or {}
    nombre = data.get('nombre')
    ruc = data.get('ruc')
    tel = data.get('telefono')
    email = data.get('email')
    direccion = data.get('direccion')
    
    if not nombre:
        return jsonify({'success': False, 'error': 'El nombre es obligatorio.'}), 400
        
    if ruc:
        existing = db.session.query(Cliente).filter_by(ruc=ruc).first()
        if existing:
            return jsonify({'success': False, 'error': f'Ya existe un cliente con el RUC {ruc}.'}), 400
            
    try:
        c = Cliente(nombre=nombre, ruc=ruc, telefono=tel, email=email, direccion=direccion)
        db.session.add(c)
        db.session.commit()
        return jsonify({
            'success': True,
            'id': c.id,
            'nombre': c.nombre,
            'ruc': c.ruc or 'N/A'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': f'Error al guardar el cliente: {str(e)}'}), 500

import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from models import (
    db, Usuario, Cliente, Proveedor, Producto, 
    Categoria, UnidadMedida, Bodega, Empleado, 
    Compra, DetalleCompra, Venta, DetalleVenta, 
    Kardex, InventarioService
)
import datetime
import io
from sqlalchemy import func

from routes.auth import auth_bp
from routes.auth_utils import login_required, role_required, get_current_user

app = Flask(__name__)
app.secret_key = 'ivvi_secret_key_pro'

# Configuración base de datos SQLite
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()
    # Semilla inicial: Administrador
    if not Usuario.query.filter_by(rol='Administrador').first():
        admin = Usuario(
            nombre="Administrador IVVI", 
            telefono="0999999999", 
            email="admin@ivvi.com", 
            direccion="Oficinas IVVI",
            rol="Administrador", 
            password="admin123"
        )
        db.session.add(admin)
        db.session.commit()

app.register_blueprint(auth_bp)

@app.context_processor
def inject_user():
    return dict(current_user=get_current_user())

@app.route('/')
@login_required
def index():
    # KPIs para el Dashboard
    total_productos = Producto.query.count()
    total_clientes = Cliente.query.count()
    total_proveedores = Proveedor.query.count()
    
    # Ventas del mes actual (Ejemplo simple)
    hoy = datetime.datetime.now()
    inicio_mes = datetime.datetime(hoy.year, hoy.month, 1)
    # Suma de totales de ventas este mes
    ventas_mes = db.session.query(func.sum(Venta.total)).filter(Venta.fecha >= inicio_mes).scalar() or 0.0
    compras_mes = db.session.query(func.sum(Compra.total)).filter(Compra.fecha >= inicio_mes).scalar() or 0.0
    
    productos_bajo_stock = Producto.query.filter(Producto.stock_actual <= Producto.stock_minimo).all()
    ultimas_ventas = Venta.query.order_by(Venta.id.desc()).limit(5).all()
    ultimas_compras = Compra.query.order_by(Compra.id.desc()).limit(5).all()
    
    return render_template('index.html', 
                           tp=total_productos, tc=total_clientes, prov=total_proveedores,
                           vm=ventas_mes, cm=compras_mes,
                           bajo_stock=productos_bajo_stock,
                           ventas=ultimas_ventas, compras=ultimas_compras)

# --- MAESTROS (CRUD) ---

@app.route('/productos', methods=['GET', 'POST'])
@login_required
def productos():
    if request.method == 'POST':
        # Guardar / Editar
        id_prod = request.form.get('id')
        sku, nombre, desc = request.form['sku'], request.form['nombre'], request.form['descripcion']
        cat_id, uni_id, precio = int(request.form['categoria_id']), int(request.form['unidad_id']), float(request.form['precio'])
        stock_min = int(request.form['stock_minimo'])
        
        if id_prod:
            p = Producto.query.get(id_prod)
            p.sku, p.nombre, p.descripcion = sku, nombre, desc
            p.categoria_id, p.unidad_id, p.precio_venta = cat_id, uni_id, precio
            p.stock_minimo = stock_min
            flash('Producto actualizado', 'success')
        else:
            p = Producto(sku=sku, nombre=nombre, descripcion=desc, categoria_id=cat_id, unidad_id=uni_id, precio_venta=precio, stock_minimo=stock_min)
            db.session.add(p)
            flash('Producto creado', 'success')
        db.session.commit()
        return redirect(url_for('productos'))
        
    prods = Producto.query.all()
    cats = Categoria.query.all()
    unis = UnidadMedida.query.all()
    return render_template('productos.html', items=prods, categorias=cats, unidades=unis)

# Rutas Auxiliares (Categorías, Unidades, Bodegas, Empleados)
@app.route('/categorias', methods=['GET', 'POST'])
@login_required
@role_required('Administrador')
def categorias():
    if request.method == 'POST':
        nombre, desc = request.form['nombre'], request.form['descripcion']
        c = Categoria(nombre=nombre, descripcion=desc)
        db.session.add(c)
        db.session.commit()
        flash('Categoría creada', 'success')
        return redirect(url_for('categorias'))
    return render_template('maestros/categorias.html', items=Categoria.query.all())

@app.route('/unidades', methods=['GET', 'POST'])
@login_required
@role_required('Administrador')
def unidades():
    if request.method == 'POST':
        nombre, abr = request.form['nombre'], request.form['abreviatura']
        u = UnidadMedida(nombre=nombre, abreviatura=abr)
        db.session.add(u)
        db.session.commit()
        flash('Unidad de medida creada', 'success')
        return redirect(url_for('unidades'))
    return render_template('maestros/unidades.html', items=UnidadMedida.query.all())

@app.route('/bodegas', methods=['GET', 'POST'])
@login_required
@role_required('Administrador')
def bodegas():
    if request.method == 'POST':
        nombre, ubi = request.form['nombre'], request.form['ubicacion']
        b = Bodega(nombre=nombre, ubicacion=ubi)
        db.session.add(b)
        db.session.commit()
        flash('Bodega creada', 'success')
        return redirect(url_for('bodegas'))
    return render_template('maestros/bodegas.html', items=Bodega.query.all())

@app.route('/empleados', methods=['GET', 'POST'])
@login_required
@role_required('Administrador')
def empleados():
    if request.method == 'POST':
        nombre, cargo, tel = request.form['nombre'], request.form['cargo'], request.form['telefono']
        e = Empleado(nombre=nombre, cargo=cargo, telefono=tel)
        db.session.add(e)
        db.session.commit()
        flash('Empleado creado', 'success')
        return redirect(url_for('empleados'))
    return render_template('maestros/empleados.html', items=Empleado.query.all())

@app.route('/clientes', methods=['GET', 'POST'])
@login_required
@role_required('Administrador', 'Vendedor')
def clientes():
    if request.method == 'POST':
        nombre, ruc, tel = request.form['nombre'], request.form['ruc'], request.form['telefono']
        c = Cliente(nombre=nombre, ruc=ruc, telefono=tel, email=request.form['email'], direccion=request.form['direccion'])
        db.session.add(c)
        db.session.commit()
        flash('Cliente registrado', 'success')
        return redirect(url_for('clientes'))
    return render_template('clientes.html', items=Cliente.query.all())

@app.route('/proveedores', methods=['GET', 'POST'])
@login_required
@role_required('Administrador', 'Operador de Almacén')
def proveedores():
    if request.method == 'POST':
        rs, ruc, tel = request.form['razon_social'], request.form['ruc'], request.form['telefono']
        p = Proveedor(razon_social=rs, ruc=ruc, telefono=tel, email=request.form['email'])
        db.session.add(p)
        db.session.commit()
        flash('Proveedor registrado', 'success')
        return redirect(url_for('proveedores'))
    return render_template('proveedores.html', items=Proveedor.query.all())

# --- OPERACIONES ---

@app.route('/ventas', methods=['GET', 'POST'])
@login_required
@role_required('Administrador', 'Vendedor')
def ventas():
    if request.method == 'POST':
        # Lógica de venta Cabecera-Detalle
        cliente_id = int(request.form['cliente_id'])
        vendedor_id = get_current_user().id
        nums_prod = request.form.getlist('producto_id[]')
        cants = request.form.getlist('cantidad[]')
        
        nueva_venta = Venta(cliente_id=cliente_id, vendedor_id=vendedor_id, total=0.0)
        db.session.add(nueva_venta)
        db.session.flush() # Para obtener el ID
        
        total_acumulado = 0
        for pid, cant in zip(nums_prod, cants):
            prod = Producto.query.get(pid)
            cantidad = int(cant)
            if prod.validar_stock(cantidad):
                sub = prod.precio_venta * cantidad
                det = DetalleVenta(venta_id=nueva_venta.id, producto_id=pid, cantidad=cantidad, precio_unitario=prod.precio_venta, subtotal=sub)
                db.session.add(det)
                InventarioService.registrar_salida(pid, cantidad, f"Venta #{nueva_venta.id}", vendedor_id)
                total_acumulado += sub
            else:
                db.session.rollback()
                flash(f'Stock insuficiente para {prod.nombre}', 'error')
                return redirect(url_for('ventas'))
        
        nueva_venta.total = total_acumulado
        db.session.commit()
        flash('Venta registrada con éxito', 'success')
        return redirect(url_for('ventas'))

    vnts = Venta.query.all()
    prods = Producto.query.filter_by(estado='Activo').all()
    clis = Cliente.query.all()
    return render_template('ventas.html', items=vnts, productos=prods, clientes=clis)

@app.route('/compras', methods=['GET', 'POST'])
@login_required
@role_required('Administrador', 'Operador de Almacén')
def compras():
    if request.method == 'POST':
        prov_id = int(request.form['proveedor_id'])
        bod_id = int(request.form['bodega_id'])
        usr_id = get_current_user().id
        nums_prod = request.form.getlist('producto_id[]')
        cants = request.form.getlist('cantidad[]')
        costos = request.form.getlist('costo[]')
        
        nueva_compra = Compra(proveedor_id=prov_id, bodega_id=bod_id, total=0.0)
        db.session.add(nueva_compra)
        db.session.flush()
        
        total_acum = 0
        for pid, cant, cst in zip(nums_prod, cants, costos):
            cantidad = int(cant)
            costo = float(cst)
            sub = cantidad * costo
            det = DetalleCompra(compra_id=nueva_compra.id, producto_id=pid, cantidad=cantidad, costo_unitario=costo, subtotal=sub)
            db.session.add(det)
            InventarioService.registrar_entrada(pid, cantidad, f"Compra #{nueva_compra.id}", usr_id)
            total_acum += sub
            
        nueva_compra.total = total_acum
        db.session.commit()
        flash('Compra registrada con éxito', 'success')
        return redirect(url_for('compras'))

    cmps = Compra.query.all()
    prods = Producto.query.all()
    provs = Proveedor.query.all()
    bodegas = Bodega.query.all()
    return render_template('compras.html', items=cmps, productos=prods, proveedores=provs, bodegas=bodegas)

# --- INVENTARIO Y KARDEX ---

@app.route('/inventario')
@login_required
def inventario():
    prods = Producto.query.all()
    return render_template('inventario.html', items=prods)

@app.route('/kardex')
@login_required
def kardex():
    movs = Kardex.query.order_by(Kardex.fecha.desc()).all()
    return render_template('kardex.html', items=movs)

# --- USUARIOS ---
@app.route('/usuarios', methods=['GET', 'POST'])
@login_required
@role_required('Administrador')
def usuarios():
    if request.method == 'POST':
        nombre, email, rol = request.form['nombre'], request.form['email'], request.form['rol']
        pwd = request.form['password']
        u = Usuario(nombre=nombre, email=email, rol=rol, password=pwd)
        db.session.add(u)
        db.session.commit()
        flash('Usuario creado', 'success')
        return redirect(url_for('usuarios'))
    return render_template('usuarios.html', items=Usuario.query.all())

# --- CONFIGURACION Y REPORTES ---
from flask import send_file
from utils.pdf_generator import InvoiceGenerator
import openpyxl

@app.route('/ventas/pdf/<int:id>')
@login_required
def generar_factura_pdf(id):
    venta = Venta.query.get_or_404(id)
    pdf_buffer = InvoiceGenerator.generate_invoice(venta)
    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f'Factura_IVVI_{venta.id}.pdf',
        mimetype='application/pdf'
    )

@app.route('/productos/excel')
@login_required
def exportar_productos_excel():
    prods = Producto.query.all()
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Inventario IVVI"
    
    headers = ['SKU', 'Nombre', 'Categoría', 'Unidad', 'Precio Venta', 'Stock Actual']
    ws.append(headers)
    
    for p in prods:
        ws.append([
            p.sku, p.nombre, 
            p.categoria.nombre if p.categoria else 'N/A',
            p.unidad.abreviatura if p.unidad else 'N/A',
            p.precio_venta, p.stock_actual
        ])
    
    excel_buffer = io.BytesIO()
    wb.save(excel_buffer)
    excel_buffer.seek(0)
    
    return send_file(
        excel_buffer,
        as_attachment=True,
        download_name='Inventario_IVVI.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@app.route('/configuracion')
@login_required
@role_required('Administrador')
def configuracion():
    return render_template('configuracion.html')

@app.route('/reportes')
@login_required
def reportes():
    return render_template('reportes.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)



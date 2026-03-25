import os
from flask import Flask, render_template, request, redirect, url_for, flash
from models import Cliente, Usuario, Proveedor, Producto, Inventario, Compra, Venta
from db import db
import datetime

from routes.auth import auth_bp
from routes.auth_utils import login_required, role_required, get_current_user

app = Flask(__name__)
app.secret_key = 'ivvi_secret_key'

# Configuración base de datos SQLite
basedir = os.path.abspath(os.path.dirname(__file__))
# Asegurar db.sqlite3 se crea en esta carpeta
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()
    # Si la base de datos está vacía, crear al administrador inicial
    if not Usuario.query.first():
        admin = Usuario(
            nombre="Admin General", 
            telefono="555-0000", 
            email="admin@ivvi.com", 
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
    p_count = Producto.query.count()
    v_count = Venta.query.count()
    c_count = Compra.query.count()
    u_count = Usuario.query.count()
    return render_template('index.html', p_count=p_count, v_count=v_count, c_count=c_count, u_count=u_count)

# --- USUARIOS ---
@app.route('/usuarios', methods=['GET', 'POST'])
@app.route('/usuarios/<int:id>', methods=['GET', 'POST'])
@login_required
@role_required('Administrador')
def usuarios(id=None):
    if request.method == 'POST':
        nombre, telefono, email, rol = request.form['nombre'], request.form['telefono'], request.form['email'], request.form['rol']
        password = request.form.get('password')
        if id:
            usr = Usuario.query.get_or_404(id)
            usr.nombre, usr.telefono, usr.email, usr.rol = nombre, telefono, email, rol
            if password: 
                usr.password = password
            db.session.commit()
            flash('Usuario actualizado', 'success')
        else:
            if not password: password = '123'
            usr = Usuario(nombre=nombre, telefono=telefono, email=email, rol=rol, password=password)
            db.session.add(usr)
            db.session.commit()
            flash('Usuario creado', 'success')
        return redirect(url_for('usuarios'))
    
    users = Usuario.query.all()
    edit_item = Usuario.query.get(id) if id else None
    return render_template('usuarios.html', items=users, edit_item=edit_item)

@app.route('/usuarios/delete/<int:id>')
@login_required
@role_required('Administrador')
def delete_usuario(id):
    usr = Usuario.query.get(id)
    if usr:
        if usr.email == 'admin@ivvi.com':
            flash('No puedes eliminar al administrador principal del sistema.', 'error')
        else:
            db.session.delete(usr)
            db.session.commit()
            flash('Usuario eliminado', 'success')
    return redirect(url_for('usuarios'))

# --- CLIENTES ---
@app.route('/clientes', methods=['GET', 'POST'])
@app.route('/clientes/<int:id>', methods=['GET', 'POST'])
@login_required
@role_required('Ventas')
def clientes(id=None):
    if request.method == 'POST':
        nombre, tel, email, direccion = request.form['nombre'], request.form['telefono'], request.form['email'], request.form['direccion']
        if id:
            c = Cliente.query.get_or_404(id)
            c.nombre, c.telefono, c.email, c.direccion = nombre, tel, email, direccion
            db.session.commit()
            flash('Cliente actualizado', 'success')
        else:
            c = Cliente(nombre=nombre, telefono=tel, email=email, direccion=direccion)
            db.session.add(c)
            db.session.commit()
            flash('Cliente creado', 'success')
        return redirect(url_for('clientes'))
    
    clients = Cliente.query.all()
    edit_item = Cliente.query.get(id) if id else None
    return render_template('clientes.html', items=clients, edit_item=edit_item)

@app.route('/clientes/delete/<int:id>')
@login_required
@role_required('Ventas')
def delete_cliente(id):
    c = Cliente.query.get(id)
    if c:
        db.session.delete(c)
        db.session.commit()
        flash('Cliente eliminado', 'success')
    return redirect(url_for('clientes'))

# --- PROVEEDORES ---
@app.route('/proveedores', methods=['GET', 'POST'])
@app.route('/proveedores/<int:id>', methods=['GET', 'POST'])
@login_required
@role_required('Inventario')
def proveedores(id=None):
    if request.method == 'POST':
        empresa, contacto, tel = request.form['empresa'], request.form['contacto'], request.form['telefono']
        if id:
            p = Proveedor.query.get_or_404(id)
            p.empresa, p.contacto, p.telefono = empresa, contacto, tel
            db.session.commit()
            flash('Proveedor actualizado', 'success')
        else:
            p = Proveedor(empresa=empresa, contacto=contacto, telefono=tel)
            db.session.add(p)
            db.session.commit()
            flash('Proveedor creado', 'success')
        return redirect(url_for('proveedores'))
        
    provs = Proveedor.query.all()
    edit_item = Proveedor.query.get(id) if id else None
    return render_template('proveedores.html', items=provs, edit_item=edit_item)

@app.route('/proveedores/delete/<int:id>')
@login_required
@role_required('Inventario')
def delete_proveedor(id):
    p = Proveedor.query.get(id)
    if p:
        db.session.delete(p)
        db.session.commit()
        flash('Proveedor eliminado', 'success')
    return redirect(url_for('proveedores'))

# --- PRODUCTOS ---
@app.route('/productos', methods=['GET', 'POST'])
@app.route('/productos/<int:id>', methods=['GET', 'POST'])
@login_required
@role_required('Inventario', 'Ventas')
def productos(id=None):
    if request.method == 'POST':
        nombre, desc, precio, stock, prov_id = request.form['nombre'], request.form['descripcion'], request.form['precio'], request.form['stock'], request.form['proveedor_id']
        if id:
            p = Producto.query.get_or_404(id)
            p.nombre, p.descripcion, p.precio, p.proveedor_id = nombre, desc, float(precio), int(prov_id)
            p.stock = int(stock) 
            db.session.commit()
            flash('Producto actualizado', 'success')
        else:
            p = Producto(nombre=nombre, descripcion=desc, precio=float(precio), stock=int(stock), proveedor_id=int(prov_id))
            db.session.add(p)
            db.session.commit()
            flash('Producto creado', 'success')
        return redirect(url_for('productos'))
        
    prods = Producto.query.all()
    provs = Proveedor.query.all()
    edit_item = Producto.query.get(id) if id else None
    return render_template('productos.html', items=prods, proveedores=provs, edit_item=edit_item)

@app.route('/productos/delete/<int:id>')
@login_required
@role_required('Inventario')
def delete_producto(id):
    p = Producto.query.get(id)
    if p:
        db.session.delete(p)
        db.session.commit()
        flash('Producto eliminado', 'success')
    return redirect(url_for('productos'))

# --- VENTAS ---
@app.route('/ventas', methods=['GET', 'POST'])
@app.route('/ventas/<int:id>', methods=['GET', 'POST'])
@login_required
@role_required('Ventas')
def ventas(id=None):
    if request.method == 'POST':
        try:
            prod_id, cant, cli_id = int(request.form['producto_id']), int(request.form['cantidad']), int(request.form['cliente_id'])
            fecha_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            if id:
                flash('Edición directa de ventas no permitida. Elimine y vuelva a crear para auditoría.', 'warning')
            else:
                Inventario.registrar_venta(prod_id, cant, cli_id, fecha_str)
                db.session.commit()
                flash('Venta registrada exitosamente', 'success')
        except ValueError as e:
            flash(str(e), 'error')
        return redirect(url_for('ventas'))
        
    vnts = Venta.query.all()
    prods = Producto.query.all()
    clients = Cliente.query.all()
    return render_template('ventas.html', items=vnts, productos=prods, clientes=clients, get_prod=lambda x: Producto.query.get(x), get_cli=lambda x: Cliente.query.get(x))

@app.route('/ventas/delete/<int:id>')
@login_required
@role_required('Ventas')
def delete_venta(id):
    try:
        Inventario.eliminar_venta(id)
        db.session.commit()
        flash('Venta eliminada, el stock regresó a inventario', 'success')
    except Exception as e:
        db.session.rollback()
        flash('Error al eliminar venta.', 'error')
    return redirect(url_for('ventas'))

# --- COMPRAS ---
@app.route('/compras', methods=['GET', 'POST'])
@app.route('/compras/<int:id>', methods=['GET', 'POST'])
@login_required
@role_required('Inventario')
def compras(id=None):
    if request.method == 'POST':
        try:
            prod_id, cant = int(request.form['producto_id']), int(request.form['cantidad'])
            fecha_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            if id:
                flash('Edición directa de compras no permitida. Elimine y vuelva a crear.', 'warning')
            else:
                Inventario.registrar_compra(prod_id, cant, fecha_str)
                db.session.commit()
                flash('Compra registrada exitosamente', 'success')
        except ValueError as e:
            flash(str(e), 'error')
        return redirect(url_for('compras'))
        
    cmps = Compra.query.all()
    prods = Producto.query.all()
    return render_template('compras.html', items=cmps, productos=prods, get_prod=lambda x: Producto.query.get(x))

@app.route('/compras/delete/<int:id>')
@login_required
@role_required('Inventario')
def delete_compra(id):
    try:
        Inventario.eliminar_compra(id)
        db.session.commit()
        flash('Compra eliminada, el stock se descontó', 'success')
    except Exception as e:
        db.session.rollback()
        flash('Error al eliminar compra.', 'error')
    return redirect(url_for('compras'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)

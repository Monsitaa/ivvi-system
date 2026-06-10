import os
import shutil
import threading
from datetime import datetime, timezone
from flask import Flask, session, url_for, jsonify
from db import db
from models import Usuario
from routes.auth import auth_bp
from routes.auth_utils import get_current_user, login_required, role_required

# Importación de Blueprints Modularizados
from routes.dashboard import dashboard_bp
from routes.maestros import maestros_bp
from routes.transacciones import transacciones_bp
from routes.inventario import inventario_bp
from routes.reportes import reportes_bp

app = Flask(__name__, static_folder='frontend/dist', static_url_path='/')
app.secret_key = 'ivvi_secret_key_pro'

# Configuración base de datos SQLite
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

from sqlalchemy.engine import Engine
from sqlalchemy import event

# --- WAL CHECKPOINT AUTOMÁTICO ---
# Contador compartido de escrituras. Cada 50 commits se fuerza un checkpoint
# para vaciar el WAL al archivo principal y evitar que crezca indefinidamente.
_write_counter = 0
_write_lock = threading.Lock()
WAL_CHECKPOINT_INTERVAL = 50  # Checkpoint cada N transacciones de escritura

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA wal_autocheckpoint=100")  # SQLite también hace checkpoint cada 100 páginas
    cursor.close()

@event.listens_for(Engine, "after_cursor_execute")
def track_writes(conn, cursor, statement, parameters, context, executemany):
    """Incrementa el contador en cada escritura DML y dispara checkpoint si corresponde."""
    global _write_counter
    if statement.strip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')):
        with _write_lock:
            _write_counter += 1
            if _write_counter >= WAL_CHECKPOINT_INTERVAL:
                _write_counter = 0
                try:
                    conn.execute(db.text("PRAGMA wal_checkpoint(PASSIVE)"))
                except Exception:
                    pass  # No interrumpir la operación principal si el checkpoint falla

def _hacer_backup_bd(basedir: str) -> dict:
    """Copia database.db -> database.db.bak con timestamp. Devuelve resultado."""
    origen = os.path.join(basedir, 'database.db')
    destino = os.path.join(basedir, 'database.db.bak')
    try:
        # Primero vaciar el WAL al archivo principal (TRUNCATE es más agresivo que PASSIVE)
        with db.engine.connect() as conn:
            conn.execute(db.text("PRAGMA wal_checkpoint(TRUNCATE)"))
        shutil.copy2(origen, destino)
        ts = datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')
        return {'success': True, 'message': f'Backup completado el {ts}', 'archivo': destino}
    except Exception as e:
        return {'success': False, 'error': str(e)}

# Interceptar url_for en Jinja para redireccionar rutas tradicionales a sus respectivos Blueprints
@app.context_processor
def override_url_for():
    original_url_for = url_for
    def custom_url_for(endpoint, **values):
        # Mapeo de rutas legacy de la primera versión a los nuevos blueprints modularizados
        mapping = {
            'index': 'dashboard.index',
            'productos': 'maestros.productos',
            'gestion_producto': 'maestros.gestion_producto',
            'categorias': 'maestros.categorias',
            'unidades': 'maestros.unidades',
            'clientes': 'maestros.clientes',
            'proveedores': 'maestros.proveedores',
            'compras': 'transacciones.compras',
            'anular_compra': 'transacciones.anular_compra',
            'get_compra_detalle': 'transacciones.get_compra_detalle',
            'ventas': 'transacciones.ventas',
            'anular_venta': 'transacciones.anular_venta',
            'get_venta_detalle': 'transacciones.get_venta_detalle',
            'generar_factura_pdf': 'transacciones.generar_factura_pdf',
            'envasado': 'inventario.envasado',
            'inventario': 'inventario.inventario',
            'ajuste_inventario': 'inventario.ajuste_inventario',
            'get_valorizacion_detalle': 'inventario.get_valorizacion_detalle',
            'kardex': 'inventario.kardex',
            'usuarios': 'maestros.usuarios',
            'eliminar_entidad': 'maestros.eliminar_entidad',
            'configuracion': 'reportes.configuracion',
            'reportes': 'reportes.reportes',
            'reporte_ventas_excel': 'reportes.reporte_ventas_excel',
            'reporte_compras_excel': 'reportes.reporte_compras_excel',
            'reporte_inventario_excel': 'reportes.reporte_inventario_excel',
            'reporte_kardex_excel': 'reportes.reporte_kardex_excel',
        }
        mapped_endpoint = mapping.get(endpoint, endpoint)
        return original_url_for(mapped_endpoint, **values)
    
    return dict(
        current_user=get_current_user(),
        url_for=custom_url_for
    )

# Registrar Blueprints Modularizados
app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(maestros_bp)
app.register_blueprint(transacciones_bp)
app.register_blueprint(inventario_bp)
app.register_blueprint(reportes_bp)

with app.app_context():
    db.create_all()
    
    # --- AUDITORÍA: TRIGGERS DE INALTERABILIDAD DEL KÁRDEX ---
    try:
        db.session.execute(db.text("""
            CREATE TRIGGER IF NOT EXISTS impedir_edicion_kardex BEFORE UPDATE ON kardex
            BEGIN
                SELECT RAISE(FAIL, 'El Kardex de Auditoria es inalterable y no puede ser editado.');
            END;
        """))
        db.session.execute(db.text("""
            CREATE TRIGGER IF NOT EXISTS impedir_borrado_kardex BEFORE DELETE ON kardex
            BEGIN
                SELECT RAISE(FAIL, 'El Kardex de Auditoria es inalterable y no puede ser eliminado.');
            END;
        """))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Semilla inicial de contingencia (Administrador)
    try:
        if not db.session.query(Usuario).filter_by(rol='Administrador').first():
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
    except Exception:
        db.session.rollback()

    # --- BACKUP AUTOMÁTICO AL INICIAR ---
    # Si el backup tiene más de 24 horas (o no existe), hacer uno nuevo al arrancar.
    bak_path = os.path.join(basedir, 'database.db.bak')
    bak_edad_horas = 999
    if os.path.exists(bak_path):
        bak_edad_horas = (datetime.now(timezone.utc).timestamp() - os.path.getmtime(bak_path)) / 3600
    if bak_edad_horas > 24:
        _hacer_backup_bd(basedir)

# --- ENDPOINT DE MANTENIMIENTO (solo Administrador) ---
@app.route('/api/admin/mantenimiento', methods=['POST'])
@login_required
@role_required('Administrador')
def mantenimiento():
    """Fuerza checkpoint WAL + backup manual. Solo accesible para Administrador."""
    wal_path = os.path.join(basedir, 'database.db-wal')
    wal_kb_antes = round(os.path.getsize(wal_path) / 1024, 1) if os.path.exists(wal_path) else 0
    resultado = _hacer_backup_bd(basedir)
    wal_kb_despues = round(os.path.getsize(wal_path) / 1024, 1) if os.path.exists(wal_path) else 0
    return jsonify({
        **resultado,
        'wal_kb_antes': wal_kb_antes,
        'wal_kb_despues': wal_kb_despues,
    })

    # Serve Vite SPA on catch-all
api_prefixes = ('api/', 'auth/', 'reportes/', 'compras', 'ventas', 'configuracion', 'produccion/', 'login', 'logout', 'status', 'mantenimiento')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    if any(path.startswith(prefix) for prefix in api_prefixes):
        return jsonify({'error': 'Not Found'}), 404
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)

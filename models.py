from db import db
from datetime import datetime

# --- BASE DE DATOS Y POO ---

class Persona(db.Model):
    """
    CLASE BASE (Abstracción e Herencia)
    Implementa los datos comunes para cualquier entidad humana o jurídica en el sistema.
    """
    __tablename__ = 'personas'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(150), nullable=False)
    telefono = db.Column(db.String(50))
    email = db.Column(db.String(120))
    direccion = db.Column(db.String(250))
    tipo_persona = db.Column(db.String(50)) # Para herencia de tabla unida

    __mapper_args__ = {
        'polymorphic_identity': 'persona',
        'polymorphic_on': tipo_persona
    }

    def mostrar_resumen(self):
        """ Ejemplo de método base para polimorfismo """
        return f"{self.nombre} ({self.email})"

class Usuario(Persona):
    """
    Entidad de acceso al sistema (Herencia de Persona).
    """
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, db.ForeignKey('personas.id'), primary_key=True)
    rol = db.Column(db.String(50), nullable=False) # Administrador, Operador, Vendedor, Gerencia
    password = db.Column(db.String(100), nullable=False)
    estado = db.Column(db.String(20), default='Activo')

    __mapper_args__ = {
        'polymorphic_identity': 'usuario',
    }

class Cliente(Persona):
    """
    Entidad de ventas (Herencia de Persona).
    """
    __tablename__ = 'clientes'
    id = db.Column(db.Integer, db.ForeignKey('personas.id'), primary_key=True)
    ruc = db.Column(db.String(20), unique=True)
    contacto_principal = db.Column(db.String(100))
    observaciones = db.Column(db.Text)
    estado = db.Column(db.String(20), default='Activo')

    __mapper_args__ = {
        'polymorphic_identity': 'cliente',
    }

class Empleado(Persona):
    """
    Entidad de personal (Herencia de Persona).
    """
    __tablename__ = 'empleados'
    id = db.Column(db.Integer, db.ForeignKey('personas.id'), primary_key=True)
    cargo = db.Column(db.String(100))
    estado = db.Column(db.String(20), default='Activo')
    observaciones = db.Column(db.Text)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)

    __mapper_args__ = {
        'polymorphic_identity': 'empleado',
    }

class Proveedor(db.Model):
    """
    Entidad de compras. 
    Se mantiene como tabla independiente por la complejidad de campos específicos empresariales.
    """
    __tablename__ = 'proveedores'
    id = db.Column(db.Integer, primary_key=True)
    razon_social = db.Column(db.String(150), nullable=False)
    ruc = db.Column(db.String(20), unique=True)
    contacto = db.Column(db.String(100))
    telefono = db.Column(db.String(50))
    email = db.Column(db.String(120))
    direccion = db.Column(db.String(250))
    pais = db.Column(db.String(100))
    banco = db.Column(db.String(100))
    numero_cuenta = db.Column(db.String(100))
    observaciones = db.Column(db.Text)
    estado = db.Column(db.String(20), default='Activo')

# --- MAESTROS DE INVENTARIO ---

class Categoria(db.Model):
    __tablename__ = 'categorias'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.String(250))

class UnidadMedida(db.Model):
    __tablename__ = 'unidades_medida'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False) # Litros, Galones, Kilos, etc.
    abreviatura = db.Column(db.String(10))

class Bodega(db.Model):
    __tablename__ = 'bodegas'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    ubicacion = db.Column(db.String(250))

class Producto(db.Model):
    """
    CATÁLOGO DE PRODUCTOS (Encapsulación)
    """
    __tablename__ = 'productos'
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(50), unique=True)
    nombre = db.Column(db.String(150), nullable=False)
    descripcion = db.Column(db.Text)
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias.id'))
    unidad_id = db.Column(db.Integer, db.ForeignKey('unidades_medida.id'))
    precio_venta = db.Column(db.Float, default=0.0)
    stock_minimo = db.Column(db.Integer, default=5)
    estado = db.Column(db.String(20), default='Activo')
    
    # Campo calculado o centralizado
    stock_actual = db.Column(db.Integer, default=0)

    def validar_stock(self, cantidad):
        """ Encapsula la validación de disponibilidad """
        return self.stock_actual >= cantidad

    def es_bajo_stock(self):
        return self.stock_actual <= self.stock_minimo

# --- OPERACIONES ---

class Compra(db.Model):
    """ CABECERA DE COMPRA """
    __tablename__ = 'compras'
    id = db.Column(db.Integer, primary_key=True)
    proveedor_id = db.Column(db.Integer, db.ForeignKey('proveedores.id'))
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    numero_factura = db.Column(db.String(50))
    bodega_id = db.Column(db.Integer, db.ForeignKey('bodegas.id'))
    observaciones = db.Column(db.Text)
    total = db.Column(db.Float, default=0.0)

    detalles = db.relationship('DetalleCompra', backref='compra', lazy=True, cascade="all, delete-orphan")

class DetalleCompra(db.Model):
    """ DETALLE DE COMPRA """
    __tablename__ = 'detalles_compra'
    id = db.Column(db.Integer, primary_key=True)
    compra_id = db.Column(db.Integer, db.ForeignKey('compras.id'))
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'))
    cantidad = db.Column(db.Integer, nullable=False)
    costo_unitario = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)

class Venta(db.Model):
    """ CABECERA DE VENTA """
    __tablename__ = 'ventas'
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'))
    vendedor_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    numero_factura = db.Column(db.String(50))
    observaciones = db.Column(db.Text)
    total = db.Column(db.Float, default=0.0)

    detalles = db.relationship('DetalleVenta', backref='venta', lazy=True, cascade="all, delete-orphan")

class DetalleVenta(db.Model):
    """ DETALLE DE VENTA """
    __tablename__ = 'detalles_venta'
    id = db.Column(db.Integer, primary_key=True)
    venta_id = db.Column(db.Integer, db.ForeignKey('ventas.id'))
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'))
    cantidad = db.Column(db.Integer, nullable=False)
    precio_unitario = db.Column(db.Float, nullable=False)
    descuento = db.Column(db.Float, default=0.0)
    impuesto = db.Column(db.Float, default=0.0)
    subtotal = db.Column(db.Float, nullable=False)

# --- KARDEX ---

class Kardex(db.Model):
    """ HISTORIAL DE MOVIMIENTOS (Trazabilidad) """
    __tablename__ = 'kardex'
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    tipo_movimiento = db.Column(db.String(50)) # ENTRADA, SALIDA, AJUSTE
    documento_id = db.Column(db.String(50))    # ID de venta o compra
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'))
    cantidad = db.Column(db.Integer, nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    observacion = db.Column(db.String(250))

# --- LÓGICA DE NEGOCIO (Modularidad) ---

class InventarioService:
    """ Clase para centralizar operaciones de inventario (Polimorfismo / Abstracción) """
    
    @staticmethod
    def registrar_entrada(producto_id, cantidad, documento, usuario_id, obs="Compra"):
        prod = Producto.query.get(producto_id)
        if prod:
            prod.stock_actual += cantidad
            mov = Kardex(
                tipo_movimiento='ENTRADA',
                documento_id=documento,
                producto_id=producto_id,
                cantidad=cantidad,
                usuario_id=usuario_id,
                observacion=obs
            )
            db.session.add(mov)
            return True
        return False

    @staticmethod
    def registrar_salida(producto_id, cantidad, documento, usuario_id, obs="Venta"):
        prod = Producto.query.get(producto_id)
        if prod and prod.validar_stock(cantidad):
            prod.stock_actual -= cantidad
            mov = Kardex(
                tipo_movimiento='SALIDA',
                documento_id=documento,
                producto_id=producto_id,
                cantidad=cantidad,
                usuario_id=usuario_id,
                observacion=obs
            )
            db.session.add(mov)
            return True
        return False


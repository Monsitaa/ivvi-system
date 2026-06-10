from db import db
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash

# --- BASE DE DATOS Y POO ---

class ConfiguracionGlobal(db.Model):
    """ PARAMETROS CENTRALES DEL SISTEMA """
    __tablename__ = 'configuracion_global'
    id = db.Column(db.Integer, primary_key=True)
    nombre_empresa = db.Column(db.String(150), default='IVVI S.A.')
    ruc = db.Column(db.String(50), default='1790045623001')
    tasa_cambio = db.Column(db.Float, default=36.00)
    tasa_cambio_max = db.Column(db.Float, default=40.00)  # Limite maximo permitido para evitar errores graves
    sku_bidon_vacio = db.Column(db.String(50), default='BID-VACIO-19L')  # SKU del envase retornable de 19L

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
    Entidad de colaboradores y acceso al sistema (Herencia de Persona).
    """
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, db.ForeignKey('personas.id'), primary_key=True)
    rol = db.Column(db.String(50), nullable=False) # Administrador, Operador, Vendedor, Gerencia
    password_hash = db.Column('password', db.String(255), nullable=True) # Mapeado a la columna 'password'
    estado = db.Column(db.String(20), default='Activo')
    cargo = db.Column(db.String(100), nullable=True) # Cargo específico en la empresa (ej: Chofer, Operario)

    __mapper_args__ = {
        'polymorphic_identity': 'usuario',
    }

    @property
    def password(self):
        raise AttributeError('La contraseña no es un atributo legible.')

    @password.setter
    def password(self, val):
        if val is not None:
            self.password_hash = generate_password_hash(val)
        else:
            self.password_hash = None

    def verificar_password(self, val):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, val)

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
    envases_pendientes = db.Column(db.Integer, default=0, nullable=False)

    __mapper_args__ = {
        'polymorphic_identity': 'cliente',
    }

# El modelo Empleado ha sido fusionado con Usuario para evitar redundancia.

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

# El modelo Bodega ha sido eliminado debido a la unificación a un solo almacén central.

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
    stock_minimo = db.Column(db.Float, default=5.0)
    factor_conversion = db.Column(db.Float, default=1.0) # Cuántas uds inventario por 1 ud compra
    estado = db.Column(db.String(20), default='Activo')
    
    # Campo calculado o centralizado
    stock_actual = db.Column(db.Float, default=0.0)

    # Relaciones
    categoria = db.relationship('Categoria', backref='productos', lazy=True)
    unidad = db.relationship('UnidadMedida', backref='productos', lazy=True)

    def validar_stock(self, cantidad):
        """ Encapsula la validación de disponibilidad """
        return self.stock_actual >= cantidad

    def es_bajo_stock(self):
        return self.stock_actual <= self.stock_minimo

class RecetaEnvasado(db.Model):
    """ RECETA DE ENVASADO DINÁMICA """
    __tablename__ = 'recetas_envasado'
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(50), unique=True, nullable=False) # e.g. 'ESTANDAR-19L'
    nombre = db.Column(db.String(150), nullable=False) # e.g. 'Fruto Dorado 19L'
    
    # Insumos / Materias primas consumidas
    producto_aceite_id = db.Column(db.Integer, db.ForeignKey('productos.id'), nullable=False)
    producto_envase_id = db.Column(db.Integer, db.ForeignKey('productos.id'), nullable=False)
    
    # Producto terminado resultante
    producto_final_id = db.Column(db.Integer, db.ForeignKey('productos.id'), nullable=False)
    
    litros_aceite = db.Column(db.Float, nullable=False, default=19.0)
    estado = db.Column(db.String(20), default='Activo') # 'Activo' o 'Inactivo'

    # Relaciones
    producto_aceite = db.relationship('Producto', foreign_keys=[producto_aceite_id])
    producto_envase = db.relationship('Producto', foreign_keys=[producto_envase_id])
    producto_final = db.relationship('Producto', foreign_keys=[producto_final_id])


# --- OPERACIONES ---

class Compra(db.Model):
    """ CABECERA DE COMPRA """
    __tablename__ = 'compras'
    id = db.Column(db.Integer, primary_key=True)
    proveedor_id = db.Column(db.Integer, db.ForeignKey('proveedores.id'))
    fecha = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    numero_factura = db.Column(db.String(50), unique=True)  # Unicidad obligatoria — evita duplicados contables
    observaciones = db.Column(db.Text)
    
    # Manejo Multimoneda
    moneda = db.Column(db.String(3), default='NIO')
    tasa_cambio = db.Column(db.Float, default=1.0)
    total = db.Column(db.Float, default=0.0) # Total expresado en la moneda original de transacción
    total_base = db.Column(db.Float, default=0.0) # Total normalizado forzosamente a la moneda principal de la compañía (NIO)
    estado = db.Column(db.String(20), default='Completada') # Completada, Anulada
    anulado_por_usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)  # Quién anuló
    fecha_anulacion = db.Column(db.DateTime, nullable=True)  # Cuándo se anuló

    # Relaciones
    proveedor = db.relationship('Proveedor', backref='compras', lazy=True)
    detalles = db.relationship('DetalleCompra', backref='compra', lazy=True, cascade="all, delete-orphan")
    anulado_por_usuario = db.relationship('Usuario', foreign_keys=[anulado_por_usuario_id], lazy=True)

class DetalleCompra(db.Model):
    """ DETALLE DE COMPRA """
    __tablename__ = 'detalles_compra'
    id = db.Column(db.Integer, primary_key=True)
    compra_id = db.Column(db.Integer, db.ForeignKey('compras.id'))
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'))
    cantidad = db.Column(db.Float, nullable=False)
    costo_unitario = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)

    # Relación
    producto = db.relationship('Producto', lazy=True)

class Venta(db.Model):
    """ CABECERA DE VENTA """
    __tablename__ = 'ventas'
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'))
    vendedor_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    fecha = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    numero_factura = db.Column(db.String(50), unique=True)  # Unicidad obligatoria — evita duplicados contables
    observaciones = db.Column(db.Text)
    total = db.Column(db.Float, default=0.0)
    estado = db.Column(db.String(20), default='Completada') # Completada, Anulada
    anulado_por_usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)  # Quién anuló
    fecha_anulacion = db.Column(db.DateTime, nullable=True)  # Cuándo se anuló

    # Relaciones
    cliente = db.relationship('Cliente', backref='ventas', lazy=True)
    usuario = db.relationship('Usuario', foreign_keys=[vendedor_id], backref='ventas', lazy=True)
    anulado_por_usuario = db.relationship('Usuario', foreign_keys=[anulado_por_usuario_id], lazy=True)
    detalles = db.relationship('DetalleVenta', backref='venta', lazy=True, cascade="all, delete-orphan")

class DetalleVenta(db.Model):
    """ DETALLE DE VENTA """
    __tablename__ = 'detalles_venta'
    id = db.Column(db.Integer, primary_key=True)
    venta_id = db.Column(db.Integer, db.ForeignKey('ventas.id'))
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'))
    cantidad = db.Column(db.Float, nullable=False)
    precio_unitario = db.Column(db.Float, nullable=False)
    descuento = db.Column(db.Float, default=0.0)
    impuesto = db.Column(db.Float, default=0.0)
    subtotal = db.Column(db.Float, nullable=False)

    # Relación
    producto = db.relationship('Producto', lazy=True)

# --- KARDEX ---

class Kardex(db.Model):
    """ HISTORIAL DE MOVIMIENTOS (Trazabilidad) """
    __tablename__ = 'kardex'
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    tipo_movimiento = db.Column(db.String(50)) # ENTRADA, SALIDA, AJUSTE
    documento_id = db.Column(db.String(50))    # ID de venta o compra
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'))
    cantidad = db.Column(db.Float, nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    observacion = db.Column(db.String(250))

    # Relaciones
    producto = db.relationship('Producto', lazy=True)
    usuario = db.relationship('Usuario', lazy=True)

class RetornoEnvase(db.Model):
    """ HISTORIAL DE RETORNOS DE ENVASES 19L """
    __tablename__ = 'retorno_envases'
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    fecha = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    cantidad_total = db.Column(db.Integer, nullable=False)
    cantidad_buenos = db.Column(db.Integer, nullable=False)
    cantidad_danados = db.Column(db.Integer, nullable=False)
    observaciones = db.Column(db.String(250))

    # Relaciones
    cliente = db.relationship('Cliente', backref='retornos', lazy=True)
    usuario = db.relationship('Usuario', lazy=True)

# --- LÓGICA DE NEGOCIO (Modularidad) ---

class InventarioService:
    """ Clase para centralizar operaciones de inventario (Polimorfismo / Abstracción) """
    
    @staticmethod
    def registrar_entrada(producto_id, cantidad, documento, usuario_id, obs="Compra"):
        prod = db.session.query(Producto).filter_by(id=producto_id).with_for_update().first()
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
        prod = db.session.query(Producto).filter_by(id=producto_id).with_for_update().first()
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

    @staticmethod
    def registrar_produccion(tipo_combo, cantidad, usuario_id, merma_aceite=0, merma_envase=0):
        """
        Lógica de Envasado Multimarca y Multi-Envase (Transaccional con Mermas de Base de Datos)
        """
        receta = db.session.query(RecetaEnvasado).filter_by(codigo=tipo_combo, estado='Activo').first()
        if not receta:
            return False, f"Error: No existe receta activa para el código '{tipo_combo}'."
        
        try:
            with db.session.begin_nested():
                p_bulk = db.session.query(Producto).filter_by(id=receta.producto_aceite_id).with_for_update().first()
                p_envase = db.session.query(Producto).filter_by(id=receta.producto_envase_id).with_for_update().first()
                p_final = db.session.query(Producto).filter_by(id=receta.producto_final_id).with_for_update().first()

                if not p_bulk or not p_envase or not p_final:
                    raise ValueError("Error: Configuración de productos (IDs) no encontrada en catálogo.")

                oil_total = cantidad * receta.litros_aceite + merma_aceite
                envase_total = cantidad + merma_envase

                # Validaciones
                if p_bulk.stock_actual < oil_total:
                    raise ValueError(f"Stock insuficiente de Aceite Bulk: Se requieren {oil_total}L.")
                if p_envase.stock_actual < envase_total:
                    raise ValueError(f"Stock insuficiente de Envases Vacíos: Se requieren {envase_total} UND.")

                # Transacción
                doc = f"PLANTA-{tipo_combo}-{datetime.now().strftime('%m%d%H%M')}"
                
                # 1. Salida ACEITE
                obs_oil = f"Consumo envasado {receta.nombre}"
                if merma_aceite > 0:
                    obs_oil += f" (+ {merma_aceite}L merma)"
                InventarioService.registrar_salida(p_bulk.id, oil_total, doc, usuario_id, obs_oil)
                
                # 2. Salida ENVASE
                obs_env = f"Envases usados para {receta.nombre}"
                if merma_envase > 0:
                    obs_env += f" (+ {merma_envase} UND merma)"
                InventarioService.registrar_salida(p_envase.id, envase_total, doc, usuario_id, obs_env)
                
                # 3. Entrada FINAL
                InventarioService.registrar_entrada(p_final.id, cantidad, doc, usuario_id, f"Producción terminada {receta.nombre}")

            return True, f"Orden de producción completada: {cantidad} unidades de {receta.nombre}."
        except ValueError as e:
            return False, str(e)
        except Exception as e:
            return False, f"Error imprevisto en producción: {str(e)}"



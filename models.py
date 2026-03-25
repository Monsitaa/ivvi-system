from db import db
from datetime import datetime

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    rol = db.Column(db.String(50), nullable=False)
    password = db.Column(db.String(100), nullable=False)

class Cliente(db.Model):
    __tablename__ = 'clientes'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    direccion = db.Column(db.String(200), nullable=False)

class Proveedor(db.Model):
    __tablename__ = 'proveedores'
    id = db.Column(db.Integer, primary_key=True)
    empresa = db.Column(db.String(100), nullable=False)
    contacto = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(20), nullable=False)

class Producto(db.Model):
    __tablename__ = 'productos'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.String(200))
    precio = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, default=0)
    proveedor_id = db.Column(db.Integer, db.ForeignKey('proveedores.id'))

class Compra(db.Model):
    __tablename__ = 'compras'
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'))
    cantidad = db.Column(db.Integer, nullable=False)
    fecha = db.Column(db.String(50), nullable=False)

class Venta(db.Model):
    __tablename__ = 'ventas'
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'))
    cantidad = db.Column(db.Integer, nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'))
    fecha = db.Column(db.String(50), nullable=False)

# Lógica de Negocio aislada para Inventario (Capa de Servicio)
class Inventario:
    @staticmethod
    def registrar_compra(producto_id, cantidad, fecha):
        producto = Producto.query.get(producto_id)
        if producto:
            producto.stock += cantidad
            compra = Compra(producto_id=producto_id, cantidad=cantidad, fecha=fecha)
            db.session.add(compra)
            return compra
        raise ValueError("Producto no encontrado")

    @staticmethod
    def registrar_venta(producto_id, cantidad, cliente_id, fecha):
        producto = Producto.query.get(producto_id)
        if not producto:
            raise ValueError("Producto no encontrado.")
        if producto.stock < cantidad:
            raise ValueError(f"Stock insuficiente para {producto.nombre}. Disponible: {producto.stock}")
            
        producto.stock -= cantidad
        venta = Venta(producto_id=producto_id, cantidad=cantidad, cliente_id=cliente_id, fecha=fecha)
        db.session.add(venta)
        return venta
        
    @staticmethod
    def eliminar_venta(venta_id):
        venta = Venta.query.get(venta_id)
        if venta:
            producto = Producto.query.get(venta.producto_id)
            if producto:
                producto.stock += venta.cantidad
            db.session.delete(venta)
            
    @staticmethod
    def eliminar_compra(compra_id):
        compra = Compra.query.get(compra_id)
        if compra:
            producto = Producto.query.get(compra.producto_id)
            if producto:
                producto.stock -= compra.cantidad
            db.session.delete(compra)

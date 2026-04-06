import unittest
from flask import Flask
from models import db, Producto, Persona, Usuario, Cliente, InventarioService, Categoria, UnidadMedida
import os

class IvviTest(unittest.TestCase):

    def setUp(self):
        # Configuración de App de Prueba
        self.app = Flask(__name__)
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app.config['TESTING'] = True
        db.init_app(self.app)

        with self.app.app_context():
            db.create_all()
            # Semillas básicas para pruebas
            self.cat = Categoria(nombre="Aceites")
            self.uni = UnidadMedida(nombre="Galones", abreviatura="gal")
            db.session.add_all([self.cat, self.uni])
            db.session.commit()
            db.session.refresh(self.cat)
            db.session.refresh(self.uni)

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_creacion_producto(self):
        """ Prueba 1: Creación de Producto y POO """
        with self.app.app_context():
            p = Producto(
                sku="PROD-001", 
                nombre="Aceite de Palma", 
                categoria_id=self.cat.id,
                unidad_id=self.uni.id,
                stock_actual=10,
                stock_minimo=5
            )
            db.session.add(p)
            db.session.commit()
            
            p_db = Producto.query.filter_by(sku="PROD-001").first()
            self.assertIsNotNone(p_db)
            self.assertEqual(p_db.stock_actual, 10)

    def test_herencia_persona_usuario(self):
        """ Prueba 2: Herencia entre Persona y Usuario """
        with self.app.app_context():
            u = Usuario(
                nombre="Test User",
                email="test@ivvi.com",
                rol="Vendedor",
                password="123"
            )
            db.session.add(u)
            db.session.commit()
            
            # Verificar que existe tanto como Usuario como Persona (ID compartido)
            u_db = Usuario.query.filter_by(email="test@ivvi.com").first()
            self.assertEqual(u_db.nombre, "Test User")
            self.assertEqual(u_db.rol, "Vendedor")

    def test_validacion_stock_insuficiente(self):
        """ Prueba 3: Regla de Negocio - No vender sin stock """
        with self.app.app_context():
            p = Producto(sku="PROD-LOW", nombre="Stock Bajo", stock_actual=2)
            db.session.add(p)
            db.session.commit()
            
            # Escenario: Intentar vender 5 cuando hay 2
            success = p.validar_stock(5)
            self.assertFalse(success, "El sistema permitió validar stock inexistente.")

    def test_flujo_inventario_kardex(self):
        """ Prueba 4: Registro Kardex Automático """
        with self.app.app_context():
            p = Producto(sku="P-TEST", nombre="Producto Test", stock_actual=10)
            u = Usuario(nombre="Admin", rol="Administrador", password="123", email="ad@ivvi.com")
            db.session.add_all([p, u])
            db.session.commit()
            
            # Registrar Entrada (Compra)
            res = InventarioService.registrar_entrada(p.id, 5, "C-001", u.id, "Compra Test")
            
            # Verificar cambios
            p_updated = Producto.query.get(p.id)
            self.assertEqual(p_updated.stock_actual, 15)
            
            # Verificar que el Kardex tenga el registro
            from models import Kardex
            mov = Kardex.query.filter_by(documento_id="C-001").first()
            self.assertIsNotNone(mov)
            self.assertEqual(mov.tipo_movimiento, "ENTRADA")

if __name__ == '__main__':
    unittest.main()

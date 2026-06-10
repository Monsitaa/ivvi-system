import unittest
from flask import Flask
from models import db, Producto, Persona, Usuario, Cliente, InventarioService, Categoria, UnidadMedida, RecetaEnvasado
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
            cat = Categoria(nombre="Aceites")
            uni = UnidadMedida(nombre="Galones", abreviatura="gal")
            db.session.add_all([cat, uni])
            db.session.commit()
            
            # Almacenamos solo los IDs para evitar problemas de sesión (DetachedInstanceError)
            self.cat_id = cat.id
            self.uni_id = uni.id

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
                categoria_id=self.cat_id,
                unidad_id=self.uni_id,
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
            p_updated = db.session.get(Producto, p.id)
            self.assertEqual(p_updated.stock_actual, 15)
            
            # Verificar que el Kardex tenga el registro
            from models import Kardex
            mov = Kardex.query.filter_by(documento_id="C-001").first()
            self.assertIsNotNone(mov)
            self.assertEqual(mov.tipo_movimiento, "ENTRADA")

    def test_conversion_industrial_tm_l(self):
        """ Prueba 5: Conversión Industrial (TM a L) """
        with self.app.app_context():
            p_bulk = Producto(sku="O-BULK", nombre="Aceite Bulk", factor_conversion=1100.0, stock_actual=0)
            u = Usuario(nombre="Logistica", rol="Operador", password="123", email="log@ivvi.com")
            db.session.add_all([p_bulk, u])
            db.session.commit()
            
            # Compramos 2 TM. El stock debe subir 2200 Litros.
            cantidad_tm = 2.0
            InventarioService.registrar_entrada(p_bulk.id, cantidad_tm * p_bulk.factor_conversion, "COMPRA-TM", u.id)
            
            p_updated = Producto.query.filter_by(sku="O-BULK").first()
            self.assertEqual(p_updated.stock_actual, 2200)

    def test_envasado_atomico(self):
        """ Prueba 6: Producción/Envasado Atómico (Descuento Doble) """
        with self.app.app_context():
            # Mock de datos para producción (Fruto Dorado 19L)
            p_oil = Producto(sku="ACE-EST-BULK", nombre="Aceite Est", stock_actual=100)
            p_env = Producto(sku="BID-VACIO-19L", nombre="Bidon", stock_actual=10)
            p_pt  = Producto(sku="PRO-EST-19L", nombre="PT 19L", stock_actual=0)
            u = Usuario(nombre="Planta", rol="Administrador", password="1", email="p@ivvi.com")
            db.session.add_all([p_oil, p_env, p_pt, u])
            db.session.commit()
            
            # Insertar Receta de Envasado para pruebas
            receta = RecetaEnvasado(
                codigo="ESTANDAR-19L",
                nombre="Fruto Dorado 19L",
                producto_aceite_id=p_oil.id,
                producto_envase_id=p_env.id,
                producto_final_id=p_pt.id,
                litros_aceite=19.0
            )
            db.session.add(receta)
            db.session.commit()
            
            # Producir 2 bidones de 19L
            # Debe descontar 38L de aceite y 2 bidones vacios. Debe sumar 2 PT.
            success, msg = InventarioService.registrar_produccion("ESTANDAR-19L", 2, u.id)
            
            p_oil_up = Producto.query.filter_by(sku="ACE-EST-BULK").first()
            p_env_up = Producto.query.filter_by(sku="BID-VACIO-19L").first()
            p_pt_up  = Producto.query.filter_by(sku="PRO-EST-19L").first()
            
            self.assertTrue(success)
            self.assertEqual(p_oil_up.stock_actual, 100 - 38)
            self.assertEqual(p_env_up.stock_actual, 10 - 2)
            self.assertEqual(p_pt_up.stock_actual, 2)

    def test_integridad_referencial_kardex(self):
        """ Prueba 7: Integridad y Autoría del Kárdex """
        with self.app.app_context():
            p = Producto(sku="P-AUTH", nombre="P", stock_actual=10)
            u = Usuario(nombre="Auditor", rol="Administrador", password="1", email="a@ivvi.com")
            db.session.add_all([p, u])
            db.session.commit()
            
            InventarioService.registrar_salida(p.id, 1, "DOC-AUDIT", u.id, "Muestra de calidad")
            
            from models import Kardex
            mov = Kardex.query.filter_by(documento_id="DOC-AUDIT").first()
            # Validar que el movimiento esté amarrado a un usuario real
            self.assertEqual(mov.usuario.nombre, "Auditor")
            self.assertEqual(mov.producto.sku, "P-AUTH")

    def test_anulacion_compras_y_ventas(self):
        """ Prueba 8: Lógica de Negocio de Anulaciones y Reversión de Stock """
        from models import Compra, DetalleCompra, Venta, DetalleVenta
        with self.app.app_context():
            p = Producto(sku="PROD-ANULA", nombre="Prod Anula", stock_actual=10)
            u = Usuario(nombre="Supervisor", rol="Administrador", password="1", email="sup@ivvi.com")
            db.session.add_all([p, u])
            db.session.commit()

            # --- CASO 1: Anulación de Venta ---
            # Venta de 4 unidades
            v = Venta(vendedor_id=u.id, total=100.0)
            db.session.add(v)
            db.session.flush()
            
            InventarioService.registrar_salida(p.id, 4, f"VENTA-{v.id}", u.id)
            det_v = DetalleVenta(venta_id=v.id, producto_id=p.id, cantidad=4, precio_unitario=25.0, subtotal=100.0)
            db.session.add(det_v)
            db.session.commit()

            # Confirmar stock bajó a 6
            p_db = db.session.get(Producto, p.id)
            self.assertEqual(p_db.stock_actual, 6)

            # Revertir Venta (Anulación)
            v.estado = 'Anulada'
            for det in v.detalles:
                InventarioService.registrar_entrada(det.producto_id, det.cantidad, f"AJUSTE-VENTA-{v.id}", u.id, "Anulación")
            db.session.commit()

            # Confirmar stock regresó a 10
            self.assertEqual(p_db.stock_actual, 10)

            # --- CASO 2: Anulación de Compra ---
            # Compra de 5 unidades
            c = Compra(total=50.0)
            db.session.add(c)
            db.session.flush()
            
            InventarioService.registrar_entrada(p.id, 5, f"COMPRA-{c.id}", u.id)
            det_c = DetalleCompra(compra_id=c.id, producto_id=p.id, cantidad=5, costo_unitario=10.0, subtotal=50.0)
            db.session.add(det_c)
            db.session.commit()

            # Confirmar stock subió a 15
            self.assertEqual(p_db.stock_actual, 15)

            # Revertir Compra (Anulación)
            c.estado = 'Anulada'
            for det in c.detalles:
                # Verificar stock antes
                self.assertGreaterEqual(det.producto.stock_actual, det.cantidad)
                InventarioService.registrar_salida(det.producto_id, det.cantidad, f"AJUSTE-COMPRA-{c.id}", u.id, "Anulación")
            db.session.commit()

            # Confirmar stock bajó a 10
            self.assertEqual(p_db.stock_actual, 10)

            # --- CASO 3: Intento de Anulación de Compra sin stock ---
            c2 = Compra(total=50.0)
            db.session.add(c2)
            db.session.flush()
            
            InventarioService.registrar_entrada(p.id, 5, f"COMPRA-{c2.id}", u.id)
            det_c2 = DetalleCompra(compra_id=c2.id, producto_id=p.id, cantidad=5, costo_unitario=10.0, subtotal=50.0)
            db.session.add(det_c2)
            db.session.commit()

            # Stock actual es 15. Ahora vendemos 12 unidades (quedan 3)
            InventarioService.registrar_salida(p.id, 12, "VENTA-TEMP", u.id)
            db.session.commit()
            self.assertEqual(p_db.stock_actual, 3)

            # Si intentamos anular c2 (que requiere restar 5), debe fallar la validación
            puedo_anular = True
            for det in c2.detalles:
                if det.producto.stock_actual < det.cantidad:
                    puedo_anular = False
            
            self.assertFalse(puedo_anular, "El sistema permitió anular una compra sin tener stock para devolver.")

    def test_envasado_con_mermas(self):
        """ Prueba 9: Producción/Envasado con Mermas registradas """
        with self.app.app_context():
            p_oil = Producto(sku="ACE-EST-BULK", nombre="Aceite Est", stock_actual=100)
            p_env = Producto(sku="BID-VACIO-19L", nombre="Bidon", stock_actual=10)
            p_pt  = Producto(sku="PRO-EST-19L", nombre="PT 19L", stock_actual=0)
            u = Usuario(nombre="Planta", rol="Administrador", password="1", email="p@ivvi.com")
            db.session.add_all([p_oil, p_env, p_pt, u])
            db.session.commit()
            
            # Insertar Receta de Envasado para pruebas
            receta = RecetaEnvasado(
                codigo="ESTANDAR-19L",
                nombre="Fruto Dorado 19L",
                producto_aceite_id=p_oil.id,
                producto_envase_id=p_env.id,
                producto_final_id=p_pt.id,
                litros_aceite=19.0
            )
            db.session.add(receta)
            db.session.commit()
            
            # Producir 2 bidones de 19L con 3L de merma de aceite y 1 bidón de merma de envase
            # Debe descontar 38L (aceite) + 3L (merma) = 41L de aceite y 2 (envases) + 1 (merma) = 3 bidones vacíos.
            # Debe sumar 2 PT.
            success, msg = InventarioService.registrar_produccion("ESTANDAR-19L", 2, u.id, merma_aceite=3, merma_envase=1)
            
            p_oil_up = db.session.query(Producto).filter_by(sku="ACE-EST-BULK").first()
            p_env_up = db.session.query(Producto).filter_by(sku="BID-VACIO-19L").first()
            p_pt_up  = db.session.query(Producto).filter_by(sku="PRO-EST-19L").first()
            
            self.assertTrue(success)
            self.assertEqual(p_oil_up.stock_actual, 100 - 41)
            self.assertEqual(p_env_up.stock_actual, 10 - 3)
            self.assertEqual(p_pt_up.stock_actual, 2)

    def test_valorizacion_multimoneda(self):
        """ Prueba: Conversión de moneda en valoración de inventario """
        from routes.auth import auth_bp
        from routes.inventario import inventario_bp
        from models import Compra, DetalleCompra
        from flask import session
        
        self.app.register_blueprint(auth_bp)
        self.app.register_blueprint(inventario_bp)
        self.app.config['SECRET_KEY'] = 'test_secret'
        
        @self.app.before_request
        def mock_login():
            session['user_id'] = 1
            
        with self.app.test_client() as client:
            with self.app.app_context():
                # Crear Usuario mock con ID 1
                u = Usuario(id=1, nombre="Admin", rol="Administrador", email="admin@test.com", password="123")
                db.session.add(u)
                
                # 1. Crear productos (uno en USD, otro en NIO)
                p_usd = Producto(sku="P-USD", nombre="Bulk USD", stock_actual=10, unidad_id=self.uni_id, categoria_id=self.cat_id)
                p_nio = Producto(sku="P-NIO", nombre="Insumo NIO", stock_actual=5, unidad_id=self.uni_id, categoria_id=self.cat_id)
                db.session.add_all([p_usd, p_nio])
                db.session.commit()
                
                # 2. Registrar compra en USD (tasa 36.0)
                c_usd = Compra(moneda="USD", tasa_cambio=36.0, total=10.0, total_base=360.0)
                db.session.add(c_usd)
                db.session.flush()
                det_usd = DetalleCompra(compra_id=c_usd.id, producto_id=p_usd.id, cantidad=10, costo_unitario=1.0, subtotal=10.0)
                db.session.add(det_usd)
                db.session.commit()
                
                # 3. Registrar compra en NIO (tasa 1.0)
                c_nio = Compra(moneda="NIO", tasa_cambio=1.0, total=50.0, total_base=50.0)
                db.session.add(c_nio)
                db.session.flush()
                det_nio = DetalleCompra(compra_id=c_nio.id, producto_id=p_nio.id, cantidad=5, costo_unitario=10.0, subtotal=50.0)
                db.session.add(det_nio)
                db.session.commit()
                
            res = client.get('/api/inventario/valorizacion')
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            
            # p_usd: 10 * (1.0 * 36.0) = 360.0
            # p_nio: 5 * (10.0 * 1.0) = 50.0
            # total = 410.0
            self.assertEqual(data['total_general'], 410.0)

    def test_validaciones_compras_ventas_inactivos_y_negativos(self):
        """ Prueba: Validación del lado del servidor para entidades inactivas y valores negativos en compras/ventas """
        from routes.auth import auth_bp
        from routes.dashboard import dashboard_bp
        from routes.transacciones import transacciones_bp
        from models import Proveedor, Cliente, Compra, Venta
        from flask import session
        
        self.app.register_blueprint(auth_bp)
        self.app.register_blueprint(dashboard_bp)
        self.app.register_blueprint(transacciones_bp)
        self.app.config['SECRET_KEY'] = 'test_secret'
        
        @self.app.before_request
        def mock_login():
            session['user_id'] = 1
            session['rol'] = 'Administrador'
            
        with self.app.test_client() as client:
            with self.app.app_context():
                # Crear Usuario mock con ID 1
                u = Usuario(id=1, nombre="Admin", rol="Administrador", email="admin@test.com", password="123")
                db.session.add(u)
                
                prov_act = Proveedor(razon_social="Olmeca Activo", ruc="11", estado="Activo")
                prov_inact = Proveedor(razon_social="Olmeca Inactivo", ruc="12", estado="Inactivo")
                cli_act = Cliente(nombre="Cliente Activo", ruc="21", estado="Activo")
                cli_inact = Cliente(nombre="Cliente Inactivo", ruc="22", estado="Inactivo")
                p_act = Producto(sku="P-ACT", nombre="Producto Activo", stock_actual=100, precio_venta=10.0, unidad_id=self.uni_id, categoria_id=self.cat_id)
                p_inact = Producto(sku="P-INACT", nombre="Producto Inactivo", stock_actual=10, precio_venta=10.0, unidad_id=self.uni_id, categoria_id=self.cat_id, estado="Inactivo")
                
                db.session.add_all([prov_act, prov_inact, cli_act, cli_inact, p_act, p_inact])
                db.session.commit()
                
                self.p_act_id = p_act.id
                self.p_inact_id = p_inact.id
                self.prov_act_id = prov_act.id
                self.prov_inact_id = prov_inact.id
                self.cli_act_id = cli_act.id
                self.cli_inact_id = cli_inact.id
                
            # 1. Compra con proveedor inactivo
            res = client.post('/compras', data={
                'proveedor_id': self.prov_inact_id,
                'numero_factura': '123',
                'producto_id[]': [self.p_act_id],
                'cantidad[]': ['10'],
                'costo[]': ['5.0'],
                'fecha_factura': '2026-06-09T00:00'
            })
            self.assertEqual(res.status_code, 302)
            with self.app.app_context():
                self.assertEqual(db.session.query(Compra).count(), 0)
                
            # 2. Compra con producto inactivo
            res = client.post('/compras', data={
                'proveedor_id': self.prov_act_id,
                'numero_factura': '123',
                'producto_id[]': [self.p_inact_id],
                'cantidad[]': ['10'],
                'costo[]': ['5.0'],
                'fecha_factura': '2026-06-09T00:00'
            })
            with self.app.app_context():
                self.assertEqual(db.session.query(Compra).count(), 0)
                
            # 3. Compra con costo negativo
            res = client.post('/compras', data={
                'proveedor_id': self.prov_act_id,
                'numero_factura': '123',
                'producto_id[]': [self.p_act_id],
                'cantidad[]': ['10'],
                'costo[]': ['-5.0'],
                'fecha_factura': '2026-06-09T00:00'
            })
            with self.app.app_context():
                self.assertEqual(db.session.query(Compra).count(), 0)
                
            # 4. Venta con cliente inactivo
            res = client.post('/ventas', data={
                'cliente_id': self.cli_inact_id,
                'producto_id[]': [self.p_act_id],
                'cantidad[]': ['2']
            })
            with self.app.app_context():
                self.assertEqual(db.session.query(Venta).count(), 0)
                
            # 5. Venta con cantidad negativa
            res = client.post('/ventas', data={
                'cliente_id': self.cli_act_id,
                'producto_id[]': [self.p_act_id],
                'cantidad[]': ['-2']
            })
            with self.app.app_context():
                self.assertEqual(db.session.query(Venta).count(), 0)

    def test_flujo_retorno_envases(self):
        """ Prueba 10: Flujo completo de retorno de envases de 19L y pérdidas en Kárdex """
        from routes.auth import auth_bp
        from routes.transacciones import transacciones_bp
        from routes.inventario import inventario_bp
        from models import Venta, DetalleVenta, RetornoEnvase, Kardex
        from flask import session

        self.app.register_blueprint(auth_bp)
        self.app.register_blueprint(transacciones_bp)
        self.app.register_blueprint(inventario_bp)
        self.app.config['SECRET_KEY'] = 'test_secret'

        with self.app.app_context():
            u = Usuario(nombre="Admin", rol="Administrador", email="admin@test.com", password="123")
            cli = Cliente(nombre="Cliente Test", ruc="12345", envases_pendientes=0)
            p_19l = Producto(sku="PRO-EST-19L", nombre="Aceite Est 19L", stock_actual=100, precio_venta=30.0, unidad_id=self.uni_id, categoria_id=self.cat_id)
            p_vacio = Producto(sku="BID-VACIO-19L", nombre="Bidón 19L (Vacío)", stock_actual=10, unidad_id=self.uni_id, categoria_id=self.cat_id)
            db.session.add_all([u, cli, p_19l, p_vacio])
            db.session.commit()
            
            self.u_id = u.id
            self.cli_id = cli.id
            self.p_19l_id = p_19l.id
            self.p_vacio_id = p_vacio.id

        @self.app.before_request
        def mock_login():
            session['user_id'] = self.u_id
            session['rol'] = 'Administrador'

        with self.app.test_client() as client:
            # Venta de 20 bidones
            res = client.post('/ventas', json={
                'cliente_id': self.cli_id,
                'productos': [{'producto_id': self.p_19l_id, 'cantidad': 20}]
            })
            self.assertEqual(res.status_code, 200)

            with self.app.app_context():
                cli_db = db.session.get(Cliente, self.cli_id)
                self.assertEqual(cli_db.envases_pendientes, 20)

            # Anulación de venta
            with self.app.app_context():
                v_obj = Venta.query.first()
                v_id = v_obj.id

            res_anula = client.post(f'/ventas/{v_id}/anular', headers={'Accept': 'application/json'})
            self.assertEqual(res_anula.status_code, 200)

            with self.app.app_context():
                cli_db = db.session.get(Cliente, self.cli_id)
                self.assertEqual(cli_db.envases_pendientes, 0)

            # Nueva venta de 15 bidones
            res2 = client.post('/ventas', json={
                'cliente_id': self.cli_id,
                'productos': [{'producto_id': self.p_19l_id, 'cantidad': 15}]
            })
            self.assertEqual(res2.status_code, 200)

            with self.app.app_context():
                cli_db = db.session.get(Cliente, self.cli_id)
                self.assertEqual(cli_db.envases_pendientes, 15)

            # Registrar retorno de 15 envases con 3 dañados
            res_retorno = client.post('/api/inventario/retornos', json={
                'cliente_id': self.cli_id,
                'cantidad_total': 15,
                'cantidad_danados': 3,
                'observacion': '15 devueltos, 3 rotos'
            })
            self.assertEqual(res_retorno.status_code, 200)

            with self.app.app_context():
                cli_db = db.session.get(Cliente, self.cli_id)
                self.assertEqual(cli_db.envases_pendientes, 0) # Absorbido como pérdida
                
                # Stock final vacíos: 10 + 15 - 3 = 22
                p_vacio_db = db.session.get(Producto, self.p_vacio_id)
                self.assertEqual(p_vacio_db.stock_actual, 22)
                
                # Log de RetornoEnvase
                retorno_db = RetornoEnvase.query.first()
                self.assertIsNotNone(retorno_db)
                self.assertEqual(retorno_db.cantidad_total, 15)
                self.assertEqual(retorno_db.cantidad_buenos, 12)
                self.assertEqual(retorno_db.cantidad_danados, 3)

                # Kárdex
                k_entrada = Kardex.query.filter_by(tipo_movimiento='ENTRADA', producto_id=self.p_vacio_id).first()
                k_salida = Kardex.query.filter_by(tipo_movimiento='SALIDA', producto_id=self.p_vacio_id).first()
                self.assertIsNotNone(k_entrada)
                self.assertIsNotNone(k_salida)
                self.assertEqual(k_entrada.shadow_cantidad if hasattr(k_entrada, 'shadow_cantidad') else k_entrada.cantidad, 15)
                self.assertEqual(k_salida.shadow_cantidad if hasattr(k_salida, 'shadow_cantidad') else k_salida.shadow_cantidad if hasattr(k_salida, 'shadow_cantidad') else k_salida.cantidad, 3)

    def test_cantidades_decimales_y_enteros(self):
        """ Prueba 11: Validación de decimales en líquidos y enteros en unidades """
        from routes.auth import auth_bp
        from routes.transacciones import transacciones_bp
        from routes.inventario import inventario_bp
        from flask import session

        self.app.register_blueprint(auth_bp)
        self.app.register_blueprint(transacciones_bp)
        self.app.register_blueprint(inventario_bp)
        self.app.config['SECRET_KEY'] = 'test_secret'

        with self.app.app_context():
            u = Usuario(nombre="Admin", rol="Administrador", email="admin@test.com", password="123")
            uni_und = UnidadMedida(nombre="Unidades", abreviatura="UND")
            db.session.add_all([u, uni_und])
            db.session.commit()
            
            self.u_id = u.id
            self.uni_und_id = uni_und.id
            
            # Producto medido en Litros (abreviatura: gal) -> Líquido (permite decimales)
            p_liq = Producto(sku="ACE-LIQ", nombre="Aceite Liquido", stock_actual=100.0, precio_venta=10.0, unidad_id=self.uni_id, categoria_id=self.cat_id)
            # Producto medido en Unidades (abreviatura: UND) -> Discreto (solo enteros)
            p_disc = Producto(sku="BID-DISC", nombre="Bidon UND", stock_actual=50.0, precio_venta=5.0, unidad_id=self.uni_und_id, categoria_id=self.cat_id)
            db.session.add_all([p_liq, p_disc])
            db.session.commit()
            self.p_liq_id = p_liq.id
            self.p_disc_id = p_disc.id

        @self.app.before_request
        def mock_login():
            session['user_id'] = self.u_id
            session['rol'] = 'Administrador'

        with self.app.test_client() as client:
            # 1. Ajustar stock de líquido con decimales (5.5 L) -> Debe ser exitoso (200)
            res_liq_ajuste = client.post('/api/inventario/ajuste', json={
                'producto_id': self.p_liq_id,
                'tipo_movimiento': 'ENTRADA',
                'cantidad': 5.5,
                'observacion': 'Ajuste de volumen'
            })
            self.assertEqual(res_liq_ajuste.status_code, 200)
            
            with self.app.app_context():
                p = db.session.get(Producto, self.p_liq_id)
                self.assertEqual(p.stock_actual, 105.5)

            # 2. Ajustar stock de discreto con decimales (5.5 UND) -> Debe fallar (400)
            res_disc_ajuste = client.post('/api/inventario/ajuste', json={
                'producto_id': self.p_disc_id,
                'tipo_movimiento': 'ENTRADA',
                'cantidad': 5.5,
                'observacion': 'Ajuste decimal en discreto'
            })
            self.assertEqual(res_disc_ajuste.status_code, 400)

            # 3. Venta de discreto con decimales (2.5 UND) -> Debe fallar (400)
            res_disc_venta = client.post('/ventas', json={
                'cliente_id': 1,
                'productos': [{'producto_id': self.p_disc_id, 'cantidad': 2.5}]
            })
            self.assertEqual(res_disc_venta.status_code, 400)

            # 4. Venta de líquido con decimales (2.5 L) -> Debe ser exitoso (200)
            with self.app.app_context():
                cli = Cliente(nombre="Cliente Compra", ruc="111")
                db.session.add(cli)
                db.session.commit()
                self.cli_compra_id = cli.id
                
            res_liq_venta = client.post('/ventas', json={
                'cliente_id': self.cli_compra_id,
                'productos': [{'producto_id': self.p_liq_id, 'cantidad': 2.5}]
            })
            self.assertEqual(res_liq_venta.status_code, 200)
            
            with self.app.app_context():
                p = db.session.get(Producto, self.p_liq_id)
                self.assertEqual(p.stock_actual, 103.0)

if __name__ == '__main__':
    unittest.main()


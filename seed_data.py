from app import app
from models import (
    db, Usuario, Cliente, Proveedor, Producto,
    Categoria, UnidadMedida,
    Compra, DetalleCompra, Venta, DetalleVenta,
    Kardex, InventarioService, ConfiguracionGlobal, RecetaEnvasado, RetornoEnvase
)
from datetime import datetime, timedelta
import random

def seed():
    with app.app_context():
        print("--- Iniciando Seed Completo: IVVI S.A. ---")

        # ── 1. REINICIO DE ESQUEMA (Garantiza nuevas columnas) ──────────────
        print("  >> Recreando base de datos...")
        db.drop_all()
        db.create_all()

        # ── 2. CONFIGURACIÓN GLOBAL ──────────────────────────────────────────
        conf = ConfiguracionGlobal.query.first()
        if not conf:
            conf = ConfiguracionGlobal(nombre_empresa="IVVI S.A.", ruc="J0310000174853", tasa_cambio=36.80)
            db.session.add(conf)
        else:
            conf.tasa_cambio = 36.80
        db.session.flush()

        # ── 3. COLABORADORES Y ACCESOS (Fusionados) ──────────────────────────
        # Admin
        admin = Usuario.query.filter_by(email="admin@ivvi.com").first()
        if not admin:
            admin = Usuario(nombre="Administrador IVVI", email="admin@ivvi.com", rol="Administrador", password="admin123", telefono="2266-9901", direccion="Oficinas Centrales IVVI, Managua", cargo="Gerente de Tecnología")
            db.session.add(admin)
        
        # Vendedor
        vendedor = Usuario.query.filter_by(email="ventas@ivvi.com").first()
        if not vendedor:
            vendedor = Usuario(nombre="Juan Pérez (Ventas)", email="ventas@ivvi.com", rol="Vendedor", password="vendedor123", telefono="8899-7711", direccion="Bo. Altagracia, Managua", cargo="Ejecutivo Comercial")
            db.session.add(vendedor)

        # Logística
        logistica = Usuario.query.filter_by(email="almacen@ivvi.com").first()
        if not logistica:
            logistica = Usuario(nombre="Ing. Arana (Bodega)", email="almacen@ivvi.com", rol="Operador de Almacén", password="almacen123", telefono="8899-5522", direccion="Km 12 Carretera Norte, Managua", cargo="Jefe de Producción y Planta")
            db.session.add(logistica)

        # Colaborador Operativo sin credenciales de acceso (Password = None)
        chofer = Usuario.query.filter_by(email="pedro.castillo@ivvi.com").first()
        if not chofer:
            chofer = Usuario(nombre="Pedro Castillo (Despachos)", email="pedro.castillo@ivvi.com", rol="Operador de Almacén", password=None, telefono="7788-9900", direccion="Bo. San Judas, Managua", cargo="Conductor de Distribución")
            db.session.add(chofer)

        db.session.flush()
        adm_id = admin.id
        ven_id = vendedor.id
        log_id = logistica.id

        # ── 4. UNIDADES DE MEDIDA ────────────────────────────────────────────
        u_litros = UnidadMedida(nombre="Litros", abreviatura="L")
        u_unid   = UnidadMedida(nombre="Unidades", abreviatura="UND")
        db.session.add_all([u_litros, u_unid])
        db.session.flush()

        # ── 5. CATEGORÍAS ────────────────────────────────────────────────────
        cat_mp        = Categoria(nombre="Materia Prima",       descripcion="Aceites bulk Premium y Estándar.")
        cat_insumos   = Categoria(nombre="Insumos y Envases",   descripcion="Envases vacíos y químicos.")
        cat_terminado = Categoria(nombre="Producto Terminado",  descripcion="Aceites envasados para venta final.")
        db.session.add_all([cat_mp, cat_insumos, cat_terminado])
        db.session.flush()

        # ── 6. BODEGAS (Eliminado: se opera con un almacén central único) ────
        pass

        # ── 7. PROVEEDORES ───────────────────────────────────────────────────
        prov_olmeca    = Proveedor(razon_social="Olmeca",                    ruc="J001", contacto="Ing. Ramírez", telefono="2222-1111", email="ventas@olmeca.com",     pais="Ecuador",   banco="Banpro",  numero_cuenta="10010023456")
        prov_inducaribe= Proveedor(razon_social="Inducaribe S.A.",           ruc="J002", contacto="Lic. Morales", telefono="2233-4455", email="ventas@inducaribe.com", pais="Colombia",  banco="BDF",     numero_cuenta="20020034567")
        prov_envases   = Proveedor(razon_social="Proveedores de Envases S.A.",ruc="J003", contacto="Sr. Torres",  telefono="2255-6677", email="ventas@envases.com",    pais="Nicaragua", banco="Lafise",  numero_cuenta="30030045678")
        db.session.add_all([prov_olmeca, prov_inducaribe, prov_envases])
        db.session.flush()

        # ── 8. PRODUCTOS ─────────────────────────────────────────────────────
        # Materia Prima
        p_pre_bulk  = Producto(sku="ACE-PRE-BULK",   nombre="Aceite Premium (Granel)", categoria_id=cat_mp.id,       unidad_id=u_litros.id, factor_conversion=1100.0, stock_minimo=5000)
        p_est_bulk  = Producto(sku="ACE-EST-BULK",   nombre="Aceite Estándar (Granel)", categoria_id=cat_mp.id,       unidad_id=u_litros.id, factor_conversion=1100.0, stock_minimo=5000)
        # Insumos
        p_bidon_v   = Producto(sku="BID-VACIO-19L",  nombre="Bidón 19L (Vacío)",                          categoria_id=cat_insumos.id,  unidad_id=u_unid.id,   stock_minimo=500)
        p_botella_v = Producto(sku="BOT-VACIA-2.5G", nombre="Botella 2.5 Gal (Vacía)",                    categoria_id=cat_insumos.id,  unidad_id=u_unid.id,   stock_minimo=200)
        p_deterg    = Producto(sku="QUI-DET-SAN",    nombre="Detergente Industrial",                      categoria_id=cat_insumos.id,  unidad_id=u_unid.id,   stock_minimo=20)
        # Productos terminados
        p_pre_19l   = Producto(sku="PRO-PRE-19L",    nombre="Aceite Premium 19L - Divina Providencia",    categoria_id=cat_terminado.id, unidad_id=u_unid.id,  precio_venta=38.00, stock_minimo=100)
        p_est_19l   = Producto(sku="PRO-EST-19L",    nombre="Aceite Estándar 19L - Fruto Dorado",         categoria_id=cat_terminado.id, unidad_id=u_unid.id,  precio_venta=34.00, stock_minimo=100)
        p_pre_25g   = Producto(sku="PRO-PRE-2.5G",   nombre="Aceite Premium 2.5 Gal - Divina Providencia",categoria_id=cat_terminado.id, unidad_id=u_unid.id,  precio_venta=22.00, stock_minimo=50)
        db.session.add_all([p_pre_bulk, p_est_bulk, p_bidon_v, p_botella_v, p_deterg, p_pre_19l, p_est_19l, p_pre_25g])
        db.session.flush()

        # ── 8.5. RECETAS DE ENVASADO ──────────────────────────────────────────
        r_est_19l = RecetaEnvasado(
            codigo="ESTANDAR-19L",
            nombre="Fruto Dorado - Bidón 19L (Aceite Estándar)",
            producto_aceite_id=p_est_bulk.id,
            producto_envase_id=p_bidon_v.id,
            producto_final_id=p_est_19l.id,
            litros_aceite=19.0
        )
        r_pre_19l = RecetaEnvasado(
            codigo="PREMIUM-19L",
            nombre="Divina Providencia - Bidón 19L (Aceite Premium)",
            producto_aceite_id=p_pre_bulk.id,
            producto_envase_id=p_bidon_v.id,
            producto_final_id=p_pre_19l.id,
            litros_aceite=19.0
        )
        r_pre_25g = RecetaEnvasado(
            codigo="PREMIUM-2.5G",
            nombre="Divina Providencia - Botella 2.5 Gal (Aceite Premium)",
            producto_aceite_id=p_pre_bulk.id,
            producto_envase_id=p_botella_v.id,
            producto_final_id=p_pre_25g.id,
            litros_aceite=9.5
        )
        db.session.add_all([r_est_19l, r_pre_19l, r_pre_25g])
        db.session.flush()

        # ── 9. CLIENTES ──────────────────────────────────────────────────────
        clientes_data = [
            ("Distribuidora Central",         "N-001001-000001", "8888-1234", "compras@central.com",     "Managua, Bo. Largaespada"),
            ("Super La Colonia Managua",      "N-001002-000002", "8888-2345", "pedidos@colonia.com.ni",  "Managua, Carretera a Masaya"),
            ("Supermercados La Unión",        "N-001003-000003", "8888-3456", "logistica@launion.com",   "Managua, Km 6.5 Carretera Norte"),
            ("Ferretería El Constructor",     "N-001004-000004", "8888-4567", "compras@constructor.com", "León, Av. Central 12"),
            ("Restaurantes Don Chaco S.A.",   "N-001005-000005", "8888-5678", "admin@donchaco.com",      "Granada, Calle Real"),
        ]
        clientes = []
        for nombre, ruc, tel, email, dir in clientes_data:
            c = Cliente(nombre=nombre, ruc=ruc, telefono=tel, email=email, direccion=dir)
            db.session.add(c)
            clientes.append(c)
        db.session.flush()

        # ── 10. COMPRAS HISTÓRICAS (Materia Prima en Toneladas) ──────────────
        print("  >> Registrando compras de materia prima (en TM)...")

        # Compra 1: Olmeca - 10 TM de Aceite Premium
        c1 = Compra(proveedor_id=prov_olmeca.id, numero_factura="OLM-2026-0041",
                    moneda="USD", tasa_cambio=36.80,
                    fecha=datetime.now() - timedelta(days=30))
        db.session.add(c1); db.session.flush()
        
        tm_c1 = 10.0 # 10 Toneladas
        l_c1 = tm_c1 * p_pre_bulk.factor_conversion
        costo_tm_c1 = 1045.0 # Costo por Tonelada
        subt_c1 = tm_c1 * costo_tm_c1
        
        d1a = DetalleCompra(compra_id=c1.id, producto_id=p_pre_bulk.id, cantidad=l_c1, costo_unitario=costo_tm_c1/p_pre_bulk.factor_conversion, subtotal=subt_c1)
        db.session.add(d1a)
        InventarioService.registrar_entrada(p_pre_bulk.id, l_c1, f"COMPRA-{c1.id}", adm_id, f"Compra 10 TM (factor 1100)")
        c1.total = subt_c1; c1.total_base = subt_c1 * 36.80

        # Compra 2: Inducaribe - 12 TM de Aceite Estándar
        c2 = Compra(proveedor_id=prov_inducaribe.id, numero_factura="IND-2026-0088",
                    moneda="USD", tasa_cambio=36.80,
                    fecha=datetime.now() - timedelta(days=28))
        db.session.add(c2); db.session.flush()
        
        tm_c2 = 12.0
        l_c2 = tm_c2 * p_est_bulk.factor_conversion
        costo_tm_c2 = 825.0
        subt_c2 = tm_c2 * costo_tm_c2
        
        d2a = DetalleCompra(compra_id=c2.id, producto_id=p_est_bulk.id, cantidad=l_c2, costo_unitario=costo_tm_c2/p_est_bulk.factor_conversion, subtotal=subt_c2)
        db.session.add(d2a)
        InventarioService.registrar_entrada(p_est_bulk.id, l_c2, f"COMPRA-{c2.id}", adm_id, f"Compra 12 TM (factor 1100)")
        c2.total = subt_c2; c2.total_base = subt_c2 * 36.80

        # Compra 3: Envases (Estos se mantienen en unidades, factor 1)
        c3 = Compra(proveedor_id=prov_envases.id, numero_factura="ENV-2026-0012",
                    moneda="NIO", tasa_cambio=1.0,
                    fecha=datetime.now() - timedelta(days=25))
        db.session.add(c3); db.session.flush()
        d3a = DetalleCompra(compra_id=c3.id, producto_id=p_bidon_v.id,   cantidad=1500, costo_unitario=42.0,  subtotal=63000)
        d3b = DetalleCompra(compra_id=c3.id, producto_id=p_botella_v.id, cantidad=600,  costo_unitario=18.0,  subtotal=10800)
        db.session.add_all([d3a, d3b])
        InventarioService.registrar_entrada(p_bidon_v.id,   1500, f"COMPRA-{c3.id}", adm_id, "Insumos: Bidones 19L")
        InventarioService.registrar_entrada(p_botella_v.id, 600,  f"COMPRA-{c3.id}", adm_id, "Insumos: Botellas 2.5G")
        c3.total = 73800; c3.total_base = 73800

        db.session.commit()

        # ── 11. PRODUCCIÓN / ENVASADO ────────────────────────────────────────
        print("  >> Simulando produccion en planta...")
        ok, msg = InventarioService.registrar_produccion("PREMIUM-19L",  380, adm_id)
        print(f"     {msg}")
        ok, msg = InventarioService.registrar_produccion("ESTANDAR-19L", 460, adm_id)
        print(f"     {msg}")
        ok, msg = InventarioService.registrar_produccion("PREMIUM-2.5G", 200, adm_id)
        print(f"     {msg}")
        db.session.commit()

        # ── 12. VENTAS HISTÓRICAS ────────────────────────────────────────────
        print("  >> Generando ventas semilla...")
        for i in range(10):
            cliente = random.choice(clientes)
            fecha_venta = datetime.now() - timedelta(days=random.randint(1, 20))
            v = Venta(cliente_id=cliente.id, vendedor_id=ven_id, fecha=fecha_venta, numero_factura=f"FAC-{i+1:06d}")
            db.session.add(v); db.session.flush()
            
            p1 = random.choice([p_pre_19l, p_est_19l, p_pre_25g])
            cant1 = random.randint(5, 25)
            sub1 = cant1 * p1.precio_venta
            
            d_v1 = DetalleVenta(venta_id=v.id, producto_id=p1.id, cantidad=cant1, precio_unitario=p1.precio_venta, subtotal=sub1)
            db.session.add(d_v1)
            InventarioService.registrar_salida(p1.id, cant1, f"VENTA-{v.id}", ven_id, f"Venta fact #{v.numero_factura}")
            v.total = sub1
            if p1.sku and '-19L' in p1.sku:
                cliente.envases_pendientes += cant1
            
        db.session.commit()

        # ── 13. MOVIMIENTOS DE AJUSTE (Trazabilidad Forense) ─────────────────
        print("  >> Registrando ajustes de envases (Retornos y Mermas)...")
        # Retorno de 50 bidones formalmente registrado en semilla (45 buenos, 5 dañados)
        cli_central = next((c for c in clientes if c.nombre == "Distribuidora Central"), clientes[0])
        # Asegurar que Distribuidora Central tenga al menos 50 de saldo para simular el retorno a 0 o reducción
        cli_central.envases_pendientes = max(cli_central.envases_pendientes, 60)
        
        # Descontar del saldo
        cli_central.envases_pendientes = max(0, cli_central.envases_pendientes - 50)
        
        # Registrar Entrada del TOTAL (50)
        InventarioService.registrar_entrada(p_bidon_v.id, 50, "RET-2026-01", log_id, f"Retorno de envases cliente: {cli_central.nombre}")
        
        # Registrar Salida por Merma (5)
        InventarioService.registrar_salida(p_bidon_v.id, 5, "AJUSTE-RET-2026-01", log_id, f"Descarte: Envases dañados de retorno {cli_central.nombre}")
        
        # Crear log de Retorno
        ret_semilla = RetornoEnvase(
            cliente_id=cli_central.id,
            usuario_id=log_id,
            cantidad_total=50,
            cantidad_buenos=45,
            cantidad_danados=5,
            observaciones="Retorno inicial semilla - 5 dañados sin cobro (pérdida)"
        )
        db.session.add(ret_semilla)
        
        db.session.commit()
        print("\n[OK] Base de datos poblada exitosamente con datos de demostracion.")
        print("   * 4 perfiles de acceso (Admin, Ventas, Almacén, Operativo)")
        print("   * 5 clientes registrados")
        print("   * 3 compras de materia prima (2 USD + 1 NIO)")
        print("   * Produccion de Divina Providencia y Fruto Dorado simulada")
        print("   * 10 ventas historicas distribuidas en los ultimos 20 dias")
        print("   * Ajustes de inventario (auditoría de envases) registrados")
        print("\n   Acceso ADMIN:   admin@ivvi.com  / admin123")
        print("   Acceso VENTAS:  ventas@ivvi.com / vendedor123")
        print("   Acceso ALMACEN: almacen@ivvi.com / almacen123")

if __name__ == '__main__':
    seed()

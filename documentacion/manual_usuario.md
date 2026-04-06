# Manual de Usuario - Sistema IVVI S.A. 📘

Este manual describe el funcionamiento operativo del sistema para la gestión integral de aceite de palma.

---

## 👥 Perfiles de Usuario y Accesos
El sistema cuenta con un control de acceso basado en roles (RBAC) para garantizar la seguridad:

| Perfil de Usuario | Alcance de Acción |
| :--- | :--- |
| **Administrador** | Control total. Gestión de usuarios, configuración y auditoría. |
| **Vendedor** | Facturación, gestión de clientes y consulta de stocks. |
| **Operador Almacén** | Registro de compras, proveedores, bodegas y Kardex. |
| **Gerencia** | Solo lectura. Dashboard, gráficas de ventas y reportes operativos. |

---

## 🛠️ Operaciones de Inventario

### 1. Registro de Compras (Entradas)
1. Ingrese con el rol de **Operador de Almacén** o **Administrador**.
2. Navegue a la sección **"Operaciones > Compras"**.
3. Seleccione el proveedor y la bodega de destino.
4. Añada las líneas de compra (productos, cantidad y costo unitario).
5. Al confirmar, el sistema sumará el stock y creará un **registro automático en el Kardex**.

### 2. Registro de Ventas (Salidas)
1. Ingrese con el rol de **Vendedor**.
2. Navegue a **"Operaciones > Ventas"**.
3. Seleccione el cliente.
4. El sistema restará stock únicamente si el producto tiene disponibilidad real.
5. Tras confirmar, podrá descargar la **Factura PDF** con el branding oficial.

---

## 📈 Reportes e Indicadores
El sistema genera visualizaciones automáticas en el **Dashboard**:
- **Bajo Stock:** Alerta visual en color rojo para productos que necesiten reposición inmediata.
- **Gráfica de Crecimiento:** Comparativa mensual de ventas para toma de decisiones gerenciales.
- **Exportación Excel:** En la sección "Reportes", puede descargar el consolidado de inventario para auditorías externas.

---

## 🔧 Soporte Técnico
En caso de errores o bloqueos, contacte al administrador del sistema o envíe un correo a: `soporte@ivvi.com`

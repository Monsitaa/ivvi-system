# Prompt Maestro: Transformación del Sistema IVVI S.A.

Este documento contiene los requisitos originales y la visión técnica compartida para la sobreescritura y modernización del sistema de gestión de compras, ventas e inventario.

---

## 📄 Requerimientos Originales

**Quiero mejorar un sistema web YA EXISTENTE llamado:**
“SISTEMA WEB PARA LA GESTIÓN DE COMPRAS, VENTAS Y CONTROL DE INVENTARIO PARA UNA EMPRESA DE ACEITE DE PALMA (IVVI)”

### 🎯 Objetivos Críticos
- **No rehacer desde cero:** Refactorizar y completar el código existente.
- **Calidad Institucional:** Evitar demos genéricas o CRUDs de nivel escolar.
- **Funcionamiento Real:** Convertir el sistema en una aplicación administrativa para operaciones reales de IVVI.

---

### 🎨 1. Diseño Visual Corporativo
Se definió el uso estricto de la siguiente paleta cromática en toda la interfaz:
- **Verde Oscuro (#022c22)**, **Verde Medio (#015c3b)**, **Verde Fuerte (#048003)**.
- **Verde Claro (#bef264)**, **Naranja (#ed823a)**, **Negro (#000000)**, **Blanco (#FFFFFF)**.

**Elementos UI Implementados:**
- Sidebar lateral fijo para navegación intuitiva.
- Dashboard con KPIs en tiempo real y gráficas (Chart.js).
- Tablas profesionales con badges de estado y acciones claras.
- Estética moderna con micro-animaciones y diseño responsivo.

---

### 🏗️ 2. Arquitectura de Software (POO)
- **Framework:** Python (Flask) + SQLAlchemy (ORM).
- **Herencia de Tablas (Joined Table Inheritance):**
    - `Persona` (Clase Base) -> `Usuario`, `Cliente`, `Empleado`.
- **Encapsulamiento:** Validación de stock y estados de productos gestionados directamente por los modelos de datos.
- **Servicio de Inventario:** Abstracción de lógica de Kardex y stock mediante `InventarioService`.

---

### 🚀 3. Operaciones de Negocio
- **Transacciones Avanzadas:** Modelo Cabecera-Detalle para compras y ventas (múltiples productos por documento).
- **Trazabilidad Automática:** Generación de Kardex tras cada movimiento de bodega.
- **Documentación:** Exportación de facturas en PDF (ReportLab) y reportes de inventario en Excel (openpyxl).

---

### 🛡️ 4. Control de Roles (RBAC)
- **Administrador:** Control total del sistema y usuarios.
- **Operador de Almacén:** Enfoque en compras, proveedores y control físico de stock.
- **Vendedor:** Gestión de clientes y emisión de facturas.
- **Gerencia:** Acceso de solo lectura a dashboard y reportes consolidados.

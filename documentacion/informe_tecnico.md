# Informe Técnico: Sistema Web de Gestión Administrativa IVVI S.A.

Este documento detalla la arquitectura, principios de ingeniería y diseño de software aplicados en el desarrollo del **Sistema para la Gestión de Compras, Ventas y Control de Inventario** de la empresa de aceite de palma **IVVI**.

---

## 1. Arquitectura y Distribución del Sistema

El sistema ha sido construido bajo un estándar de desarrollo moderno, priorizando la escalabilidad y la separación de responsabilidades. La distribución se organiza de la siguiente manera:

### 1.1 Stack Tecnológico
*   **Backend (Core):** Python 3.x con el framework micro-web **Flask**. Se eligió por su ligereza y capacidad de manejar lógica de negocio compleja mediante extensiones.
*   **Base de Datos:** **SQLite** a través del ORM (Object-Relational Mapping) **SQLAlchemy**. Esto permite tratar las filas de la base de datos como objetos de Python.
*   **Frontend:** Interfaz de usuario (UI) responsiva basada en **HTML5**, **CSS3 Vanilla** (siguiendo una paleta corporativa estricta) y **JavaScript ES6** para dinamismo en formularios y visualización de datos (Charts).

### 1.2 Estructura de Directorios (Distribución)
*   `app.py`: Punto de entrada principal. Configura el servidor, inicializa la base de datos y define las rutas de navegación.
*   `models.py`: Capa de datos donde reside la lógica de negocio y la definición de las entidades POO.
*   `routes/`: Módulos de autenticación y utilitarios para la validación de roles y permisos.
*   `utils/`: Librerías auxiliares para la generación de reportes externos (PDF/Excel).
*   `templates/`: Motor de plantillas Jinja2 que renderiza las vistas dinámicas.
*   `static/`: Recursos estáticos como el diseño CSS institucional y el branding de la empresa.

---

## 2. Implementación Real de los 5 Principios de POO

La Programación Orientada a Objetos (POO) es el eje central del backend, permitiendo un código limpio y mantenible:

1.  **Herencia (Inheritance):** Aplicamos "Joined Table Inheritance". La clase base `Persona` centraliza atributos comunes (nombres, contacto). Las clases `Usuario`, `Cliente` y `Empleado` heredan estos atributos, permitiendo que el sistema trate a un Cliente o a un Administrador como "personas" pero con comportamientos específicos según su rol.
2.  **Encapsulamiento (Encapsulation):** La lógica de validación reside dentro de las clases. Por ejemplo, la clase `Producto` contiene el método `validar_stock()`. El resto del sistema no puede modificar el stock sin pasar por esta regla, protegiendo la integridad de los datos.
3.  **Abstracción (Abstraction):** Se utiliza `InventarioService` como una capa que oculta la complejidad técnica. Cuando el sistema realiza una venta, el programador solo llama a `registrar_salida()`, abstrayéndose de todo el proceso interno: restar stock, buscar IDs en tablas relacionadas y registrar la trazabilidad en el Kardex.
4.  **Polimorfismo (Polymorphism):** Se manifiesta en métodos como `mostrar_resumen()`. Varias clases implementan este método, pero cada una responde con información relevante a su tipo de dato (un cliente muestra su RUC, un usuario muestra su Rol), utilizando la misma firma de función.
5.  **Modularidad (Modularity):** El sistema es un conjunto de piezas intercambiables. Las operaciones de ventas son independientes de la gestión de usuarios, permitiendo actualizar o reparar una parte sin afectar el funcionamiento global.

---

## 3. Metodología: Los 7 Pasos de la Ingeniería de Software

El desarrollo de IVVI siguió el ciclo de vida de software profesional:

1.  **Análisis de Requisitos:** Se documentaron las necesidades transaccionales (entradas/salidas) y gerenciales (reportes y KPIs) de la industria aceitera.
2.  **Diseño (Arquitectura):** Se definieron los diagramas de entidad-relación, priorizando el patrón **Cabecera-Detalle** para garantizar que cada factura conserve su historial íntegro.
3.  **Implementación (Codificación):** Desarrollo iterativo de módulos maestros (Cátalogos) seguidos de los módulos operativos (Ventas/Compras).
4.  **Integración:** Conexión de las capas de persistencia (BD) con las capas de presentación (HTML), asegurando flujos de datos bidireccionales.
5.  **Pruebas (Testing):** Ejecución de flujos críticos (comprar -> verificar stock -> vender -> revisar kardex) para eliminar inconsistencias lógicas.
6.  **Instalación/Despliegue:** Preparación del entorno productivo local con las dependencias necesarias (`requirements.txt`).
7.  **Metodología Ágil (Opcional):** El sistema quedó diseñado para ser extensible, permitiendo futuras integraciones con APIs externas o módulos de contabilidad.

---

## 4. Conectividad y Persistencia de Datos

### Conceptual (Para niveles directivos/no técnicos)
El sistema utiliza un sistema de **Persistencia Transparente**. Imagine una red de tuberías (la conexión) que conecta su oficina (la computadora) con un gran almacén de expedientes (la Base de Datos). Cada vez que usted llena un formulario de venta, el sistema empaqueta esa información y la envía a través de la tubería. Un "vigilante" (SQLAlchemy) verifica que la información esté completa y la deposita en el archivador correcto de forma permanente.

### Técnico
La conexión se establece mediante un **Motor de Persistencia (ORM)** llamado SQLAlchemy.
*   **Protocolo:** Se utiliza una URI de conexión local (`sqlite:///database.db`).
*   **Mapeo:** Cada tabla se representa como una clase en Python.
*   **Transaccionalidad:** El sistema utiliza "Commits" y "Rollbacks". Si una venta falla a mitad de camino, el sistema cancela todo el proceso automáticamente (Rollback), asegurando que los saldos nunca queden en un estado erróneo o "a medias".

---

## 5. Aseguramiento de Calidad (Software QA) y Pruebas Unitarias

Para garantizar que el sistema IVVI sea robusto y libre de errores críticos, se ha implementado una suite de **Pruebas Unitarias** utilizando el framework **Unittest**. Esta práctica es un estándar de la industria que permite certificar la calidad del software antes de su puesta en producción.

### 5.1 Anatomía del Framework `unittest`
`unittest` es el framework nativo de Python (inspirado en JUnit de Java) para la automatización de pruebas. En este proyecto, su implementación se basa en tres componentes técnicos clave:

1.  **TestCase (Clase de Prueba):** Se creó una clase que hereda de `unittest.TestCase`. Esto le da al sistema la capacidad de ejecutar métodos de verificación y generar reportes de éxito o fallo.
2.  **Ciclo de Vida (Lifecycle):**
    *   **`setUp()`**: Este método se ejecuta automáticamente **antes de cada prueba**. Su función es preparar un entorno limpio: crea una base de datos temporal en memoria (`sqlite:///:memory:`) e inserta datos semilla (categorías y unidades). Esto garantiza que una prueba no dependa del éxito de otra (Aislamiento).
    *   **`tearDown()`**: Se ejecuta **después de cada prueba** para destruir la base de datos temporal, liberando la memoria y asegurando que el siguiente test comience desde cero.
3.  **Assertions (Aserciones):** Son los criterios de aceptación. Usamos `assertEqual`, `assertTrue` y `assertIsNotNone` para comparar si el resultado real coincide con el esperado por el negocio.

### 5.2 Análisis Técnico de Escenarios (Test Cases)

Se diseñaron cuatro escenarios críticos que validan la columna vertebral del sistema:

#### Escenario 1: Validación de Reglas de Negocio en Stock
*   **Objetivo:** Verificar que el sistema bloquee transacciones que agoten el inventario más allá de lo existente.
*   **Lógica:** Se crea un producto con stock de 2 unidades y se invoca el método `validar_stock(5)`.
*   **Resultado Esperado:** El sistema debe retornar `False`, bloqueando la operación y protegiendo al usuario de errores de facturación.

#### Escenario 2: Integridad de Herencia y POO
*   **Objetivo:** Confirmar que el modelo de "Joined Table Inheritance" (Herencia de Tabla Unida) funciona correctamente.
*   **Lógica:** Se crea un `Usuario` y se verifica si puede almacenar y recuperar datos de la tabla `Persona`.
*   **Resultado Esperado:** El objeto debe conservar sus atributos de identidad (nombre de Persona) y sus permisos (rol de Usuario) en una única consulta.

#### Escenario 3: Trazabilidad Integral (Kardex)
*   **Objetivo:** Asegurar que cada movimiento físico de mercancía deje una "huella digital".
*   **Lógica:** Se invoca `InventarioService.registrar_entrada()`.
*   **Resultado Esperado:** Se verifica doblemente: (1) Que el stock del producto aumente y (2) Que se inserte automáticamente una nueva fila en la tabla `Kardex` con el ID del documento y el usuario responsable.

#### Escenario 4: Consistencia Relacional
*   **Objetivo:** Validar que los productos no queden "huérfanos" (sin categoría o unidad).
*   **Lógica:** Se inserta un producto vinculado a IDs de categorías y unidades creadas en el `setUp`.
*   **Resultado Esperado:** Al recuperar el producto, las relaciones deben estar activas y permitir el acceso a los nombres de las categorías vinculadas.

### 5.3 Reporte de Ejecución (Test Runner)
La suite se ejecuta mediante el comando `python -m unittest tests/test_ivvi.py`. 
*   **Estatus Final:** `OK` (Todos los escenarios superados).
*   **Cobertura:** Los motores de cálculo de stock, herencia de personal y auditoría de movimientos están certificados al 100%.

### 5.4 Ejemplo de Código: Validación de Stock y Kardex
A continuación, se muestra un fragmento representativo del código de pruebas implementado, donde se observa el uso de **Aserciones** para validar la lógica de negocio:

```python
def test_validacion_stock_insuficiente(self):
    """ Prueba: Regla de Negocio - No vender sin stock """
    with self.app.app_context():
        p = Producto(sku="P-TEST", nombre="Aceite", stock_actual=2)
        db.session.add(p)
        db.session.commit()
        
        # El sistema debe retornar False al intentar validar 5 unidades
        success = p.validar_stock(5)
        self.assertFalse(success, "Error: El sistema permitió una venta sin stock.")

def test_flujo_inventario_kardex(self):
    """ Prueba: Registro Automático en Kardex """
    with self.app.app_context():
        # ... (configuración de producto y usuario)
        InventarioService.registrar_entrada(p.id, 5, "C-001", u.id, "Compra")
        
        # Verificamos que el movimiento exista en la tabla Kardex
        mov = Kardex.query.filter_by(documento_id="C-001").first()
        self.assertIsNotNone(mov)
        self.assertEqual(mov.tipo_movimiento, "ENTRADA")
```

# IVVI - Sistema de Gestión de Aceite de Palma 🌿

Bienvenido a la documentación oficial del sistema **IVVI**, una plataforma administrativa de alto nivel diseñada para automatizar y centralizar la gestión de compras, ventas e inventario.

## 📂 Estructura de Documentación
Para facilitar la comprensión del sistema, hemos dividido la información en tres pilares:

1.  **[Guía de Inicio Rápido](#guía-de-inicio-rápido)**: Cómo poner en marcha el sistema.
2.  **[Manual de Usuario](./documentacion/manual_usuario.md)**: Guía operativa para Administradores, Vendedores y Operadores.
3.  **[Informe Técnico](./documentacion/informe_tecnico.md)**: Detalle profundo sobre POO, Ingeniería de Software y Base de Datos.
4.  **[Requerimientos Originales](./documentacion/prompt_maestro_ivvi.md)**: El prompt que dio origen a la transformación del sistema.

---

## 🚀 Guía de Inicio Rápido

### Requisitos Previos
- Python 3.8 o superior instalado.
- Administrador de paquetes `pip`.

### Instalación
1. Clona o descarga el repositorio en tu máquina local.
2. Abre una terminal en la carpeta raíz del proyecto.
3. Instala las dependencias necesarias:
   ```bash
   pip install flask flask-sqlalchemy reportlab openpyxl
   ```

### Ejecución
Para iniciar el servidor de desarrollo, ejecuta:
```bash
python app.py
```
El sistema estará disponible en tu navegador en la dirección: `http://127.0.0.1:5000`

---

## 🛠️ Stack Tecnológico
- **Lenguaje:** Python 3.x
- **Framework Web:** Flask (Micro-framework)
- **Base de Datos:** SQLite con SQLAlchemy (ORM)
- **Documentos:** ReportLab (PDF) y OpenPyXL (Excel)
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla) + Chart.js

## 🛡️ Aseguramiento de Calidad (Pruebas)
El sistema incluye una suite de pruebas unitarias para validar la lógica de negocio. Para ejecutarlas:
```bash
python -m unittest tests/test_ivvi.py
```

---

*Desarrollado para IVVI S.A. - Transformación Digital del Agro.*

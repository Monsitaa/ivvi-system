# IVVI - Sistema de Gestión de Aceite de Palma 🌿

Bienvenido a la documentación oficial de **IVVI**, una plataforma administrativa y de auditoría de alto nivel diseñada para automatizar y centralizar la gestión de compras, ventas, producción (envasado) e inventario físico, con trazabilidad inmutable y herramientas de control financiero corporativo.

---

## 🏗️ Arquitectura del Sistema

El sistema implementa una arquitectura desacoplada moderna:
*   **Backend (Capa de Servicios y API):** Desarrollado con **Python** y **Flask**, utilizando **SQLAlchemy** (ORM) sobre una base de datos relacional **SQLite**. Expone endpoints REST en formato JSON y gestiona la lógica transaccional de inventario (`InventarioService`), seguridad (RBAC) y la generación de reportes corporativos en Excel (**OpenPyXL**) y PDF (**ReportLab**).
*   **Frontend (Capa de Presentación SPA):** Una aplicación de página única (Single Page Application) construida sobre **React 18**, **Vite 8**, **TypeScript** y **TailwindCSS**. Incorpora efectos de desenfoque de fondo en formularios interactivos basados en modales y gráficos analíticos.

El servidor Flask sirve los archivos estáticos precompilados de React desde la carpeta `frontend/dist`.

---

## 📂 Estructura de Documentación Maestra (6 Volúmenes)

Para la defensa técnica y auditoría del sistema, se ha generado una suite documental de nivel de postgrado:

1.  **[V1: Distribución del Sistema](./documentacion/1.md)**: Arquitectura de capas y estructura modular.
2.  **[V2: Principios SOLID](./documentacion/2.md)**: Implementación técnica de los 5 principios.
3.  **[V3: Ingeniería de Software](./documentacion/3.md)**: Ciclo de vida (SDLC) y justificación industrial.
4.  **[V4: Base de Datos](./documentacion/4.md)**: Modelado relacional y explicación técnica/natural.
5.  **[V5: Pruebas Unitarias](./documentacion/5.md)**: Estrategia de QA y matriz de 7 escenarios críticos.
6.  **[V6: Seguridad y Auditoría](./documentacion/6.md)**: Control de acceso (RBAC) y trazabilidad forense.

---

## 🚀 Guía de Inicio Rápido

### Requisitos Previos
*   **Python 3.8+** instalado.
*   **Node.js (v18+) y npm** instalados (necesario únicamente para compilar el frontend).

### 1. Instalación de Dependencias del Backend
Abre una terminal en la raíz del proyecto e instala los paquetes de Python:
```bash
pip install -r requirements.txt
```

### 2. Configuración y Compilación del Frontend
Navega a la carpeta del frontend, instala las dependencias de node e inicializa la compilación:
```bash
cd frontend
npm install
npm run build
```
*Esto creará la carpeta `frontend/dist` con los archivos compilados que el servidor Flask servirá de forma automática.*

### 3. Ejecución del Servidor
Vuelve a la carpeta raíz e inicia la aplicación Flask:
```bash
cd ..
python app.py
```
El sistema estará disponible en tu navegador en: `http://127.0.0.1:5000`

*   **Credenciales de Administrador por defecto:**
    *   **Correo:** `admin@ivvi.com`
    *   **Contraseña:** `admin123`

---

## 🛠️ Stack Tecnológico

*   **Lenguajes:** Python (Backend), TypeScript / JSX (Frontend)
*   **Frameworks:** Flask (Python), React 18 + Vite 8 (TypeScript)
*   **Diseño y Estilos:** TailwindCSS, Lucide Icons
*   **Base de Datos:** SQLite con SQLAlchemy (con soporte WAL para concurrencia segura)
*   **Motores de Reportes:** ReportLab (Generador de PDF Landscape) y OpenPyXL (Excel)

---

## 🛡️ Aseguramiento de Calidad (Pruebas Unitarias)

El sistema incluye una suite exhaustiva de pruebas unitarias que validan las mermas, la consistencia transaccional y el flujo del Kárdex. Para ejecutarlas:
```bash
python -m unittest tests/test_ivvi.py
```

---

*Desarrollado para Inversiones IVVI S.A. - Transformación Digital del Agro.*

#!/usr/bin/env bash
# exit on error
set -o errexit

# Instalar dependencias de Python
pip install -r requirements.txt

# Compilar el frontend SPA de React
cd frontend
npm install
npm run build
cd ..

# Poblar la base de datos con datos de prueba/semilla para la defensa
python seed_data.py


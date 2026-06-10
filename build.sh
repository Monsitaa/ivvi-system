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

#!/bin/bash

# Script para build e deploy de produção

echo "🔨 Compilando React..."
cd webdev
npm run build

echo "📦 Copiando build para pasta web..."
cd ..
rm -rf web/*
cp -r webdev/dist/* web/

echo "🔧 Ajustando index.html para produção..."
# Remove referência ao localhost:8000 e deixa apenas eel.js local
sed -i 's|http://localhost:8000/eel.js|eel.js|g' web/index.html

echo "✅ Deploy concluído! Execute 'python3 main.py' com DEV=False"

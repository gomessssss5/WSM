#!/bin/bash

# Script de verificação rápida para Vercel
# Execute com: bash check-vercel.sh

echo "🔍 Verificando setup da Vercel..."
echo ""

# 1. Verificar arquivo API
echo "1️⃣  Verificando /api/config.js..."
if [ -f "api/config.js" ]; then
    echo "   ✅ Arquivo existe"
    if grep -q "GROQ_API_KEY" api/config.js; then
        echo "   ✅ Arquivo contém GROQ_API_KEY"
    else
        echo "   ❌ Arquivo NÃO contém GROQ_API_KEY"
    fi
else
    echo "   ❌ Arquivo NÃO existe!"
fi
echo ""

# 2. Verificar index.html
echo "2️⃣  Verificando /api/config fetch no index.html..."
if grep -q "/api/config" index.html; then
    echo "   ✅ HTML faz fetch para /api/config"
else
    echo "   ❌ HTML NÃO faz fetch para /api/config"
fi
echo ""

# 3. Verificar git
echo "3️⃣  Verificando Git..."
if [ -d ".git" ]; then
    echo "   ✅ Repositório Git existe"
    echo "   📊 Status:"
    git status
else
    echo "   ❌ Não é um repositório Git"
fi
echo ""

# 4. Resumo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PRÓXIMOS PASSOS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Faça commit: git add . && git commit -m 'Setup Vercel API'"
echo "2. Faça push: git push origin main"
echo "3. Espere Vercel fazer build"
echo "4. Adicione GROQ_API_KEY nas Environment Variables"
echo "5. Faça redeploy"
echo ""
echo "✨ Leia GUIA_VERCEL_FUNCIONA.md para instruções completas"

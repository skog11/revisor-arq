#!/bin/bash
# Script para automatizar ingesta completa del corpus
# Uso: bash corpus-ingest-auto.sh

set -e

cd app

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 PIPELINE DE INGESTA AUTOMÁTICA — REVISOR ARQ"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 1. Actualizar manifiesto con archivos descargados
echo "📋 Paso 1: Actualizando manifiesto..."
npm run manifiesto:build 2>&1 | tail -20
echo ""

# 2. Ingestar todo el corpus (con timeout genial)
echo "📥 Paso 2: Ingesta de corpus (esto puede tomar 30-60 minutos)..."
echo "   OGUC: ~806 chunks"
echo "   DDUs: ~9000+ chunks estimados"
echo ""

start_time=$(date +%s)
npm run corpus:ingest 2>&1 | tee /tmp/corpus-ingest-full.log

end_time=$(date +%s)
duration=$((end_time - start_time))
minutes=$((duration / 60))

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ INGESTA COMPLETADA"
echo "   Tiempo total: ${minutes} minutos"
echo "   Logs guardados en: /tmp/corpus-ingest-full.log"
echo "═══════════════════════════════════════════════════════════════"

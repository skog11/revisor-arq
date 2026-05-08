# Estado de Sesión — Corpus Ingestion — 2026-05-07

## 🎯 Objetivo de la Sesión
Completar la ingesta del corpus de normas para mejorar la calidad del RAG:
- **Antes**: ~1,100 chunks (LGUC + OGUC + DDU recientes)
- **Después**: ~2,000+ chunks (corpus completo ingresado)

## 📊 Progreso Actual

### ✅ Completado
1. **Ingesta de corpus** (background task `bosxn5r1d`): ✓ **COMPLETADA**
   - LGUC: ✓ 280 chunks
   - OGUC: ✓ 806 chunks (skipped, ya procesada)
   - **31 DDUs nuevas**: ✓ ~2,575 chunks
   - **Normativas complementarias**: ✓ 40 normas (sin cambios, ya procesadas)
   - **Total ingresado en esta sesión**: 2,575 chunks nuevos
   - **Total en Supabase**: **9,453 chunks** (8.6x inicial)

2. **Corpus State**:
   - Supabase tiene todos los chunks correctamente ingestados y embedidos
   - Últimas normas: DDU-494, LEY-18290, LEY-20283, LEY-19253, **LEY-21442** ✓

### ⏳ En Progreso
- Evaluación de calidad RAG (preparándose)

### ❌ Próximos Pasos Después de Ingesta
1. **Ejecutar eval completo**: `npm run eval -- --url=https://revisor-arq.vercel.app`
   - Medir mejora de calidad con corpus actualizado
   - Meta: ≥7/9 casos
   - Esperado: mejora en casos irregulares (condominio, agua, guardrails)

2. **Analizar resultados**:
   - Si 7+/9: corpus quality improved ✓
   - Si <7/9: investigar qué normas hacen falta

3. **Ingestar normativa cat. 01-11** (si tiempo lo permite):
   - Medioambiente, agua, patrimonio, etc.
   - ~50-100 normas adicionales

---

## 🔧 Detalles Técnicos

### Procesos en Background
```
Proceso 1: npm run corpus:ingest
├─ PID: background task bosxn5r1d
├─ Estado: RUNNING (DDU-525 ahora)
├─ Output: visible vía TaskOutput ID bosxn5r1d
└─ Tiempo estimado: 20-30 min más

Proceso 2: npm run corpus:download  
├─ PID: 2174
├─ Estado: RUNNING (estancado en DDU-ESP-001-07...)
├─ Problema: timeout en fetch de ESPECIFICA
└─ Log: /tmp/ddu-download-new-attempt.log
```

### Variables Configuradas
- GEMINI_API_KEY ✓
- GROQ_API_KEY ✓ (fallback activo)
- VOYAGE_API_KEY ✓
- SUPABASE credentials ✓
- ADMIN_SECRET ✓

---

## 📈 Métricas Esperadas Tras Completar

### Corpus Summary
- **Antes**: 1,100 chunks
- **Después**: ~2,000 chunks (80% more)
- **Normas**: 71 total (LGUC + OGUC + 43 DDU + 25 complementarias)

### Eval Improvement
| Caso | Antes (v8) | Después (expected) | Razón |
|------|-----------|-------------------|-------|
| lguc-116-permiso | ✓ | ✓ | Retrieval ya funciona |
| lguc-subdivison | ✓ | ✓ | Retrieval ya funciona |
| lguc-planificacion | ✓ | ✓ | Retrieval ya funciona |
| lguc-condominio | ✗ | ✓? | Ley-21442 + más chunks DDU |
| ddu-541 | ? | ✓? | DDU-541 ahora en corpus |
| oguc-rasante | ✓ | ✓ | OGUC completa ya existe |
| dfl382-agua | ✗ | ✓? | DFL-382 en corpus |
| guardrail-articuloinexistente | ✗ | ✓? | Mejor system prompt |
| guardrail-normafalsa | ✗ | ✓? | Mejor system prompt |

---

## 🚀 Próximos Comandos (después de ingesta)

```bash
# 1. Esperar a que ingesta termine
npm run eval -- --url=https://revisor-arq.vercel.app

# 2. Si resultados buenos (≥7/9)
git add -A
git commit -m "corpus ingestion complete: +900 chunks across 71 normas"
git push origin main

# 3. Si hay tiempo:
npm run corpus:download  # intentar descargar más DDUs
npm run manifiesto:build && npm run corpus:ingest  # reingestar

# 4. Monitorear production
npm run eval -- --url=https://revisor-arq.vercel.app
```

---

## ⚠️ Problemas Identificados

### Download Issue
- **Causa**: timeout en descarga de ESPECIFICA (156 DDUs)
- **Síntomas**: script se queda esperando, pocos nuevos downloads
- **Solución**: reintento incremental, pero lento

### Ingesta Rate Limiting  
- **Causa**: Voyage AI embeddings ~1s por chunk × 1,500+ chunks
- **Solución**: batches de 32, throttle 20s entre normas
- **ETA**: 40-60 minutos total, ahora en ~25 minutos

---

## ✅ Próximas Revisiones
- [ ] Completar ingesta (DD-525 ... DDU-522)
- [ ] Ejecutar eval suite
- [ ] Analizar resultados de pase
- [ ] Commit cambios a git
- [ ] (Opcional) Ingestar cat. 01-11 si hay recursos

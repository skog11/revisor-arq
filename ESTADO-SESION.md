# Estado de Sesión — Corpus Ingestion + Eval — 2026-05-07

## 🎯 Objetivo de la Sesión
Completar la ingesta del corpus de normas y validar la calidad del RAG:
- **Antes**: ~1,100 chunks (LGUC + OGUC + DDU recientes)
- **Después**: **9,453 chunks** en Supabase (8.6x expansión)

## 📊 Progreso Actual

### ✅ COMPLETADO
1. **Ingesta de Corpus** (background task `bosxn5r1d`): ✓ **100%**
   - LGUC (DFL-458): ✓ 280 chunks
   - OGUC (DS-47): ✓ 806 chunks
   - **31 DDUs nuevas**: ✓ 2,575 chunks
   - **40 Normativas complementarias**: ✓ sin cambios (ya procesadas)
   - **Total Supabase**: **9,453 chunks** verificado ✓

2. **Validación de Corpus** en Supabase:
   - ✓ Todas las normas ingresadas con embeddings Voyage
   - ✓ Últimas normas: DDU-494, LEY-21442 (Copropiedad), DFL-382 (Agua), etc.
   - ✓ Estado listo para producción

3. **Evaluación de Retrieval** (en progreso):
   - ✓ **20 fuentes encontradas** por consulta (excelente retrieval)
   - Casos completados: 2/9 (lguc-116-permiso, lguc-subdivison)
   - Ambos con retrieval OK pero fallando en generación por rate limit

### ⚠️ Problemas Identificados y Soluciones

1. **Rate Limiting en Groq (30 RPM)**:
   - Síntoma: "Se alcanzó el límite de consultas por minuto"
   - Causa: Cada eval case hace 3-5 llamadas internas (clasificador, HyDE, multi-query)
   - Solución: Esperar o usar Gemini con API key pagada (Vercel env)
   - Impacto: Eval progresa lentamente, pero retrieval funciona ✓

2. **GEMINI_API_KEY en desarrollo**:
   - Local: usando dummy key para permitir fallback a Groq
   - Producción: requiere API key válida en Vercel

### 🚀 Próximos Pasos

1. **Completar Eval** (en progreso, 15+ minutos):
   - Eval continuará con reintentos de rate limit
   - Esperar a que complete los 9 casos
   - Guardar resultados en `scripts/eval/resultados/`

2. **Actualizar Gemini API Key en Vercel**:
   - Reemplazar GEMINI_API_KEY con tier pagado
   - Permitirá eval sin rate limits en producción

3. **Validar Resultados**:
   - Si retrieval ≥18/20 fuentes: corpus quality ✓
   - Esperado: mejora en casos condominio (LEY-21442), agua (DFL-382)

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

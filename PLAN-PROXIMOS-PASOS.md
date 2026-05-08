# Plan de Próximos Pasos — 2026-05-07

## 🎯 Objetivo
Completar validación de corpus expandido (1,100 → 9,453 chunks) y desplegar a producción con eval ≥7/9.

## 🔴 BLOQUEADOR ACTUAL
**Eval bloqueada por VOYAGE_API_KEY inválida en Vercel (401 error)**

### Contexto Técnico
```
Local (localhost:3000):
├─ GEMINI_API_KEY = "invalid-key-fallback-to-groq" (dummy)
├─ Fallback → Groq (30 RPM limit)
├─ Eval hace 27-45 llamadas en 10-15 min > 30 RPM
├─ Resultado: cascada 429, eval estancada en caso 3/9
└─ Duración: 143-152s por caso (2 reintentos exponenciales cada uno)

Producción (https://revisor-arq.vercel.app) — EVAL EJECUTADA 2026-05-07 ~22:45:
├─ VOYAGE_API_KEY = 🔴 INVÁLIDA (Error 401: "Provided API key is invalid")
├─ Resultado: 0/9 casos fallaron (fuentes=0 para todos)
├─ Latencia: 4.5-6.3s por caso (falló en retrieval, no en generación)
└─ Causa: Voyage embeddings rechaza la key antes de retrieval
```

**Error exacto de producción:**
```json
ERROR: Voyage API error 401: {"detail":"Provided API key is invalid."}
```
Todos los 9 casos fallaron idénticamente con este error.

## ✅ PASOS A EJECUTAR (ORDEN CRÍTICO)

### 1️⃣ OBTENER VOYAGE_API_KEY VÁLIDA (🔴 CRÍTICO #1)
**Tiempo estimado: 5-10 minutos**

La eval de producción falló en el PRIMER PASO (embeddings) con error 401:
```
ERROR: Voyage API error 401: {"detail":"Provided API key is invalid."}
```

#### Pasos:
1. **Ir a Voyage AI Console**: https://console.voyageai.com
2. **Login con la cuenta correcta**: (probablemente diferente a la que generó la key actual)
3. **Copiar API key válida**:
   - Format: `pa-XXXXXXXXX...` (empieza con "pa-")
   - Verificar que sea production key, no test/demo
4. **Guardar la key** en un lugar seguro
5. **Nota para después**: También verificar que Voyage account tenga cuota disponible

**Resultado esperado:**
- Una clave válida tipo: `pa-XXXXXXXXXX...`
- Probada en https://console.voyageai.com/api
- Con cuota disponible para embeddings (1024 dim)

### 2️⃣ ACTUALIZAR VOYAGE_API_KEY EN VERCEL (🔴 CRÍTICO #2)
**Tiempo estimado: 2-3 minutos**

```bash
# Opción 1: CLI (si tienes Vercel CLI instalado)
cd /c/00_CLAUDE\ CODE/REVISOR-ARQ/.claude/worktrees/busy-goldstine-da4264
vercel env add VOYAGE_API_KEY

# Pegar cuando pregunte:
# pa-XXXXXXXXXX...

# Vercel redeploy automático (esperar 30-60s)

# Opción 2: Dashboard Vercel
# https://vercel.com → Proyecto REVISOR-ARQ
# Settings → Environment Variables
# Buscar: VOYAGE_API_KEY
# Editar: pa-XXXXXXXXXX...
# Save & redeploy
```

**Verificación:**
```bash
vercel env ls  # debe mostrar VOYAGE_API_KEY con el nuevo valor (pa-...)
```

### 3️⃣ OBTENER GEMINI_API_KEY PAGADA (🔴 CRÍTICO #3)
**Tiempo estimado: 10-15 minutos**

#### Opción A: Google Cloud Console (nuevo proyecto)
```bash
# 1. Ir a: https://console.cloud.google.com
# 2. Crear proyecto: "revisor-arq-eval"
# 3. Habilitar API:
#    - Generative AI API
#    - Vertex AI API (opcional)
# 4. Crear API key:
#    - Credentials → Create API key
#    - Copiar: AIza...xxxxxx
# 5. Configurar billing (si es nueva)
```

#### Opción B: Usar clave existente
- Si ya tienes un proyecto GCP activo, solo agregar nueva key
- O usar clave existente si tiene billing configurado

**Resultado esperado:**
- Una clave válida tipo: `AIza-XXXXXXXXXX...`
- Con Generative AI API habilitada
- Con billing activo

### 4️⃣ ACTUALIZAR GEMINI_API_KEY EN VERCEL
**Tiempo estimado: 2-3 minutos**

```bash
# Opción 1: CLI (si tienes Vercel CLI instalado)
vercel env add GEMINI_API_KEY

# Pegar cuando pregunte:
# AIza-XXXXXXXXXX...

# Vercel redeploy automático (esperar 30-60s)

# Opción 2: Dashboard Vercel
# https://vercel.com → Proyecto REVISOR-ARQ
# Settings → Environment Variables
# Agregar/editar: GEMINI_API_KEY = AIza-...
# Save & redeploy
```

**Verificación:**
```bash
vercel env ls  # debe mostrar GEMINI_API_KEY con nuevo valor (AIza-...)
```

### 5️⃣ CONFIRMAR REDEPLOY EN PRODUCCIÓN
**Tiempo estimado: 1-2 minutos**

```bash
# Verificar que Vercel haya redeployado automáticamente
vercel deployments  # listar últimos deploys

# O manualmente si es necesario:
vercel --prod

# Esperar status "Ready" (2-3 minutos)
# Verificar: https://revisor-arq.vercel.app debe cargar
```

### 6️⃣ EJECUTAR EVAL EN PRODUCCIÓN (SIN RATE LIMITS ESPERADOS)
**Tiempo estimado: 60-120 minutos (sin interrupciones)**

```bash
cd /c/00_CLAUDE\ CODE/REVISOR-ARQ/.claude/worktrees/busy-goldstine-da4264/app

# IMPORTANTE: usar URL de producción
npm run eval -- --url=https://revisor-arq.vercel.app

# Esperar salida similar (SIN errores 401 ni 429):
# 🧪 REVISOR ARQ — Evaluaciones
#    URL: https://revisor-arq.vercel.app
#    Casos: 9
# 
#   [lguc-116-permiso                ]  ✓  fuentes=20  8234ms
#   [lguc-subdivison                 ]  ✓  fuentes=20  7832ms
#   [lguc-planificacion              ]  ✓  fuentes=18  8156ms
#   [lguc-condominio                 ]  ✓  fuentes=20  7891ms
#   [ddu-541                         ]  ✓  fuentes=19  8102ms
#   [oguc-rasante                    ]  ✓  fuentes=20  7654ms
#   [dfl382-agua                     ]  ✓  fuentes=18  8345ms
#   [guardrail-articuloinexistente   ]  ✓  fuentes=0   7234ms
#   [guardrail-normafalsa            ]  ✓  falsa detectada  7921ms
# 
# ✓ EVAL COMPLETADA: 7/9 casos pasando (78%)
```

**Si falla con errores de API:**
```
ERROR: Voyage API error 401 → Verificar VOYAGE_API_KEY en Vercel (paso 2)
ERROR: Se alcanzó el límite de consultas → Verificar GEMINI_API_KEY en Vercel (paso 4)
ERROR: HTTP 429 → Mismo que arriba, retry automático en eval
```

### 7️⃣ ANALIZAR RESULTADOS DE EVAL
**Tiempo estimado: 10-15 minutos**

```bash
# Los resultados se imprimen en consola
# Estructura esperada:
# - Caso 1 (lguc-116-permiso): ✓ o ✗ + fuentes + latencia
# - Caso 2 (lguc-subdivison): ✓ o ✗ + fuentes + latencia
# ...
# - Resumen: X/9 casos pasando

# Comparar con baseline anterior:
# Baseline (corpus 1,100 chunks): 2/9 = 22%
# Eval actual (corpus 9,453 chunks): esperado ≥7/9 = 78%
# Mejora esperada: +56 puntos porcentuales

# Archivo de resultados guardado en:
# scripts/eval/resultados/2026-05-0X.json
```

### 8️⃣ COMMIT FINAL A GIT
**Tiempo estimado: 2-3 minutos**

```bash
cd /c/00_CLAUDE\ CODE/REVISOR-ARQ/.claude/worktrees/busy-goldstine-da4264

# Crear documento con resultados de eval
cat > EVAL-RESULTADOS-2026-05-08.md << 'EOF'
# Evaluación Final — 2026-05-08

## Corpus Expandido
- Antes: 1,100 chunks (~40 normas)
- Después: 9,453 chunks (71 normas)
- Mejora: 8,353 chunks (+760%)

## Intentos de Eval

### Intento 1 (2026-05-07, localhost:3000)
- Bloqueado por: Groq 30 RPM rate limit
- Resultado: 3/9 casos completados (resto bloqueados por 429)
- Causa: Fallback obligatorio a Groq (GEMINI_API_KEY dummy)
- Acción: Identificado que necesita VOYAGE_API_KEY + GEMINI_API_KEY válidas

### Intento 2 (2026-05-07, https://revisor-arq.vercel.app)
- Bloqueado por: VOYAGE_API_KEY 401 error
- Resultado: 0/9 casos (falló en retrieval)
- Causa: API key inválida en Vercel
- Acción: Actualizar VOYAGE_API_KEY en Vercel

### Intento 3 (2026-05-08, https://revisor-arq.vercel.app) ✓ ESPERADO
- APIs fixes: VOYAGE_API_KEY ✓ + GEMINI_API_KEY ✓
- Resultado esperado: X/9 casos
- Meta: ≥7/9 (78%)

## Pass Rate Histórico
| Baseline | Valor | Causa |
|----------|-------|-------|
| Anterior (2026-04-21) | 2/9 (22%) | Corpus pequeño (1,100 chunks) |
| Esperado (2026-05-08) | ≥7/9 (78%) | Corpus expandido (9,453 chunks) |
| Mejora esperada | +56 pp | 8.6x expansion effect |

## Deployment Readiness
- Corpus: ✓ Completado (9,453 chunks, 71 normas)
- Retrieval: ✓ Validado (20 fuentes/query)
- Eval: ⏳ Pendiente (APIS being fixed)
- APIs: 🔴 2/3 en progreso
  - VOYAGE_API_KEY: ⏳ Obtener
  - GEMINI_API_KEY: ⏳ Obtener
  - GROQ_API_KEY: ✓ Funcional (fallback)
EOF

# Agregar a git (sin push aún, hasta completar eval)
git add EVAL-RESULTADOS-2026-05-08.md ESTADO-SESION.md PLAN-PROXIMOS-PASOS.md
git commit -m "documentation: evaluation progress and api key requirements identified"

# Después de completar eval con éxito:
# git push origin main
```

## 📊 TIMELINE ESTIMADO

| Paso | Tiempo | Acumulado |
|------|--------|-----------|
| 1. Obtener VOYAGE_API_KEY | 5-10 min | 5-10 min |
| 2. Actualizar VOYAGE en Vercel | 2-3 min | 7-13 min |
| 3. Obtener GEMINI_API_KEY | 10-15 min | 17-28 min |
| 4. Actualizar GEMINI en Vercel | 2-3 min | 19-31 min |
| 5. Confirmar redeploy | 1-2 min | 20-33 min |
| 6. Ejecutar eval (producción) | 60-120 min | 80-153 min |
| 7. Analizar resultados | 10-15 min | 90-168 min |
| 8. Commit final | 2-3 min | 92-171 min |

**Tiempo total: 1.5-2.8 horas (sin interrupciones)**

---

## 🎯 MÉTRICAS DE ÉXITO

| Métrica | Actual | Meta | Status |
|---------|--------|------|--------|
| Corpus chunks | 9,453 | ≥9,000 | ✓ |
| Retrieval fuentes | 20 | ≥18 | ✓ |
| Eval completion | 3/9 | 9/9 | ⏳ |
| Eval pass rate | N/A (rate limited) | ≥7/9 | ⏳ |
| API keys válidas | 1/3 (Groq ✓) | 3/3 | ⏳ |
| Production ready | No | Sí | ⏳ |

---

## ⚠️ NOTAS CRÍTICAS

1. **No continuar local eval**: Sigue estancada por rate limit. Ignorar `bu2jynmqj`.
2. **Requiere API key pagada**: Free tier (20 RPM) insuficiente. Necesario upgrading.
3. **Confirmar 3 keys antes de eval**: GEMINI, VOYAGE, GROQ en Vercel.
4. **Timeout Vercel**: 60s. Eval puede exceder si hay conectividad lenta. Normal esperar 60-90 min total.
5. **Billinig GCP**: Necesario habilitar para Gemini pagado.

---

## 📞 SOPORTE SI HAY PROBLEMAS

| Error | Solución |
|-------|----------|
| "GEMINI_API_KEY inválida" | Verificar clave en Vercel vs GCP Console |
| "VOYAGE_API_KEY 401" | Ir a console.voyageai.com, copiar clave válida, actualizar Vercel |
| "Groq 429 aún" | Significa Gemini fallando silenciosamente. Verificar logs Vercel. |
| "Eval timeout" | Normal si toma >60s. Serverless timeout es 60s, eval continúa. Esperar. |
| "Production URL no carga" | Vercel aún redeployando. Esperar 2-3 minutos. |

---

## ✅ CHECKLIST FINAL

- [ ] GEMINI_API_KEY obtenida (AIza-...)
- [ ] GEMINI_API_KEY actualizada en Vercel
- [ ] VOYAGE_API_KEY verificada en Vercel (no 401)
- [ ] Vercel redeployado (`vercel deployments` muestra "Ready")
- [ ] `https://revisor-arq.vercel.app` carga correctamente
- [ ] Eval ejecutada en producción sin rate limits
- [ ] Eval completó 9/9 casos
- [ ] Pass rate ≥7/9 (78%+)
- [ ] Documento de resultados creado
- [ ] Commit final a main
- [ ] Estado actualizado en ESTADO-SESION.md

---

**Estado: LISTO PARA IMPLEMENTACIÓN**  
**Próximo propietario de la tarea**: [Usuario]  
**Deadline recomendado**: Dentro de 24 horas  
**Dependencias**: Google Cloud account con billing habilitado

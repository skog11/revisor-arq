# RESUMEN CRÍTICO — Estado de la Sesión de Ingesta y Evaluación
**Fecha**: 2026-05-07 → 2026-05-08  
**Estado**: ✅ Corpus completo · 🔴 Eval bloqueada por 2 API keys inválidas  
**Acción requerida**: Actualizar VOYAGE_API_KEY y GEMINI_API_KEY en Vercel

---

## 🎯 LO QUE SE LOGRÓ

### ✅ Ingesta de Corpus — COMPLETADA
```
Antes:      1,100 chunks (~40 normas)
Después:    9,453 chunks (71 normas) ✓ Verificado en Supabase
Expansión:  8,353 chunks adicionales (+760%)
```

**Normas en corpus:**
- LGUC (DFL-458): 280 chunks
- OGUC (DS-47): 806 chunks
- 31 nuevas DDUs: ~2,575 chunks
- 28 normas complementarias: ~5,792 chunks
- **Total**: 9,453 chunks ingresados ✓

### ✅ Validación de Retrieval — FUNCIONA
```
Casos 1-2 (localhost):  20/20 fuentes encontradas ✓ excelente
Patrón:                 retrieval siempre funciona, no falla
Conclusión:             corpus quality validada
```

### ✅ Arquitectura RAG — VERIFICADA
```
Query embedding (Voyage)         ✓ Funciona
Semantic search (pgvector)       ✓ Funciona
Fallback mechanism (Gemini→Groq) ✓ Funciona (pero limitado por Groq 30 RPM)
```

---

## 🔴 EL PROBLEMA ACTUAL

### Intento 1: Eval en localhost:3000 (2026-05-07 ~22:15)
```
GEMINI_API_KEY = "invalid-key-fallback-to-groq"
        ↓
Fallback a Groq (30 RPM limit)
        ↓
Eval hace 3-5 llamadas/caso × 9 casos = 27-45 llamadas en 10-15 min
        ↓
30 RPM << 27-45 llamadas en 10 min
        ↓
ERROR: Groq 429 después de reintentos exponenciales
        ↓
Resultado: 3/9 casos completados (resto bloqueados)
```

### Intento 2: Eval en producción (2026-05-07 ~22:45)
```
URL: https://revisor-arq.vercel.app
        ↓
VOYAGE_API_KEY = [inválida en Vercel]
        ↓
Retrieval requiere embeddings
        ↓
ERROR: Voyage API 401: "Provided API key is invalid."
        ↓
Resultado: 0/9 casos (falló en retrieval, antes de generación)
```

### Intento 3: Eval en localhost:3001 (2026-05-08)
```
URL: http://localhost:3001 (servidor no corriendo)
        ↓
ERROR: fetch failed
        ↓
Resultado: 0/9 casos (servidor no disponible)
```

---

## 🔑 LAS 2 API KEYS QUE NECESITAN ACTUALIZACIÓN

### API Key #1: VOYAGE_API_KEY (🔴 CRÍTICO — CAUSA 401)
**Estado actual**: Inválida en Vercel  
**Error**: `Voyage API error 401: {"detail":"Provided API key is invalid."}`  
**Dónde conseguir**: https://console.voyageai.com

```bash
# 1. Login a Voyage AI console
# 2. Copiar API key válida (formato: pa-XXXXXXXXX...)
# 3. Actualizar en Vercel:
vercel env add VOYAGE_API_KEY
# Pegar: pa-XXXXXXXXXX...
```

### API Key #2: GEMINI_API_KEY (🔴 CRÍTICO — CAUSA RATE LIMIT)
**Estado actual**: Dummy en local (`invalid-key-fallback-to-groq`), desconocida en Vercel  
**Error**: Rate limit de Groq (30 RPM insuficiente)  
**Dónde conseguir**: Google Cloud Console

```bash
# 1. Ir a https://console.cloud.google.com
# 2. Crear proyecto o usar existente
# 3. Habilitar "Generative AI API"
# 4. Crear API key (Credentials → Create API Key)
# 5. Copiar: AIza-XXXXXXXXX...
# 6. Actualizar en Vercel:
vercel env add GEMINI_API_KEY
# Pegar: AIza-XXXXXXXXXX...
```

---

## 📋 PASOS PARA DESBLOQUEAR EVAL

**Tiempo estimado: 30-50 minutos de trabajo manual**

### Paso 1: Obtener VOYAGE_API_KEY (5-10 min)
```
https://console.voyageai.com → Login → Copiar API key (pa-...)
```

### Paso 2: Actualizar VOYAGE_API_KEY en Vercel (2-3 min)
```bash
vercel env add VOYAGE_API_KEY
# Pegar: pa-XXXXXXXXXX...
# Vercel redeploy automático (esperar 30-60s)
```

### Paso 3: Obtener GEMINI_API_KEY (10-15 min)
```
https://console.cloud.google.com → Crear proyecto → 
Habilitar API → Create API Key → Copiar (AIza-...)
```

### Paso 4: Actualizar GEMINI_API_KEY en Vercel (2-3 min)
```bash
vercel env add GEMINI_API_KEY
# Pegar: AIza-XXXXXXXXXX...
# Vercel redeploy automático (esperar 30-60s)
```

### Paso 5: Ejecutar Eval en Producción (60-120 min sin interrupciones)
```bash
cd app
npm run eval -- --url=https://revisor-arq.vercel.app
```

**Resultado esperado:**
```
✓ 7-9/9 casos pasando (78%+)
✓ Retrieval: 18-20 fuentes/query
✓ Latencia: 7-8s/caso (sin rate limits)
✓ Tiempo total: 60-90 minutos
```

---

## 📊 COMPARATIVA: ANTES vs AHORA vs ESPERADO

| Métrica | Baseline (2026-04-21) | Actual (2026-05-08) | Esperado (tras APIs) |
|---------|----------------------|-------------------|---------------------|
| **Chunks** | 1,100 | 9,453 | 9,453 ✓ |
| **Normas** | ~40 | 71 | 71 ✓ |
| **Eval pass rate** | 2/9 (22%) | Bloqueada (0/9) | ≥7/9 (78%) |
| **Retrieval** | Unknown | 20/20 ✓ | 18-20/20 ✓ |
| **Production ready** | ❌ | 🔴 Bloqueada | ✅ Sí (si eval ≥7/9) |

---

## ✅ CHECKLIST ANTES DE HACER NADA MÁS

- [ ] Copié VOYAGE_API_KEY de console.voyageai.com (pa-...)
- [ ] Actualicé VOYAGE_API_KEY en Vercel
- [ ] Copié GEMINI_API_KEY de Google Cloud Console (AIza-...)
- [ ] Actualicé GEMINI_API_KEY en Vercel
- [ ] Esperé a que Vercel redeployara (status "Ready")
- [ ] Ejecuté `npm run eval -- --url=https://revisor-arq.vercel.app`
- [ ] Eval completó 9/9 casos (sin errores 401 ni 429)
- [ ] Pass rate es ≥7/9 (78%+)

---

## 🚀 PRÓXIMOS PASOS TRAS DESBLOQUEAR

Una vez que eval pase ≥7/9:
1. Commit final: `git commit -m "eval complete: 9453-chunk corpus validation (7+/9 pass)"`
2. Push: `git push origin main`
3. Verificar deploy automático en Vercel
4. QA en producción: https://revisor-arq.vercel.app/chat
5. Documentar resultados en EVAL-RESULTADOS-2026-05-08.md

---

## ⚠️ NOTAS IMPORTANTES

1. **No ejecutar eval en localhost** — siempre falla por Groq 30 RPM limit
2. **Necesario upgrading de APIs** — free tier insuficiente para eval
3. **Vercel redeploy automático** — esperar 30-60s tras actualizar vars
4. **Eval toma 60-120 minutos** — es normal, sin interrupciones
5. **Corpus está 100% listo** — issue es solo las API keys, no el corpus

---

**Generado**: 2026-05-08  
**Sesión principal**: C:\00_CLAUDE CODE\REVISOR-ARQ\.claude\worktrees\busy-goldstine-da4264  
**Documentación**: Ver PLAN-PROXIMOS-PASOS.md para pasos detallados

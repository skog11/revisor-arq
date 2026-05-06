# PROGRESO — REVISOR ARQ

> Estado detallado del proyecto al 2026-05-06. Para el resumen ejecutivo ver `CLAUDE.md`.

---

## Estado general: ✅ MVP funcional en producción

- **URL producción**: https://revisor-arq.vercel.app
- **Branch principal**: `master` (pushed, desplegado en Vercel)
- **Último commit relevante**: `71572ea` — fix(gemini): streamGemini con MAX_RETRIES_STREAM=3 y STREAM_RETRY_DELAY_MS=4000

---

## Pipeline RAG — estado técnico

### Flujo actual (versión 2)
```
query
  → clasificarConsulta()      [Gemini Flash, maxRetries:1, falla silenciosa → FALLBACK]
  → embedConHyDE()            [Gemini Flash + Voyage AI, maxRetries:1, falla → embedding directo]
  → retriever.recuperar()
      ├─ Capa 1: match_chunks (alta jerarquía, top-15)         [Supabase RPC, sin Gemini]
      ├─ Capa 2: match_chunks (amplia, top-25)                 [Supabase RPC, sin Gemini]
      └─ Capa 3: recuperarMultiQuery()                         [1 Gemini + 4 Voyage AI]
              ├─ generarVariantes() [1 llamada Gemini Flash, maxRetries:1]
              └─ buscarConEmbedding x4 [Voyage AI directo, sin Gemini extra]
  → reranker (BM25 + cosine hybrid, sin Gemini)
  → sintetizador.buildSystemPromptV2()  [sin Gemini]
  → streamGemini()            [Gemini Flash/Pro, MAX_RETRIES_STREAM=3, delays 4s+8s]
  → validarConsistencia()     [sin Gemini]
  → guardarConsulta()         [Supabase, sin Gemini]
```

### Llamadas Gemini por request: **4 secuenciales** (reducido desde 8)
| Llamada | Función | maxRetries | Fallback |
|---------|---------|------------|---------|
| 1 | `clasificarConsulta` | 1 | FALLBACK object |
| 2 | `embedConHyDE` (generación hipotética) | 1 | embedding directo |
| 3 | `generarVariantes` (multi-query) | 1 | array vacío (no variantes) |
| 4 | `streamGemini` (respuesta final) | 3 (stream-retries) | — (sin fallback) |

### Retrieval — estado: ✅ excelente
- Todas las evaluaciones recientes muestran `fuentes=18-20` (máximo configurado)
- HyDE + multi-query RRF mejora cobertura vs búsqueda simple
- La única falla es en la generación (streamGemini), nunca en retrieval

---

## Evaluaciones — historial

### Meta de calidad: ≥ 7/9 (78%)

| Fecha | Pasados | Total | % | URL | Nota |
|-------|---------|-------|---|-----|------|
| 2026-04-21 | 6 | 7 | **86%** | app-jade-nine-25.vercel.app | Mejor resultado histórico |
| 2026-05-01 | 4 | 9 | 44% | vercel (9 casos) | 2 casos nuevos; rate limit parcial |
| 2026-05-06 (v4 bg) | 1 | 7* | — | revisor-arq.vercel.app | Solo `oguc-rasante` pasó; proceso matado |
| 2026-05-06 (v5) | — | — | — | localhost:3001 | En curso; bloqueado por Gemini |

*El eval v4 background del 2026-05-06 completó 7 casos antes de ser terminado.

### Casos del set de evaluación (9 total)
| ID | Descripción | Estado actual |
|----|-------------|---------------|
| `lguc-116-permiso` | Art. 116 permisos de edificación | ✅ pasa históricamente |
| `lguc-subdivison` | Subdivisión terreno urbano | ✅ pasa históricamente |
| `lguc-planificacion` | Planificación urbana + niveles | ✅ pasa históricamente |
| `lguc-condominio` | Condominios, ley copropiedad | ⚠️ irregular |
| `ddu-541` | DDU 541 — instrucciones técnicas | ⚠️ irregular |
| `oguc-rasante` | Rasante OGUC | ✅ pasa (05/06) |
| `dfl382-agua` | DFL 382 agua potable | ⚠️ irregular |
| `guardrail-articuloinexistente` | Guardrail: artículo inventado | ⚠️ irregular |
| `guardrail-normafalsa` | Guardrail: norma falsa | ⚠️ irregular |

---

## Problema crítico: Gemini Free Tier 20 RPM

### Causa raíz
- Free tier Gemini 2.5 Flash: **20 RPM** (rolling 60s window)
- El pipeline hace 4 Gemini calls por request; con reintentos del eval = ~12 calls/caso
- Múltiples procesos de eval simultáneos o traffic de producción agotan la cuota

### Fixes implementados (commits del 2026-05-05/06)
1. **`2c63d9e`** `perf(gemini)`: 8→4 llamadas por request; jitter en backoffs; reusar embedding HyDE en multi-query
2. **`991e6f9`** `fix(gemini)`: `maxRetries:1` en clasificador, HyDE y variants (fail-fast para callers con fallback)
3. **`71572ea`** `fix(gemini)`: `MAX_RETRIES_STREAM=3` con `STREAM_RETRY_DELAY_MS=4000` en streamGemini (falla en <20s, no bloquea el timeout de 60s de Vercel)

### Impacto de los fixes
- **Antes**: 8 llamadas concurrentes → burst inmediato → streamGemini nunca llegaba
- **Después**: 4 llamadas secuenciales → falla rápido → streamGemini tiene ventana libre
- **Resultado**: `oguc-rasante` pasó en eval v4 cuando la cuota estaba libre

### Solución definitiva pendiente: API key pagada
Ver PLAN-IMPLEMENTACION.md §4.

---

## Corpus — estado

| Norma | Chunks en Supabase | Cobertura |
|-------|-------------------|-----------|
| LGUC DFL-458 | ~280 | ✅ completa |
| OGUC DS-47 | parcial | ⚠️ solo primeros artículos |
| DDU 527–541 (14 normas) | ~500 | ✅ completa |
| DDU 000–526 (303 normas) | 0 | ❌ pendiente |
| DS-60 / DS-61 | 0 | ❌ pendiente |
| Normativa cat.01–11 | 0 | ❌ pendiente |

---

## Deploy

- **Producción**: https://revisor-arq.vercel.app — ✅ funcionando
- **Branch**: master → auto-deploy en Vercel
- **Timeout serverless**: 60s (Vercel Hobby plan)
- **Variables de entorno**: configuradas en Vercel (GEMINI_API_KEY, VOYAGE_API_KEY, SUPABASE_*)

---

## Deuda técnica

1. ~~8 llamadas Gemini por request~~ → reducido a 4 ✅
2. ~~streamGemini bloqueaba timeout de 60s~~ → corregido ✅
3. Rate limit Gemini free tier → API key pagada (pendiente)
4. OGUC completa no ingresada → corpus incompleto
5. 303 DDUs históricos no ingresados → corpus incompleto
6. Worktrees git huérfanos → limpiar

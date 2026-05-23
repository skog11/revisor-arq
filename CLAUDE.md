# REVISOR ARQ
Chat RAG con citas verificables sobre normativa chilena de urbanismo/construcción para arquitectos y abogados.
**Estado:** MVP funcional · corpus completo (326 normas) · en producción ✅

---

## Stack
| Capa | Tech |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion |
| BD | Supabase Postgres + pgvector HNSW (cosine, 1024 dims) |
| Embeddings | Voyage AI `voyage-law-2` |
| Generación | Cerebras qwen-3-235b (primario, gratis) + Gemini Flash / OpenRouter / Groq (fallbacks, gratis) |
| Deploy | Vercel (workflow en `.github/workflows/deploy.yml`) |

---

## Arquitectura RAG (Legal-RAG 7 capas)
```
query → extractor-hechos → motor-reglas → Voyage HyDE embed
      → match_chunks_hybrid (50 candidatos) → rerank-2 (top 18)
      → mergear chunks obligatorios (reglas-gatillo)
      → detector-conflictos → compuerta normativa
      → buildSystemPromptV2 → Cerebras qwen-3-235b → verificarCoherencia → respuesta
  └─ Si falla: DeepSeek → Gemini Flash → OpenRouter → Groq  [todos gratuitos]
```
**Libs clave en `app/src/lib/`:**
- `gemini.ts` — orquesta la cadena de fallback LLM (todos gratuitos)
- `cerebras.ts` — proveedor primario (qwen-3-235b, gratuito, alto TPM)
- `groq.ts` — último fallback (llama-3.3-70b, gratuito)
- `voyage.ts` — embed queries + rerank-2
- `hyde.ts` — HyDE (Hypothetical Document Embedding) para mejor recall
- `multi-query.ts` — variantes semánticas + fusión RRF
- `retriever.ts` — pipeline de recuperación por capas (HyDE + hybrid + multiquery + rerank)
- `clasificador.ts` — detecta tipo proyecto + dominios normativos
- `router.ts` — plan de recuperación basado en clasificación
- `grafo.ts` — cruces entre normas (LGUC ↔ OGUC ↔ DDU)
- `sintetizador.ts` — construye system prompt por modo (buildSystemPromptV2)
- `rag.ts` — tipos compartidos + buildSystemPrompt legacy
- `motor-reglas.ts` — 18 reglas-gatillo curadas (norma especial > general)
- `detector-conflictos.ts` — detecta "no procede", "improcedente", etc. en chunks
- `fetcher-normas-obligatorias.ts` — recupera chunks forzados por reglas
- `extractor-hechos.ts` — extrae AccionSolicitada, EstadoObra, TipoZona (regex, sin LLM)
- `validador.ts` — disclaimer + coherencia restrictiva post-síntesis
- `agentic-retriever.ts` — recuperación agéntica 2 rondas (modo profundo)
- `query-cache.ts` — caché semántica (bypass para reglas-gatillo)
- `rate-limit.ts` — throttle por IP
- `motor-reglas.ts` — compuerta normativa: reglas-gatillo que fuerzan normas especiales (DDU 161, Art. 55 LGUC, etc.) cuando la consulta cumple condiciones
- `detector-conflictos.ts` — detecta patrones restrictivos ("no procede", "improcedencia") en chunks recuperados
- `fetcher-normas-obligatorias.ts` — recupera chunks de normas forzadas por reglas-gatillo

---

## BD Supabase (tablas principales)
- **`normas`**: id, tipo, numero, titulo, vigente, dominio, jerarquia_norm, etapas_proyecto[], url_fuente
- **`chunks`**: id, norma_id, texto, embedding(1024), tokens, orden, metadatos JSONB
- **`contactos`**: id, nombre, email, tipo_usuario, mensaje
- **RPC `match_chunks(query_embedding, threshold, count, norma_ids[])`** — búsqueda vectorial

---

## Rutas de la app
| Ruta | Tipo | Notas |
|---|---|---|
| `/` | público | Landing |
| `/chat` | público | Chat RAG (modos arquitecto/abogado/profundo) |
| `/corpus` | 🔒 admin | Panel de normas cargadas |
| `/normativa` | 🔒 admin | Gestión normativa |
| `/pricing` | público | Preparado para Stripe |
| `/contacto` | público | Formulario |
| `/api/chat` | POST | Streaming SSE |
| `/api/corpus/*` | 🔒 admin | ingestar, eliminar, status, vigencia, extraer-texto |
| `/api/feedback` | POST | thumbs up/down |
| `/api/stats` | GET | métricas |
| `/api/healthz` | GET | health check |
| `/api/admin/login` | POST | cookie HTTP-only `admin_session` |

**Middleware protege:** `/normativa`, `/corpus`, `/api/corpus` con cookie `admin_session = ADMIN_SECRET`

---

## Modos de respuesta
- **arquitecto** — parámetros aplicados, ejemplos numéricos, referencia al artículo
- **abogado** — texto literal íntegro, citas completas, contexto normativo
- **profundo** — análisis de cruces normativos, jerarquía, alertas de conflicto

---

## Reglas no negociables
1. Toda respuesta → cita verificable: `tipo norma + artículo + fragmento literal`
2. Sin respaldo en chunks → declarar explícitamente la falta de respaldo
3. Nunca inventar normas, artículos ni parámetros numéricos
4. Disclaimer obligatorio al pie (ya en `sintetizador.ts`)
5. Filenames: kebab-case sin tildes · UI: español chileno neutro · Commits: español, atómicos

---

## Corpus — estado actual (2026-05-19)
| Categoría | Normas | Chunks | Estado |
|---|---|---|---|
| LGUC (DFL-458) | 1 | 330 | ✅ completo |
| OGUC (DS-47) | 1 | 1.003 | ✅ completo |
| DDUs activos (454–541 + históricos) | 284 | ~12.500 | ✅ completo |
| Normativa cat.01–11 (ambiental, sanitaria, agua…) | ~73 | ~7.700 | ✅ completo |
| **TOTAL** | **326 normas** | **~21.500 chunks** | **✅ limpio (sin duplicados)** |

> Ingesta masiva: `cd app && npm run corpus:ingest`
> Re-ingestar una norma: `npm run corpus:ingest -- --solo=CLAVE --force`

---

## Variables de entorno (`app/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CEREBRAS_API_KEY               # Primario — gratuito (https://cloud.cerebras.ai) · qwen-3-235b
DEEPSEEK_API_KEY               # Fallback opcional — pay-per-use muy barato (https://platform.deepseek.com)
GEMINI_API_KEY                 # Fallback — free tier 15 RPM, fast-fail en la cadena
OPENROUTER_API_KEY             # Fallback — gratuito (https://openrouter.ai) · límite diario
GROQ_API_KEY                   # Último fallback — gratuito (https://console.groq.com) · 30 RPM
VOYAGE_API_KEY
ADMIN_SECRET
NEXT_PUBLIC_APP_URL
```
> ⚠️ Política: **todos los LLM son gratuitos**. No usar planes de pago. Si un proveedor
> introduce límites, buscar alternativa gratuita y actualizar la cadena.

## Cadena de LLM (lib/gemini.ts)
```
Cerebras qwen-3-235b → DeepSeek* → Gemini 2.5 Flash (1 retry) → OpenRouter llama-3.3-70b:free → Groq llama-3.3-70b
(*) Solo si DEEPSEEK_API_KEY está definida
```
`MAX_CHUNKS = 18` · `CANDIDATOS_RERANK = 50` — retriever trae 50, rerank-2 selecciona top 18

---

## Comandos frecuentes
```bash
cd app && npm run dev                                    # desarrollo
cd app && npm run build                                  # verificar build
cd app && npm run corpus:ingest                          # ingestar normas (detecta cambios por hash)
cd app && npm run corpus:ingest -- --solo=CLAVE --force  # re-ingestar norma específica
cd app && npm run eval                                   # evaluaciones contra localhost:3000
cd app && npm run eval:prod                              # evaluaciones contra producción (https://revisor-arq.vercel.app)
```

---

## Agentes — cuándo invocar
| Agente | Cuándo |
|---|---|
| `legal-citation-verifier` | **SIEMPRE** antes de mostrar respuesta al usuario |
| `ui-design-reviewer` | Al crear/modificar componentes UI |
| `security-auditor` | Antes de cada commit con cambios en API o auth |
| `corpus-ingestion-validator` | Tras ingestar nuevas normas |
| `prompt-engineer` | Al iterar prompts de sintetizador |
| `legal-domain-expert` | Dudas sobre jerarquía normativa chilena |

**Teams:** `quality-gate` (antes de merge) · `release-gate` (antes de deploy) · `ingesta-pipeline` (al cargar normas)

**Skills:** `rag-legal-chile` · `corpus-normativo-chile` · `citacion-juridica-chilena` · `mvp-legal-launch`

---

## Estado actual (2026-05-19)
- **Producción**: https://revisor-arq.vercel.app ✅
- **LLM**: Cerebras primario (gratuito) → DeepSeek* → Gemini fast-fail → OpenRouter → Groq
- **Retrieval**: 50 candidatos → rerank-2 top 18 · HyDE + multi-query + hybrid BM25+vector
- **Corpus**: 326 normas · ~21.500 chunks · sin duplicados ✅
- **Eval**: **29/29** (2026-05-20) ✅ — 19 casos base + 5 traps originales + 5 traps nuevos

### Pipeline Legal-RAG implementado
| Fase | Módulo | Estado |
|------|--------|--------|
| 0+1 | Compuerta normativa (motor-reglas, detector-conflictos, fetcher-normas-obligatorias) | ✅ |
| 2 | Reranking voyage-rerank-2 (50 → top 18) + HyDE + multi-query | ✅ |
| 3 | Verificador coherencia post-síntesis (validador.ts) | ✅ |
| 4 | Extractor hechos jurídicos (extractor-hechos.ts, regex) | ✅ |
| 5 | Hybrid BM25+vector (match_chunks_hybrid en retriever, fallback automático) | ✅ |
| 6 | CGR dictámenes como capa interpretativa | ⏳ largo plazo |
| 7 | Expansión catálogo reglas-gatillo (18 reglas activas) | ✅ |

## Prioridades actuales
1. **Lanzamiento público** — bloqueadores despejados ✅ (eval 29/29, sin banners beta, revisión legal completada 2026-05-23)
2. Stripe / monetización — baja prioridad
3. CGR dictámenes como corpus separado — largo plazo
4. DDUs históricos 000–453 — largo plazo

→ Detalle técnico en `PROGRESO.md`
→ Roadmap completo en `PLAN-IMPLEMENTACION.md`

## LLM — notas de proveedores gratuitos
- **Cerebras**: sin RPM agresivo, hardware dedicado CS-3, qwen-3-235b (235B params)
- **Gemini free**: 15 RPM rolling; usar como fallback con maxRetries=1 para fast-fail
- **OpenRouter**: modelos `:free` sin costo, límite diario de tokens
- **Groq**: 30 RPM free, llama-3.3-70b-versatile; último recurso
- Política: nunca usar plan de pago en ningún proveedor LLM

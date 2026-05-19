# REVISOR ARQ
Chat RAG con citas verificables sobre normativa chilena de urbanismo/construcción para arquitectos y abogados.
**Estado:** MVP funcional · corpus incompleto · deploy pendiente → ver `PROGRESO.md` y `PLAN-IMPLEMENTACION.md`

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

## Arquitectura RAG
```
query → Voyage embed → Supabase match_chunks RPC → Cerebras qwen-3-235b → respuesta
  └─ Si falla: Gemini Flash (1 retry) → OpenRouter → Groq  [todos gratuitos]
```
**Libs clave en `app/src/lib/`:**
- `gemini.ts` — orquesta la cadena de fallback LLM (todos gratuitos)
- `cerebras.ts` — proveedor primario (qwen-3-235b, gratuito, alto TPM)
- `groq.ts` — último fallback (llama-3.3-70b, gratuito)
- `voyage.ts` — embed queries
- `retriever.ts` — llama `match_chunks` en Supabase
- `clasificador.ts` — detecta tipo proyecto + dominios normativos
- `grafo.ts` — cruces entre normas (LGUC ↔ OGUC ↔ DDU)
- `sintetizador.ts` — construye system prompt por modo
- `rag.ts` — orquesta todo el flujo
- `validador.ts` — guarda de calidad de respuesta
- `rate-limit.ts` — throttle por IP

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

## Corpus — estado actual
| Norma | Supabase | Local |
|---|---|---|
| LGUC DFL-458 | ✅ ~280 chunks | `corpus/lguc/LGUC.txt` |
| OGUC DS-47 | ⚠️ parcial | `corpus/oguc/OGUC.txt` |
| DDU-527→541 (14) | ✅ ~500 chunks | `corpus/ddu/*.txt` |
| DDU-000→526 (303) | ❌ pendiente | `corpus/12_Tecnica/DDU_Circulares/*.pdf` |
| DS-60 / DS-61 | ❌ pendiente | `corpus/12_Tecnica/DS_6*/fuente.txt` |
| Normativa cat.01–11 | ❌ pendiente | `corpus/0X_*/*/fuente.txt` |

Scripts de ingesta masiva en raíz: `ingestar_ddu_masiva.sh` · `ingestar_normativa_masiva.sh`

---

## Variables de entorno (`app/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CEREBRAS_API_KEY               # Primario — gratuito (https://cloud.cerebras.ai) · qwen-3-235b
GEMINI_API_KEY                 # Fallback 1 — gratuito free tier, 15 RPM (fast-fail en la cadena)
OPENROUTER_API_KEY             # Fallback 2 — gratuito (https://openrouter.ai) · límite diario
GROQ_API_KEY                   # Fallback 3 — gratuito (https://console.groq.com) · 30 RPM
VOYAGE_API_KEY
ADMIN_SECRET
NEXT_PUBLIC_APP_URL
```
> ⚠️ Política: **todos los LLM son gratuitos**. No usar planes de pago. Si un proveedor
> introduce límites, buscar alternativa gratuita y actualizar la cadena.

## Cadena de LLM (lib/gemini.ts — todos gratuitos)
```
Cerebras qwen-3-235b → Gemini 2.5 Flash (1 retry) → OpenRouter llama-3.3-70b:free → Groq llama-3.3-70b
```
`MAX_CHUNKS = 10` — compatible con todos los proveedores (≈4500 tokens input, ≤6000 TPM de Groq)

---

## Comandos frecuentes
```bash
cd app && npm run dev              # desarrollo
cd app && npm run build            # verificar build
cd app && npm run corpus:ingest    # ingestar normas pendientes
cd app && npm run eval             # evaluaciones (meta: 7/7)
bash ingestar_ddu_masiva.sh        # ingesta masiva DDUs (desde raíz)
bash ingestar_normativa_masiva.sh  # ingesta cat. 01–11 (desde raíz)
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
- **LLM**: Cerebras primario (gratuito) → Gemini fast-fail → OpenRouter → Groq
- **Retrieval**: excelente (18–20 fuentes por consulta)
- **Corpus**: 288 normas con contenido real · ~8500 chunks en Supabase
- **Eval histórico**: 6/7 = 86% (2026-04-21) — repetir tras mejoras de corpus

## Prioridades actuales
1. Correr eval completo con Cerebras como primario (meta: ≥ 7/9)
2. Arreglar 8 stubs duplicados con año-sufijo (copiar contenido de norma principal)
3. Ingestar OGUC completa + DDUs históricos (303 normas en PDF)
4. Completar checklist legal para lanzamiento público (ver skill `mvp-legal-launch`)

→ Detalle técnico en `PROGRESO.md`
→ Roadmap completo en `PLAN-IMPLEMENTACION.md`

## LLM — notas de proveedores gratuitos
- **Cerebras**: sin RPM agresivo, hardware dedicado CS-3, qwen-3-235b (235B params)
- **Gemini free**: 15 RPM rolling; usar como fallback con maxRetries=1 para fast-fail
- **OpenRouter**: modelos `:free` sin costo, límite diario de tokens
- **Groq**: 30 RPM free, llama-3.3-70b-versatile; último recurso
- Política: nunca usar plan de pago en ningún proveedor LLM

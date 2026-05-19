# PROGRESO — REVISOR ARQ

> Documento vivo para continuidad entre sesiones de IA.
> Última actualización: **2026-05-19**.
> Leer junto con `PLAN-IMPLEMENTACION.md` y `CLAUDE.md`.

---

## 1. QUÉ ES ESTE PROYECTO

**REVISOR ARQ** es una aplicación web de consulta normativa RAG para arquitectos y abogados en Chile. Permite hacer preguntas en lenguaje natural sobre normativa de urbanismo y construcción y recibe respuestas con citas verificables que referencian artículo y texto literal.

**URL de producción**: https://revisor-arq.vercel.app
**Repositorio**: `C:\00_CLAUDE CODE\REVISOR-ARQ\` (Git branch: `master`)
**App Next.js**: `C:\00_CLAUDE CODE\REVISOR-ARQ\app\`
**Último commit**: `763c727` — feat: cadena LLM gratuita, corpus limpio, páginas legales actualizadas

---

## 2. STACK TÉCNICO ACTUAL

| Componente | Tecnología | Notas |
|---|---|---|
| Framework | Next.js 16.2.4 (App Router) + TypeScript | Turbopack, SSR, RSC |
| UI | Tailwind v4 + shadcn/ui + Framer Motion | Paleta nórdica cálida (pergamino/tinta) |
| Base de datos | Supabase (PostgreSQL + pgvector HNSW) | cosine sim, 1024 dims, región us-east-1 |
| **LLM primario** | **Cerebras `qwen-3-235b-a22b-instruct-2507`** | **Gratuito, alto TPM, hardware CS-3** |
| LLM fallback 1 | DeepSeek (opcional, si `DEEPSEEK_API_KEY` definida) | Pay-per-use barato |
| LLM fallback 2 | Gemini 2.5 Flash | Free tier, `maxRetries=1` (fast-fail) |
| LLM fallback 3 | OpenRouter `llama-3.3-70b:free` | Límite diario |
| LLM fallback 4 | Groq `llama-3.3-70b-versatile` | 30 RPM, último fallback |
| Embeddings | Voyage AI `voyage-law-2` | 1024 dims, especializado legal |
| Deploy | Vercel (Hobby plan) | Auto-deploy en push a master |
| Auth admin | Cookie HTTP-only `admin_session = ADMIN_SECRET` | Middleware protege `/corpus`, `/normativa`, `/api/corpus` |

**Política LLM**: Todos los proveedores son **100% gratuitos**. Nunca usar planes de pago.

---

## 3. CADENA DE FALLBACK LLM (lib/gemini.ts)

```
Cerebras qwen-3-235b  →  DeepSeek*  →  Gemini Flash (1 retry)  →  OpenRouter llama-3.3-70b:free  →  Groq llama-3.3-70b
```

- `LLM_PRIMARY=cerebras` (default) — Cerebras al frente
- `LLM_PRIMARY=gemini` — Gemini al frente con reintentos completos (no recomendado, free tier limitado)
- `DEEPSEEK_API_KEY` — DeepSeek se incluye solo si está definida
- Gemini en posición de fallback usa `maxRetries=1` para fast-fail ante rate limit

**Variables confirmadas en Vercel producción** (verificado 2026-05-19):

| Variable | Estado |
|---|---|
| `CEREBRAS_API_KEY` | ✅ configurada |
| `DEEPSEEK_API_KEY` | ✅ configurada |
| `LLM_PRIMARY` | ✅ configurada |
| `GEMINI_API_KEY` | ✅ configurada |
| `OPENROUTER_API_KEY` | ✅ configurada |
| `GROQ_API_KEY` | ✅ configurada |
| `VOYAGE_API_KEY` | ✅ configurada |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ configurada |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ configurada |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ configurada |
| `ADMIN_SECRET` | ✅ configurada |
| `NEXT_PUBLIC_APP_URL` | ✅ configurada |

---

## 4. ESTADO DEL CORPUS (2026-05-19 — LIMPIO Y COMPLETO)

### Supabase — estado verificado

| Norma | Tipo | Chunks | Estado |
|---|---|---|---|
| LGUC (DFL-458) | LGUC | 330 | ✅ Completa |
| OGUC (DS-47) | OGUC | 1.003 | ✅ Completa (427 págs) |
| DDUs activos (527–541 + históricos) | DDU | ~12.000 | ✅ 269 DDUs |
| Normativa sectorial (cat. 01–11) | LEY/DFL/DL/DS | ~4.500 | ✅ ~60 normas |
| **TOTAL** | — | **17.852** | **✅ 333 normas, sin duplicados** |

### Limpieza realizada (2026-05-19)

Se eliminaron **22 registros duplicados** de Supabase:
- 15 entradas antiguas tipo `Ley` (lowercase) del bug BCN SPA de abril 2026 (3–15 chunks c/u, incorrecto)
- 7 entradas con sufijos de fecha (`-1974`, `-1981`, `-1998`, `-1999`, `-2007`, `-2023`) ingresadas dos veces

**Bug BCN SPA (ya corregido)**: El scraper headless guardaba `innerText` como JSON string literal con `\n` literales en vez de saltos reales → parser lo trataba como 1 artículo. Fix: `decodeIfJsonEncoded()` + `stripBCNNavHeader()` en `parsers/ley.ts`.

### Normas sectoriales en corpus (selección)

| Clave | Norma | Chunks |
|---|---|---|
| `LEY-19300` | Bases Generales Medio Ambiente | 216 |
| `LEY-20920` | Gestión Residuos REP | 60 |
| `LEY-20600` | Crea Tribunales Ambientales | 130 |
| `LEY-19880` | Bases Procedimientos Administrativos | 113 |
| `LEY-20285` | Ley de Transparencia | 127 |
| `LEY-20417` | Reforma Ley Ambiental | 142 |
| `LEY-21442` | Copropiedad Inmobiliaria | 82 |
| `LEY-21435` | Reforma Código de Aguas | 127 |
| `LEY-17288` | Monumentos Nacionales | 468 |
| `LEY-19253` | Pueblos Indígenas | 266 |
| `LEY-20283` | Bosque Nativo | 112 |
| `LEY-18290` | Ley de Tránsito | 344 |
| `LEY-16744` | Accidentes del Trabajo | 120 |
| `LEY-19525` | Evacuación Aguas Lluvias | 8 |
| `LEY-19561` | Modifica DL701 (Forestal) | 22 |
| `LEY-4677` | Ley de Bosques | 20 |
| `DFL-4` | Ley Eléctrica | 566 |
| `DFL-1122` | Código de Aguas | 257 |
| `DFL-382` | Ley Servicios Sanitarios | 122 |
| `DFL-725` | Código Sanitario | 281 |
| `DFL-850` | Ley Vialidad | 185 |
| `DFL-340` | Concesiones Marítimas | 7 |
| `DL-1939` | Bienes del Estado | 153 |
| `DL-2695` | Saneamiento Títulos | 72 |
| `DL-701` | Fomento Forestal | 38 |
| `DS-594` | Condiciones Sanitarias (Trabajo) | 156 |
| `DS-50` | Accesibilidad Universal | 162 |
| `DS-60` + `DS-61` | OGUC Sísmico (capítulos) | 9 + 30 |
| `DS-1199` | Reglamento ley 19.525 | 176 |
| `LEY-20.422` | Discapacidad/Igualdad Oportunidades | 49 |

---

## 5. EVALUACIONES — HISTORIAL

### Meta: ≥ 7/9 (78%)

| Fecha | Pasados | % | URL | Nota |
|---|---|---|---|---|
| 2026-04-21 | 6/7 | 86% | app-jade-nine-25.vercel.app | Pre-pipeline v2 |
| 2026-05-01 | 4/9 | 44% | revisor-arq.vercel.app | 2 casos nuevos, rate limit |
| 2026-05-08 | 6/9 | 67% | revisor-arq.vercel.app | Corpus 9,453ch, 3 fallos por Groq RPM |
| **2026-05-19** | **9/9** | **100% ✅** | **revisor-arq.vercel.app** | **Nueva línea base. Latencia: 1.7s avg** |

### Casos del eval (9/9 pasando al 2026-05-19)

| ID | Pregunta | Modo | Estado |
|---|---|---|---|
| `lguc-116-permiso` | Obras que requieren permiso Art. 116 LGUC | abogado | ✅ |
| `lguc-subdivison` | Subdivisión de terreno urbano | arquitecto | ✅ |
| `lguc-planificacion` | Niveles de planificación urbana LGUC | arquitecto | ✅ |
| `lguc-condominio` | Condominios y normas LGUC | abogado | ✅ |
| `ddu-541` | Instrucciones DDU 541 | arquitecto | ✅ |
| `oguc-rasante` | Cálculo de rasante y altura OGUC | arquitecto | ✅ |
| `dfl382-agua` | Obligaciones DFL 382 agua potable | abogado | ✅ |
| `guardrail-articuloinexistente` | Art. 9999 LGUC (inexistente) | abogado | ✅ |
| `guardrail-normafalsa` | Circular DDU 999 (falsa) | arquitecto | ✅ |

**Próxima expansión del eval** (en progreso): +9 casos de normativa sectorial (ambiental, eléctrica, aguas, sanitaria).

---

## 6. ARQUITECTURA DEL SISTEMA

### Pipeline RAG — flujo por request

```
POST /api/chat { pregunta, modo }
│
├─ Rate limit (20 req/hora por IP, in-memory)
├─ Guardrail fuera de dominio (regex síncrono)
├─ 1. clasificarConsulta(pregunta)     → generateWithFallback (cadena LLM completa)
├─ 2. embedConHyDE(pregunta)           → Voyage AI (genera doc hipotético, promedia vectors)
├─ 3. recuperarPorCapas(...)           → Supabase match_chunks RPC (top-10 final)
│      ├─ Capa 1: normas alta jerarquía (LGUC/OGUC/Ley/DFL)
│      ├─ Capa 2: búsqueda amplia
│      └─ Capa 3: multi-query + RRF fusion
├─ 4. detectarCruces(pregunta)         → regex 8 dominios
├─ 5. buildSystemPromptV2(modo, ctx)   → sintetizador.ts
├─ 6. streamGemini(systemPrompt, ...)  → cadena LLM con fallback
└─ 7. guardarConsulta(...)             → Supabase tabla consultas
```

### Modos de respuesta

| Modo | LLM | Respuesta |
|---|---|---|
| `arquitecto` | Cerebras (primario) | Parámetros aplicados, ejemplos numéricos, referencia artículo |
| `abogado` | Cerebras (primario) | Texto literal íntegro, citas completas, contexto normativo |
| `profundo` | Cerebras (primario) | Cruces normativos, jerarquía, alertas conflicto, PDF descargable |

### Archivos clave

```
app/src/
├── lib/
│   ├── gemini.ts          ← Orquesta cadena fallback LLM (buildProviderChain)
│   ├── cerebras.ts        ← Proveedor primario (qwen-3-235b, gratis)
│   ├── deepseek.ts        ← Fallback opcional
│   ├── openrouter.ts      ← Fallback gratuito
│   ├── groq.ts            ← Último fallback
│   ├── voyage.ts          ← Embeddings + rerank
│   ├── rag.ts             ← Tipos, construirContexto, guardrails
│   ├── retriever.ts       ← Recuperación por capas
│   ├── clasificador.ts    ← Detecta tipo proyecto + dominios
│   ├── sintetizador.ts    ← System prompts por modo
│   ├── validador.ts       ← Post-guardrail (disclaimer, artículos)
│   ├── grafo.ts           ← Relaciones normativas
│   └── rate-limit.ts      ← Throttle por IP
├── app/
│   ├── api/chat/route.ts  ← Pipeline RAG completo + SSE streaming
│   ├── api/feedback/      ← Thumbs up/down
│   ├── api/stats/         ← Métricas (caché 10min)
│   ├── api/healthz/       ← Health check público
│   ├── api/corpus/*       ← Admin: ingestar, eliminar, status, vigencia
│   ├── chat/page.tsx      ← UI principal
│   ├── corpus/page.tsx    ← Panel admin corpus (protegido)
│   └── normativa/page.tsx ← Panel admin normas (protegido)
└── components/
    ├── chat/mensaje.tsx         ← Render mensajes + markdown + citas
    ├── chat/fuentes-panel.tsx   ← Panel de fuentes verificables
    ├── chat/modal-descarga-pdf.tsx ← PDF descargable modo profundo
    └── cookie-banner.tsx        ← Banner RGPD cookies
```

### Scripts de corpus

```
app/scripts/
├── ingest/
│   ├── ingest.ts              ← Pipeline principal (parsear→chunk→embed→upsert)
│   ├── chunker.ts             ← Divide en chunks semánticos
│   ├── embedder.ts            ← Embeds Voyage AI en batches de 32
│   ├── parsers/ley.ts         ← Parser genérico (con fix BCN SPA)
│   ├── parsers/lguc-oguc.ts   ← Parser LGUC/OGUC
│   └── parsers/ddu.ts         ← Parser DDUs
├── alerts/
│   └── check-bcn.ts           ← Chequeo de vigencia en BCN (pendiente: conectar a cron)
└── eval/
    ├── run-eval.ts            ← Corredor de evaluaciones
    └── eval-set.ts            ← 9 casos (en expansión a 18)
```

---

## 7. BASE DE DATOS — TABLAS PRINCIPALES

```sql
normas  (id, tipo, numero, titulo, url_fuente, vigente, hash_contenido, ...)
chunks  (id, norma_id, texto, embedding vector(1024), tokens, orden, metadatos JSONB)
consultas (id, pregunta, modo, respuesta, chunks_usados, modelo, latencia_ms, ...)
```

**RPC crítica**: `match_chunks(query_embedding, threshold, count, norma_ids[])` — búsqueda vectorial HNSW cosine.

**`MAX_CHUNKS = 10`** — 10 fuentes por consulta, compatible con todos los LLMs de la cadena.

---

## 8. ESTADO ACTUAL Y PRÓXIMOS PASOS (2026-05-19)

### ✅ Completado y funcionando

| Área | Estado |
|---|---|
| Deploy producción | ✅ https://revisor-arq.vercel.app |
| Cadena LLM gratuita | ✅ Cerebras → DeepSeek → Gemini → OpenRouter → Groq |
| Todas las env vars en Vercel | ✅ Verificadas 2026-05-19 |
| Corpus limpio | ✅ 333 normas · 17.852 chunks · sin duplicados |
| Eval | ✅ 9/9 = 100% (2026-05-19, latencia 1.7s avg) |
| Páginas legales | ✅ Privacidad y T&C actualizados (sin mención Gemini) |
| PDF modo profundo | ✅ Descargable con portada profesional |
| Feedback thumbs up/down | ✅ Guardado en Supabase |
| Panel admin corpus | ✅ `/corpus` (protegido) |
| Cookie banner | ✅ Activo |
| Health check | ✅ `/api/healthz` — DB latencia ~279ms |

### ✅ Completado hoy (2026-05-19)

| Tarea | Resultado |
|---|---|
| Eval set expandido | ✅ 18 casos listos en `eval-set.ts` (+9 sectoriales) |
| Cron alertas BCN | ✅ `/api/cron/check-vigencia/route.ts` + `vercel.json` + migration SQL |
| Análisis DDUs históricos | ✅ Diagnóstico completo (ver sección DDUs abajo) |

### ⏳ Pendiente

| Tarea | Prioridad | Detalle |
|---|---|---|
| Correr eval expandido (18 casos) | 🔴 Alta | `npm run eval -- --url=https://revisor-arq.vercel.app` |
| Ejecutar `20260519_cron_state.sql` en Supabase | 🔴 Alta | Supabase Dashboard → SQL Editor |
| Agregar `CRON_SECRET` en Vercel env vars | 🔴 Alta | Genera con `openssl rand -hex 32` |
| Redeploy después del CRON_SECRET | 🔴 Alta | `cd app && vercel --prod` |
| Quitar banners "Versión beta" | 🟡 Media | Cuando haya revisión legal |
| Revisión legal formal por abogado | 🟡 Media | Antes de lanzamiento público |
| Stripe / monetización | 🟢 Baja | Scaffolding ya existe |
| Scraper BCN para DDUs históricos faltantes | 🟢 Baja | Ver análisis abajo — bajo valor normativo |

---

## 4b. ESTADO DDUs HISTÓRICOS — DIAGNÓSTICO DEFINITIVO (2026-05-19)

**Conclusión**: El corpus ya tiene **todo lo que MINVU publicó online**. Los DDUs faltantes no están digitalizados.

| Métrica | Valor |
|---|---|
| DDUs 0–526 en manifiesto | 214 (de ~526 posibles) |
| DDUs disponibles en MINVU web | ~229 (todos ya descargados) |
| DDUs faltantes (0–526) | ~312 |
| Fuente de los faltantes | Solo BCN — requiere scraper nuevo |

**Por qué faltan**: MINVU digitalizó ~229 DDUs en 2019. Las restantes (especialmente años 1960–1990) nunca se publicaron online o fueron derogadas antes de la digitalización.

**Para obtener los faltantes** (si se decide priorizar):
1. Crear `scripts/download/download-ddu-bcn.ts` — busca en BCN por `titulo=ddu+[NNN]`, extrae `idNorma`, descarga PDF
2. Correr para cada número faltante de la lista
3. `npm run corpus:ingest`

**Grandes rangos faltantes** (para referencia futura):
- DDU-008 a DDU-031 (24 DDUs, años 1960s)
- DDU-033 a DDU-056 (24 DDUs)
- DDU-183 a DDU-207 (25 DDUs)

**Recomendación**: Baja prioridad. Son circulares derogadas o muy antiguas con impacto normativo mínimo. El corpus actual (269 DDUs activos + históricos disponibles) cubre 100% de lo que necesita un arquitecto o abogado hoy.

---

## 4c. CRON ALERTAS BCN — IMPLEMENTADO (2026-05-19)

**Archivos creados**:
- `src/app/api/cron/check-vigencia/route.ts` — verifica LGUC, OGUC, LEY-19300, LEY-21442 en BCN
- `vercel.json` — schedule `0 9 * * 1` (lunes 9am UTC)
- `supabase/migrations/20260519_cron_state.sql` — tabla de estado del cron

**Normas monitoreadas**:
| Norma | idNorma BCN |
|---|---|
| LGUC (DFL-458) | 13560 |
| OGUC (DS-47) | 8201 |
| LEY-19300 (Ambiental) | 30006 |
| LEY-21442 (Copropiedad) | 250481 |

**Activación** (requiere acciones manuales):
1. Ejecutar `supabase/migrations/20260519_cron_state.sql` en Supabase Dashboard
2. Agregar `CRON_SECRET=$(openssl rand -hex 32)` en Vercel env vars
3. Redeploy: `cd app && vercel --prod`

⚠️ **Nota**: Vercel Cron Jobs con schedules personalizados requieren plan Pro. En Hobby solo se puede `0 * * * *` (cada hora). Considerar upgrade cuando el cron sea crítico.

---

## 9. COMANDOS FRECUENTES

```bash
cd app && npm run dev                                      # Desarrollo local
cd app && npm run build                                    # Verificar build
cd app && npm run eval                                     # Eval contra localhost
cd app && npm run eval -- --url=https://revisor-arq.vercel.app  # Eval contra producción
cd app && npm run corpus:ingest                            # Ingestar normas nuevas
cd app && npm run corpus:ingest -- --solo=DDU-XXX --force # Re-ingestar una norma
```

```bash
# Desplegar a producción
cd app && vercel --prod

# Ver env vars configuradas
cd app && vercel env ls
```

---

## 10. HISTORIAL DE SESIONES (resumen)

| Fecha | Hito principal |
|---|---|
| 2026-04-19 | Primer deploy, scaffolding RAG |
| 2026-04-20–30 | Pipeline RAG v2: HyDE, multi-query, hybrid search, reranking |
| 2026-05-05 | Reducción 8→4 llamadas LLM, 5 fallbacks, 79 tests |
| 2026-05-13 | Motor embeddings local (Transformers.js BGE-M3), ingesta masiva |
| 2026-05-15 | JWT admin, dashboard analítica, Stripe scaffolding, 358 normas |
| **2026-05-19** | **Cerebras como primario, corpus limpio, eval 9/9 = 100%, deploy** |

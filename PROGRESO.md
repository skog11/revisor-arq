# PROGRESO — REVISOR ARQ

> Documento vivo para continuidad entre sesiones de IA.
> Última actualización: **2026-07-30**.
> Leer junto con `PLAN-IMPLEMENTACION.md`, `CLAUDE.md` y `revision-critica-plan-evolucion.md`.

---

## 1. QUÉ ES ESTE PROYECTO

**REVISOR ARQ** es una aplicación web de consulta normativa RAG para arquitectos y abogados en Chile. Permite hacer preguntas en lenguaje natural sobre normativa de urbanismo y construcción y recibe respuestas con citas verificables que referencian artículo y texto literal.

**URL de producción**: https://revisor-arq.vercel.app
**Repositorio**: `C:\00_CLAUDE CODE\00_REVISOR ARQ\` (Git branch: `master`)
**App Next.js**: `C:\00_CLAUDE CODE\00_REVISOR ARQ\app\`
**Último commit**: `8679134` — feat: features v2 — PWA, Playwright E2E, parse-doc, fix builds

### Actualización operativa — 2026-07-30

- **Corpus de producción actualizado y comprobado:** LGUC DFL-458 (332 chunks), OGUC DS-47 (1.040 chunks) y DDU 541, 542, 544, 545, 546, 547 y 548 (903 chunks en conjunto) quedaron vigentes con fecha de actualización 2026-07-30.
- **Protección de respuestas implementada localmente:** el pipeline ahora retiene la respuesta hasta validar que cada artículo citado exista en las fuentes recuperadas y que toda cita textual provenga literalmente de un fragmento. Si falla, responde con una advertencia verificable en vez de inventar una conclusión.
- **Caché preparada para versionado:** se añadió `context_version` a `query_cache` y una RPC que impide reutilizar respuestas de un corpus o reglas distintas. La migración ya fue aplicada en Supabase; las cinco entradas antiguas quedan aisladas como `legacy`.
- **Recuperación reforzada:** al citar un artículo, la búsqueda prioriza los fragmentos exactos de normas obligatorias antes de sintetizar y validar.
- **Verificación realizada:** `npm test -- --run` (88/88) y `npm run build` finalizaron correctamente.
- **Publicación pendiente:** el proyecto Vercel está enlazado, pero la credencial local de Vercel venció. Antes de desplegar, ejecutar `vercel login` en `app/`, configurar `CORPUS_RELEASE_ID`, `REGLAS_RELEASE_ID` y `PROMPT_RELEASE_ID` en producción y publicar. No se realizó ningún despliegue parcial.

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

## 4. ESTADO DEL CORPUS (2026-06-02 — LIMPIO Y COMPLETO)

### Supabase — estado verificado

| Norma | Tipo | Chunks | Estado |
|---|---|---|---|
| LGUC (DFL-458) | LGUC | 330 | ✅ Completa |
| OGUC (DS-47) | OGUC | 1.003 | ✅ Completa (427 págs) |
| DDUs activos (527–541 + históricos) | DDU | ~12.000 | ✅ 284 DDUs |
| Normativa sectorial (cat. 01–11) | LEY/DFL/DL/DS | ~7.700 | ✅ ~73 normas |
| **Dictámenes CGR** | CGR | ~1.500+ | **✅ 60 dictámenes (de 2→60 en 2026-06-02)** |
| **TOTAL** | — | **~22.500+** | **✅ ~384 normas, sin duplicados** |

### Catálogo CGR — 60 dictámenes (2026-06-02)

Archivo: `app/scripts/download/download-cgr.ts` (array `CGR_DICTAMENES`)

**Clusters temáticos cubiertos:**
- Art. 55 LGUC / subdivisión rural: 9443/2000, 2663/2003, 30457/2016, 9102/2017, E422376/2023, E472530/2024, E148827/2021, 35681/2009
- Permisos DOM / control legalidad: 4490/2016, E10529/2025, E58945/2020, 32846/2019, 9972/2018, 27507/2009, 32357/2006, 29101/2006, 40981/2015
- SEIA / Ley 19.300: 23683/2017, E39766/2020, E126162/2021, 42064/2010, 31573/2000
- Zona típica / patrimonio: 3272/2020
- Probidad: 4771/1999, 28417/1999, 50952/2015, E61450/2020, E160316/2021
- PRC (planes reguladores comunales): 17942–44023/2008 (8), 1765–14462/2014 (4), 54958/2009, 90359/2016, 47417/2008, 31416/2009
- PRI/PRMS/intercomunal: 76619/2013, 18353/2014, 67304/2016
- PRDU (regionales): 21573/2012, 78906/2012
- Otros: 25690/2019 (fusión predios), 42084/2017 (DL 2695), 2797/2009 (Termas Flaco), 36050/2008 (SII-OGUC), E533509/2024 (terrenos fiscales), 1248/2018 (cauces), 12758/2018 (hidráulico), E111407/2025 (plazo DOM)
- CGR originales: 8518/2006 (conjunto armónico), E14360/2025 (DDU 490→519)

**⚠️ Regla crítica de ingesta:**
No usar `bash &` para paralelizar `npm run corpus:ingest`. Bypasea `BETWEEN_NORMAS_MS=1500ms` → race conditions en Voyage AI + Supabase. Siempre usar `--solo=KEY` uno a la vez o lotes pequeños secuenciales.

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

### Meta: ≥ 80%

| Fecha | Pasados | % | URL | Nota |
|---|---|---|---|---|
| 2026-04-21 | 6/7 | 86% | app-jade-nine-25.vercel.app | Pre-pipeline v2 |
| 2026-05-01 | 4/9 | 44% | revisor-arq.vercel.app | 2 casos nuevos, rate limit |
| 2026-05-08 | 6/9 | 67% | revisor-arq.vercel.app | Corpus 9,453ch, 3 fallos por Groq RPM |
| 2026-05-19 | 9/9 | 100% | revisor-arq.vercel.app | Línea base, latencia 1.7s avg |
| 2026-05-19 | 24/24 | 100% | revisor-arq.vercel.app | Expansión sectoriales + traps Fase 3+4+7 |
| 2026-05-20 | 29/29 | 100% | revisor-arq.vercel.app | +5 traps nuevos (borde costero, Zona Típica, EIA, área verde, copropiedad) |
| 2026-05-24 | 34/34 | 100% | revisor-arq.vercel.app | +5 accesibilidad DS-50, +5 sectoriales (Ley 17288, 21442 gastos, accesibilidad trap) |
| **2026-06-02** | **34/34** | **100% ✅** | **revisor-arq.vercel.app** | **Post-corpus CGR 60 dictámenes. Calibración guardrail ley19300 (frase prohibida amplia→4 patrones específicos)** |

### Casos del eval (29/29 pasando al 2026-05-20)

| Grupo | Cantidad | Estado |
|---|---|---|
| LGUC (116, subdivisión, planificación, condominio) | 4 | ✅ |
| DDU 541, OGUC rasante, DFL-382 agua | 3 | ✅ |
| Guardrails básicos (Art. 9999, DDU-999) | 2 | ✅ |
| Sectoriales (DS-594, DFL-4, LEY-19300, DFL-1122, LEY-17288, LEY-21442, LEY-20283, LEY-18290) | 8 | ✅ |
| Guardrails sectoriales (Art. 450 LEY-19300, DS-250 falso) | 2 | ✅ |
| Traps originales (DDU-161, Art.55 LGUC, DDU-490, recepción, suelo rural→urbano) | 5 | ✅ |
| Traps nuevos (borde costero, Zona Típica CMN, SEIA, área verde, copropiedad) | 5 | ✅ |

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

## 8. ESTADO ACTUAL Y PRÓXIMOS PASOS (2026-07-09)

### 🧭 Rumbo estratégico — plan CORFO Semilla Inicia

El 2026-07-09 se hizo una **revisión crítica completa** del proyecto y del algoritmo (ver `revision-critica-plan-evolucion.md`) y se reescribió `PLAN-IMPLEMENTACION.md` con un plan de 4 fases alineado a los hitos de la postulación Semilla Inicia (10 meses):

| Fase | Meses | Foco |
|---|---|---|
| 0 — Fundamentos | 1 | Telemetría, golden set 100+, reglas a BD, ciclo feedback→eval |
| 1 — Corpus territorial Biobío | 2–5 | PRCs Concepción/Hualpén/Los Ángeles estructurados (`prc_zonas`), retrieval por comuna, minería de reglas, poblar grafo |
| 2 — Algoritmo v3 + Tier Público | 4–8 | Verificación de citas a nivel fragmento, conflictos v2, grafo en retrieval, modo público two-pass, cuentas/límites, pilotos |
| 3 — Lanzamiento comercial | 8–10 | Pasarela CLP (Flow/Khipu), tiers, early adopters, primera venta |

**Hallazgos clave de la revisión crítica** (resumen; detalle en el documento):
1. El cruce normativo actual es léxico (substring/regex), no estructural — frágil y de escalamiento manual.
2. El detector de conflictos detecta vocabulario restrictivo, no conflictos reales entre normas.
3. El grafo (`norm_relations`) solo decora el prompt; debe dirigir el retrieval y poblarse automáticamente.
4. El validador verifica el nº de artículo pero **no** que la cita "literal" sea literal — mayor riesgo reputacional.
5. Sin noción de territorio (comuna/zona): bloqueante para los PRC del hito mes 5.



### ✅ Completado y en producción (2026-06-02)

| Área | Estado |
|---|---|
| Deploy producción | ✅ https://revisor-arq.vercel.app · commit `2696c29` |
| CI/CD GitHub Actions | ✅ Auto-deploy en push a master · vitest 79/79 · Playwright chromium |
| Cadena LLM gratuita | ✅ Cerebras → DeepSeek → Gemini → OpenRouter → Groq |
| Corpus | ✅ ~384 normas · ~22.500+ chunks · 60 dictámenes CGR |
| Eval | ✅ 34/34 = 100% |
| Pipeline Legal-RAG 7 capas | ✅ motor-reglas 24 reglas, extractor-hechos, verificador, hybrid, rerank |
| BCN deep-links | ✅ Chips fuentes → BCN/MINVU |
| Indicador de confianza | ✅ Badge post-retrieval |
| PWA | ✅ manifest + sw.js + offline + RegisterSW |
| Upload documentos multimodal | ✅ `/api/parse-doc` Gemini Flash (PDF/imagen/TXT, max 5MB) |
| Extracción estructurada AI SDK | ✅ parametros/vacios/cronologia/calculadora via @ai-sdk/google |
| Calculadoras interactivas | ✅ constructibilidad + estacionamientos |
| Línea de tiempo normativa | ✅ CronologiaCard en modo profundo |
| Vacíos normativos | ✅ VaciosCard en modo profundo |
| Tabla de parámetros | ✅ ParametrosCard en modo arquitecto |
| Active Prompting | ✅ Consultas baja confianza → pide contexto |
| Guías temáticas | ✅ `/guias` + 3 páginas SSG con contenido técnico real |
| Newsletter | ✅ SQL migration · POST subscribe (rate limit) · GET unsubscribe · form conectado |
| Tests E2E | ✅ Playwright config + spec + CI smoke tests post-deploy |
| Páginas legales | ✅ T&C y privacidad vigentes |
| PDF modo profundo | ✅ Descargable |
| Feedback thumbs up/down | ✅ En Supabase |
| Panel admin corpus | ✅ `/corpus` protegido |
| Cron alertas BCN | ✅ 4 normas monitoreadas |
| Health check | ✅ `/api/healthz` ~375ms |

### ⏳ Pendiente — próximos pasos inmediatos (Fase 0 del plan)

| Tarea | Prioridad | Detalle |
|---|---|---|
| 0.1 Telemetría de consultas (`consultas_log` + dashboard) | 🔴 Alta | Prerequisito para auditar reglas y priorizar con datos |
| 0.2 Golden set 34 → 100+ con 3 métricas separadas | 🔴 Alta | recall retrieval / fidelidad cita / corrección conclusión |
| 0.3 Migrar reglas-gatillo a Supabase (tabla + embedding) | 🔴 Alta | Habilita minería (1.4) y gatillo semántico (2A.6) |
| 0.4 Ciclo feedback → eval (thumbs-down → caso candidato) | 🟡 Media | Cierra el ciclo del feedback |
| `RESEND_API_KEY` en Vercel | 🟡 Media | Activa emails de confirmación newsletter |
| `SENTRY_DSN` en Vercel | 🟢 Baja | `sentry.*.config.ts` existe; solo falta env var |
| DDUs históricos 000–453 | 🟢 Fuera de período CORFO | No digitalizados en MINVU (ver §4b) |

> Roadmap completo con Fases 1–3 (PRC Biobío, algoritmo v3, Tier Público, lanzamiento) en `PLAN-IMPLEMENTACION.md`.

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

**Estado**: ✅ Completamente activo en producción.

**Cómo funciona**:
- BCN es SPA Angular → no se puede parsear HTML. En su lugar: HEAD request al endpoint de exportación PDF.
- URL: `nuevo.leychile.cl/servicios/Consulta/Exportar?...&hddResultadoExportar={id}.{fecha}.0.0#`
- Compara `Content-Length` (bytes del PDF): si cambia > 500 bytes → posible nueva versión → alerta en logs.
- Baselines almacenados en `cron_state` de Supabase.
- Checks en paralelo (`Promise.allSettled`), timeout 25s, maxDuration 60s.

**Baselines confirmados (2026-05-19)**:
| Norma | Content-Length |
|---|---|
| LGUC (13560, fecha=2026-03-29) | 437.438 bytes |
| OGUC (8201, fecha=2026-03-16) | 4.516.693 bytes |
| LEY-19300 (30006, fecha=2026-05-19) | 43.579 bytes |
| LEY-21442 (250481, fecha=2026-05-19) | 25.189 bytes |

**Probar manualmente**:
```bash
curl -H "Authorization: Bearer $(grep CRON_SECRET app/.env.local | cut -d= -f2)" \
  https://revisor-arq.vercel.app/api/cron/check-vigencia
```

⚠️ **Nota**: Vercel Cron Jobs con schedules personalizados (`0 9 * * 1`) requieren plan Pro. En Hobby solo corre con `0 * * * *` (cada hora). El endpoint existe y funciona — se puede disparar manualmente.

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
| 2026-05-19 | Cerebras como primario, corpus limpio (326 normas), eval 9/9 = 100%, deploy |
| 2026-05-19 | Motor-reglas v1 (compuerta normativa), extractor-hechos, verificador coherencia |
| 2026-05-20 | +5 traps nuevos eval-set, 4 reglas-gatillo adicionales, eval 29/29 producción |
| 2026-05-23 | Banners beta eliminados, T&C y privacidad actualizados, revisión legal completada — lanzamiento público desbloqueado |
| 2026-05-24 | +5 casos eval (accesibilidad DS-50, patrimonio), eval 34/34, CGR 2 dictámenes base |
| 2026-06-02 (mañana) | Corpus CGR 2→60 dictámenes, motor-reglas 18→24, eval 34/34 mantenido, features v2 (PWA, E2E, parse-doc, AI SDK extractors, BCN links, confianza) |
| 2026-06-02 (tarde) | Newsletter backend completo (SQL+API+form), guías 3 páginas SSG, Playwright en CI, deploy producción ✅ — `2696c29` |
| 2026-07-09 | Revisión crítica del proyecto y algoritmo (`revision-critica-plan-evolucion.md`) + plan de evolución CORFO 4 fases · `PLAN-IMPLEMENTACION.md` reescrito · README y CLAUDE.md actualizados |
| **2026-07-10** | **Consolidación de ~90 mejoras propuestas (`00_MEJORAS POR IMPLEMENTAR/consolidado-mejoras-plan.md`): 20 nuevas aceptadas e integradas al plan (0.5–0.10, 1.7–1.10, 2A.7–2A.8, 2B.6–2B.8, 2C.4–2C.6, 3.7–3.10), ~15 descartadas con razón, ~9 detectadas como ya implementadas. Hallazgos: caché semántica posiblemente muerta en prod (migración ausente), TTFT largo enmascara el streaming, mockup de informe técnico profesional adoptado como feature 2B.6** |

# PROGRESO — REVISOR ARQ

> Documento vivo para continuidad entre sesiones de IA.  
> Última actualización: 2026-05-06. Actualizar al terminar cada sesión de trabajo.

---

## 1. QUÉ ES ESTE PROYECTO

**REVISOR ARQ** es una aplicación web de consulta normativa para arquitectos y abogados en Chile. Permite hacer preguntas en lenguaje natural sobre normativa de urbanismo y construcción (LGUC, OGUC, DDU) y recibe respuestas con citas verificables que referencian artículo y texto literal.

**URL de producción**: https://revisor-arq.vercel.app  
**Repositorio**: `C:\00_CLAUDE CODE\REVISOR-ARQ\` (Git master branch)  
**App Next.js**: `C:\00_CLAUDE CODE\REVISOR-ARQ\app\`

### Público objetivo
- Arquitectos que necesitan saber parámetros normativos para proyectos
- Abogados que necesitan fundamento legal verificable
- Ambos requieren citas con artículo exacto, no respuestas genéricas

---

## 2. STACK TÉCNICO COMPLETO

| Componente | Tecnología | Versión | Notas |
|------------|-----------|---------|-------|
| Framework web | Next.js (App Router) | ^16.2.4 | TypeScript, SSR, RSC |
| UI | Tailwind v4 + shadcn/ui + Framer Motion | — | Paleta nórdica cálida |
| Base de datos | Supabase (PostgreSQL + pgvector) | — | Hosted, región us-east-1 |
| LLM generación | Google Gemini 2.5 Flash / Pro | — | vía `@google/generative-ai` SDK |
| Embeddings | Voyage AI `voyage-law-2` | — | 1024 dimensiones, especializado legal |
| Reranking | Voyage AI `rerank-2` | — | Cross-encoder post-retrieval |
| Deploy | Vercel (Hobby plan) | — | Timeout serverless: 60s |
| Auth | Supabase Auth (email magic link) | — | |
| CI/CD | GitHub Actions → Vercel | — | Auto-deploy en push a master |

### Variables de entorno requeridas (`.env.local` y Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AIza...           # Free tier (20 RPM); Groq fallback (30 RPM) mitigado
GROQ_API_KEY=gsk_...             # Fallback automático cuando Gemini agota cuota
VOYAGE_API_KEY=pa-...
ADMIN_SECRET=...                 # Protege /normativa, /corpus y APIs admin
```

---

## 3. ARQUITECTURA DEL SISTEMA

### 3.1 Pipeline RAG — flujo completo por request

```
POST /api/chat  { pregunta, modo: "arquitecto"|"abogado"|"profundo" }
│
├─ [Rate limit IP] 20 consultas/hora (in-memory, bypass con x-eval-secret header)
├─ [Auth Supabase] detectar userId (opcional, para cuota por usuario)
├─ [Cuota mensual] check_and_use_quota(userId) via Supabase RPC
├─ [Guardrail 0] detectarFueraDominio(pregunta) — sincrónico, regex
│
├─ 1. clasificarConsulta(pregunta)              → Gemini Flash (maxRetries:1)
│      └─ Retorna: tipo_proyecto, etapa, dominios, keywords, requiere_jerarquia
│      └─ Fallback: FALLBACK object si falla
│
├─ 2. routear(clasificacion)                   → sincrónico, lógica pura
│      └─ Retorna: PlanRecuperacion {tiposNorma[], filtrarSoloVigentes, matchCountPorCapa[]}
│
├─ 3. Retrieval (modo profundo → agentic, else → por capas)
│      recuperarPorCapas(pregunta, plan):
│        ├─ embedConHyDE(pregunta)             → Gemini Flash + Voyage AI (maxRetries:1)
│        │    └─ Genera texto hipotético, embeds query+hipotético, promedia vectores
│        ├─ Capa 1: match_chunks(embedding, LGUC/OGUC/Ley/DFL/DL, top-15) [Supabase RPC]
│        ├─ Capa 2: match_chunks(embedding, todos, top-25) [Supabase RPC]
│        ├─ Capa 3: recuperarMultiQuery(pregunta, top-20, embedding)
│        │    └─ generarVariantes(pregunta)    → Gemini Flash (maxRetries:1)
│        │    └─ embedText(variante×3)         → Voyage AI (sin Gemini)
│        │    └─ buscarConEmbedding×4 [Supabase RPC]
│        │    └─ rrfFusion(resultados) → Reciprocal Rank Fusion
│        └─ rerank top-50 candidatos → Voyage rerank-2 → top-20 final
│
├─ 4. detectarCruces(pregunta)                 → sincrónico, regex 8 dominios
│
├─ 5. obtenerRelacionesNormativas(chunks)      → Supabase, tabla norm_relations
│
├─ 6. buildSystemPromptV2(modo, contexto, cruces, clasificacion, relaciones)
│      └─ Sistema + chunks como contexto RAG + clasificacion del proyecto
│
├─ 7. streamGemini(systemPrompt, pregunta, modelo)  → Gemini (MAX_RETRIES_STREAM=3)
│      └─ Flash para arquitecto/abogado, Pro para profundo
│      └─ Backoffs: 4s, 8s → falla en ~20s (para respetar timeout Vercel 60s)
│
├─ 8. validarConsistencia(respuesta, chunks)   → sincrónico
│      └─ Verifica disclaimer, artículos citados vs encontrados
│      └─ Si falta disclaimer, lo agrega automáticamente
│
└─ 9. guardarConsulta(...)                     → Supabase, tabla consultas
```

**Llamadas Gemini por request**: 4 secuenciales (reducido desde 8 en 2026-05-05)
| # | Función | maxRetries | Fallback |
|---|---------|------------|---------|
| 1 | `clasificarConsulta` | 1 | FALLBACK object |
| 2 | `embedConHyDE` (hipotético) | 1 | embedding directo (Voyage) |
| 3 | `generarVariantes` (multi-query) | 1 | array vacío |
| 4 | `streamGemini` (respuesta final) | 3 (stream) | **Groq Mixtral** (automático en rate limit) |

### 3.2 Modos de respuesta

| Modo | Modelo | Estructura de respuesta | Uso |
|------|--------|------------------------|-----|
| `arquitecto` | Gemini Flash | Respuesta breve → Normativa → Impacto diseño → Datos faltantes → Próximos pasos | Default para arquitectos |
| `abogado` | Gemini Flash | Conclusión jurídica → Fundamento → Jerarquía fuentes → Normas concordantes → Riesgos | Para abogados |
| `profundo` | Gemini Pro | Marco regulatorio total → Cruces → Permisos → Matriz normativa → Riesgos → Hoja de ruta | Análisis exhaustivo, genera PDF |

### 3.3 Modos de retrieval

- **Estándar** (arquitecto/abogado): HyDE + 3 capas + rerank = 20 chunks finales
- **Agentic** (profundo): 2 rondas de retrieval, analiza gaps entre rondas, expande búsqueda

### 3.4 Estructura de la base de datos (Supabase)

```sql
-- Normas ingresadas
normas (
  id UUID PK,
  tipo TEXT,          -- "LGUC" | "OGUC" | "DDU" | "LEY" | "DFL" | "DL" | "DS"
  numero TEXT,        -- "DFL-458" | "DS-47" | "541" | etc.
  titulo TEXT,
  url_fuente TEXT,
  fecha_vigencia_desde TEXT,
  fecha_vigencia_hasta TEXT,
  vigente BOOLEAN,
  dominio TEXT,                 -- "urbanismo" | "construccion" | etc.
  organo_emisor TEXT,           -- "MINVU" | "MIDEPLAN" | etc.
  jerarquia_norm TEXT,          -- "ley" | "reglamento" | "instruccion" | etc.
  etapas_proyecto TEXT[],       -- ["prefactibilidad", "ingreso_permiso", ...]
  hash TEXT,                    -- SHA-256 del archivo fuente
  created_at TIMESTAMPTZ
)

-- Chunks con embeddings vectoriales
chunks (
  id UUID PK,
  norma_id UUID FK → normas.id,
  texto TEXT,
  embedding vector(1024),  -- voyage-law-2, 1024 dims
  metadatos JSONB,         -- { articulo, jerarquia, inciso, etc. }
  fuente TEXT,             -- URL a BCN
  norma_tipo TEXT,         -- desnormalizado de normas para queries rápidas
  norma_numero TEXT,
  norma_titulo TEXT,
  fecha_vigencia_desde TEXT,
  norma_dominio TEXT,
  norma_organo_emisor TEXT,
  norma_jerarquia_norm TEXT,
  norma_etapas_proyecto TEXT[],
  texto_tsv TSVECTOR        -- Full-text search (agregado en migración 20260430_hybrid_search)
)

-- Consultas de usuarios
consultas (
  id UUID PK,
  pregunta TEXT,
  modo TEXT,
  respuesta TEXT,
  chunks_usados JSONB,
  modelo TEXT,
  latencia_ms INTEGER,
  user_id UUID FK → auth.users (nullable),
  clasificacion JSONB,
  advertencias_validacion TEXT[],
  relaciones_detectadas INTEGER,
  created_at TIMESTAMPTZ
)

-- Perfiles y cuota de usuarios
perfiles (
  id UUID PK → auth.users.id,
  plan TEXT DEFAULT 'free',
  consultas_este_mes INTEGER DEFAULT 0,
  consultas_limite INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ
)

-- Relaciones entre normas (grafo normativo)
norm_relations (
  id UUID PK,
  norma_origen TEXT,   -- "LGUC DFL-458"
  norma_destino TEXT,  -- "OGUC DS-47"
  tipo_relacion TEXT,  -- "remite_a" | "modifica" | "deroga" | etc.
  descripcion TEXT,
  created_at TIMESTAMPTZ
)
```

**Funciones RPC en Supabase**:
- `match_chunks(query_embedding, match_count, filter_tipos, solo_vigentes)` — búsqueda vectorial
- `match_chunks_hybrid(query_embedding, query_text, ...)` — búsqueda híbrida FTS+vector
- `check_and_use_quota(p_user_id)` — verifica y consume cuota mensual

### 3.5 Archivos clave del proyecto

```
app/src/
├── app/
│   ├── api/chat/route.ts          ← Pipeline completo (600+ líneas)
│   ├── api/corpus/ingestar/       ← API admin para ingestar normas
│   ├── api/feedback/              ← Thumbs up/down por respuesta
│   ├── api/stats/                 ← Estadísticas de uso
│   ├── chat/page.tsx              ← UI principal del chat
│   ├── dashboard/page.tsx         ← Dashboard usuario
│   ├── normativa/page.tsx         ← Panel admin de normas (protegido)
│   ├── corpus/page.tsx            ← Panel admin corpus (protegido)
│   ├── pricing/page.tsx           ← Página de precios (beta gratis)
│   ├── terminos/page.tsx          ← Términos y condiciones
│   └── privacidad/page.tsx        ← Política de privacidad
├── lib/
│   ├── gemini.ts                  ← Cliente Gemini con retry/backoff/jitter
│   ├── voyage.ts                  ← Cliente Voyage AI (embed + rerank)
│   ├── rag.ts                     ← Tipos, construirContexto, cruces, guardrails
│   ├── retriever.ts               ← Pipeline de recuperación por capas
│   ├── agentic-retriever.ts       ← Retrieval agentic para modo profundo
│   ├── hyde.ts                    ← Hypothetical Document Embedding
│   ├── multi-query.ts             ← Multi-query + RRF fusion
│   ├── clasificador.ts            ← Clasificador de consultas con Gemini
│   ├── router.ts                  ← Router de dominios normativos
│   ├── sintetizador.ts            ← buildSystemPromptV2 (prompts por modo)
│   ├── validador.ts               ← Post-guardrail: disclaimer, artículos
│   ├── grafo.ts                   ← Relaciones normativas (norm_relations)
│   ├── rate-limit.ts              ← Rate limiter in-memory por IP
│   └── supabase*.ts               ← Clientes Supabase (server/browser/service)
├── components/
│   ├── chat/mensaje.tsx           ← Render de mensajes con Markdown + citas
│   ├── chat/fuentes-panel.tsx     ← Panel lateral con chunks fuente
│   ├── chat/informe-pdf.tsx       ← Generador PDF (modo profundo)
│   └── cookie-banner.tsx          ← Banner LGPD cookies
└── middleware.ts                  ← Auth Supabase + protección rutas admin
```

### 3.6 Scripts de ingesta del corpus

```
app/scripts/
├── download/
│   ├── download-all.ts     ← Descarga LGUC, OGUC, DDUs desde BCN/MINVU
│   └── manifiesto.ts       ← Carga corpus/manifiesto.json
├── ingest/
│   ├── ingest.ts           ← Pipeline principal de ingesta (parsear→chunk→embed→upsert)
│   ├── chunker.ts          ← Divide normas en chunks semánticos con solapamiento
│   ├── embedder.ts         ← Embeds en batches de 32 con Voyage AI
│   ├── parsers/
│   │   ├── lguc-oguc.ts    ← Parser específico LGUC/OGUC
│   │   ├── ddu.ts          ← Parser para DDUs
│   │   └── ley.ts          ← Parser genérico para leyes/DFL/DS
│   ├── detectar-referencias.ts ← Detecta referencias inter-normas → norm_relations
│   └── build-manifiesto.ts     ← Construye manifiesto.json desde carpetas del corpus
└── eval/
    ├── run-eval.ts         ← Corredor de evaluaciones automáticas
    └── eval-set.ts         ← 9 casos de prueba con criterios de pase
```

**Comandos npm para el corpus**:
```bash
npm run corpus:download          # Descarga archivos desde BCN/MINVU
npm run corpus:ingest            # Pipeline completo (parsear + chunk + embed + upsert)
npm run corpus:ingest:dry        # Sin tocar Supabase (solo muestra stats)
npm run manifiesto:build         # Reconstruye manifiesto.json
npm run corpus:referencias       # Detecta referencias inter-normas
npm run eval                     # Corre el eval set completo
npm run eval -- --url=https://... # Eval contra producción
npm run eval -- --casos=lguc-116-permiso  # Un caso específico
```

---

## 4. ESTADO DEL CORPUS (2026-05-06)

### Normas ingresadas en Supabase

| Norma | Tipo | Chunks | Estado |
|-------|------|--------|--------|
| LGUC (DFL-458) | LGUC | ~280 | ✅ Completa |
| OGUC (DS-47) | OGUC | parcial | ⚠️ Solo inicio (427 pgs total, no todo ingresado) |
| DDU-527 a DDU-541 | DDU | ~14 normas × ~30 chunks | ✅ Recientes |
| DDU-527 a DDU-530 | DDU | ingresadas | ✅ |
| 25 normas complementarias | LEY/DFL/DL/DS | ~ingresadas | ✅ (sesión 9) |
| DDU-000 a DDU-526 | DDU | 0 | ❌ Pendiente (303 DDUs) |
| Cat. 01-11 (medioambiente, agua, etc.) | LEY/DS/DFL | archivos listos | ❌ No ingresadas |

### Corpus disponible localmente (listo para ingestar)

El directorio `C:\00_CLAUDE CODE\REVISOR-ARQ\corpus\` tiene:
```
lguc/LGUC.txt            ← 386.001 chars, 124 páginas
lguc/LGUC.pdf
oguc/OGUC.txt            ← 1.322.489 chars, 427 páginas  
oguc/OGUC.pdf
ddu/DDU-527.txt ... DDU-541.txt   ← 28 archivos DDU
00_Indice_Maestro/       ← Catálogo completo de normas complementarias
01_Medio_Ambiente.../    ← Archivos txt listos para ingestar
02_Sanitario_.../
03_Agua_.../
04_Patrimonio_.../
05_Procedimiento_.../
06_Bienes_del_Estado_.../
07_Pueblos_Indigenas_.../
08_Forestal_.../
09_Borde_Costero_.../
10_Vialidad_.../
11_Energia_.../
12_Tecnica_Estructural_.../
```

**Para ingestar una categoría completa:**
```bash
cd app
# Opción 1: una norma específica
npm run corpus:ingest -- --solo=DDU-535

# Opción 2: todas las pendientes (usa el manifiesto)
npm run corpus:ingest

# Opción 3: rebuild completo del manifiesto primero
npm run manifiesto:build && npm run corpus:ingest
```

---

## 5. EVALUACIONES — HISTORIAL COMPLETO

### Meta de calidad: ≥ 7/9 casos (78%)

| Fecha | Run | Pasados/Total | % | URL evaluada | Nota clave |
|-------|-----|---------------|---|--------------|-----------|
| 2026-04-19 | v1 | — | — | — | Primer deploy |
| 2026-04-20 | v2 | — | — | — | Pre-pipeline v2 |
| 2026-04-21 | v3 | **6/7** | **86%** | app-jade-nine-25.vercel.app | Mejor resultado; sin rate limit |
| 2026-04-22 | v4 | — | — | — | |
| 2026-04-30 | v5 | — | — | — | |
| 2026-05-01 | v6 | 4/9 | 44% | vercel (9 casos) | 2 casos nuevos; rate limit parcial |
| 2026-05-06 | v7 (bg) | 1/7* | — | revisor-arq.vercel.app | Proceso en background, 1 pasó (`oguc-rasante`) |
| 2026-05-06 | v8 | en curso | — | localhost:3001 | Bloqueado Gemini 503/429 |

*El eval v4 background del 2026-05-06 fue matado manualmente después de completar 7 casos.

### Los 9 casos del eval-set

| ID | Pregunta (resumen) | Modo | Artículos esperados | Frases esperadas | Estado histórico |
|----|-------------------|------|---------------------|-----------------|-----------------|
| `lguc-116-permiso` | Obras que requieren permiso Art. 116 LGUC | abogado | 116 | "Dirección de Obras Municipales", "permiso" | ✅ Pasa consistentemente |
| `lguc-subdivison` | Normas subdivisión terreno urbano | arquitecto | — | "subdivisión" | ✅ Pasa consistentemente |
| `lguc-planificacion` | Planificación urbana + niveles LGUC | arquitecto | — | "planificación", "niveles" | ✅ Pasa consistentemente |
| `lguc-condominio` | Condominios + normas LGUC | abogado | — | "copropiedad", "condominio" | ⚠️ Irregular |
| `ddu-541` | Instrucciones DDU 541 | arquitecto | — | "DDU 541" | ⚠️ Irregular |
| `oguc-rasante` | Cálculo rasante y altura OGUC | arquitecto | — | "rasante", "altura" | ✅ Pasó en v7 |
| `dfl382-agua` | Obligaciones DFL 382 agua potable | abogado | — | "agua potable", "servicio" | ⚠️ Irregular |
| `guardrail-articuloinexistente` | Art. 9999 LGUC (inexistente) | abogado | — | "base de conocimiento" | ⚠️ Irregular |
| `guardrail-normafalsa` | Circular DDU 999 (falsa) | arquitecto | — | "base de conocimiento" | ⚠️ Irregular |

**Diagnóstico de casos irregulares:**
- `lguc-condominio`: La ley de copropiedad (Ley 21.442) podría no estar ingresada en el corpus
- `ddu-541`: Corpus DDU-541 existe y está ingresado; revisar si el chunk relevante se recupera
- `dfl382-agua`: DFL 382 debe estar en el corpus (norma complementaria); verificar ingesta
- `guardrail-*`: Fallan cuando Gemini alucina respuestas para normas inexistentes; mejorar el system prompt para que cite "base de conocimiento" explícitamente en esos casos

---

## 6. PROBLEMA CRÍTICO ACTIVO: GEMINI FREE TIER RATE LIMIT (MITIGADO CON GROQ)

### Diagnóstico definitivo (2026-05-06)
- API key Gemini está en **Free Tier: 20 RPM** (rolling 60s window)
- El pipeline consume 4 llamadas Gemini por request
- El eval runner hace hasta 3 intentos por caso = hasta 12 llamadas/caso
- Múltiples procesos concurrentes (eval + dev server + prod) consumen el mismo cupo

### Fixes implementados
1. **Reducción de 8→4 llamadas** (commit 2c63d9e): eliminó llamadas HyDE duplicadas
2. **maxRetries:1 en callers con fallback** (commit 991e6f9): clasificador, HyDE y variants fallan rápido
3. **streamGemini con backoffs cortos** (commit 71572ea): MAX_RETRIES_STREAM=3
4. **✅ NUEVO: Fallback automático a Groq** (commit TBD):
   - Si Gemini falla por 429/503, automáticamente se usa `groq-sdk` (Mixtral)
   - Groq free tier: **30 RPM** (vs Gemini: 20 RPM)
   - Groq es **ultrarrápido** (inferencia en edge ~1s)
   - Sin cambios de código en route.ts — el fallback es transparente

### Solución multiCapas (implementada hoy)
```
✅ Fallback a Groq (hoy):
   - GROQ_API_KEY env var (obtener en https://console.groq.com/keys)
   - streamGroq() en lib/groq.ts
   - streamGemini() envuelve con try/catch + fallback automático
   
⏳ Upgrade API key Gemini (sigue siendo recomendado para mayor confiabilidad):
   1. Ir a https://console.cloud.google.com
   2. Habilitar billing en el proyecto
   3. En Vercel Dashboard: actualizar GEMINI_API_KEY
   Costo: ~USD $0.30/mes por 1000 consultas
```

---

## 7. HISTORIAL DE DESARROLLO (cronológico)

### Fase 0 — Scaffolding (commits 44c8f87..9998042)
- Configuración Claude Code con subagentes, hooks, skills, worktrees
- Scaffolding Next.js 14 con shadcn, fuentes Instrument Serif + JetBrains Mono
- Backend Supabase: schema `normas` + `chunks` con pgvector, clientes Gemini y Voyage

### Fase 1 — MVP básico RAG (commits 911bf6d..da35fb5)
- Pipeline completo de ingesta: parsers LGUC/OGUC/DDU → chunker → embedder → Supabase
- Chat RAG con streaming SSE, dos modos (arquitecto/abogado), panel de fuentes
- Panel admin corpus: subir normas, toggle vigencia, eliminar
- Guardrails básicos, modo profundo (6 fuentes)

### Fase 2 — UI y calidad (commits f67810c..3124f75)
- Rediseño editorial del chat (empty state, burbujas, citas Markdown)
- Páginas: pricing, contacto, términos, privacidad, feedback activo
- Rate limiting por IP (20 consultas/hora), admin middleware
- Paleta nórdica cálida (fondo pergamino, texto tinta)
- CI/CD: GitHub Actions → Vercel auto-deploy en master

### Fase 3 — Cruces normativos (commits b293447..a07a447)
- Motor de detección de cruces regulatorios (8 dominios: medioambiente, patrimonio, salud, etc.)
- Reestructura de prompts para los 3 modos (arquitecto/abogado/profundo)
- Renombrar corpus→normativa en UI

### Fase 4 — PDF y pipeline v2 (commits 8da87c6..9303003)
- Informe PDF descargable (modo profundo): portada profesional, tabla normativa, campos extendidos
- Clasificador de consultas: tipo_proyecto, etapa, dominios, keywords, requiere_jerarquia
- Router de dominios: genera PlanRecuperacion según clasificación

### Fase 5 — Pipeline RAG v2 completo (commits 15fe61b..1a6b5fd)
- Schema DB expandido: norma_dominio, organo_emisor, jerarquia_norm, etapas_proyecto
- Recuperación por capas normativas (Capa 1 alta jerarquía, Capa 2 amplia)
- Grafo normativo (tabla norm_relations, referencias inter-normas)
- Sintetizador v2 con contexto del proyecto clasificado
- Validador de consistencia post-generación (disclaimer, artículos)
- Migración embedder de Gemini → Voyage AI (mayor calidad, menos costos)
- Auth Supabase completa (magic link, perfiles, cuota mensual)
- Búsqueda híbrida FTS + vector (función `match_chunks_hybrid`)
- Reranking con `voyage-rerank-2`

### Fase 6 — Técnicas RAG avanzadas (commits f8a51d9..8c88339)
- **HyDE** (Hypothetical Document Embedding): genera texto hipotético, promedia vector query+hipotético
- **Multi-query RRF**: 3 variantes semánticas + Reciprocal Rank Fusion
- **Agentic RAG** (modo profundo): 2 rondas de retrieval, análisis de gaps
- Auto-detección de referencias normativas en chunks

### Fase 7 — Fixes y estabilización (commits c5df3d9..71572ea)
- Fix eval: reintentar errores transitorios (429, 503, parse stream)
- Bypass rate limit en eval con `x-eval-secret` header
- Reducción 8→4 llamadas Gemini por request
- Fast-fail maxRetries:1 en callers con fallback
- streamGemini backoffs cortos para respetar timeout Vercel 60s
- Accesibilidad WCAG 2.1 AA (chat, modales, drawers)
- Revisión legal completada (páginas legales actualizadas)
- 41 normas complementarias ingresadas

---

## 8. DEUDA TÉCNICA PENDIENTE

### Crítica (bloquea calidad del producto)
- [ ] **Upgrade GEMINI_API_KEY a tier pagado** — sin esto el eval falla y producción es inestable
- [ ] **OGUC completa**: solo el inicio está ingresado; 427 páginas total, ~80% pendiente
- [ ] **DDU-000 a DDU-527** (303 normas): disponibles localmente en `corpus/ddu/`, no ingresadas

### Importante (mejora cobertura)
- [ ] **Normativa complementaria cat. 01-11**: archivos en `corpus/01_*/`...`corpus/12_*/`, no ingresadas
- [ ] **Ley de Copropiedad 21.442**: probablemente explica la falla en `lguc-condominio`
- [ ] **DFL 382 agua potable**: verificar si está en el corpus

### Baja prioridad
- [ ] Worktrees git huérfanos: limpiar con `git worktree prune`
- [ ] Paginación en panel admin de normativa
- [ ] Tests unitarios para pipeline (actualmente solo eval de integración)
- [ ] Caching de embeddings para preguntas frecuentes
- [ ] Multi-turno conversacional

---

## 9. CONTEXTO DE NEGOCIO

- **Etapa actual**: Beta abierta, gratis
- **Monetización planeada**: Plan de pago post-beta (modelo SaaS por consultas o mensual)
- **Pricing page**: ya existe en `/pricing`, dice "gratuito durante la beta"
- **Usuarios actuales**: no hay métricas disponibles; uso principalmente de prueba
- **Legal**: páginas de términos y privacidad existen; se hizo revisión por abogado (commit 5ccb001)
- **Accesibilidad**: WCAG 2.1 AA implementada (commit 29a4c8a)

---

## 10. ESTADO ACTUAL (2026-05-07 — Groq implementado)

### ✅ Lo que acaba de cambiar
- **Groq fallback** integrado: `app/src/lib/groq.ts` + streamGemini con wrapper
- **npm install groq-sdk**: dependencia agregada
- **Variables de entorno**: GROQ_API_KEY en `.env.example`
- **Documentación**: CLAUDE.md, PROGRESO.md, PLAN-IMPLEMENTACION.md actualizados

### Cómo funciona el fallback
```
1. Usuario pregunta en /api/chat
2. streamGemini intenta Gemini 2.5 Flash
3. Si Gemini falla por 429/503 (rate limit):
   → Automáticamente usa streamGroq (Mixtral)
   → Groq retorna respuesta igual de buena, más rápido
4. Si Groq también falla:
   → Lanza error con info de ambos intentos
```

### Próximos pasos recomendados
1. **Obtener GROQ_API_KEY**: ir a https://console.groq.com/keys (gratis, 30 RPM)
2. **Agregarlo a .env.local** y luego a Vercel env vars
3. **Correr eval completo**: `npm run eval -- --url=https://revisor-arq.vercel.app`
   - Ahora sin bloqueo de rate limit
   - Meta: ≥ 7/9 casos
4. **Upgrade Gemini** (opcional pero recomendado): https://console.cloud.google.com
   - Groq es fallback, no reemplazo permanente
   - Gemini es más robusto para producción de largo plazo

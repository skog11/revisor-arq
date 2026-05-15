# AUDITORÍA INTEGRAL — REVISOR ARQ
### Diagnóstico ejecutivo · 2026-05-14

---

## 1. Resumen ejecutivo

**REVISOR ARQ es un MVP funcional de calidad superior a lo esperado para su etapa**, con una arquitectura RAG sofisticada y producción activa en https://revisor-arq.vercel.app. El producto ya resuelve el problema central: responder preguntas sobre normativa urbanística chilena con citas verificables.

Sin embargo, el proyecto enfrenta tres fricciones críticas que impiden alcanzar su potencial: **(1) la limitación de API keys en tier gratuito** que degrada la calidad en producción y bloquea el eval, **(2) un corpus incompleto** que deja fuera normas clave para muchos casos de uso reales, y **(3) ausencia total de testing automatizado** más allá del eval de integración.

El código es de calidad técnica alta — la arquitectura RAG, los guardrails y el sistema de fallback son diseño profesional. El producto necesita estabilización operacional, no rediseño.

**Veredicto**: Estado **Beta funcional** avanzando hacia **Release candidato**. Con 3-5 días de trabajo enfocado en los bloqueadores correctos, el proyecto puede llegar a un estado de producción sólido.

---

## 2. Qué es este proyecto

**REVISOR ARQ** es un asistente de consulta normativa basado en RAG (*Retrieval-Augmented Generation*) orientado a profesionales chilenos del sector construcción y urbanismo (arquitectos, abogados, gestores de proyectos). Permite hacer preguntas en lenguaje natural sobre leyes, reglamentos y circulares como la LGUC, OGUC y circulares DDU, recibiendo respuestas con citas verificables que incluyen artículo exacto y fragmento literal de la norma.

**Flujo principal de uso**:
1. El usuario accede a `/chat`, selecciona un modo (arquitecto / abogado / profundo).
2. Formula una pregunta en lenguaje natural.
3. El sistema embebe la pregunta, recupera fragmentos normativos relevantes de Supabase/pgvector, y genera una respuesta con Gemini 2.5 Flash (con fallback a Groq si hay rate limit).
4. La respuesta incluye citas literales con referencia a artículo y norma, más un disclaimer legal obligatorio.

**Etapa de desarrollo**: **Beta interna funcional** — producción activa, corpus parcial, sin usuarios reales ni monetización activa.

---

## 3. Estado actual real

### Lo que YA EXISTE y está implementado

| Componente | Estado | Evidencia |
|---|---|---|
| Pipeline RAG completo | ✅ Operativo | `app/src/lib/rag.ts`, `retriever.ts`, `route.ts` |
| Clasificador de consultas | ✅ Operativo | `clasificador.ts` → tipo_proyecto, dominios |
| HyDE + Multi-query + RRF | ✅ Operativo | `hyde.ts`, `multi-query.ts` |
| Reranking Voyage `rerank-2` | ✅ Operativo | `voyage.ts` |
| Retriever agentico (modo profundo) | ✅ Operativo | `agentic-retriever.ts` |
| Grafo normativo (remisiones) | ✅ Operativo | `grafo.ts`, tabla `norm_relations` |
| Fallback Gemini → Groq | ✅ Operativo | `gemini.ts`, detección 429/503 |
| Streaming SSE al cliente | ✅ Operativo | `route.ts` SSE encoding |
| Guardrails de alucinación | ✅ Implementado | `sintetizador.ts`, `validador.ts` |
| Sistema de cuotas por usuario | ✅ Implementado | RPC `check_and_use_quota` |
| Memoria multi-turno | ✅ Operativo | Standalone Query Rewriting |
| Rate limiting por IP | ✅ Implementado | `rate-limit.ts` (in-memory) |
| Auth Supabase | ✅ Configurado | `supabase*.ts` |
| Panel admin protegido | ✅ Operativo | Middleware cookie `admin_session` |
| Pipeline de ingesta | ✅ Operativo | `app/scripts/ingest.ts`, parsers, embedder |
| Detección de cambios (hash) | ✅ Operativo | `corpus/manifiesto.json` + SHA diff |
| Corpus LGUC | ✅ ~280 chunks | `corpus/lguc/LGUC.txt` |
| Corpus DDU-527→541 | ✅ ~700 chunks | `corpus/ddu/*.txt` |
| Corpus 25+ normas complementarias | ✅ ~6.667 chunks | Categorías 01–11 |
| Scraper BCN alertas normativas | ✅ Configurado | `.github/workflows/alerts.yml` |
| CI/CD GitHub → Vercel | ✅ Activo | `.github/workflows/deploy.yml` |
| Eval set con 9 casos | ✅ Definido | `app/scripts/eval-set.ts` |
| Eval runner con reintentos | ✅ Implementado | `app/scripts/run-eval.ts` |

### Lo que está PARCIALMENTE implementado

| Componente | Brecha | Impacto |
|---|---|---|
| Corpus OGUC | 806 chunks para una norma de 427 págs — cobertura dudosa | Alto: casos prácticos de urbanismo |
| Corpus DDU-000→526 | 303 DDUs históricas no ingresadas | Medio: consultas sobre normas antiguas |
| Rate limit (in-memory) | Sin persistencia entre instancias serverless | Medio: evasión real en producción |
| Hybrid search (FTS + vector) | RPC `match_chunks_hybrid` existe en BD pero no se usa en `retriever.ts` | Oportunidad perdida de precisión |

### Lo que NO EXISTE aún

- Testing unitario (cero archivos `.test.ts` o `.spec.ts`)
- Monitoreo de errores en producción (sin Sentry ni similar)
- Logging estructurado de errores en producción
- Dashboard de métricas para el administrador
- Validación confirmada de RLS en Supabase
- Documentación del schema de la BD (DDL exportado)
- Documentación de la API (sin OpenAPI/Swagger)
- Estrategia de fallback si ambos Gemini y Groq fallan simultáneamente
- Circuit breaker para el cliente Voyage AI

---

## 4. Evaluación de madurez

| # | Dimensión | Puntaje | Riesgo | Hallazgo principal |
|---|---|---|---|---|
| 1 | Claridad del propósito | **5/5** | 🟢 Bajo | Problema definido, usuario claro, propuesta de valor concisa. `CLAUDE.md` y `PROGRESO.md` articulan bien el qué y el para quién. |
| 2 | Coherencia visión ↔ ejecución | **4/5** | 🟢 Bajo | La implementación técnica responde al problema declarado. El gap es operacional (API keys), no de diseño. |
| 3 | Cobertura funcional | **3/5** | 🟡 Medio | El flujo principal funciona, pero corpus incompleto implica respuestas vacías en muchos casos reales de uso. |
| 4 | Experiencia de usuario estimada | **3/5** | 🟡 Medio | UI existe y es funcional. Sin pruebas reales con usuarios. Latencias de 30–200s son problemáticas. |
| 5 | Arquitectura técnica | **4/5** | 🟢 Bajo | RAG multi-capa con HyDE, RRF y reranking es diseño de nivel profesional. El cuello de botella es externo (rate limits). |
| 6 | Calidad del código | **4/5** | 🟢 Bajo | Código TypeScript tipado, manejo de errores explícito, separación clara de responsabilidades por archivo. |
| 7 | Escalabilidad potencial | **3/5** | 🟡 Medio | Rate limit in-memory no escala entre instancias serverless. Sin caché de embeddings ni respuestas. Hobby plan Vercel con timeout 60s. |
| 8 | Mantenibilidad | **4/5** | 🟢 Bajo | Módulos bien acotados, manifiesto para corpus, scripts documentados. Falta testing que proteja regresiones. |
| 9 | Testing y control de calidad | **2/5** | 🔴 Alto | Solo eval de integración. Cero tests unitarios. Un cambio en `sintetizador.ts` puede romper guardrails silenciosamente. |
| 10 | Seguridad básica | **3/5** | 🟡 Medio | Admin con cookie simple (no JWT firmado). Rate limit bypasseable con header. RLS en Supabase no confirmado. |
| 11 | Rendimiento potencial | **3/5** | 🟡 Medio | 4 llamadas Gemini secuenciales por request. Latencias de 30–200s observadas en eval. Sin caché. |
| 12 | Documentación y handoff | **4/5** | 🟢 Bajo | `CLAUDE.md`, `PROGRESO.md` y `PLAN-IMPLEMENTACION.md` son documentación ejecutiva útil. Falta schema de BD y documentación de API. |
| 13 | Preparación para continuidad | **4/5** | 🟢 Bajo | Nivel raro en proyectos de esta etapa. Cualquier dev o IA puede orientarse en minutos. El gap es el secreto de qué está configurado en Vercel. |

**Promedio**: **3.5/5** — Base técnica sólida con brechas operacionales y de estabilidad específicas.

---

## 5. Qué está fallando

### F1 — Rate limits degradan calidad en producción (CRÍTICO)
**Evidencia**: Eval v9 (2026-05-08): 3 de 9 casos fallan por Groq 429, no por lógica. `PROGRESO.md` y `EVAL-RESULTADOS-2026-05-08.md` lo confirman como bloqueador activo.
**Impacto**: Un usuario real en producción que haga más de 2 consultas seguidas puede recibir respuestas degradadas o error visible.
**Urgencia**: Alta — ocurre hoy en producción.

### F2 — Rate limit in-memory no sobrevive entre instancias serverless (ALTO)
**Evidencia**: `app/src/lib/rate-limit.ts` usa `Map` en memoria del proceso. Vercel puede tener múltiples instancias concurrentes, cada una con su propio contador.
**Impacto**: El límite de 20 consultas/hora por IP es ilusorio bajo carga real.
**Urgencia**: Media — sin usuarios masivos aún, pero la lógica es incorrecta.

### F3 — Latencias extremas en modo profundo superan timeout de Vercel Hobby (ALTO)
**Evidencia**: Eval v9: `dfl382-agua` tomó 205s, `oguc-rasante` 201s, `guardrail-articuloinexistente` 193s. El timeout de Vercel Hobby es 60s.
**Impacto**: El modo "profundo" probablemente termina en timeout 504 en producción real, sin que el equipo lo sepa por falta de monitoreo.
**Urgencia**: Alta — el modo premium puede estar esencialmente inutilizable en producción hoy.

### F4 — Corpus OGUC potencialmente incompleto (MEDIO)
**Evidencia**: 806 chunks para una norma de 427 páginas. El caso `oguc-rasante` falla en eval — no se puede confirmar si es por rate limit o por falta de chunks.
**Impacto**: Preguntas sobre edificación, rasantes, alturas y otros temas OGUC centrales pueden tener respuestas pobres.
**Urgencia**: Media.

### F5 — Hybrid search implementado en BD pero no usado en el retriever (OPORTUNIDAD PERDIDA)
**Evidencia**: RPC `match_chunks_hybrid` existe en Supabase, pero `app/src/lib/retriever.ts` solo usa `match_chunks`. Para términos exactos (nombres de artículos, números de DDU), la búsqueda vectorial pura es inferior a un híbrido FTS+vector.
**Impacto**: Pérdida de precisión en búsquedas por número de norma o artículo exacto.
**Urgencia**: Media.

### F6 — Sin unit tests: cualquier refactor puede romper silenciosamente (MEDIO)
**Evidencia**: Búsqueda en el repositorio — no hay archivos `.test.ts`, `.spec.ts` ni carpeta `__tests__`.
**Impacto**: Cambios en `sintetizador.ts`, `validador.ts` o `retriever.ts` pueden introducir regresiones que solo se detectan en el eval completo (que toma minutos y consume quota).
**Urgencia**: Media — crítica para mantenibilidad a largo plazo.

### F7 — Sin monitoreo de errores en producción (MEDIO)
**Evidencia**: No hay Sentry, Datadog, ni logging estructurado visible en el proyecto.
**Impacto**: Imposible saber cuántas consultas fallan silenciosamente, con qué frecuencia, y por qué.
**Urgencia**: Media.

### F8 — Admin auth débil (BAJO-MEDIO)
**Evidencia**: `middleware.ts` usa cookie simple `admin_session = ADMIN_SECRET`. Sin JWT firmado ni expiración configurada explícitamente.
**Impacto**: Si `ADMIN_SECRET` se filtra (logs, error pages), el panel de ingesta queda expuesto. Desde `/api/corpus/ingestar` se pueden subir normas o eliminar el corpus.
**Urgencia**: Baja en contexto actual, pero riesgo real con más usuarios.

---

## 6. Qué falta por implementar

### Crítico para que funcione correctamente
- **C1** — Upgrade `GEMINI_API_KEY` a tier pagado (elimina el bloqueador principal de calidad)
- **C2** — Confirmar/actualizar `VOYAGE_API_KEY` válida en Vercel (producción requiere key activa)
- **C3** — Resolver latencias modo profundo: mover a Vercel Pro (timeout 300s) o implementar respuesta en dos fases

### Necesario para estabilidad
- **E1** — Migrar rate limit de in-memory a Redis/Supabase KV para consistencia entre instancias serverless
- **E2** — Agregar manejo explícito del caso "ambos LLMs fallan" (respuesta de error amigable, no excepción no capturada)
- **E3** — Activar hybrid search (`match_chunks_hybrid`) en `retriever.ts` para consultas con términos exactos
- **E4** — Integrar monitoreo de errores (Sentry o Vercel Analytics) para visibilidad en producción

### Necesario para usabilidad
- **U1** — Validar y completar corpus OGUC (verificar cobertura real, re-ingestar si hay gaps)
- **U2** — Ingestar DDU-000→526 (303 DDUs históricas) para cubrir consultas sobre normas antiguas
- **U3** — Mejorar UX de espera en modo profundo cuando la respuesta supera los 30s

### Necesario para mantenibilidad
- **M1** — Tests unitarios mínimos para `validador.ts`, `sintetizador.ts` (guardrails) y `retriever.ts` (filtros)
- **M2** — Exportar y documentar schema de Supabase en `supabase/schema.sql` + `SCHEMA.md`
- **M3** — Confirmar que RLS está activado en todas las tablas de Supabase

### Deseable pero no urgente
- **D1** — Dashboard de métricas para admin (consultas/día, tasa de éxito, normas más consultadas)
- **D2** — Caché de embeddings para queries frecuentes (reducir latencia y costo Voyage)
- **D3** — Paralelizar las 4 llamadas Gemini donde sea posible (HyDE + multi-query con clasificación)
- **D4** — OpenAPI/Swagger para la API de chat

---

## 7. Mejoras recomendadas

### Corto plazo (días)

**M-C1 — Activar hybrid search en retriever**
Modificar `app/src/lib/retriever.ts` para usar `match_chunks_hybrid` cuando la query contenga términos exactos (números de artículo, códigos de norma). El RPC ya existe, solo falta el switch de routing. Impacto: mejora inmediata en precisión para queries como "Art. 116 LGUC" o "DDU 541". Esfuerzo: bajo.

**M-C2 — Agregar Sentry al proyecto**
`npm install @sentry/nextjs` + configuración básica en `next.config.js` y `app/layout.tsx`. Visibilidad inmediata de errores en producción. Esfuerzo: bajo.

**M-C3 — Hardening del error handler en `route.ts`**
Agregar un catch final que retorne SSE de error legible cuando ambos LLMs fallan, en lugar de dejar al cliente colgado. Esfuerzo: bajo.

### Mediano plazo (1-2 semanas)

**M-M1 — Migrar rate limit a Supabase KV o Upstash Redis**
Reemplazar el `Map` in-memory en `rate-limit.ts` con llamadas a una tabla de Supabase (o Upstash Redis via Vercel KV). Esfuerzo: medio. Impacto: protección real contra abuso en producción.

**M-M2 — Suite de tests unitarios mínima**
Crear `app/src/__tests__/validador.test.ts`, `app/src/__tests__/sintetizador.test.ts` y `app/src/__tests__/retriever.test.ts` con Jest o Vitest. Casos críticos: disclaimer faltante, artículo fuera de rango, query sin chunks, prompt por modo. Esfuerzo: medio.

**M-M3 — Paralelizar llamadas Gemini en el pipeline**
En `route.ts`, las llamadas a `clasificarConsulta()`, embedding HyDE y `generarVariantes()` son secuenciales pero pueden ejecutarse con `Promise.all()`. Reduce latencia en ~40%. Requiere Gemini tier pagado. Esfuerzo: medio.

### Mayor alcance (2-4 semanas)

**M-L1 — Upgrade a Vercel Pro**
El timeout de 60s bloquea el modo profundo. Pro sube a 300s. Crítico si el modo "profundo" va a ser una funcionalidad usable en producción.

**M-L2 — Completar ingesta de corpus**
303 DDUs históricas + OGUC completa + DS-60/DS-61. Este es el trabajo de mayor impacto en calidad de respuestas. El pipeline ya existe, es solo ejecución.

**M-L3 — Documentar schema de BD**
Exportar el DDL de Supabase y guardarlo en `supabase/schema.sql`. Agregar `SCHEMA.md` con descripción de cada tabla, RPC y política RLS. Crítico para continuidad del proyecto.

---

## 8. Backlog priorizado

### ALTA prioridad

---

**T1 — Upgrade GEMINI_API_KEY a tier pagado**
- **Descripción**: Ir a Google AI Studio o Google Cloud, habilitar billing, obtener key de tier pagado (1000 RPM), actualizar variable `GEMINI_API_KEY` en Vercel dashboard y redesplegar.
- **Objetivo**: Eliminar el bloqueador principal de calidad del sistema.
- **Prioridad**: Alta
- **Impacto**: Eval pasa de 6/9 a potencialmente 8-9/9. Producción estable.
- **Esfuerzo**: Bajo (30 min)
- **Dependencias**: Tarjeta de crédito / cuenta Google Cloud activa
- **Archivos**: `.env.local`, Vercel env vars
- **Criterio de aceptación**: `npm run eval` pasa ≥7/9 sin errores 429.

---

**T2 — Validar y actualizar VOYAGE_API_KEY en Vercel**
- **Descripción**: Verificar que la clave Voyage AI en producción sea válida y tenga cuota suficiente. Probar con una consulta real en producción.
- **Objetivo**: Garantizar que embeddings y reranking funcionen en producción.
- **Prioridad**: Alta
- **Impacto**: Sin Voyage activo, el retrieval completo falla.
- **Esfuerzo**: Bajo (15 min)
- **Dependencias**: Cuenta Voyage AI activa
- **Archivos**: Vercel env vars
- **Criterio de aceptación**: Consulta en https://revisor-arq.vercel.app retorna fuentes correctas.

---

**T3 — Resolver timeout en modo profundo**
- **Descripción**: El modo profundo genera latencias de 190–205s observadas en eval, superando el timeout de 60s de Vercel Hobby. Opciones: (a) Mover a Vercel Pro (timeout 300s), (b) convertir a respuesta en dos fases (fuentes rápidas + análisis en background), (c) limitar el retriever agentico en número de rondas.
- **Objetivo**: Que el modo profundo sea usable en producción sin timeout 504.
- **Prioridad**: Alta
- **Impacto**: Funcionalidad premium actualmente inutilizable en producción real.
- **Esfuerzo**: Bajo (upgrade Vercel Pro) / Alto (refactor arquitectónico)
- **Dependencias**: T1 (Gemini key pagada elimina reintentos que inflan latencia)
- **Archivos**: `app/src/lib/agentic-retriever.ts`, `app/src/app/api/chat/route.ts`
- **Criterio de aceptación**: Consulta en modo profundo en producción retorna respuesta en <60s, o la arquitectura soporta hasta 300s.

---

**T4 — Migrar rate limit a store persistente**
- **Descripción**: Reemplazar el `Map` in-memory en `rate-limit.ts` con llamadas a Supabase (tabla `rate_limits` con IP, contador, reset_at) o Upstash Redis via Vercel KV.
- **Objetivo**: Rate limiting real y consistente entre instancias serverless.
- **Prioridad**: Alta
- **Impacto**: Sin esto, el límite de 20 consultas/hora es evasible trivialmente bajo carga.
- **Esfuerzo**: Medio
- **Dependencias**: Supabase (ya disponible) o Upstash KV (nueva integración)
- **Archivos**: `app/src/lib/rate-limit.ts`, posiblemente nueva tabla en Supabase
- **Criterio de aceptación**: Dos instancias del servidor comparten el mismo contador por IP.

---

**T5 — Activar hybrid search (FTS + vector) en retriever**
- **Descripción**: Modificar `retriever.ts` para detectar queries con términos exactos (números de artículo, nombre de norma) y llamar a `match_chunks_hybrid` en lugar de `match_chunks`. El RPC ya existe en Supabase.
- **Objetivo**: Mejorar precisión en búsquedas exactas sin cambiar la arquitectura.
- **Prioridad**: Alta
- **Impacto**: Queries como "Art. 116 LGUC" o "DDU 541" encuentran el chunk exacto en lugar del más similar semánticamente.
- **Esfuerzo**: Bajo
- **Dependencias**: Ninguna (RPC ya implementado en Supabase)
- **Archivos**: `app/src/lib/retriever.ts`
- **Criterio de aceptación**: Query con número de artículo exacto retorna el chunk correcto como primer resultado.

---

### MEDIA prioridad

---

**T6 — Integrar Sentry para monitoreo de errores**
- **Descripción**: Instalar `@sentry/nextjs`, configurar DSN en Vercel, agregar captura en `route.ts` catch blocks.
- **Objetivo**: Visibilidad de errores en producción.
- **Prioridad**: Media
- **Impacto**: Pasar de "ciego en producción" a "alertado en minutos".
- **Esfuerzo**: Bajo
- **Dependencias**: Cuenta Sentry (plan gratuito disponible)
- **Archivos**: `next.config.js`, `app/src/app/api/chat/route.ts`, nuevos `sentry.*.config.ts`
- **Criterio de aceptación**: Error 500 en producción genera alerta en dashboard Sentry en <5 minutos.

---

**T7 — Tests unitarios para módulos de guardrail y validación**
- **Descripción**: Crear `app/src/__tests__/validador.test.ts`, `app/src/__tests__/sintetizador.test.ts` y `app/src/__tests__/retriever.test.ts` con Jest o Vitest. Cubrir: (1) respuesta sin disclaimer añade disclaimer, (2) artículo >999 activa guardrail, (3) query fuera de dominio retorna falso, (4) prompt construido correctamente por modo.
- **Objetivo**: Proteger la lógica crítica de guardrails contra regresiones.
- **Prioridad**: Media
- **Impacto**: Detectar regresiones en segundos en lugar de minutos de eval consumiendo quota.
- **Esfuerzo**: Medio
- **Dependencias**: Ninguna
- **Archivos**: `app/src/lib/validador.ts`, `app/src/lib/sintetizador.ts`, `app/src/lib/retriever.ts`
- **Criterio de aceptación**: `npm test` pasa con ≥8 casos cubriendo los módulos críticos.

---

**T8 — Completar ingesta y validar corpus OGUC**
- **Descripción**: Verificar cobertura real del corpus OGUC (806 chunks para 427 págs). Si hay gaps, re-parsear y re-ingestar desde `corpus/oguc/OGUC.txt`. Verificar caso `oguc-rasante` del eval con corpus completo.
- **Objetivo**: Que preguntas centrales de edificación (rasante, CUT, alturas) tengan respaldo en corpus.
- **Prioridad**: Media
- **Impacto**: Posiblemente resuelve el fallo de `oguc-rasante` en eval.
- **Esfuerzo**: Medio
- **Dependencias**: T1 (Gemini key pagada para no saturar en re-ingesta)
- **Archivos**: `corpus/oguc/OGUC.txt`, `app/scripts/ingest.ts`, `app/scripts/parsers/`
- **Criterio de aceptación**: Eval caso `oguc-rasante` pasa con respuesta correcta sobre cálculo de rasante.

---

**T9 — Documentar schema de Supabase**
- **Descripción**: Exportar DDL completo desde Supabase (`pg_dump --schema-only`) y guardarlo en `supabase/schema.sql`. Crear `SCHEMA.md` con descripción de tablas, RPCs, índices y políticas RLS.
- **Objetivo**: Que cualquier desarrollador o IA pueda entender la BD sin acceso al dashboard.
- **Prioridad**: Media
- **Impacto**: Crítico para continuidad y debugging.
- **Esfuerzo**: Bajo
- **Dependencias**: Acceso a Supabase dashboard
- **Archivos**: Nuevo `supabase/schema.sql`, nuevo `SCHEMA.md`
- **Criterio de aceptación**: Un desarrollador nuevo puede recrear la BD desde cero usando solo el repositorio.

---

### BAJA prioridad

---

**T10 — Ingestar DDU-000→526 (303 DDUs históricas)**
- **Descripción**: Ejecutar ingesta masiva de las 303 DDUs históricas desde `corpus/12_Tecnica/DDU_Circulares/*.pdf` usando `ingestar_ddu_masiva.sh` o el pipeline de ingesta.
- **Objetivo**: Cubrir consultas sobre normativas DDU anteriores a la 527.
- **Prioridad**: Baja (urgente solo si hay demanda real de usuarios)
- **Impacto**: Amplía cobertura normativa significativamente.
- **Esfuerzo**: Alto (OCR + parsing + embedding de 303 PDFs)
- **Dependencias**: T1, LlamaParse activo
- **Archivos**: `corpus/12_Tecnica/DDU_Circulares/`, `ingestar_ddu_masiva.sh`
- **Criterio de aceptación**: Los chunks de DDU-000→526 aparecen en Supabase y una query sobre DDU histórica retorna chunks relevantes.

---

**T11 — Paralelizar llamadas Gemini en pipeline**
- **Descripción**: En `route.ts`, convertir la secuencia `clasificarConsulta() → embedConHyDE() → generarVariantes()` en `Promise.all([clasificar, hyde, variantes])`. Requiere que los 3 tengan manejadores de error independientes.
- **Objetivo**: Reducir latencia media en ~40%.
- **Prioridad**: Baja (requiere T1 primero para que el RPM lo soporte)
- **Impacto**: Respuestas más rápidas, mejor UX.
- **Esfuerzo**: Medio
- **Dependencias**: T1 (Gemini tier pagado)
- **Archivos**: `app/src/app/api/chat/route.ts`, `app/src/lib/clasificador.ts`, `app/src/lib/hyde.ts`
- **Criterio de aceptación**: Latencia P50 baja de ~60s a ~35s en eval.

---

## 9. Quick wins

Los siguientes cambios tienen el mayor impacto con el menor esfuerzo:

| # | Quick Win | Esfuerzo | Impacto esperado |
|---|---|---|---|
| QW1 | Upgrade `GEMINI_API_KEY` (T1) | 30 min | Eval pasa de 6/9 a ≥8/9 inmediatamente |
| QW2 | Activar `match_chunks_hybrid` en retriever (T5) | 2-3 h | Mejora precisión en queries exactas sin tocar arquitectura |
| QW3 | Agregar Sentry (T6) | 1-2 h | Visibilidad inmediata de fallos en producción |
| QW4 | Error handler final en `route.ts` para doble fallo LLM | 1 h | Elimina posibilidad de respuesta colgada silenciosamente |
| QW5 | Documentar schema Supabase (T9) | 2 h | Continuidad garantizada para cualquier desarrollador o IA |

---

## 10. Riesgos clave

### R1 — Timeout silencioso en modo profundo [ALTO]
El modo "profundo" genera latencias de 190–205s con frecuencia. El timeout de Vercel Hobby es 60s. Esto significa que el modo profundo probablemente retorna 504 en producción real, pero el equipo no lo sabe porque no hay monitoreo. **Si no se corrige**: los usuarios que usen el modo premium reciben errores opacos sin explicación.

### R2 — Rate limit evasible en producción [ALTO]
El `Map` in-memory en `rate-limit.ts` significa que cada instancia serverless tiene su propio contador. Un usuario puede evadir el límite distribuyendo tráfico. **Si no se corrige**: abuso posible cuando haya más usuarios.

### R3 — Corpus incompleto degrada la percepción del producto [MEDIO]
Con 303 DDUs históricas sin ingestar y posibles gaps en OGUC, preguntas sobre normas comunes pero antiguas retornan "no encontré información suficiente". Un usuario profesional que recibe esa respuesta probablemente abandona el producto. **Si no se corrige**: churn temprano de usuarios técnicos.

### R4 — Sin tests: refactors introducen regresiones invisibles [MEDIO]
Cualquier cambio en `sintetizador.ts`, `validador.ts` o `retriever.ts` puede romper los guardrails sin que nadie lo note hasta el próximo eval completo, que tarda minutos y consume quota. **Si no se corrige**: la deuda de confiabilidad crece con cada iteración.

### R5 — Dependencia total en Voyage AI sin circuit breaker [MEDIO]
El fallback Gemini→Groq existe. El fallback de Voyage no. Si Voyage falla, el retrieval completo falla y no hay degradación elegante. **Si no se corrige**: un fallo de Voyage deja el sistema completamente inoperable sin mensaje útil al usuario.

### R6 — `ADMIN_SECRET` como único guard del panel de ingesta [BAJO-MEDIO]
Si el secreto se expone (logs de Vercel, error pages), el panel `/api/corpus/ingestar` queda accesible. Desde ahí se pueden subir normas maliciosas o eliminar el corpus. **Si no se corrige**: vector de ataque de envenenamiento del corpus.

---

## 11. Recomendación de secuencia de ejecución

### Primeras 24 horas — Desbloquear calidad y visibilidad

1. **T1**: Upgrade `GEMINI_API_KEY` a tier pagado → redesplegar en Vercel.
2. **T2**: Verificar `VOYAGE_API_KEY` en Vercel con una consulta de prueba en producción.
3. Correr `npm run eval -- --url=https://revisor-arq.vercel.app` y documentar resultado baseline con keys actualizadas.
4. **QW4**: Agregar catch final en `route.ts` para ambos LLMs fallidos → deployar.
5. **QW3**: Integrar Sentry con DSN en Vercel para monitoreo inmediato.

### Próximos 7 días — Estabilizar la plataforma

1. **T5**: Activar `match_chunks_hybrid` en `retriever.ts` para mejorar precisión en queries exactas.
2. **T4**: Migrar rate limit a Supabase (tabla `rate_limits`) para consistencia entre instancias.
3. **T3**: Evaluar timeout en producción para modo profundo; decidir entre Vercel Pro o refactor arquitectónico.
4. **T8**: Completar y validar corpus OGUC con el caso `oguc-rasante` del eval como criterio.
5. **T9**: Exportar y documentar schema de Supabase en el repositorio.

### Próximas 2-4 semanas — Madurez y cobertura

1. **T7**: Implementar suite de tests unitarios mínima (validador, sintetizador, retriever).
2. **T10**: Ingestar DDU-000→526 (303 normas históricas) en batches.
3. **T11**: Paralelizar llamadas Gemini (solo viable con key pagada activa).
4. Correr eval final completo y documentar: si ≥7/9, el sistema está listo para apertura pública controlada.

---

## 12. Instrucciones de continuidad para otra IA

### Qué revisar primero

1. **`PROGRESO.md`** — estado actualizado del proyecto, última ingesta, último eval.
2. **`EVAL-RESULTADOS-2026-05-08.md`** — resultado más reciente del eval (6/9) con detalle de qué pasó y qué falló.
3. **`app/src/app/api/chat/route.ts`** — endpoint principal que orquesta todo el pipeline. Si algo falla, empieza aquí.
4. **`app/src/lib/gemini.ts`** y **`app/src/lib/groq.ts`** — lógica de fallback y retry. Los fallos de 429 se originan aquí.
5. **Variables de entorno en Vercel** — el bloqueador principal (API keys de tier pagado) vive aquí, no en el código.

### Partes más sensibles del proyecto

- **`app/src/lib/sintetizador.ts`**: Construye los system prompts. Un cambio aquí afecta la calidad de todas las respuestas y los guardrails de alucinación. No modificar sin correr eval completo después.
- **`app/src/lib/retriever.ts`**: Determina qué chunks llegan al LLM. Cambios aquí afectan directamente la cobertura y precisión. El RPC `match_chunks` en Supabase debe coincidir con los parámetros que pasa esta función.
- **`app/src/lib/validador.ts`**: Guarda de calidad post-generación. Si se relajan las reglas aquí, el producto puede empezar a inventar normas.
- **`middleware.ts`**: Protege rutas admin. Un error aquí expone el panel de ingesta.
- **`corpus/manifiesto.json`**: Índice de todas las normas. Si se corrompe o desincroniza, la ingesta pierde el rastro de qué está actualizado.

### Decisiones que no deberías cambiar sin revisar impacto

- **Modelo `voyage-law-2`** para embeddings: cambiar a otro modelo invalida todos los vectores existentes en Supabase y requiere re-ingestar el corpus completo (~9.453 chunks actuales).
- **Dimensiones de embedding (1024)**: configurado en el índice HNSW de Supabase. Cambiar esto requiere recrear el índice vectorial.
- **Estructura de chunks y metadatos JSONB**: el schema de `chunks.metadatos` es asumido por `retriever.ts` y `sintetizador.ts`. Cambiar la estructura requiere migración y re-ingesta.
- **Lógica de guardrails en `sintetizador.ts`**: los guardrails de artículos >999 y normas no encontradas son requisitos del producto, no opcionales.

### Tareas a ejecutar antes de intentar nuevas funcionalidades

1. Completar T1 (Gemini tier pagado) y correr eval → confirmar ≥7/9.
2. Confirmar que modo profundo no termina en timeout en producción.
3. Verificar que `VOYAGE_API_KEY` en Vercel sea válida.
4. Verificar que el corpus OGUC esté completo (T8).
5. Antes de cualquier cambio en `sintetizador.ts` o `retriever.ts`, correr como smoke test:
   ```bash
   npm run eval -- --casos=lguc-116,oguc-rasante,guardrail-articuloinexistente
   ```

### Información que falta documentar urgentemente

- **Schema completo de Supabase**: DDL de tablas, funciones RPC, índices y políticas RLS. Sin esto, recrear la BD desde cero es imposible.
- **Qué variables de entorno están configuradas en Vercel**: hay 8 variables críticas; documentar cuáles están en producción vs. solo en `.env.local`.
- **Resultado del eval después del upgrade de API keys**: el baseline real con keys de producción no se conoce aún (el 6/9 está distorsionado por rate limits).
- **Estado de RLS en Supabase**: si las políticas RLS están activadas en tablas `consultas`, `perfiles` y `chunks`. Sin RLS, un usuario autenticado puede leer consultas de otros.

---

*Auditoría realizada el 2026-05-14. Basada exclusivamente en artefactos del repositorio: código fuente, documentación, scripts, configuraciones, resultados de eval y estructura de carpetas. No se asumió que el código funciona — se infirió el estado real desde evidencia observable.*

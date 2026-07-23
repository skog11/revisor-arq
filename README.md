# REVISOR ARQ

Plataforma de consulta de normativa urbanística y de construcción chilena (LGUC, OGUC, DDU, dictámenes CGR y normativa sectorial). Respuestas con citas verificables a artículos, en modo Arquitecto, Abogado, Profundo — y próximamente modo Público (lenguaje simple para ciudadanos).

**Producción:** https://revisor-arq.vercel.app · **Corpus:** ~384 normas · ~22.500 chunks · 60 dictámenes CGR

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend / Backend | Next.js 16 App Router · TypeScript · Tailwind v4 · shadcn/ui · Framer Motion |
| Base de datos | Supabase (PostgreSQL + pgvector HNSW, cosine, 1024 dims) |
| Generación | Cerebras qwen-3-235b (primario, gratuito) → DeepSeek → Gemini Flash → OpenRouter → Groq |
| Embeddings y rerank | Voyage AI (`voyage-law-2` + `voyage-rerank-2`) |
| Deploy | Vercel · GitHub Actions CI/CD · Playwright E2E |

## Arrancar en local

```bash
git clone https://github.com/skog11/revisor-arq.git
cd revisor-arq/app
cp .env.local.example .env.local   # llenar credenciales
npm install
npm run dev
```

Variables de entorno: ver tabla completa en `PLAN-IMPLEMENTACION.md` (§ Referencia — variables de entorno).

## Pipeline Legal-RAG (7 capas)

```
Pregunta usuario
  │
  ├─ Rate limit + guardrail de dominio
  ├─ Extractor de hechos (regex: acción, estado obra, zona)   extractor-hechos.ts
  ├─ Motor de reglas-gatillo (24 reglas curadas)              motor-reglas.ts
  ├─ Clasificador (LLM) → tipo proyecto + dominios            clasificador.ts
  ├─ Router → plan de recuperación                            router.ts
  │
  ├─ Retriever por capas                                      retriever.ts
  │   ├─ HyDE embedding (Voyage)                              hyde.ts
  │   ├─ Híbrido BM25 + vector (match_chunks_hybrid, 50 candidatos)
  │   ├─ Multi-query RRF (3 variantes)                        multi-query.ts
  │   └─ Rerank voyage-rerank-2 → top 18
  ├─ Chunks obligatorios por reglas-gatillo                   fetcher-normas-obligatorias.ts
  ├─ Modo profundo: agentic retriever (2 rondas)              agentic-retriever.ts
  │
  ├─ Detector de conflictos (lenguaje restrictivo)            detector-conflictos.ts
  ├─ Grafo normativo (LGUC ↔ OGUC ↔ DDU)                      grafo.ts
  ├─ Sintetizador → respuesta con citas (streaming SSE)       sintetizador.ts
  └─ Validador post-síntesis (disclaimer, artículos,          validador.ts
     coherencia restrictiva) + indicador de confianza         confianza.ts
```

## Documentación del proyecto

| Documento | Contenido |
|---|---|
| `PLAN-IMPLEMENTACION.md` | **Roadmap vigente**: plan de 4 fases (fundamentos → corpus territorial Biobío → algoritmo v3 + Tier Público → lanzamiento comercial), KPIs y prioridades |
| `revision-critica-plan-evolucion.md` | Revisión crítica del algoritmo de cruce normativo (2026-07-09) que fundamenta el plan |
| `PROGRESO.md` | Estado detallado: corpus, evals, arquitectura, historial de sesiones |
| `CLAUDE.md` | Instrucciones para sesiones de IA (reglas no negociables, agentes, comandos) |
| `SCHEMA.md` | Esquema de base de datos |

## Proceso de actualización del corpus

El corpus se almacena en `corpus/` (archivos fuente) y en Supabase (embeddings + chunks).

### Agregar una nueva norma

1. Colocar el PDF o texto en la carpeta temática correspondiente bajo `corpus/`.
2. Agregar la entrada al índice maestro con metadatos (tipo, número, fecha, jerarquía).
3. Ejecutar la ingesta:
   ```bash
   cd app
   npm run manifiesto:build   # si se agregaron archivos nuevos
   npm run corpus:ingest      # parsea, chunquea y embedea (detecta cambios por hash)
   ```
4. Verificar con el agente `corpus-ingestion-validator`.
5. Commit y push — deploy automático en Vercel.

> ⚠️ **No paralelizar la ingesta con `bash &`**: bypasea el delay `BETWEEN_NORMAS_MS` y causa race conditions en Voyage/Supabase. Usar `--solo=CLAVE` de a uno o lotes secuenciales.

### Actualizar una norma existente

1. Reemplazar el archivo en `corpus/`; si fue derogada, marcar `vigente = false` en Supabase.
2. `npm run corpus:ingest -- --solo=CLAVE --force`
3. Verificar y hacer commit.

### Vigilancia de vigencia

- Cron semanal (`/api/cron/check-vigencia`) monitorea LGUC, OGUC, LEY-19300 y LEY-21442 en BCN.
- Revisar mensualmente el sitio DDU del MINVU para circulares nuevas.

## Scripts disponibles

```bash
npm run dev                  # Servidor de desarrollo
npm run build                # Build de producción
npm run lint                 # ESLint
npm run corpus:ingest        # Ingestar normas al corpus
npm run manifiesto:build     # Reconstruir manifiesto del corpus
npm run eval                 # Eval contra localhost
npm run eval:prod            # Eval contra producción
```

## CI/CD

GitHub Actions en cada push a `master`: build TypeScript + vitest + deploy a Vercel + smoke tests Playwright post-deploy.
Secrets requeridos: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Aviso legal

Las respuestas de esta herramienta son de carácter informativo y no constituyen asesoría jurídica ni profesional. Ver [Términos y condiciones](https://revisor-arq.vercel.app/terminos) y [Política de privacidad](https://revisor-arq.vercel.app/privacidad).

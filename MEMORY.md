# REVISOR ARQ — Estado del proyecto

> Última actualización: 2026-04-19

## Stack real en producción
- Next.js 15 + TypeScript + Tailwind + shadcn/ui + Framer Motion
- Supabase (pgvector, HNSW cosine 1024 dims)
- Gemini 2.5 Flash (generación streaming)
- Gemini `gemini-embedding-001` (embeddings, 1024 dims, free tier)
- Deploy: local dev (pendiente Vercel)

## Corpus ingresado en Supabase
| Norma        | Chunks | Estado    |
|--------------|--------|-----------|
| LGUC DFL-458 | 280    | ✅        |
| OGUC         | —      | ⏳ pendiente (806 chunks, cuota diaria) |
| DDU-527      | 37     | ✅        |
| DDU-528      | 42     | ✅        |
| DDU-529      | 35     | ✅        |
| DDU-531      | 29     | ✅        |
| DDU-532      | 34     | ✅        |
| DDU-533      | 29     | ✅        |
| DDU-534      | —      | ⏳ pendiente |
| DDU-535      | 42     | ✅        |
| DDU-537      | 24     | ✅        |
| DDU-539      | —      | ⏳ pendiente |
| DDU-540      | 56     | ✅        |
| DDU-541      | 36     | ✅        |
| DDU-530      | —      | ⏳ pendiente |
| DDU-ESP-025-07 | 21   | ✅        |

**Total actual: 665 chunks / 12 normas**

## Comandos para completar corpus
```bash
# Cuando se resetee la cuota de Gemini (medianoche PT):
cd app
npm run corpus:ingest           # ingestará solo las normas pendientes (por hash)
npm run eval                    # correr evaluaciones (7 casos)
```

## Prompts completados
- [x] Prompt 1: Scaffolding Next.js + shadcn
- [x] Prompt 2: Backend Supabase (schema, clientes)
- [x] Prompt 3: Descarga automatizada del corpus
- [x] Prompt 4: Sistema de diseño v2 (landing, header, footer)
- [x] Prompt 5: Pipeline de ingesta (parsers, chunker, embedder, Supabase)
- [x] Prompt 5B: Panel corpus (/corpus)
- [x] Prompt 6: Chat RAG con streaming (modos arquitecto + abogado)
- [x] Prompt 6B: Modo profundo
- [x] Prompt 7: Set de evaluaciones + guardrails

## Pendientes (próxima sesión)
1. **Completar corpus**: ejecutar `npm run corpus:ingest` con cuota fresca → OGUC (806) + DDU-530/534/539
2. **Correr eval**: `npm run eval` → verificar 7/7 cases pasan
3. **UI chat pulido**: revisar diseño con `ui-design-reviewer`
4. **Deploy Vercel**: configurar variables de entorno y primer deploy
5. **Prompt 8** (si aplica): autenticación básica o ajustes finales

## Arquitectura de rutas
- `/` — landing
- `/chat` — consulta RAG (modos arquitecto/abogado/profundo)
- `/corpus` — panel de estado del corpus (admin)
- `/api/chat` — POST streaming SSE
- `/api/corpus/status` — GET estado corpus
- `/api/feedback` — POST thumbs up/down

## Cuota Gemini free tier
- Embeddings: ~1500/día, 100 RPM → se resetea ~medianoche PT
- Generación (Flash): 1500 req/día, 15 RPM
- El ingest usa 700ms entre llamadas (~85 RPM, seguro)

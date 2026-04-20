# REVISOR ARQ

Asistente RAG de normativa chilena de urbanismo y construcción. Responde consultas sobre LGUC, OGUC y DDU con citas verificables de los artículos relevantes.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Supabase** (Postgres + pgvector HNSW) para almacenamiento y búsqueda vectorial
- **Gemini 2.5 Flash** para generación de respuestas (streaming)
- **Gemini Embeddings** (`gemini-embedding-001`, dim 1024) para búsqueda semántica
- **Vercel** para deploy

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

Necesitas:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` — desde [Supabase Dashboard](https://supabase.com/dashboard)
- `GEMINI_API_KEY` — desde [Google AI Studio](https://aistudio.google.com/app/apikey)

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Ingesta del corpus

```bash
# Descargar PDFs (LGUC, OGUC, DDUs)
npm run corpus:download

# Ingestar en Supabase (requiere cuota diaria de Gemini Embeddings)
npm run corpus:ingest

# Dry run sin escribir a Supabase
npm run corpus:ingest:dry

# Reingestar una norma específica aunque no cambió
npm run corpus:ingest -- --force --solo=LGUC_DFL-458
```

El script es idempotente: solo re-embeda normas cuyo hash de contenido cambió.

## Evaluaciones

```bash
npm run eval
```

Requiere servidor local corriendo (`npm run dev`). Genera un reporte en `scripts/eval/resultados/`.

## Modos de respuesta

| Modo | Descripción |
|------|-------------|
| **Arquitecto** | Parámetros técnicos, coeficientes, ejemplos prácticos |
| **Abogado** | Texto literal de artículos, cadena normativa, análisis de vacíos |
| **Profundo** | Análisis exhaustivo multi-norma en 6 secciones estructuradas |

## Deploy en Vercel

1. Conecta el repositorio en [vercel.com](https://vercel.com/new)
2. Configura el **Root Directory** como `app`
3. Agrega las variables de entorno (ver `.env.example`)
4. Deploy

El `vercel.json` configura un timeout de 60s para la ruta `/api/chat` (necesario para el modo Profundo).

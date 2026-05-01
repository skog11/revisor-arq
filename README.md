# REVISOR ARQ

Plataforma de consulta de normativa urbanística y de construcción chilena (LGUC, OGUC, DDU).
Respuestas con citas verificables a artículos, en modo Arquitecto, Abogado o Profundo.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend / Backend | Next.js 14 App Router · TypeScript · Tailwind · shadcn/ui |
| Base de datos | Supabase (PostgreSQL + pgvector) |
| Generación | Google Gemini 2.5 Flash / Pro |
| Embeddings y rerank | Voyage AI (voyage-3 + voyage-rerank-2) |
| Deploy | Vercel · GitHub Actions CI/CD |

## Arrancar en local

```bash
git clone https://github.com/skog11/revisor-arq.git
cd revisor-arq/app
cp .env.local.example .env.local   # llenar credenciales
npm install
npm run dev
```

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_AI_API_KEY=
VOYAGE_API_KEY=
```

## Pipeline RAG

```
Pregunta usuario
  │
  ├─ Clasificador (Gemini Flash) → tipo proyecto + dominios + etapa
  ├─ Router → plan de recuperación (tipos de norma, filtros)
  │
  ├─ Retriever por capas
  │   ├─ Capa 1: alta jerarquía (LGUC, OGUC, Ley, DFL, DL) con HyDE
  │   ├─ Capa 2: todos los tipos del plan con HyDE
  │   └─ Capa 3: multi-query RRF (3 variantes semánticas)
  │
  ├─ Modo profundo: agentic retriever (2 rondas + análisis de gaps)
  ├─ Rerank voyage-rerank-2 → top 20 chunks
  ├─ Grafo normativo → relaciones entre normas
  │
  └─ Sintetizador (Gemini Flash / Pro) → respuesta con citas
       └─ Validador → disclaimer, artículos verificados
```

## Proceso de actualización del corpus

El corpus se almacena en `corpus/` (archivos fuente) y en Supabase (embeddings + chunks).

### Agregar una nueva norma

1. Colocar el PDF o texto en la carpeta temática correspondiente bajo `corpus/`.
2. Agregar la entrada a `corpus/00_Indice_Maestro/` con metadatos (tipo, número, fecha, jerarquía).
3. Ejecutar la ingesta:
   ```bash
   cd app
   npm run corpus:ingest      # parsea, chunquea y embedea
   npm run corpus:referencias # detecta referencias cruzadas entre normas
   ```
4. Verificar con el agente `corpus-ingestion-validator`:
   ```bash
   # desde Claude Code
   /agent corpus-ingestion-validator
   ```
5. Hacer commit y push — el deploy en Vercel se activa automáticamente.

### Actualizar una norma existente

1. Reemplazar el archivo en `corpus/`.
2. En Supabase, marcar los chunks de esa norma como `vigente = false` si fue derogada.
3. Repetir pasos 3–5 del proceso anterior.

### Frecuencia recomendada

- Revisar la BCN (bcn.cl) mensualmente para detectar modificaciones a LGUC/OGUC.
- Suscribirse al Diario Oficial para DDU nuevas del MINVU.
- Documentar cada actualización en el historial de commits con `corpus:` como prefijo.

## Scripts disponibles

```bash
npm run corpus:ingest        # Ingestar normas al corpus
npm run corpus:referencias   # Detectar referencias cruzadas
npm run eval                 # Correr set de evaluación
npm run dev                  # Servidor de desarrollo
npm run build                # Build de producción
npm run lint                 # ESLint
```

## CI/CD

GitHub Actions corre en cada push a `master`:
1. `npm run build` — verifica compilación TypeScript
2. Deploy automático a Vercel si el build pasa

Secrets requeridos en GitHub: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Aviso legal

Las respuestas de esta herramienta son de carácter informativo y no constituyen asesoría
jurídica ni profesional. Ver [Términos y condiciones](/terminos) y [Política de privacidad](/privacidad).

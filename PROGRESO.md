# REVISOR ARQ — Registro de Progreso
> Actualizar este archivo al inicio/fin de cada sesión de trabajo.
> Formato: `[YYYY-MM-DD] Qué se hizo / qué falta`

---

## Estado global del proyecto

```
FASE 1 — Estabilización     ██████████ 100%   ✅ Completa
FASE 2 — Corpus completo    ███░░░░░░░  25%   Bloqueado (cuota Voyage AI)
FASE 3 — Deploy             ██████████ 100%   ✅ Completa
FASE 4 — Calidad/UX         ██░░░░░░░░  20%   Parcial
FASE 5 — Monetización       ░░░░░░░░░░   0%   No iniciado
```

---

## Sesiones de trabajo

---

### 2026-04-18 — Sesión 1: Scaffolding inicial
**Hecho:**
- Scaffolding Next.js 14 + TypeScript + Tailwind + shadcn/ui
- Setup Supabase (schema, pgvector, tablas `normas` y `chunks`)
- Estructura de carpetas del proyecto

**Resultado:** Proyecto base funcionando en localhost

---

### 2026-04-19 — Sesión 2: Pipeline RAG + corpus inicial
**Hecho:**
- Pipeline de ingesta: parsers (LGUC/OGUC/DDU), chunker, embedder, carga a Supabase
- Descarga automatizada: LGUC, OGUC, DDU-527 al DDU-541, DDU-ESP-025-07
- LGUC ingestado completo (~280 chunks)
- 11 DDUs ingestados (DDU-527, 528, 529, 531, 532, 533, 535, 537, 540, 541, ESP-025-07)
- Chat RAG con streaming SSE funcionando (modos arquitecto + abogado)
- Landing page + `/chat` + `/corpus` + `/pricing` + `/contacto`
- Set de 7 evaluaciones creado

**Bloqueado:** OGUC y DDU-530/534/539 pendientes por cuota Gemini embeddings (1.500/día)
**Resultado:** Chat funcional con corpus parcial. Eval: 0/7 por error de cuota al momento del test.

---

### 2026-04-20 — Sesión 3: Sistema de diseño v2
**Hecho:**
- Rediseño visual completo (landing, header, footer)
- Modo oscuro/claro
- Componentes: `mensaje.tsx`, `fuentes-panel.tsx`, `modal-exportar-pdf.tsx`
- Mejoras al sintetizador (prompts arquitecto/abogado más precisos)
- Página `/privacidad` y `/terminos`

**Resultado:** UI completa y pulida.

---

### 2026-04-21 al 2026-04-22 — Sesiones 4–5: Corpus ampliado + eval
**Hecho:**
- Migración de embeddings: Gemini → Voyage AI `voyage-law-2` (mayor calidad legal)
- Corpus ampliado con más DDUs
- Evaluaciones adicionales (resultados en `app/scripts/eval/resultados/`)
- Migración SQL: `match_chunks` actualizado a Voyage dims (1024)
- Rate limiting en `/api/chat`

**Resultado:** Calidad de retrieval mejorada significativamente.

---

### 2026-04-27 — Sesión 6: Arquitectura normativa ampliada
**Hecho:**
- Descarga y organización del corpus normativo completo (cat. 01–12)
- 303 DDUs históricos descargados (DDU-000 al DDU-526) en formato PDF
- Normativa complementaria descargada: ambiental, sanitario, agua, patrimonio, vialidad, etc.
- Scripts de ingesta masiva: `ingestar_ddu_masiva.sh` y `ingestar_normativa_masiva.sh`
- Grafo normativo (`grafo.ts`) estructurado
- Migraciones SQL: `consultas_v2` y `norm_relations`

**Resultado:** Corpus local completo, pendiente de ingestar a Supabase.

---

### 2026-04-29 — Sesión 7: Limpieza y organización del proyecto ← HOY
**Hecho:**
- Limpieza del worktree: eliminados `CLAUDE DESIGN/`, `GUIA IMPLEMENTACION/`, `docs/`, `design/`, `scripts/worktrees/`, `MEMORY.md` (vieja), `README.md`, `LICENSE` del worktree principal
- Limpieza del app: eliminados `app/docs/`, `app/scripts/download/`, `app/scripts/eval/`, scripts auxiliares `.js`, `app/README.md`
- Análisis completo de carpetas `normativa/` y `normativa_chile/`
- Consolidación del corpus en una sola carpeta `corpus/` sin duplicados:
  - 10 pares de carpetas gemelas fusionadas (cat. 06, 07, 09, 10, 12)
  - Control files migrados a `corpus/00_control/` (desde `normativa_chile/`)
  - Eliminados: `normativa_chile/`, `NORMATIVA/`, `00_RESPALDO/`, `scratch/`
  - Eliminados: `99_logs/html_raw/`, `99_logs/pdf_raw/`
- Creados: `PLAN-IMPLEMENTACION.md` (este plan) y `PROGRESO.md` (este archivo)

**Resultado:** Proyecto ordenado, corpus único sin duplicados, 888 archivos en `corpus/`.

**Completado en esta sesión:**
- [x] Limpiar worktrees colgantes (6 eliminados, 1 prunado → quedan solo master + beautiful-shamir)
- [x] Rutas en `corpus/manifiesto.json` ya correctas (apuntaban a `00_CLAUDE CODE`, no a OBSIDIAN VAULT)
- [x] `middleware.ts` deprecado reemplazado por `proxy.ts` (Next.js 16)
- [x] `jspdf` instalado (faltaba para `generar-pdf.ts`)
- [x] Build verificado: `npm run build` → ✅ 21 rutas, 0 errores TypeScript
- [x] Commit `16395eb` en master con todos los cambios

---

### 2026-04-30 — Sesión 8: Estabilización completa + Deploy ← HOY
**Hecho:**
- Limpieza worktrees: 6 eliminados + 1 prunado → quedan master + beautiful-shamir
- Rutas `manifiesto.json` verificadas (ya correctas)
- `middleware.ts` reemplazado por `proxy.ts` (Next.js 16)
- `jspdf` instalado como dependencia
- Build: ✅ 21 rutas, 0 errores TypeScript
- Commits: `16395eb` (limpieza general) + `91d1ef9` (embedder Voyage AI)
- Ingesta parcial: LGUC (284 chunks) + 8 DDUs (250 chunks) → **bloqueado por cuota Voyage AI**
- Vercel CLI instalado + proyecto vinculado (`prj_qPBAs8QBkMmaLwbfK384UiuKA4Os`)
- 7 env vars configuradas en Vercel producción
- **Deploy exitoso**: https://app-jade-nine-25.vercel.app
- Health check: `{"status":"ok","db":"ok","db_latencia_ms":430}`

**Pendiente:**
- [ ] Retomar ingesta corpus cuando cuota Voyage AI se resetee (medianoche UTC)
- [ ] Actualizar `NEXT_PUBLIC_APP_URL` tras asignar dominio personalizado
- [ ] Conectar repo GitHub para auto-deploy en push (Vercel dashboard)
- [ ] Correr evaluaciones (`npm run eval`) apuntando a producción

---

## Próximos pasos (ordenados por prioridad)

### Inmediato (próxima sesión)
- [x] ~~Git cleanup: worktrees colgantes eliminados~~
- [x] ~~Corregir manifiesto: rutas ya correctas~~
- [x] ~~Commit master: `16395eb`~~
- [x] ~~Build verificado: 21 rutas, 0 errores~~
- [ ] **Configurar `.env.local`**: verificar que todas las API keys estén presentes antes de ingestar

### Corto plazo
- [ ] **Completar OGUC**: re-ingestar chunks faltantes — **bloqueado hasta reset cuota Voyage AI (medianoche UTC)**
- [ ] **Ingestar DDUs históricos**: ejecutar `ingestar_ddu_masiva.sh` (303 PDFs → ~9.000 chunks)
- [ ] **Ingestar DS-60 y DS-61**: normas técnicas estructurales (textos ya extraídos)
- [ ] **Ingestar normativa cat. 01–11**: ejecutar `ingestar_normativa_masiva.sh`
- [ ] **Correr evaluaciones**: meta 7/7 casos pasando

### Mediano plazo
- [ ] **Deploy Vercel**: configurar env vars + activar GitHub Actions
- [ ] **Eval en producción**: verificar latencias y calidad
- [ ] **Agregar Voyage rerank**: mejorar precisión del retrieval
- [ ] **Poblar grafo normativo**: relaciones LGUC ↔ OGUC ↔ DDU

---

## Corpus — Estado detallado

| Norma | Categoría | Chunks Supabase | Texto local | Estado |
|---|---|---|---|---|
| LGUC DFL-458 | Core | ~280 | ✅ `corpus/lguc/LGUC.txt` | ✅ OK |
| OGUC DS-47 | Core | ~parcial | ✅ `corpus/oguc/OGUC.txt` | ⚠️ Incompleto |
| DDU-527 al 541 (14 DDUs) | Core | ~500 | ✅ `corpus/ddu/*.txt` | ✅ OK |
| DDU-000 al DDU-526 (303) | 12_Tecnica | 0 | ✅ PDFs descargados | ❌ Sin ingestar |
| DS-60 OGUC Cap.1 | 12_Tecnica | 0 | ✅ `fuente.txt` | ❌ Sin ingestar |
| DS-61 OGUC Cap.2 | 12_Tecnica | 0 | ✅ `fuente.txt` | ❌ Sin ingestar |
| Ley 19.300 (ambiental) | 01 | 0 | ✅ HTML | ❌ Sin ingestar |
| DFL 725 (sanitario) | 02 | 0 | ✅ HTML | ❌ Sin ingestar |
| DFL 382 (sanitarios) | 03 | 0 | ✅ `fuente.txt` | ❌ Sin ingestar |
| Ley 17.288 (patrimonio) | 04 | 0 | ✅ `fuente.txt` | ❌ Sin ingestar |
| Ley 19.880 (proc. admin.) | 05 | 0 | ✅ `fuente.txt` | ❌ Sin ingestar |
| DL 2695 (regularización) | 06 | 0 | ✅ `fuente.txt` | ❌ Sin ingestar |
| Ley 19.253 (indígena) | 07 | 0 | ✅ `fuente.txt` | ❌ Sin ingestar |
| Ley 20.283 (bosque nativo) | 08 | 0 | ✅ `fuente.txt` | ❌ Sin ingestar |
| DFL 340 (borde costero) | 09 | 0 | ✅ `fuente.txt` | ❌ Sin ingestar |
| DFL 850 (caminos) | 10 | 0 | ✅ `fuente.txt` | ❌ Sin ingestar |
| DFL 4 (electricidad) | 11 | 0 | ✅ `fuente.txt` | ❌ Sin ingestar |

**Total en Supabase:** ~780 chunks / 16 normas
**Total pendiente:** ~15.000 chunks estimados

---

## Variables de entorno requeridas

```bash
# app/.env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
VOYAGE_API_KEY=
ADMIN_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Comandos frecuentes

```bash
# Desarrollo
cd app && npm run dev

# Build
cd app && npm run build

# Ingestar corpus (desde app/)
npm run corpus:ingest

# Ingestar DDUs masivo (desde raíz)
bash ingestar_ddu_masiva.sh

# Ingestar normativa complementaria (desde raíz)
bash ingestar_normativa_masiva.sh

# Evaluaciones
cd app && npm run eval

# Limpiar worktrees colgantes
git worktree remove --force .claude/worktrees/beautiful-shamir-0f10c8
git worktree remove --force .claude/worktrees/agitated-kirch-7690f3
# ... (repetir para cada uno)

# Ver estado Supabase corpus
curl http://localhost:3000/api/corpus/status
```

---

## Decisiones técnicas tomadas

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Voyage AI `voyage-law-2` para embeddings | Gemini `gemini-embedding-001` | Mejor calidad en textos legales, sin cuota diaria restrictiva |
| Gemini 2.5 Flash para generación | Claude, GPT-4 | Gratis en tier actual, suficiente calidad |
| Supabase pgvector HNSW | Pinecone, Qdrant | Stack integrado, menor complejidad |
| Next.js App Router | Pages Router, Remix | Streaming SSE nativo, RSC para corpus |
| Chunking por artículo | Chunking fijo por tokens | Preserva unidad semántica legal |

# REVISOR ARQ — Plan de Implementación
**Versión:** 1.0 · **Fecha:** 2026-04-29 · **Estado general:** MVP funcional, corpus incompleto

---

## 1. Estado actual (diagnóstico)

### App (Next.js)
| Componente | Estado | Notas |
|---|---|---|
| Frontend (landing, chat, corpus, pricing) | ✅ Funcional | UI completa con modo arquitecto/abogado |
| API RAG (`/api/chat`) | ✅ Funcional | Streaming SSE con Gemini 2.5 Flash |
| API Corpus (`/api/corpus/*`) | ✅ Funcional | Ingestar, eliminar, status, vigencia |
| Embeddings | ✅ Voyage AI `voyage-law-2` | Migrado desde Gemini embeddings |
| Generación | ✅ Gemini 2.5 Flash | Modos arquitecto + abogado |
| Supabase (pgvector HNSW) | ✅ Configurado | Schema migrado, RPC `match_chunks` activo |
| Deploy Vercel | ⏳ Pendiente | Workflow GitHub Actions listo, no ejecutado |
| Evaluaciones | ❌ Fallando | 0/7 casos pasan (quota Gemini al momento del test) |

### Corpus en Supabase
| Norma | Chunks | Estado |
|---|---|---|
| LGUC DFL-458 | ~280 | ✅ Ingestado |
| OGUC DS-47 | ~806 | ⚠️ Parcial (cuota diaria) |
| DDU-527 al 541 (14 DDUs) | ~500 | ✅ Ingestado |
| **DDUs históricos 000–526** | **~9.000 est.** | ❌ Pendiente (303 PDFs disponibles) |
| DS-60 (Hormigón / OGUC Cap.1) | — | ❌ Pendiente (texto extraído) |
| DS-61 (Diseño sísmico / OGUC Cap.2) | — | ❌ Pendiente (texto extraído) |
| Normativa complementaria (cat. 01–11) | — | ❌ Pendiente (~200 fuente.txt listos) |

**Total estimado pendiente:** ~15.000 chunks adicionales

### Git / Repositorio
| Item | Estado |
|---|---|
| Branch `master` | Cambios sin commitear (app modificada + corpus untracked) |
| Worktrees activos | 7 colgantes (beautiful-shamir, agitated-kirch, busy-hoover, clever-bouman, happy-jennings, hopeful-yonath, magical-robinson) |
| Worktree en OBSIDIAN VAULT | `nostalgic-kepler-99f2cc` — prunable |
| Rutas en `manifiesto.json` | ❌ Apuntan a `C:\OBSIDIAN VAULT\` (roto) |

---

## 2. Plan de implementación por fases

### FASE 1 — Estabilización (prioridad inmediata)

#### 1.1 Git cleanup
- [ ] Eliminar los 7 worktrees colgantes: `git worktree remove --force <nombre>`
- [ ] Commitear cambios actuales del `master` (app modificada, corpus organizado)
- [ ] Actualizar `.gitignore` para excluir `corpus/` (archivos binarios grandes)
- [ ] Push a `origin/master`

#### 1.2 Corregir rutas del manifiesto
- [ ] Actualizar `corpus/manifiesto.json` — reemplazar rutas `C:\OBSIDIAN VAULT\` por `C:\00_CLAUDE CODE\REVISOR-ARQ\corpus\`
- [ ] Verificar que los scripts de ingesta referencien las rutas correctas

#### 1.3 Verificar build
- [ ] Ejecutar `npm run build` en `app/`
- [ ] Corregir errores de TypeScript si los hay
- [ ] Verificar que `.env.local` tiene todas las keys (Supabase, Gemini, Voyage AI, Admin secret)

---

### FASE 2 — Corpus completo (core del producto)

#### 2.1 Completar OGUC
- [ ] Re-ingestar OGUC DS-47 hasta completar los ~806 chunks faltantes
- [ ] Verificar en Supabase: `SELECT COUNT(*) FROM chunks WHERE norma_id = (SELECT id FROM normas WHERE numero = 'DS-47')`

#### 2.2 DDUs históricos (303 PDFs)
- [ ] Ejecutar `ingestar_ddu_masiva.sh` contra `corpus/12_Tecnica/DDU_Circulares/`
- [ ] Monitorear progreso con `/api/corpus/status`
- [ ] Prioridad de ingesta: DDU-001 al DDU-100 primero (los más citados históricamente)
- [ ] Estimado: ~300 tokens/DDU promedio × 303 = ~90.000 tokens Voyage AI

#### 2.3 Normas técnicas estructurales
- [ ] Ingestar DS-60 desde `corpus/12_Tecnica/DS_60_2011_MINVU_OGUC_Cap1/01_fuente_oficial/fuente.txt`
- [ ] Ingestar DS-61 desde `corpus/12_Tecnica/DS_61_2011_MINVU_OGUC_Cap2/01_fuente_oficial/fuente.txt`

#### 2.4 Normativa complementaria (cat. 01–11)
- [ ] Ejecutar `ingestar_normativa_masiva.sh`
- [ ] Prioridad por relevancia para arquitectos:
  1. Cat. 04 — Patrimonio y monumentos nacionales (Ley 17.288)
  2. Cat. 03 — Agua y servicios sanitarios (DFL 382, DS 50)
  3. Cat. 06 — Bienes del Estado y regularización (DL 2695, Ley 21442)
  4. Cat. 10 — Vialidad y caminos (DFL 850, Res. 4677)
  5. Cat. 01–02 — Ambiental y sanitario (Ley 19.300, DFL 725)
  6. Cat. 05, 07, 08, 09, 11 — Procedimiento, indígena, forestal, borde costero, energía

---

### FASE 3 — Deploy y evaluaciones

#### 3.1 Deploy a Vercel
- [ ] Configurar variables de entorno en Vercel dashboard:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`
  - `VOYAGE_API_KEY`
  - `ADMIN_SECRET`
  - `NEXT_PUBLIC_APP_URL`
- [ ] Activar GitHub Actions workflow (`.github/workflows/deploy.yml`)
- [ ] Verificar deploy exitoso en URL de Vercel
- [ ] Probar `/api/healthz` en producción

#### 3.2 Evaluaciones
- [ ] Correr `npm run eval` con corpus completo en Supabase
- [ ] Meta: 7/7 casos pasando
- [ ] Agregar casos de prueba para las nuevas normas ingestadas (DS-60, DS-61, cat. 04)
- [ ] Revisar latencias (meta: < 3.000 ms p95)

---

### FASE 4 — Calidad y UX

#### 4.1 Pulir respuestas
- [ ] Revisar prompts de sintetizador con `prompt-engineer`
- [ ] Verificar disclaimer al pie de cada respuesta
- [ ] Probar modo abogado vs arquitecto con casos reales

#### 4.2 UI/UX
- [ ] Correr `ui-design-reviewer` sobre componentes principales
- [ ] Revisar responsividad en móvil
- [ ] Verificar accesibilidad AA

#### 4.3 Seguridad
- [ ] Correr `security-auditor` antes de merge a main
- [ ] Verificar rate limiting en `/api/chat`
- [ ] Revisar RLS en Supabase

---

### FASE 5 — Monetización (preparada, no activa)

- [ ] Activar Stripe (página `/pricing` ya existe)
- [ ] Definir plan free vs pro (límite de consultas diarias)
- [ ] Implementar auth de usuarios (Supabase Auth o Clerk)
- [ ] Panel de usuario (historial de consultas, favoritos)

---

## 3. Sugerencias de escalamiento

### 3.1 Corpus — Escalar a normativa nacional completa

**Corto plazo (MVP+)**
- Agregar todas las DDUs (001–541) — ya disponibles en disco
- Agregar las Circulares MINVU (Cir-055, Cir-100, Cir-231, etc.) — ya descargadas
- Agregar normas técnicas NCh (sísmica NCh433, acero NCh427, etc.)

**Mediano plazo**
- Integrar **planes reguladores comunales** (PRC) de comunas principales (Santiago, Providencia, Las Condes, Vitacura, etc.)
- Integrar **DDU vigentes por clasificación temática** (loteos, subdivisión, edificación, etc.)
- Crawler automático de actualizaciones desde `minvu.gob.cl` y BCN (con hash diff)
- Integrar **SEREMI MINVU** — resoluciones de alcance regional

**Largo plazo**
- Normativa municipal: PRMS, PRMC, PRI
- Jurisprudencia SMA, Contraloría (dictámenes relevantes en urbanismo)
- Normativa MINSAL relevante para arquitectura (hospitales, clínicas)

### 3.2 Arquitectura RAG — Mejorar precisión

**Corto plazo**
- Aumentar `match_count` de 8 a 12 chunks para preguntas complejas
- Implementar **re-ranking** con Voyage AI `rerank-2` (mejora precisión ~15%)
- Agregar filtros por dominio/categoría al recuperar chunks

**Mediano plazo**
- **Grafo de relaciones normativas**: ya existe `grafo.ts`, poblar con relaciones reales (ej: LGUC Art. 116 → OGUC 5.1.1)
- **Cruce normativo automático**: detectar cuando una consulta requiere combinar normas de distintos cuerpos legales
- **HyDE (Hypothetical Document Embeddings)**: generar respuesta hipotética primero, luego buscar chunks similares a ella
- Implementar **BM25 híbrido** (búsqueda léxica + semántica) — Supabase lo soporta con `pg_trgm`

**Largo plazo**
- Fine-tuning de embeddings con pares (pregunta, artículo relevante) del dominio legal chileno
- Agente autónomo con herramientas: buscar en BCN, verificar vigencia, calcular plazos

### 3.3 Modelo — Alternativas y optimización

| Escenario | Modelo recomendado | Por qué |
|---|---|---|
| Actual (free) | Gemini 2.5 Flash | Gratis, rápido, bueno para síntesis |
| Modo abogado premium | Gemini 2.5 Pro o Claude Sonnet | Mayor razonamiento legal |
| Alta demanda | Gemini Flash + cache de respuestas frecuentes | Reducir latencia y costo |
| Offline/privado | Llama 3.1 70B cuantizado local | Para clientes que no quieren cloud |

### 3.4 Infraestructura — Escalar la plataforma

**Corto plazo**
- Vercel Fluid Compute (ya configurado) — escala automático
- Supabase Pro ($25/mes) cuando supere 500 MB de embeddings
- Cache de embeddings de consultas frecuentes (Redis o Supabase KV)

**Mediano plazo**
- **Multi-tenant**: separar corpus por cliente (estudio de arquitectura, municipalidad, etc.)
- **API pública**: exponer endpoints documentados para integraciones (Revit plugins, AutoCAD, BIM)
- **Webhook de actualizaciones**: notificar a usuarios cuando una norma que han consultado se actualiza

**Largo plazo**
- Infraestructura dedicada para clientes enterprise (municipalidades, DOM, ministerios)
- On-premise deployment para organismos públicos con restricciones de datos
- SLA garantizado con uptime 99.9%

### 3.5 Producto — Expansión de funcionalidades

**Corto plazo**
- Exportar respuesta a PDF (modal ya existe: `modal-exportar-pdf.tsx`)
- Historial de consultas por sesión (localStorage)
- Feedback con razón (thumbs down → ¿qué falló?)

**Mediano plazo**
- **Comparador de versiones**: mostrar cómo cambió un artículo entre versiones
- **Alertas de vigencia**: notificar cuando una norma consultada cambia
- **Modo proyecto**: el usuario ingresa datos del proyecto (superficie, uso, zona) y el sistema filtra la normativa aplicable automáticamente
- **Integración ITO/DOM**: flujo guiado para preparar expedientes de permiso de edificación

**Largo plazo**
- App móvil (React Native + mismo backend)
- Plugin para AutoCAD/Revit que consulta normativa desde el plano
- Módulo de gestión documental para expedientes DOM
- Expansión a otros países (Colombia, Perú, Argentina tienen normativa similar)

---

## 4. Stack técnico sugerido a futuro

```
Actual:          Next.js + Supabase + Gemini + Voyage AI + Vercel
MVP+:            + Redis cache + Voyage rerank + grafo normativo
Escala mediana:  + Auth usuarios + Stripe + multi-tenant corpus
Escala grande:   + API pública + BIM plugins + on-premise option
```

---

## 5. KPIs para medir progreso

| KPI | Actual | Meta MVP | Meta Escala |
|---|---|---|---|
| Normas en corpus | 16 | 50+ | 200+ |
| Chunks en Supabase | ~1.000 | 15.000 | 100.000 |
| Eval score | 0/7 (error quota) | 7/7 | 15/15 |
| Latencia p95 | ~1.200 ms | < 3.000 ms | < 1.500 ms |
| Consultas/día | 0 (dev) | 50 | 1.000+ |
| Uptime | N/A | 99% | 99.9% |

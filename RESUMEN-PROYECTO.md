# REVISOR ARQ — Documento de Proyecto
**Fecha:** Abril 2026 · **Estado:** MVP en producción · **Deploy:** Vercel

---

## 1. DESCRIPCIÓN GENERAL

**Revisor ARQ** es una aplicación web de consulta normativa con IA para arquitectos y abogados chilenos. Permite hacer preguntas en lenguaje natural sobre la normativa vigente de urbanismo y construcción, obteniendo respuestas con **citas verificables y fragmentos literales** de las leyes.

### Problema que resuelve
- Los arquitectos consultan la OGUC, LGUC y DDUs constantemente durante proyectos
- Las respuestas incorrectas generan multas, rechazos de permisos y pérdidas económicas
- Los documentos son extensos, complejos y cambian con enmiendas frecuentes
- No existía una herramienta que combinara búsqueda semántica + generación confiable para normativa chilena

### Principio fundamental
Toda respuesta **debe** incluir cita verificable (tipo norma + artículo + fragmento literal). El sistema **nunca** inventa normas ni parámetros. Si no hay respaldo en el corpus, lo declara explícitamente.

---

## 2. ARQUITECTURA TÉCNICA

### Stack
| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui + Framer Motion |
| Base de datos | Supabase (PostgreSQL + pgvector) |
| Embeddings | Voyage AI — modelo `voyage-law-2` (dim 1024) |
| Generación | Google Gemini 2.5 Flash |
| Deploy | Vercel (Fluid Compute, serverless functions) |
| Monitoreo | `/api/healthz` + Vercel Analytics |

### Diagrama de flujo RAG
```
Usuario → Pregunta
    ↓
Voyage AI: embed consulta (query mode)
    ↓
Supabase pgvector: match_chunks RPC (cosine similarity, top-8)
    ↓
Gemini 2.5 Flash: prompt con chunks + instrucciones de modo
    ↓
Respuesta con citas (tipo norma / artículo / fragmento)
```

### Base de datos (Supabase)
**Tabla `normas`**
- id (uuid), tipo, numero, titulo, vigente, dominio, subdominio
- organo_emisor, jerarquia_norm, etapas_proyecto[], dependencias[]
- fecha_actualizacion, url_fuente, alcance

**Tabla `chunks`**
- id (uuid), norma_id (FK), texto, tokens, orden
- embedding (vector 1024), metadatos (JSONB), fuente

**Tabla `contactos`**
- id, nombre, email, tipo_usuario, mensaje, fecha

**Funciones RPC**
- `match_chunks(query_embedding, match_threshold, match_count, norma_ids[])` — búsqueda vectorial
- `count_chunks_per_norma()` — estadísticas del corpus

### Autenticación Admin
Cookie HTTP-only `admin_session` generada en `/api/admin/login` con hash SHA-256 del `ADMIN_SECRET`. Middleware Next.js protege rutas `/api/corpus/*`.

---

## 3. PÁGINAS Y RUTAS

### Frontend (páginas públicas)
| Ruta | Descripción |
|------|------------|
| `/` | Landing page con CTA, features, corpus preview |
| `/chat` | Interfaz de chat principal con dos modos |
| `/corpus` | Catálogo público de normas cargadas |
| `/pricing` | Página de precios (preparada para monetización) |
| `/contacto` | Formulario de contacto |
| `/terminos` | Términos y condiciones |
| `/privacidad` | Política de privacidad |

### Panel Admin
| Ruta | Descripción |
|------|------------|
| `/normativa` | Panel de gestión de normas (auth requerida, clave: 375010) |

### API Routes
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/chat` | POST | Chat RAG principal con modos arquitecto/abogado |
| `/api/admin/login` | POST | Autenticación admin |
| `/api/corpus/ingestar` | POST | Ingestión de nueva norma (texto → chunks → embeddings → BD) |
| `/api/corpus/eliminar` | DELETE | Elimina norma y sus chunks |
| `/api/corpus/status` | GET | Estado del corpus (conteo por tipo) |
| `/api/corpus/extraer-texto` | POST | Extrae texto de PDF subido |
| `/api/corpus/vigencia` | PUT | Activa/desactiva vigencia de norma |
| `/api/feedback` | POST | Guarda feedback de usuario sobre respuesta |
| `/api/contacto` | POST | Guarda mensaje de contacto |
| `/api/stats` | GET | Estadísticas de uso |
| `/api/healthz` | GET | Health check (Supabase ping + env vars) |

---

## 4. CORPUS NORMATIVO — ESTADO ACTUAL

### Resumen por tipo (Abril 2026)
| Tipo | Normas | Chunks | Descripción |
|------|--------|--------|-------------|
| **LGUC** | 1 | 280 | Ley General de Urbanismo y Construcciones (DFL-458) |
| **OGUC** | 1 | 806 | Ordenanza General de Urbanismo y Construcciones (DS-47) |
| **DDU** | 259 | 1.267 | Circulares División Desarrollo Urbano MINVU |
| **DDU_ESPECIFICA** | 1 | 21 | DDU especial |
| **Ley** | 19 | ~295 | Leyes relevantes para arquitectura y MA |
| **DS** | 15 | ~193 | Decretos Supremos / Reglamentos |
| **DFL** | 6 | 79 | Decretos con Fuerza de Ley |
| **DL** | 3 | 44 | Decretos Ley |
| **TOTAL** | **305** | **~2.985** | |

### Normas principales cargadas
**Urbanismo y Construcción (núcleo)**
- LGUC — DFL-458 (280 chunks) ✅
- OGUC — DS-47 (806 chunks) ✅
- 259 DDUs MINVU (1.267 chunks) ✅

**Accesibilidad (recién agregadas)**
- Ley 20.422 — Igualdad de Oportunidades Personas con Discapacidad (49 chunks) ✅
- DS 50/2016 MINVU — Modifica OGUC Accesibilidad Universal (pendiente re-ingest)

**Copropiedad**
- Ley 21.442 — Nueva Ley de Copropiedad Inmobiliaria (15 chunks) ✅
- DS 7/2025 MINVU — Reglamento Ley 21.442 (44 chunks) ✅

**Medio Ambiente**
- Ley 19.300 — Bases Generales del MA (11 chunks) ✅
- DS 40 — Reglamento SEIA (15 chunks) ✅
- Ley 20.417 — Crea MMA/SEA/SMA (pendiente re-ingest)
- Ley 20.600 — Tribunales Ambientales (15 chunks) ✅

**Otras leyes relevantes**
- Ley 17.288 — Monumentos Nacionales (14 chunks) ✅
- Ley 19.880 — Bases Procedimientos Administrativos (15 chunks) ✅
- DL 1939 — Bienes del Estado (15 chunks) ✅
- DFL 382 — Servicios Sanitarios (15 chunks) ✅
- DFL 4 — Servicios Eléctricos (15 chunks) ✅
- DFL 725 — Código Sanitario (15 chunks) ✅
- DFL 850 — Ley de Caminos (15 chunks) ✅

### Normas con 0 chunks (problema conocido)
- Ley 20.417 / Ley 20417 — entrada duplicada, re-ingesta pendiente
- DS 50/2016 MINVU — rate limit Voyage AI, re-ingesta en curso

---

## 5. MODOS DE RESPUESTA

### Modo Arquitecto
- Parámetros aplicados con ejemplos prácticos
- Referencia directa al artículo y norma
- Tono técnico-profesional
- Útil para: dimensionamiento, rasantes, coeficientes, usos de suelo

### Modo Abogado
- Texto literal de los artículos íntegros
- Citas formales con número de artículo
- Contexto normativo y jerarquía
- Útil para: recursos, informes jurídicos, contratos, due diligence

---

## 6. VARIABLES DE ENTORNO

```env
NEXT_PUBLIC_SUPABASE_URL=           # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Clave anon (pública)
SUPABASE_SERVICE_ROLE_KEY=          # Clave service role (solo server-side)
GEMINI_API_KEY=                     # Google AI Studio API key
VOYAGE_API_KEY=                     # Voyage AI API key (plan gratuito: 3 RPM / 10K TPM)
ADMIN_SECRET=375010                  # Clave panel /normativa
NEXT_PUBLIC_APP_URL=                # URL de producción
```

---

## 7. SCRIPTS DISPONIBLES

```bash
# Desarrollo
npm run dev                          # Servidor local en :3000

# Corpus — ingesta estándar (LGUC/OGUC/DDU desde corpus/ local)
npm run corpus:download              # Descarga PDFs BCN
npm run corpus:ingest                # Ingesta desde manifiesto local
npm run corpus:ingest:dry            # Dry run sin escribir en BD

# Scripts ad-hoc (BCN API JSON)
node --env-file=.env.local scripts/ingestar-normas-bcn.js    # Ingesta 4 normas desde BCN
node --env-file=.env.local scripts/reingestar-pendientes.js  # Re-ingesta DS50 y Ley 20.417

# Evaluación
npm run eval                         # Corre set de evaluación

# Utilidades
node --env-file=.env.local scripts/generar-excel-corpus.js   # Genera Excel inventario
```

---

## 8. PIPELINE DE INGESTA

### Flujo para normas nuevas (vía API BCN JSON)
1. `GET https://nuevo.leychile.cl/servicios/Navegar/get_norma_json?idNorma={id}&agrupa_partes=1`
2. Extrae texto del campo `html[]` recursivamente (función `extractText`)
3. Chunking: detecta artículos (`Artículo N°`) → divide en unidades semánticas de ≤800 tokens con solapamiento de 100 tokens
4. Embeddings: Voyage AI `voyage-law-2` con `input_type="document"` (limitado a 3 RPM / 10K TPM en plan gratuito)
5. Upsert en `normas` (onConflict: tipo,numero) + DELETE + INSERT en `chunks`

### Flujo para normas nuevas (vía panel /normativa)
1. Admin sube PDF o pega texto en `/normativa`
2. Frontend llama `POST /api/corpus/extraer-texto` (pdf-parse)
3. Luego `POST /api/corpus/ingestar` con texto extraído
4. El endpoint hace chunking + embeddings + upsert

---

## 9. LO QUE FALTA POR HACER

### Inmediato (bugs / re-ingestas)
- [ ] Re-ingestar DS 50/2016 MINVU (actualmente 0 chunks, script corriendo)
- [ ] Re-ingestar Ley 20.417 (actualmente 0 chunks, duplicado con Ley 20417)
- [ ] Eliminar entrada duplicada `Ley 20417` (numero sin punto) — mantener `Ley 20.417`

### Corpus pendiente (alta prioridad)
- [ ] NCh 433 — Diseño Sísmico de Edificios (propietaria INN, requiere licencia)
- [ ] NCh 430 — Hormigón Armado (propietaria INN, requiere licencia)
- [ ] NCh 853 — Acondicionamiento Térmico (propietaria INN, requiere licencia)
- [ ] Ley 20.422 ya cargada; verificar que DS 50/2016 complete la ingesta
- [ ] DS 19/2023 MOP — Reglamento Ley 19.525 Aguas Lluvias

### Corpus pendiente (media prioridad)
- [ ] PRC comunas principales (Providencia, Las Condes, Santiago, Vitacura...)
- [ ] PRMS 100 — Plan Regulador Metropolitano de Santiago
- [ ] Ley 21.078 — Transparencia Mercado del Suelo
- [ ] Ley 18.695 — Orgánica Municipalidades

### Producto / UX
- [ ] **Autenticación de usuarios** (Supabase Auth) — actualmente sin login
- [ ] **Historial de conversaciones** por usuario persistente
- [ ] **Filtros de búsqueda** por tipo de norma, año, dominio antes del chat
- [ ] **Búsqueda directa** en el corpus (sin RAG, para encontrar artículos específicos)
- [ ] **Modo "Revisar proyecto"** — subir planos/descripción y revisar cumplimiento normativo
- [ ] Sistema de **feedback granular** (útil/no útil por cita)
- [ ] **Alertas de actualización** cuando una norma en el corpus sea modificada

### Técnico / Infraestructura
- [ ] Agregar `url_fuente` a todas las normas (actualmente vacío en las antiguas)
- [ ] Webhook BCN para detectar modificaciones de normas
- [ ] Sistema de versioning de normas (mantener texto histórico)
- [ ] Caché de respuestas frecuentes (Redis/Vercel KV)
- [ ] Mejorar chunking de OGUC (806 chunks muy fragmentados en algunos artículos)
- [ ] Test suite E2E (Playwright)
- [ ] Logging de queries para análisis (qué preguntan los usuarios)

---

## 10. SUGERENCIAS DE MEJORA Y ESCALADO

### Corto plazo (0-3 meses)
1. **Agregar método de pago en Voyage AI** → rate limit pasa de 3 RPM a 300 RPM, lo que permite reingestas en minutos en lugar de horas
2. **Supabase Auth** con Google OAuth → permite historial, preferencias, cuentas Pro
3. **Caching con Redis** (Vercel Marketplace) → reducir llamadas a Gemini para preguntas repetidas, ahorrando costos
4. **Logging de queries** → tabla `consultas` en Supabase con la pregunta, modo, chunks usados, rating

### Mediano plazo (3-6 meses)
5. **Planes de precios**:
   - Gratis: 5 consultas/día, solo modo Arquitecto
   - Pro ($15.000 CLP/mes): ilimitado, ambos modos, historial, PDF
   - Estudio ($50.000 CLP/mes): múltiples usuarios, API access, corpus personalizado
6. **Corpus personalizado por cliente** (PRC específico, normativa municipal local)
7. **Integración con SEREMI** → actualización automática de DDUs nuevas via webhook
8. **API pública** para integrar en software de arquitectura (ArchiCAD, Revit plugins)

### Largo plazo (6-12 meses)
9. **Multimodalidad**: subir plano PDF → el sistema extrae dimensiones y verifica cumplimiento de rasantes, coeficientes, etc.
10. **Comparador de proyectos vs norma** → input: descripción del proyecto, output: checklist de cumplimiento normativo con estado Aprobado/Observado/Rechazado
11. **Expansión regional**: normativa argentina (CPAU), peruana, colombiana usando la misma arquitectura RAG
12. **Alertas legales**: monitoreo de Diario Oficial → detección automática de cambios en normas del corpus → notificación a usuarios suscritos

### Consideraciones técnicas para escalar
- **pgvector** escala bien hasta ~1M vectores sin particionamiento; con 3K chunks actuales hay amplio margen
- El cuello de botella real es **Voyage AI** (costo y rate limits); considerar migrar a embeddings propios (BGE-M3 vía HuggingFace) cuando el volumen justifique el costo del GPU
- **Gemini 2.5 Flash** es actualmente gratuito con generoso rate limit; cuando monetice, el costo por consulta será ~$0.002 USD
- Vercel Fluid Compute maneja el scaling automáticamente; no hay configuración adicional necesaria

---

## 11. ESTRUCTURA DE ARCHIVOS

```
revisor-arq/
├── app/                          # Next.js app
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/              # API Routes (chat, corpus, admin, healthz...)
│   │   │   ├── chat/             # Interfaz de chat
│   │   │   ├── normativa/        # Panel admin
│   │   │   ├── corpus/           # Catálogo público
│   │   │   └── ...               # Landing, pricing, contacto, etc.
│   │   ├── components/
│   │   │   ├── chat/             # Mensaje, fuentes-panel, modal-exportar-pdf
│   │   │   └── ui/               # Componentes shadcn
│   │   └── lib/
│   │       ├── rag.ts            # Pipeline RAG (embed + match + generate)
│   │       ├── gemini.ts         # Cliente Gemini (modos arquitecto/abogado)
│   │       ├── voyage.ts         # Cliente Voyage AI (embedBatch)
│   │       ├── supabase.ts       # Clientes Supabase (public + service)
│   │       └── rate-limit.ts     # Rate limiting por IP
│   ├── scripts/
│   │   ├── download/             # Descarga corpus desde BCN
│   │   ├── ingest/               # Pipeline ingesta local (LGUC/OGUC/DDU)
│   │   ├── eval/                 # Set de evaluación de respuestas
│   │   ├── ingestar-normas-bcn.js       # Ingesta vía BCN JSON API
│   │   ├── reingestar-pendientes.js     # Re-ingesta DS50 + Ley 20.417
│   │   └── generar-excel-corpus.js      # Inventario Excel del corpus
│   └── docs/
│       ├── corpus.md             # Documentación del corpus
│       ├── ingesta.md            # Guía de ingesta
│       └── supabase-setup.md     # Setup de BD
├── .claude/
│   ├── agents/                   # Agentes especializados Claude Code
│   └── skills/                   # Skills de RAG legal y corpus
├── CLAUDE.md                     # Instrucciones para Claude Code
├── RESUMEN-PROYECTO.md           # Este documento
└── MEMORY.md                     # Memoria del proyecto para sesiones
```

---

## 12. CREDENCIALES Y ACCESOS

> ⚠️ **NUNCA compartir en repositorio público. Usar .env.local localmente.**

| Servicio | Acceso |
|---------|--------|
| Supabase | https://supabase.com/dashboard/project/tmypbopdgodbolsjbush |
| Vercel | https://vercel.com/skogpetter-6207s-projects/revisor-arq |
| Google AI Studio (Gemini) | https://aistudio.google.com |
| Voyage AI | https://dashboard.voyageai.com |
| Panel admin app | /normativa → clave: 375010 |

---

## 13. COMANDOS RÁPIDOS PARA NUEVO HILO

Para continuar en una nueva sesión de Claude Code, proporcionar este contexto:

```
Proyecto: REVISOR ARQ — chatbot RAG para normativa chilena de urbanismo
Stack: Next.js 15 / Supabase pgvector / Voyage AI voyage-law-2 / Gemini 2.5 Flash / Vercel
Repo local: C:\00_CLAUDE CODE\REVISOR-ARQ\.claude\worktrees\amazing-mclean-c3f9e5\app
Supabase project_id: tmypbopdgodbolsjbush
305 normas, ~2985 chunks en producción
Clave /normativa: 375010
Producción: https://revisor-arq.vercel.app (o similar)

Pendiente urgente:
- Re-ingestar DS 50/2016 MINVU (0 chunks) y Ley 20.417 (0 chunks)
- Eliminar duplicado Ley 20417 de BD
- Agregar pago en Voyage AI para subir rate limit
```

---

*Generado automáticamente por Claude Code · Abril 2026*

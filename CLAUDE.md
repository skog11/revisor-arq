# REVISOR ARQ
Chat RAG con citas verificables sobre normativa chilena de urbanismo/construcción para arquitectos y abogados.
**Estado:** MVP funcional · corpus completo (~384 normas + 60 dictámenes CGR) · en producción ✅

---

## Stack
| Capa | Tech |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion |
| BD | Supabase Postgres + pgvector HNSW (cosine, 1024 dims) |
| Embeddings | Voyage AI `voyage-law-2` |
| Generación | Cerebras gpt-oss-120b (primario, gratis) + Gemini Flash / OpenRouter / Groq (fallbacks, gratis) |
| Deploy | Vercel (workflow en `.github/workflows/deploy.yml`) |

---

## Arquitectura RAG (Legal-RAG 7 capas)
```
query → extractor-hechos → motor-reglas → Voyage HyDE embed
      → match_chunks_hybrid (50 candidatos) → rerank-2 (top 18)
      → mergear chunks obligatorios (reglas-gatillo)
      → detector-conflictos → compuerta normativa
      → buildSystemPromptV2 → Cerebras gpt-oss-120b → verificarCoherencia → respuesta
  └─ Si falla: DeepSeek → Gemini Flash → OpenRouter → Groq  [todos gratuitos]
```
**Libs clave en `app/src/lib/`:**
- `gemini.ts` — orquesta la cadena de fallback LLM (todos gratuitos)
- `cerebras.ts` — proveedor primario (gpt-oss-120b, gratuito, alto TPM)
- `groq.ts` — último fallback (llama-3.3-70b, gratuito)
- `voyage.ts` — embed queries + rerank-2
- `hyde.ts` — HyDE (Hypothetical Document Embedding) para mejor recall
- `multi-query.ts` — variantes semánticas + fusión RRF
- `retriever.ts` — pipeline de recuperación por capas (HyDE + hybrid + multiquery + rerank)
- `clasificador.ts` — detecta tipo proyecto + dominios normativos
- `router.ts` — plan de recuperación basado en clasificación
- `grafo.ts` — cruces entre normas (LGUC ↔ OGUC ↔ DDU)
- `sintetizador.ts` — construye system prompt por modo (buildSystemPromptV2)
- `rag.ts` — tipos compartidos + buildSystemPrompt legacy
- `motor-reglas.ts` — 18 reglas-gatillo curadas (norma especial > general)
- `detector-conflictos.ts` — detecta "no procede", "improcedente", etc. en chunks
- `fetcher-normas-obligatorias.ts` — recupera chunks forzados por reglas
- `extractor-hechos.ts` — extrae AccionSolicitada, EstadoObra, TipoZona (regex, sin LLM)
- `validador.ts` — disclaimer + coherencia restrictiva post-síntesis
- `agentic-retriever.ts` — recuperación agéntica 2 rondas (modo profundo)
- `query-cache.ts` — caché semántica (bypass para reglas-gatillo)
- `rate-limit.ts` — throttle por IP
- `motor-reglas.ts` — compuerta normativa: reglas-gatillo que fuerzan normas especiales (DDU 161, Art. 55 LGUC, etc.) cuando la consulta cumple condiciones
- `detector-conflictos.ts` — detecta patrones restrictivos ("no procede", "improcedencia") en chunks recuperados
- `fetcher-normas-obligatorias.ts` — recupera chunks de normas forzadas por reglas-gatillo

---

## BD Supabase (tablas principales)
- **`normas`**: id, tipo, numero, titulo, vigente, dominio, jerarquia_norm, etapas_proyecto[], url_fuente
- **`chunks`**: id, norma_id, texto, embedding(1024), tokens, orden, metadatos JSONB
- **`contactos`**: id, nombre, email, tipo_usuario, mensaje
- **RPC `match_chunks(query_embedding, threshold, count, norma_ids[])`** — búsqueda vectorial

---

## Rutas de la app
| Ruta | Tipo | Notas |
|---|---|---|
| `/` | público | Landing "ciudad de papel" — los edificios son el menú |
| `/landing-clasica` | público | Landing anterior, respaldo para comparar |
| `/chat` | público | Chat RAG (modos arquitecto/abogado/profundo) |
| `/archivo` | público | El Archivo: cobertura del corpus, **no el catálogo** |
| `/guias` | público | 7 guías temáticas |
| `/corpus` | 🔒 admin | Redirige a `/normativa` (ver `next.config.ts`) |
| `/normativa` | 🔒 admin | Gestión normativa |
| `/pricing` | público | Preparado para Stripe |
| `/contacto` | público | Formulario |
| `/api/chat` | POST | Streaming SSE |
| `/api/corpus/*` | 🔒 admin | ingestar, eliminar, status, vigencia, extraer-texto |
| `/api/feedback` | POST | thumbs up/down |
| `/api/stats` | GET | métricas |
| `/api/healthz` | GET | health check |
| `/api/admin/login` | POST | cookie HTTP-only `admin_session` |

**`src/proxy.ts` protege** (antes `middleware.ts`, migrado a Next 16): `/normativa`, `/corpus`, `/api/corpus` con cookie `admin_session = ADMIN_SECRET`

---

## Modos de respuesta
- **arquitecto** — parámetros aplicados, ejemplos numéricos, referencia al artículo
- **abogado** — texto literal íntegro, citas completas, contexto normativo
- **profundo** — análisis de cruces normativos, jerarquía, alertas de conflicto

---

## Reglas no negociables
1. Toda respuesta → cita verificable: `tipo norma + artículo + fragmento literal`
2. Sin respaldo en chunks → declarar explícitamente la falta de respaldo
3. Nunca inventar normas, artículos ni parámetros numéricos
4. Disclaimer obligatorio al pie (ya en `sintetizador.ts`)
5. Filenames: kebab-case sin tildes · UI: español chileno neutro · Commits: español, atómicos

---

## Corpus — estado actual (2026-07-25, cifras leídas de la BD)
**420 normas · 22.494 chunks · 0 sin dominio · 0 sin órgano emisor**

Reparto por dominio: urbanismo 357 · medioambiente 16 · aguas 10 · administrativo 10 ·
salud 8 · construccion 4 · electricidad 4 · vialidad 3 · bienes_nacionales 3 ·
copropiedad 2 · patrimonio 2 · accesibilidad 1

> **Migración `20260725_normalizar-dominios.sql`** — 134 de 420 normas tenían `dominio`
> en NULL (los 59 dictámenes CGR y 32 circulares DDU entre ellas) y el resto usaba valores
> fuera del vocabulario de `DOMINIO_A_NORMAS` (`Accesibilidad`, `energia`, `otro`…).
> Se normalizó todo y se creó el dominio **`administrativo`** para las 10 transversales
> (procedimiento administrativo, transparencia, orgánica municipal y regional, consulta
> indígena, tributaria). Requirió tocar `clasificador.ts` (tipo + instrucciones del prompt)
> y `router.ts` (entrada en `DOMINIO_A_NORMAS`). Los órganos emisores de 19 decretos supremos
> quedaron como **inferencia por materia, no dato de origen** — ✅ verificados el 2026-07-25
> contra BCN/MINVU/SUSESO uno por uno: 17 estaban correctos, 2 no (DS 66/2007 atribuido a un
> "Ministerio de Energía" que no existía en 2007; DS 193 con `organo_emisor` truncado). Ambos
> corregidos en `20260725_corregir-organo-emisor-decretos.sql`.
> Sigue pendiente: 260 circulares DDU figuran como emitidas por "SEREMI MINVU" cuando las
> dicta la DDU central del MINVU. No se tocó por ser criterio del dueño del corpus.

> Ingesta masiva: `cd app && npm run corpus:ingest`
> Re-ingestar una norma: `npm run corpus:ingest -- --solo=CLAVE --force`

---

## Variables de entorno (`app/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CEREBRAS_API_KEY               # Primario — gratuito (https://cloud.cerebras.ai) · gpt-oss-120b
DEEPSEEK_API_KEY               # Fallback opcional — pay-per-use (https://platform.deepseek.com) · deepseek-v4-flash
GEMINI_API_KEY                 # Fallback — free tier 15 RPM, fast-fail en la cadena
OPENROUTER_API_KEY             # Fallback — gratuito (https://openrouter.ai) · límite diario
GROQ_API_KEY                   # Último fallback — gratuito (https://console.groq.com) · 30 RPM
VOYAGE_API_KEY
ADMIN_SECRET
NEXT_PUBLIC_APP_URL
```
> ⚠️ Política: **todos los LLM son gratuitos**. No usar planes de pago. Si un proveedor
> introduce límites, buscar alternativa gratuita y actualizar la cadena.

## Cadena de LLM (lib/gemini.ts)
```
Cerebras gpt-oss-120b → DeepSeek deepseek-v4-flash* → Gemini 2.5 Flash (1 retry) → OpenRouter llama-3.3-70b:free → Groq llama-3.3-70b
(*) Solo si DEEPSEEK_API_KEY está definida
```
`MAX_CHUNKS = 18` · `CANDIDATOS_RERANK = 50` — retriever trae 50, rerank-2 selecciona top 18

---

## Comandos frecuentes
```bash
cd app && npm run dev                                    # desarrollo
cd app && npm run build                                  # verificar build
cd app && npm run corpus:ingest                          # ingestar normas (detecta cambios por hash)
cd app && npm run corpus:ingest -- --solo=CLAVE --force  # re-ingestar norma específica
cd app && npm run eval                                   # evaluaciones contra localhost:3000
cd app && npm run eval:prod                              # evaluaciones contra producción (https://revisor-arq.vercel.app)
```

---

## Agentes — cuándo invocar
| Agente | Cuándo |
|---|---|
| `legal-citation-verifier` | **SIEMPRE** antes de mostrar respuesta al usuario |
| `ui-design-reviewer` | Al crear/modificar componentes UI |
| `security-auditor` | Antes de cada commit con cambios en API o auth |
| `corpus-ingestion-validator` | Tras ingestar nuevas normas |
| `prompt-engineer` | Al iterar prompts de sintetizador |
| `legal-domain-expert` | Dudas sobre jerarquía normativa chilena |

**Teams:** `quality-gate` (antes de merge) · `release-gate` (antes de deploy) · `ingesta-pipeline` (al cargar normas)

**Skills:** `rag-legal-chile` · `corpus-normativo-chile` · `citacion-juridica-chilena` · `mvp-legal-launch`

---

## Estado actual (2026-07-26)
- **Producción**: https://revisor-arq.vercel.app ✅ — ⚠️ **desactualizada**: los arreglos de
  proveedores LLM y la landing nueva están solo en local, sin desplegar
- **Rumbo**: proyecto postulado a **Semilla Inicia CORFO 2026** (10 meses). Plan de evolución de 4 fases en `PLAN-IMPLEMENTACION.md`; fundamento en `revision-critica-plan-evolucion.md`
- **Guías**: 7 ✅ — permiso edificación, LGUC vs OGUC, checklist residencial, cambio uso suelo
- **LLM**: Cerebras `gpt-oss-120b` → DeepSeek `deepseek-v4-flash`* → Gemini fast-fail → OpenRouter → Groq
- **Retrieval**: 50 candidatos → rerank-2 top 18 · HyDE + multi-query + hybrid BM25+vector
- **Corpus**: 420 normas · 22.494 chunks · 59 dictámenes CGR · dominios normalizados
- **Motor-reglas**: **24 reglas-gatillo activas**
- **Eval**: 🟡 **33/34 en la corrida integral local del 2026-07-26** (sin caché;
  latencia promedio 55,7 s). Pasaron `lguc-condominio`, `ley20283-corta-bosque` y
  `trap-borde-costero-directemar`. El único fallo,
  `guardrail-articuloinexistente`, entraba por error al cuestionario y devolvía
  texto vacío al runner; quedó corregido y pasó después como caso aislado
  (18 fuentes, 13,7 s). Falta repetir la corrida completa para declarar 34/34.

### Landing "ciudad de papel" — nueva (2026-07-25)
La home dejó de ser el hero clásico y pasó a ser una maqueta de papel a pantalla completa
donde los edificios son el menú. Narrativa completa de 8 actos en `00_FRONTEND/ESTRUCTURA PAGINA.md`;
**hoy están construidos los ocho actos**: atlas cerrado, apertura pop-up,
ciudad en reposo, estratigrafía de capas normativas, conflicto sobre un mismo predio y
lectura integrada del Centro, seguida de una respuesta verificada y su entrada física.

| Pieza | Archivo |
|---|---|
| Landing nueva | `src/app/page.tsx` |
| Landing anterior, intacta | `src/app/landing-clasica/page.tsx` |
| Hero de la ciudad | `src/components/ciudad/ciudad-hero.tsx` |
| Apertura del libro a la ciudad (CSS 3D) | `src/components/ciudad/introduccion-popup.tsx` |
| Segunda ciudad: hojas normativas al hacer scroll | `src/components/ciudad/capas-normativas.tsx` |
| Conflicto: ocho fuentes sobre un predio | `src/components/ciudad/conflicto-predio.tsx` |
| Centro: registro que ordena las fuentes | `src/components/ciudad/centro-inteligencia.tsx` |
| Respuesta: dictamen con respaldo visible | `src/components/ciudad/respuesta-verificada.tsx` |
| Entrada: puerta de papel hacia `/chat` | `src/components/ciudad/entrada-centro.tsx` |
| Coordenadas de edificios y calles (% sobre la foto) | `src/components/ciudad/datos-ciudad.ts` |
| Rótulos-chincheta de los edificios-menú | `src/components/ciudad/rotulo-edificio.tsx` |
| Autos, peatones, humo y aves (SMIL, sin re-render) | `src/components/ciudad/vida-urbana.tsx` |
| Franja superior: planes, contacto, día/noche, ingresar | `src/components/ciudad/franja-superior.tsx` |
| Imagen base 16:9 | `public/ciudad/ciudad-hero-v4.png` |
| Imagen nocturna 16:9 | `public/ciudad/ciudad-hero-v4-noche.png` |

**Reglas de esta landing:**
- Ningún texto dentro de la imagen generada — la IA deforma las letras. Todos los rótulos
  van en HTML encima. El prompt con sus 10 reglas está en `00_FRONTEND/prompt-ciudad-hero.md`.
- El contenedor del hero mantiene 16:9 exacto y se escala para cubrir: por eso las
  coordenadas en porcentaje de `datos-ciudad.ts` calzan con la foto en cualquier pantalla.
  Si se cambia la imagen, hay que volver a medir esas coordenadas.
- `Header` global se oculta en `/` (ver `components/header.tsx`), porque la landing trae
  su propia franja.
- Los edificios-menú son 3: Centro de Inteligencia → `/chat`, El Archivo → `/archivo`,
  La Escuela → `/guias`. El Tribunal y la Universidad se descartaron por no representar
  nada consultable del producto.
- La animación principal es una entrada de cámara con deriva lenta y una red de hilos
  dorados que nace del Centro. La vida urbana SVG queda solo en escritorio y respeta
  `prefers-reduced-motion`.
- Antes del hero corre una apertura de 6,1 s: atlas burdeos, páginas desplegadas y la ciudad
  elevándose desde el pliegue. Usa el mismo `ciudad-hero-v4.png` del hero para que el corte
  final sea continuo. Se puede omitir con el botón o Escape; con movimiento reducido no se
  monta.
- Después del hero, el acto 4 mantiene una escena fija durante el scroll y levanta seis
  planos de papel: ciudad, zonificación, restricciones, patrimonio, riesgo y coeficientes.
  El mismo predio se marca en cada hoja. Con movimiento reducido las hojas se muestran
  estáticas, una debajo de otra.
- El acto 5 conserva ese predio en un plano físico y hace aparecer ocho intervenciones de
  papel —PRC, OGUC, LGUC, DDU, CGR, SEREMI, DGA y CMN— con líneas de replanteo que
  convergen sobre él. El cierre dice “Una sola decisión depende de todas”. El orden
  aparece recién en el acto 6.
- El acto 6 no usa esos hilos: retira las ocho fuentes hacia un registro técnico con tres
  lecturas —normativa principal, criterios aplicables y condicionantes sectoriales— junto
  al volumen de papel del Centro de Inteligencia. El orden se explica por jerarquía y
  alineación, no por conexiones decorativas.
- El acto 7 cierra esa secuencia con una única hoja de dictamen, no con una interfaz de chat.
  Deja visibles conclusión, fuentes activas, citas textuales, jerarquía aplicada y alertas
  declaradas para explicar el estándar de evidencia de una respuesta de Revisor ARQ.
- El acto 8 reemplaza el CTA clásico por dos hojas de puerta que se abren sobre el interior
  del Centro. La única acción visible es entrar a `/chat`, de modo que el final se sienta
  como el ingreso a la aplicación y no como una sección de marketing separada.
- Revisión responsive final: en móvil, cuando la puerta del acto 8 se abre, ambas hojas se
  apartan completamente para no cubrir el texto ni el CTA. Mantener esa regla al modificar
  la escena.

### Features v2 en producción
| Feature | Archivo | Estado |
|---------|---------|--------|
| BCN deep-links | `lib/bcn-links.ts` + `fuentes-panel.tsx` | ✅ prod |
| Indicador de confianza | `lib/confianza.ts` + badge en `mensaje.tsx` | ✅ prod |
| PWA | `public/manifest.webmanifest` + `public/sw.js` | ✅ prod |
| Upload documentos multimodal | `api/parse-doc` con Gemini Flash | ✅ prod |
| Extracción estructurada (AI SDK) | `extraer-parametros/vacios/cronologia` | ✅ prod |
| Calculadoras interactivas | `calc-constructibilidad`, `calc-estacionamientos` | ✅ prod |
| Guías temáticas | `/guias` + 3 páginas SSG con contenido técnico | ✅ prod |
| Newsletter | `api/newsletter/subscribe` + SQL migration + form conectado | ✅ prod |
| Playwright E2E | `playwright.config.ts` + `e2e/chat.spec.ts` | ✅ local |
| Playwright en CI | `deploy.yml` instala chromium + smoke tests post-deploy | ✅ CI |
| Active Prompting | chat baja confianza → solicita contexto antes de responder | ✅ prod |

### Pipeline Legal-RAG implementado
| Fase | Módulo | Estado |
|------|--------|--------|
| 0+1 | Compuerta normativa (motor-reglas, detector-conflictos, fetcher-normas-obligatorias) | ✅ |
| 2 | Reranking voyage-rerank-2 (50 → top 18) + HyDE + multi-query | ✅ |
| 3 | Verificador coherencia post-síntesis (validador.ts) | ✅ |
| 4 | Extractor hechos jurídicos (extractor-hechos.ts, regex) | ✅ |
| 5 | Hybrid BM25+vector (match_chunks_hybrid en retriever, fallback automático) | ✅ |
| 6 | CGR dictámenes como capa interpretativa | ✅ 60 dictámenes, 24 reglas-gatillo |
| 7 | Expansión catálogo reglas-gatillo | ✅ 24 activas |

### Ingesta CGR — advertencia técnica
**No usar `bash &` para paralelizar `npm run corpus:ingest`**: bypasea el delay interno `BETWEEN_NORMAS_MS=1500ms` y causa race conditions en Voyage AI + Supabase. Usar siempre `--solo=KEY` de a uno o en lotes pequeños secuenciales.

## Prioridades actuales — Fase 0 del plan CORFO (mes 1)
1. **0.1 Telemetría de consultas** — tabla `consultas_log` (consulta, reglas disparadas, casi-disparos, chunks, confianza, feedback) + dashboard en `/corpus`
2. **0.2 Golden set 34 → 100+** con 3 métricas separadas: recall retrieval / fidelidad de cita / corrección de conclusión
3. **0.3 Migrar reglas-gatillo a Supabase** — tabla `reglas_gatillo` con embedding de condición; motor lee de BD con caché
4. **0.4 Ciclo feedback → eval** — thumbs-down genera caso candidato en cola de revisión
5. `RESEND_API_KEY` en Vercel (newsletter, backend listo)

**Siguientes fases** (no empezar sin completar Fase 0): Fase 1 = corpus territorial PRC Biobío (hito CORFO mes 5, tabla `prc_zonas` estructurada + retrieval por comuna) · Fase 2 = algoritmo v3 (verificación citas a nivel fragmento, conflictos v2, grafo en retrieval) + Tier Público two-pass · Fase 3 = pagos CLP y lanzamiento.

**Reglas de diseño del plan (no negociables):**
- Tier Público = capa de presentación sobre respuesta verificada; **nunca** un pipeline degradado sin verificación
- PRC: **nunca mezclar chunks de comunas distintas** en una respuesta; parámetros de zona salen de `prc_zonas` (lookup determinístico), no de chunks
- Verificación de citas: objetivo mover de "nº de artículo existe" a "fragmento citado es literal" (fuzzy-match + regeneración)

→ **Al retomar, leer primero `HANDOFF-2026-07-25.md`**: proveedores LLM caídos en producción,
  corpus normalizado, landing revisada y último guardrail corregido
→ Detalle técnico en `PROGRESO.md`
→ Roadmap completo con KPIs en `PLAN-IMPLEMENTACION.md`
→ Análisis crítico que fundamenta el plan en `revision-critica-plan-evolucion.md`

## LLM — notas de proveedores gratuitos
- **Cerebras**: sin RPM agresivo, hardware dedicado CS-3, gpt-oss-120b (120B params, ~3000 t/s)
- ⚠️ **Los catálogos de modelos cambian sin aviso y la cadena de respaldo lo disimula.**
  El 2026-07-25 se detectó que Cerebras devolvía 404 (`qwen-3-235b` salió del catálogo)
  y DeepSeek 400 (`deepseek-chat` dejó de ser nombre válido) — **en producción, desde
  hacía tiempo**. Todo caía a Gemini, y como cada consulta hace ~4 llamadas al LLM,
  las 15 RPM del free tier se agotaban a la tercera pregunta seguida. Síntoma visible:
  respuestas de 50–70 s y luego timeouts. Verificar catálogo en
  https://inference-docs.cerebras.ai/models/overview antes de asumir que un modelo vive.
  ✅ **Hecho (2026-07-25)**: `/api/healthz` ahora llama `checkCerebrasHealth()` en
  `lib/cerebras.ts` — un `GET /v1/models` a Cerebras (sin gastar tokens de generación)
  que confirma que `MODEL_CEREBRAS` sigue en el catálogo. Si el proveedor primario
  cae, `/api/healthz` responde `degraded` (503) con el detalle en `checks.llm_primario`,
  en vez de tardar meses en notarse por la latencia. Falta desplegar.
- **Gemini free**: 15 RPM rolling; usar como fallback con maxRetries=1 para fast-fail
- **OpenRouter**: modelos `:free` sin costo, límite diario de tokens
- **Groq**: 30 RPM free, llama-3.3-70b-versatile; último recurso
- Política: nunca usar plan de pago en ningún proveedor LLM

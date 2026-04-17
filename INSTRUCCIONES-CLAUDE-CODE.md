# REVISOR ARQ — Plan completo para Claude Code CLI

Instrucciones paso a paso para construir REVISOR ARQ desde cero hasta lanzamiento, con ejecución **100% gratuita** mientras el uso se mantenga dentro de los *free tiers*. Diseñado para que no tengas que escribir código ni tomar decisiones técnicas: solo copiar, pegar y responder a Claude Code cuando pregunte.

---

## Parámetros del proyecto

- **Alcance MVP (Fase 1):** LGUC + OGUC + DDU normales. RAG con citas verificables.
- **Usuarios:** un solo producto con dos modos de respuesta (arquitecto / abogado).
- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion + Supabase (Postgres + pgvector) + **Google Gemini 2.5 Flash (gratis)** + Voyage AI embeddings (gratis).
- **Costo operativo esperado mientras pruebas:** USD 0.
- **Despliegue:** Vercel (gratis).

---

## Índice de fases

- **Setup A** — Requisitos previos (cuentas y herramientas).
- **Setup B** — Configuración avanzada de Claude Code (skills, subagentes, hooks, MCPs, worktrees).
- **Fase 1 — MVP funcional**
  - Prompt 1: Scaffolding e identidad visual del proyecto.
  - Prompt 2: Sistema de diseño y landing page.
  - Prompt 3: Backend Supabase y esquema de datos.
  - Prompt 4: Descarga automatizada del corpus normativo.
  - Prompt 5: Pipeline de ingesta y vectorización.
  - Prompt 6: Chat con RAG, streaming y modos.
  - Prompt 7: Blindaje anti-alucinación y evaluación.
- **Fase 2 — Escalado**
  - Prompt 8: Autenticación y persistencia.
  - Prompt 9: Dashboard de administración.
  - Prompt 10: DDU Específicas y primeros Planes Reguladores.
- **Fase 3 — Profundidad normativa**
  - Prompt 11: Normativa sectorial (SEC, MOP, Bomberos) y jurisprudencia.
  - Prompt 12: Análisis comparativo entre normas.
- **Fase 4 — Lanzamiento**
  - Prompt 13: Despliegue en Vercel + dominio.
  - Prompt 14: Métricas, monitoreo y monetización opcional.

---

## Setup A — Requisitos previos (una sola vez)

Instala en tu computador:

1. **Node.js 20 LTS** → https://nodejs.org
2. **Git** → https://git-scm.com
3. **Claude Code CLI** → sigue la guía oficial en https://docs.claude.com
4. **VS Code** (recomendado para ver los cambios) → https://code.visualstudio.com

Crea cuentas gratuitas en:

5. **Supabase** → https://supabase.com (base de datos y auth).
6. **Google AI Studio** → https://aistudio.google.com (para la API gratis de Gemini). Saca una API key desde "Get API key".
7. **Voyage AI** → https://www.voyageai.com (embeddings gratis, 200M tokens).
8. **Vercel** → https://vercel.com (hosting gratis).
9. **GitHub** → https://github.com (repositorio de código).

Guarda las API keys en un gestor de contraseñas. No las pegues nunca en chats.

---

## Setup B — Configuración avanzada de Claude Code

Antes del primer prompt de proyecto, configura Claude Code para que trabaje al máximo. Abre la terminal dentro de `REVISOR-ARQ` y ejecuta `claude`. Luego pega el siguiente prompt:

```
Antes de empezar a construir el proyecto, quiero configurar este entorno de Claude Code con las mejores prácticas. Soy un usuario no-programador, así que configura todo por mí y explícame qué estás haciendo.

Crea la siguiente estructura dentro de la carpeta actual:

1. Un archivo `.claude/settings.json` con configuración del proyecto:
   - Modelo por defecto: el Claude más capaz disponible.
   - Permisos: permitir edición de archivos y ejecución de bash sin preguntar cada vez dentro de esta carpeta.
   - Autoformat on save activado.

2. Un archivo `CLAUDE.md` en la raíz del proyecto con:
   - Descripción de REVISOR ARQ.
   - Stack técnico exacto (Next.js 14 + TS + Tailwind + shadcn/ui + Framer Motion + Supabase + Gemini 2.5 Flash + Voyage).
   - Principios no-negociables: (a) toda respuesta al usuario final debe tener citas verificables, (b) nunca inventar artículos, (c) disclaimers obligatorios, (d) kebab-case en filenames, (e) español para UI, (f) commits atómicos y mensajes en español.
   - Instrucciones para que cualquier sesión futura de Claude Code lea primero este archivo.

3. Configura los siguientes **subagentes** en `.claude/agents/` (son archivos .md con frontmatter YAML):

   a. `legal-citation-verifier.md` — agente que revisa cada respuesta generada por el RAG antes de mostrarla al usuario, verificando que (i) cada afirmación tenga cita, (ii) la cita exista realmente en los chunks recuperados, (iii) el número de artículo citado coincida con el chunk. Si detecta inconsistencia, marca la respuesta para regeneración.

   b. `ui-design-reviewer.md` — agente que revisa cada componente React nuevo verificando: uso consistente de shadcn/ui, tokens del sistema de diseño, accesibilidad (a11y), responsividad móvil, consistencia tipográfica.

   c. `corpus-ingestion-validator.md` — agente que después de cada ingesta revisa muestras aleatorias: que los chunks no estén cortados a mitad de oración, que los metadatos (artículo, número de DDU) sean correctos, que no haya duplicados.

   d. `security-auditor.md` — agente que antes de cada commit revisa: que no haya API keys hardcodeadas, que las variables de entorno sensibles estén en .env.local (no versionado), que las API routes tengan validación de inputs y rate limiting.

   e. `release-checklist.md` — agente que antes de desplegar corre una checklist: tests pasando, variables de entorno en Vercel configuradas, disclaimers visibles, rate limiting activo, evaluación de calidad reciente pasada.

4. Configura los siguientes **hooks** en `.claude/hooks/`:

   a. PreToolUse hook que bloquee `rm -rf` sobre `corpus/` o `.env.local`.
   b. PostToolUse hook después de Edit/Write que ejecute `npm run lint -- --fix` si el archivo es .ts/.tsx.
   c. Stop hook que recuerde hacer commit si hay más de 5 archivos modificados sin commitear.

5. Instala y configura los siguientes **MCPs** útiles para el proyecto (si están disponibles):
   - Filesystem MCP (acceso local mejorado).
   - GitHub MCP (para manejar repo y PRs).
   - Supabase MCP si existe oficial; si no, documenta en `docs/mcp-pendientes.md` que sería útil.

6. Configura **git worktrees** como patrón de trabajo: crea un script `scripts/new-feature.sh` que reciba el nombre de una feature y cree un worktree paralelo en `../revisor-arq-<feature>/` con una nueva rama. Esto me permitirá tener dos versiones del código simultáneas si quiero experimentar sin romper la principal.

7. Aprovecha las skills disponibles en este entorno de Claude Code. En el CLAUDE.md documenta cuáles vas a usar y cuándo:
   - `web-artifacts-builder` para prototipar componentes complejos antes de integrarlos.
   - `brand-guidelines` y `theme-factory` para el sistema de diseño visual.
   - `canvas-design` para generar assets gráficos (logo, ilustraciones, open graph).
   - `doc-coauthoring` para documentación técnica y legal.
   - `pdf` para extracción de texto del corpus normativo.
   - `slack-gif-creator` (opcional, más adelante) para material de lanzamiento.

8. Crea un archivo `docs/claude-code-workflow.md` explicándome en lenguaje simple (no-programador):
   - Qué hace cada subagente y cuándo se activa.
   - Qué hacen los hooks.
   - Cómo usar worktrees.
   - Cómo invocar una skill manualmente.

Haz todo esto, muéstrame el árbol final, y commitea como "chore: configuración avanzada de Claude Code con subagentes, hooks y workflow".
```

---

## Fase 1 — MVP funcional

### Prompt 1 — Scaffolding e identidad visual

```
Paso 1 del proyecto REVISOR ARQ.

Lee primero el CLAUDE.md que generaste. Luego crea la estructura base del proyecto:

Estructura raíz:
- `app/` — proyecto Next.js 14 (App Router, TypeScript, Tailwind, ESLint).
- `corpus/` — donde vivirán los textos normativos. Crea subcarpetas: `corpus/lguc/`, `corpus/oguc/`, `corpus/ddu/`. Incluye READMEs explicando qué va en cada una.
- `scripts/` — scripts de ingesta, descarga, evaluación y utilidades.
- `docs/` — documentación técnica y legal.
- `design/` — assets de diseño (logo, paleta, tipografía). Vacía por ahora.

Dentro de `app/`:
- Inicia con `create-next-app` + shadcn/ui.
- Instala desde el comienzo: `@supabase/supabase-js`, `@google/generative-ai`, `voyageai` (o fetch directo si no hay SDK oficial), `framer-motion`, `lucide-react`, `zod`, `react-markdown`, `remark-gfm`, `rehype-highlight`, `sonner` (toasts), `cmdk` (paleta de comandos).
- Configura `next.config.ts` con headers de seguridad básicos.
- Configura dark mode con `next-themes`.
- Configura fuentes: `Geist Sans` para texto y `Geist Mono` para código/cita, vía `next/font`.

Identidad visual inicial (deja placeholders sobrios pero de buen gusto — en el Prompt 2 lo elevamos):
- Paleta base: neutros fríos + un acento profesional (azul marino profundo tipo #0B1E3F, o verde bosque #1F3A2E — tú eliges y justifica).
- Tipografía jerárquica clara.
- Logo textual simple con monospace: "REVISOR ARQ" con un punto de color como acento.
- Favicon y open-graph generados como placeholder (usa la skill `canvas-design` si ayuda).

Crea archivos en la raíz:
- `README.md` completo (qué es, stack, cómo correrlo, roadmap resumido).
- `.gitignore` robusto.
- `.env.local.example` con todas las variables necesarias pero vacías.
- `LICENSE` (MIT, salvo que opines distinto).

Inicializa git, primer commit: "chore: scaffolding inicial con identidad visual base".

Al final muéstrame: árbol de archivos, comando para levantar el dev server, y capturas de pantalla descriptivas de cómo se verá la página de bienvenida.
```

---

### Prompt 2 — Sistema de diseño nivel profesional

```
Paso 2: elevar el diseño visual al nivel de productos como Linear, Vercel o Stripe. Quiero que REVISOR ARQ se vea como una herramienta profesional seria, no como un proyecto escolar.

Usa las skills `brand-guidelines`, `theme-factory` y `canvas-design` para fundamentar las decisiones.

Entregables:

1. **Sistema de design tokens** en `app/src/styles/tokens.css`:
   - Escala de color semántica: background, foreground, muted, accent, destructive, border, ring, con variantes dark/light.
   - Escala tipográfica: display / h1 / h2 / h3 / body / small / caption, con letter-spacing y line-height afinados.
   - Escala de espaciado (4px base).
   - Escala de radios y sombras.
   - Variables CSS bien nombradas, compatibles con shadcn.

2. **Componentes shadcn/ui instalados y personalizados**: button, input, textarea, select, card, sheet, dialog, dropdown-menu, tooltip, badge, separator, skeleton, scroll-area, avatar, tabs, toast (sonner), command (cmdk), toggle, switch.

3. **Layout global** en `app/src/app/layout.tsx`:
   - Toggle de tema (dark/light/system) persistido.
   - Header minimalista fijo con logo y navegación.
   - Footer con disclaimer y links legales.
   - Transiciones suaves con Framer Motion entre rutas.

4. **Landing page** (`/`) al nivel de un producto real:
   - Hero con titular potente en español: algo como "Normativa urbana chilena, respondida con fuentes verificables".
   - Subtítulo explicando el valor (dos modos, cita cada artículo, LGUC + OGUC + DDU).
   - CTA primario: "Probar consulta" que lleva al chat.
   - Sección de características con 3-4 tarjetas animadas (fade-up on scroll).
   - Sección "Cómo funciona" con un diagrama visual del flujo pregunta → búsqueda → respuesta con citas.
   - Sección FAQ (acordeón).
   - Microinteracciones: hover states, focus visible, cursor sutil.

5. **Branding gráfico** en `design/`:
   - Logo definitivo como SVG vectorial. Diseño original, sobrio, profesional. No copies marcas existentes.
   - Variaciones: logo completo, isotipo, versión en blanco y negro.
   - Open graph image 1200x630 generada con la skill `canvas-design`.
   - Favicon multisize.
   - Paleta documentada en `design/paleta.md`.

6. **Página 404 y página de error** también diseñadas con estilo.

7. **Accesibilidad**: contraste AAA, focus-visible en todos los interactivos, aria-labels, skip-link, prefiere-reducir-movimiento respetado.

8. Crea una ruta oculta `/design-system` que muestre todos los componentes y tokens en una página interna, estilo Storybook ligero. Útil para revisar consistencia.

9. Al terminar, pide al subagente `ui-design-reviewer` que audite todo el sistema y aplique las correcciones que sugiera.

Commit: "feat: sistema de diseño profesional con landing, tokens y branding".
```

---

### Prompt 3 — Backend Supabase y esquema de datos

Crea primero un proyecto nuevo en Supabase (https://supabase.com → New Project). Anota URL, anon key y service_role key. Luego pega:

```
Paso 3: configurar backend.

1. Crea `scripts/schema.sql` con el esquema completo:
   - Habilitar extensión `pgvector`.
   - Tipo enum `tipo_norma` con valores: 'LGUC', 'OGUC', 'DDU', 'DDU_ESPECIFICA', 'LEY', 'PRC', 'NCH', 'JURISPRUDENCIA'. Por ahora solo usaremos los tres primeros, pero dejamos el enum preparado para fases futuras.
   - Tabla `normas`: id uuid, tipo tipo_norma, numero text, titulo text, fecha_publicacion date, fecha_actualizacion date, url_fuente text, hash_contenido text, texto_completo text, vigente boolean default true, created_at, updated_at.
   - Tabla `articulos`: id uuid, norma_id fk, numero text, titulo text, texto text, orden int.
   - Tabla `chunks`: id uuid, norma_id fk, articulo_id fk nullable, texto text, embedding vector(1024), tokens int, orden int, metadatos jsonb.
   - Tabla `consultas`: id uuid, pregunta text, modo text, respuesta text, chunks_usados jsonb, modelo text, tokens_usados int, latencia_ms int, feedback_thumbs int nullable, created_at.
   - Tabla `evaluaciones`: id uuid, pregunta text, respuesta_esperada text, respuesta_generada text, pasa boolean, notas text, created_at.
   - Índices: hnsw sobre chunks.embedding, btree sobre normas.tipo, gin sobre metadatos.
   - RPC `match_chunks(query_embedding vector(1024), match_count int, filter_tipos text[])` que retorne chunks + datos de norma, ordenados por similitud coseno.
   - RLS habilitado: lectura pública a normas y articulos; escritura solo con service_role; consultas solo con token de usuario autenticado (preparar, aunque en MVP 1 todavía no hay auth).

2. Configura archivo `.env.local.example` con variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, VOYAGE_API_KEY, NEXT_PUBLIC_APP_URL.

3. En `app/src/lib/` crea los clientes:
   - `supabase.ts`: cliente público y cliente admin (service role) separados.
   - `gemini.ts`: wrapper para Gemini 2.5 Flash con streaming. Configura temperatura baja (0.2) y top_p conservador para respuestas legales.
   - `voyage.ts`: wrapper para generar embeddings en batch.

4. Crea `scripts/test-connection.ts`: script que verifica (a) conexión a Supabase, (b) llamada a Gemini con un "hola mundo", (c) llamada a Voyage con un texto corto. Imprime resultados legibles.

5. Documenta paso a paso en `docs/supabase-setup.md`: clicks literales en la web de Supabase para ejecutar el schema.sql y obtener las keys.

Pide al subagente `security-auditor` una revisión antes de commitear.

Commit: "feat: backend Supabase con esquema completo y clientes de Gemini y Voyage".
```

---

### Prompt 4 — Descarga automatizada del corpus

Este paso automatiza la obtención de los textos normativos. **Importante:** algunas fuentes pueden cambiar de URL o tener restricciones. Si un download falla, Claude Code te avisará y tendrás que descargar manualmente ese archivo.

```
Paso 4: automatizar la descarga del corpus normativo chileno.

Fuentes:
- **LGUC**: DFL 458 de 1975, MINVU. Disponible en LeyChile (BCN) vía su endpoint de texto completo. Buscar por idNorma conocido o por query.
- **OGUC**: DS 47 de 1992, MINVU. Disponible en LeyChile.
- **DDU**: circulares del MINVU. Listado histórico disponible en el Observatorio Urbano del MINVU: https://www.observatoriourbano.cl/ddu/ o sitio equivalente vigente. Cada DDU es un PDF.

Crea en `scripts/download/`:

1. `download-bcn.ts`: descarga LGUC y OGUC desde LeyChile.
   - Usa el endpoint público de BCN. Consulta primero la API (https://www.leychile.cl/Consulta/leyNorma?idNorma=...) o scrapea la página si no hay API estable.
   - Descarga en formato texto plano si está disponible; si no, PDF.
   - Guarda metadatos en `corpus/manifiesto.json`: nombre, url_fuente, fecha_descarga, hash, tipo, numero.
   - Idempotente: si ya existe y el hash coincide, no re-descarga.

2. `download-ddu.ts`: descarga DDU desde el listado del MINVU.
   - Scrapea el índice de DDU respetando robots.txt y con rate limiting (1 request cada 2 segundos).
   - Para el MVP descarga las últimas 50 DDU vigentes (o una lista configurable). Deja parámetro `--desde` y `--hasta` para filtrar por año.
   - Guarda cada PDF en `corpus/ddu/DDU-<numero>.pdf` y extrae texto con la skill `pdf` dejándolo también en `corpus/ddu/DDU-<numero>.txt`.
   - Actualiza `corpus/manifiesto.json`.

3. `download-all.ts`: orquestador que llama a los dos anteriores en orden y muestra progress bar.

4. `verify-corpus.ts`: verifica integridad — archivos existen, hashes coinciden, texto mínimo extraído (>1000 caracteres para LGUC/OGUC, >500 para cada DDU).

5. Registra los scripts en `package.json`:
   ```
   "corpus:download": "tsx scripts/download/download-all.ts",
   "corpus:verify": "tsx scripts/download/verify-corpus.ts"
   ```

6. Documenta en `docs/corpus.md`:
   - Fuentes y licencias (los textos normativos chilenos son de dominio público al ser normas oficiales, pero se deben citar las fuentes).
   - Cómo re-descargar el corpus.
   - Cómo agregar manualmente un PDF si la descarga falla.
   - Aviso legal: los PDFs del MINVU son públicos pero el servidor puede aplicar límites; respetar.

7. Ejecuta `npm run corpus:download` y reporta:
   - Qué descargó exitosamente.
   - Qué falló y por qué.
   - Para los fallos, genera instrucciones manuales (con URLs directas) para que yo complete.

Pide al subagente `corpus-ingestion-validator` una revisión de calidad de los textos extraídos.

Commit: "feat: descarga automatizada del corpus LGUC + OGUC + DDU".
```

---

### Prompt 5 — Pipeline de ingesta y vectorización

```
Paso 5: transformar el corpus en datos indexables para RAG.

Crea `scripts/ingest/`:

1. `parsers/lguc-oguc.ts`: parser especializado para LGUC y OGUC.
   - Detecta artículos por regex ("Artículo N°" o "Artículo \d+").
   - Preserva título, capítulo, y jerarquía (Libro > Título > Capítulo > Artículo).
   - Extrae texto por artículo como unidad lógica.

2. `parsers/ddu.ts`: parser para DDU.
   - Detecta header (número de DDU, fecha, materia).
   - Segmenta por secciones o por chunks de ~800 tokens con solapamiento de ~120.

3. `chunker.ts`: estrategia de chunking:
   - Para artículos cortos (<1000 tokens): un artículo = un chunk.
   - Para artículos largos: chunks con solapamiento respetando oraciones.
   - Metadatos por chunk: tipo_norma, numero_norma, articulo, titulo_articulo, orden, url_fuente.

4. `embedder.ts`: genera embeddings vía Voyage API en batches de 128, con reintentos exponenciales.

5. `ingest.ts`: script principal.
   - Lee manifiesto, detecta qué normas son nuevas o modificadas (por hash).
   - Borra registros previos de normas modificadas.
   - Parsea, chunkea, embeddea e inserta en Supabase.
   - Logging con métricas: chunks generados, tokens totales, tiempo, costo estimado (aunque sea $0 en Voyage free tier).
   - Idempotente y reanudable.

6. Registra en `package.json`:
   ```
   "corpus:ingest": "tsx scripts/ingest/ingest.ts",
   "corpus:ingest:dry": "tsx scripts/ingest/ingest.ts --dry-run"
   ```

7. Documentación en `docs/ingesta.md`: cómo funciona, cómo reingestar, cómo depurar.

8. Ejecuta `npm run corpus:ingest` y reporta resultados. Verifica en Supabase que los chunks se ven bien (toma una muestra de 5 chunks aleatorios y muéstramelos).

Pide al subagente `corpus-ingestion-validator` que audite la calidad y aplique correcciones si encuentra problemas.

Commit: "feat: pipeline de ingesta con parsers especializados por tipo de norma".
```

---

### Prompt 6 — Chat con RAG, streaming y modos

```
Paso 6: la interfaz de consulta, corazón de la app.

1. **API route** `app/src/app/api/consulta/route.ts`:
   - Recibe: { pregunta: string, modo: 'arquitecto' | 'abogado', historial?: Message[] }.
   - Valida con zod. Rate limit por IP (10 req/min) con Upstash Ratelimit en modo memoria o con cabeceras simples de Vercel.
   - Genera embedding de la pregunta (Voyage).
   - Llama RPC `match_chunks` con top_k=8, threshold de similitud 0.65.
   - Si no hay suficientes chunks sobre el umbral, responde explícitamente "sin respaldo suficiente" (no llama a Gemini).
   - Si hay chunks suficientes, construye el contexto con formato estricto: cada chunk etiquetado con [TIPO NORMA - ARTÍCULO N°].
   - System prompt según modo:
     - **Arquitecto**: orientado a aplicación práctica, parámetros numéricos, ejemplos, referencia al artículo aplicable.
     - **Abogado**: orientado al texto literal, cita íntegra del pasaje, contexto histórico si relevante, advertencias sobre reformas.
   - Regla dura en ambos prompts: "Prohibido afirmar nada que no esté literalmente respaldado por los fragmentos [TIPO NORMA - ARTÍCULO N°] entregados. Si la respuesta requiere información no entregada, declara la limitación."
   - Llama a Gemini 2.5 Flash con temperatura 0.2 en streaming.
   - Devuelve respuesta streamed (Server-Sent Events o Response streaming de Next.js) con metadatos: chunks recuperados con score, modelo, latencia.

2. **UI del chat** (`/chat`):
   - Layout de 3 columnas: historial de conversación (colapsable en móvil) | área de chat | panel de fuentes (colapsable).
   - Selector de modo como Toggle Group grande y claro en la parte superior.
   - Textarea con auto-resize, envío con Cmd+Enter.
   - Mensajes renderizados con react-markdown + GFM + highlight.
   - Citas mostradas como "chips" clickeables dentro del texto que, al hacer clic, abren el panel de fuentes con el chunk completo resaltado.
   - Loading states refinados: skeleton del mensaje, luego streaming caracter por caracter con cursor parpadeante.
   - Disclaimer pegado al pie del panel de chat en tipografía pequeña pero legible.
   - Botón thumbs-up/thumbs-down en cada respuesta para capturar feedback en la tabla `consultas`.
   - Atajo ⌘K para abrir un command palette (cmdk) con acciones rápidas: nueva consulta, cambiar modo, ver historial, ver fuentes.

3. **Panel de fuentes**:
   - Lista de chunks con: tipo de norma, número de artículo, score de similitud, fragmento textual, link "abrir norma completa".
   - Al clickear un chunk se abre un Sheet lateral con el texto completo del artículo y navegación al anterior/siguiente.

4. **Estados de error elegantes**: sin respaldo, sin conexión, rate limit alcanzado, timeout — todos con mensajes claros y sugerencias de acción.

5. **Animaciones** (Framer Motion): entrada suave de mensajes, reordenado fluido, fade-in de chips de fuente.

6. Genera 5 consultas de prueba que cubran casos diversos (parámetro urbanístico simple, pregunta legal literal, pregunta ambigua, pregunta fuera de alcance, pregunta sobre DDU específica). Ejecuta cada una en ambos modos y muéstrame resultados.

Pide a los subagentes `legal-citation-verifier` y `ui-design-reviewer` que revisen antes de commitear.

Commit: "feat: chat con RAG, streaming, dos modos y panel de fuentes".
```

---

### Prompt 7 — Blindaje anti-alucinación y evaluación

```
Paso 7: asegurar calidad antes de abrir a usuarios reales.

1. **Set de evaluación** en `docs/eval/preguntas.jsonl`:
   - 30 preguntas que cubran: LGUC (10), OGUC (10), DDU (10).
   - Para cada pregunta: pregunta_texto, modo_esperado, palabras_clave_esperadas, articulos_esperados, respuesta_resumen_esperada, debe_responder (true/false, para probar que declina cuando no hay respaldo).

2. **Runner de evaluación** `scripts/eval/run.ts`:
   - Ejecuta todas las preguntas contra la API.
   - Evalúa: (a) ¿cita los artículos esperados?, (b) ¿incluye palabras clave?, (c) ¿declina cuando debe?, (d) latencia, (e) longitud de respuesta.
   - Genera reporte en `docs/eval/reportes/<timestamp>.md` con scoring y diffs contra la corrida anterior.

3. **Refuerzo de system prompts**: itera los prompts de cada modo hasta pasar >90% del set de evaluación. Documenta cada iteración en `docs/eval/iteraciones.md`.

4. **Guardrails adicionales**:
   - Detector de pregunta fuera de dominio (no-chile, no-urbanismo): el sistema responde que está fuera de alcance.
   - Detector de PII en la pregunta: si alguien pega datos personales, se le pide reformular sin ellos.
   - Prohibición explícita de consejos legales vinculantes en modo abogado: siempre termina con el disclaimer.

5. **Observabilidad**:
   - Cada consulta se guarda en `consultas` con tokens, latencia, chunks usados.
   - Página interna `/admin/metrics` protegida con una env var simple (password temporal) que muestra: consultas por día, feedback positivo/negativo, consultas sin respaldo, top preguntas.

6. Pide al subagente `legal-citation-verifier` que corra contra el set de eval y reporte.

Commit: "feat: evaluación, guardrails y observabilidad del MVP".
```

---

## Fase 2 — Escalado

### Prompt 8 — Autenticación y persistencia

```
Paso 8: Fase 2. Autenticación y historial persistente.

1. Configura Supabase Auth (email magic link + Google OAuth).
2. Rutas protegidas: /chat y /admin requieren sesión.
3. Tabla `conversaciones` y `mensajes` con RLS (cada usuario ve solo lo suyo).
4. Sidebar de conversaciones pasadas con búsqueda.
5. Perfil de usuario con preferencias (modo por defecto, tema).
6. Compartir conversación vía link público opcional (tabla `conversaciones_compartidas` con slug único).
7. Onboarding de primer uso con tour corto.

Commit: "feat: auth, conversaciones persistentes y sharing".
```

### Prompt 9 — Dashboard de administración

```
Paso 9: panel de admin para gestionar el corpus y monitorear uso.

1. `/admin` con auth robusta (rol admin en tabla `perfiles`).
2. Vistas:
   - **Corpus**: listado de normas, estado, última ingesta, reingestar desde UI.
   - **Consultas**: tabla filtrable, detalle de una consulta con sus chunks usados.
   - **Evaluación**: ejecutar set de eval desde UI, ver histórico.
   - **Feedback**: consultas con thumbs-down, para revisión manual.
   - **Métricas**: gráficos con Recharts de uso diario, modos, tasa de "sin respaldo".
3. Acciones administrativas: marcar norma como vigente/no vigente, editar metadatos, reingestar una norma puntual.

Commit: "feat: dashboard de administración completo".
```

### Prompt 10 — DDU Específicas y Planes Reguladores piloto

```
Paso 10: ampliar corpus a DDU Específicas + 3 PRC piloto (Providencia, Las Condes, Ñuñoa).

1. Extiende `download-ddu.ts` para la serie "DDU Específica".
2. Crea `download-prc.ts`: descarga ordenanzas PRC desde sitios de las 3 municipalidades piloto (o desde el repositorio del OGUC-MINVU si está disponible). Los PRC suelen venir en PDF + planos. Ignora planos por ahora; ingesta solo el texto de la ordenanza.
3. Actualiza parsers para estas tipologías.
4. Añade filtro de comuna en la UI del chat: el usuario puede limitar la búsqueda a "solo PRC de Providencia" o "nacional + PRC de mi comuna".
5. Re-ingesta completa. Re-evaluación.

Commit: "feat: DDU Específicas y PRC de 3 comunas piloto".
```

---

## Fase 3 — Profundidad normativa

### Prompt 11 — Normativa sectorial y jurisprudencia

```
Paso 11: incorporar normativa sectorial y jurisprudencia.

1. Normativa sectorial priorizada: SEC (eléctrica), SERVIU, Superintendencia de Servicios Sanitarios, reglamentos de Bomberos relevantes para PIE y PIT, Ley 20.958 (aportes al espacio público), Ley 19.537 (copropiedad inmobiliaria), Ley 21.450 (integración social).
2. Jurisprudencia: dictámenes de la Contraloría General de la República filtrables por materia. La CGR tiene buscador público.
3. Crear parsers y descargadores específicos.
4. En la UI: tab adicional "jurisprudencia" en el panel de fuentes.
5. Evaluación específica por tipología.

Commit: "feat: normativa sectorial y jurisprudencia CGR".
```

### Prompt 12 — Análisis comparativo y herramientas avanzadas

```
Paso 12: herramientas diferenciadoras.

1. **Comparador de versiones**: ver cómo cambió un artículo de la OGUC entre fechas. Requiere ingestar versiones históricas.
2. **Verificador de cumplimiento**: el usuario describe un proyecto (uso, zona, superficie) y el sistema identifica artículos aplicables con checklist.
3. **Generador de memoria explicativa**: borrador de documento de respaldo normativo para un permiso de edificación.
4. **Exportar conversación a PDF** con formato profesional (usar la skill `pdf`).

Commit: "feat: comparador, verificador y exportación profesional".
```

---

## Fase 4 — Lanzamiento

### Prompt 13 — Despliegue en Vercel

```
Paso 13: llevarlo a internet.

1. Crea proyecto en Vercel enlazado al repo de GitHub. Configura variables de entorno (dame la lista exacta que debo pegar ahí).
2. Configura dominio personalizado (dime qué registros DNS configurar cuando compre el dominio).
3. Headers de seguridad en producción (CSP, HSTS, X-Frame-Options).
4. Configura preview deployments para cada rama.
5. Configura Vercel Analytics gratuito.
6. Pide al subagente `release-checklist` que corra la checklist completa.
7. Crea una landing de "próximamente" mientras esté en beta privada, con formulario de waitlist guardado en Supabase.

Commit: "chore: configuración de producción para despliegue".
```

### Prompt 14 — Métricas, monitoreo y monetización opcional

```
Paso 14: sostenibilidad.

1. Integra Sentry (free tier) para errores.
2. PostHog (free tier) para producto analytics.
3. Define KPIs: DAU, consultas/día, tasa de respuesta "sin respaldo", NPS via encuesta in-app.
4. **Opcional**: capa de monetización con Stripe.
   - Plan Gratis: 10 consultas/día.
   - Plan Pro: USD 9/mes, consultas ilimitadas + PRC de todas las comunas + export PDF.
   - Plan Estudio: USD 29/mes, multi-usuario + API.
5. Página pública de pricing con comparativa.
6. Alertas: email si costos de Gemini/Voyage superan umbral (aunque sean $0 ahora, preparar).

Commit: "feat: observabilidad, analytics y capa opcional de pricing".
```

---

## Control de costos — cómo te aseguras de no pagar nada

Mientras estés en uso propio + beta con pocos usuarios, todo es gratis. Aun así, protege las flancos:

1. En Google AI Studio (Gemini), los límites gratuitos son cuotas por minuto/día automáticas. No te cobrarán: si pasas el límite, la API simplemente devuelve error. No hay riesgo de factura inesperada mientras uses el tier gratuito.
2. En Voyage, activa alertas de consumo en su dashboard.
3. En Supabase, el free tier tiene límites claros (500 MB DB, 2 GB bandwidth). Si te acercas, Supabase avisa por email. No cobra sin confirmar.
4. En Vercel, el plan Hobby es gratuito para proyectos personales sin uso comercial. Si planeas cobrar (Fase 4 Prompt 14), migra a Pro (USD 20/mes).
5. **Rate limiting duro en la API route** (Prompt 6): evita que un ataque o un bot te vacíe las cuotas.

---

## Cómo operar con Claude Code día a día

- Siempre abre una sesión con `claude` dentro de la carpeta del proyecto para que lea `CLAUDE.md`.
- Un prompt = una tarea. No pegues varios prompts juntos.
- Si algo falla, copia el error completo y pregunta "¿qué significa y cómo lo arreglamos?" antes de autorizar ningún arreglo.
- Antes de commits importantes, pide explícitamente: "corre los subagentes `security-auditor` y `ui-design-reviewer` y muéstrame su reporte".
- Para experimentar sin romper nada, pide: "crea un worktree en paralelo para probar X". Así tienes dos copias funcionando.
- Cada ciertos días pide: "consolida lo aprendido en `CLAUDE.md` para que futuras sesiones sean más eficientes".

---

## Orden recomendado de ejecución

Semana 1: Setup A + Setup B + Prompt 1 + Prompt 2.
Semana 2: Prompt 3 + Prompt 4 + Prompt 5.
Semana 3: Prompt 6 + Prompt 7. MVP funcional para tu uso.
Semana 4-5: Prompt 8 + Prompt 9 + Prompt 13 (deploy privado). Beta con 3-5 colegas.
Mes 2: Prompt 10 + Prompt 11.
Mes 3: Prompt 12 + Prompt 14. Lanzamiento público.

---

## Tu rol en todo esto

Aunque no programes, tu trabajo es:

1. **Curar el corpus**: decidir qué normas priorizar, validar calidad de extracción, marcar errores cuando los veas.
2. **Evaluar respuestas**: eres el experto del dominio. Claude Code puede construir; solo tú y otros profesionales pueden validar la calidad jurídica.
3. **Diseñar el producto**: qué flujos son útiles, qué palabras usar, qué filtros ofrecer.
4. **Proteger la marca**: si abres esto al público, eres el responsable ante usuarios. El disclaimer ayuda, pero mantén el criterio firme sobre qué funcionalidades liberar y cuándo.

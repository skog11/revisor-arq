# REVISOR ARQ — Guía completa paso a paso

Guía única y consolidada para construir REVISOR ARQ desde cero hasta tenerlo funcionando. Pensada para seguirla al pie de la letra sin saber programar.

**Qué vas a construir:** una aplicación web donde arquitectos y abogados pueden hacer consultas sobre normativa urbanística y de construcción en Chile (LGUC, OGUC y DDU), con respuestas basadas en las normas reales y con citas verificables.

**Costo de construcción y operación:** USD 0 mientras te mantengas en los planes gratuitos. Pago solo si escala y quieres plan Pro de algún servicio.

**Tiempo estimado:** 3 a 4 semanas a ritmo de 1-2 horas por día para el MVP funcional. Los scripts principales son ejecutados por Claude Code; tú copias, pegas y supervisas.

**Nivel requerido:** cero conocimiento de programación. Sí necesitas paciencia para leer mensajes en pantalla y responder cuando Claude Code te pregunte.

---

## Cómo está organizada esta guía

- **Parte 0** — Conceptos mínimos que tienes que entender antes de empezar.
- **Parte 0.5** — Cómo opera la app por dentro (visión conceptual con diagrama de flujo).
- **Parte 1** — Instalaciones en tu computador (una sola vez).
- **Parte 2** — Crear cuentas gratuitas en servicios que usarás (una sola vez).
- **Parte 3** — Crear la carpeta del proyecto y abrir Claude Code.
- **Parte 4** — Configurar Claude Code con skills, subagentes y agent teams.
- **Parte 5** — Construcción de la app en 9 prompts ordenados:
  - Prompt 1: Scaffolding del proyecto Next.js.
  - Prompt 2: Sistema de diseño profesional y landing page.
  - Prompt 3: Backend Supabase y clientes.
  - Prompt 4: Descarga automatizada del corpus.
  - Prompt 5: Pipeline de ingesta al corpus.
  - Prompt 5B: Panel visual del corpus y carga manual.
  - Prompt 6: Chat con RAG, streaming y dos modos.
  - Prompt 6B: Modo análisis profundo multidisciplinario.
  - Prompt 7: Evaluación y guardrails.
- **Parte 6** — Probar la app en tu computador.
- **Parte 7** — Publicar la app en internet.
- **Parte 8** — Roadmap de siguientes fases (una vez que el MVP funcione).
- **Parte 9** — Cómo trabajar con Claude Code en el día a día.
- **Parte 10** — Solución de problemas frecuentes.

Sigue las partes en orden. No te saltes ninguna.

---

# Parte 0 — Conceptos mínimos

## Qué es cada cosa

- **Terminal (o consola):** una ventana donde escribes comandos de texto en vez de hacer clic. En Windows se llama "PowerShell"; en Mac se llama "Terminal".
- **Claude Code CLI:** Claude viviendo dentro de la terminal, capaz de crear archivos y escribir código por ti. Es tu "programador". Lo usarás durante toda la construcción del proyecto.
- **Gemini:** el modelo de IA de Google que usará tu aplicación para responder a los usuarios finales. Gratuito dentro de límites generosos.
- **Voyage AI:** servicio que convierte los textos legales en "coordenadas" (embeddings) para que tu app encuentre el artículo relevante cuando alguien pregunta algo. Gratis hasta 200 millones de tokens.
- **Supabase:** la base de datos donde se guardarán las normas, los chunks de texto y las conversaciones. Gratis dentro de límites generosos.
- **Vercel:** donde vivirá tu app para que cualquiera pueda acceder por internet. Gratis para proyectos personales.
- **GitHub:** donde se guarda el código del proyecto. Funciona como "dropbox" de código. Gratis.
- **RAG (Retrieval Augmented Generation):** técnica donde la IA primero busca el artículo legal relevante, y solo después redacta la respuesta citándolo. Es lo que evita que Gemini "invente" normas.
- **Skill:** paquete de conocimiento que instalas en Claude Code para que sepa hacer algo mejor.
- **Subagente:** un asistente especializado que Claude Code invoca para tareas específicas (por ejemplo: revisar seguridad).
- **Agent team:** grupo de subagentes que trabajan coordinados.

## Qué NO vas a hacer

- No vas a escribir código. Claude Code lo hace.
- No vas a memorizar comandos. Esta guía los trae literales.
- No vas a tomar decisiones técnicas. Ya están tomadas.

## Qué SÍ vas a hacer

- Copiar y pegar prompts a Claude Code.
- Autorizar acciones cuando Claude Code pregunte.
- Crear cuentas en servicios (con tu email).
- Revisar que los resultados se vean bien.

---

# Parte 0.5 — Cómo opera la app por dentro

Antes de construir, conviene entender cómo funciona la aplicación a nivel conceptual. Esto te va a ayudar a saber qué está pasando en cada pantalla, por qué falla cuando falla, y qué decisiones son posibles en cada capa.

## El flujo completo de una consulta

Cuando un usuario escribe una pregunta en el chat, esto es lo que ocurre en orden, capa por capa:

```
  [USUARIO]  escribe: "¿cuál es la rasante en zona habitacional?"
      │
      ▼
  [FRONTEND  /chat]  envía { pregunta, modo, historial }
      │
      ▼
  [API  /api/consulta]
      ├─ valida el input (zod)
      ├─ aplica rate limit por IP
      └─ pasa la pregunta al embedder
      │
      ▼
  [VOYAGE AI]  convierte la pregunta en un vector de 1024 números
      │
      ▼
  [SUPABASE + pgvector]  busca los 8 chunks más similares del corpus
      │  (match_chunks por similitud coseno, umbral 0.65)
      ▼
  [RAG ENGINE]  arma el contexto: pregunta + 8 chunks etiquetados
      │  + regla estricta: "responder SOLO con este contexto"
      ▼
  [GEMINI 2.5 FLASH]  redacta la respuesta en streaming
      │  (modo arquitecto o abogado o análisis profundo)
      ▼
  [legal-citation-verifier]  (opcional) valida que cada cita exista
      │
      ▼
  [FRONTEND]  muestra respuesta char-por-char
      │  + chips de fuente + disclaimer + thumbs up/down
      ▼
  [SUPABASE tabla consultas]  guarda la interacción completa
      │  (para evaluación, métricas, mejora continua)
      ▼
  [USUARIO]  lee la respuesta con sus fuentes verificables
```

## Qué hace cada capa, en términos simples

**1. Frontend (lo que ve el usuario).** Es la interfaz visual: Next.js + React + Tailwind. Su rol es capturar la pregunta, mostrar el streaming de la respuesta, y renderizar los chips de cita. No tiene inteligencia; solo presentación.

**2. API Backend.** Es el "director de orquesta" dentro de la app. Recibe la pregunta del frontend y coordina las llamadas a los servicios externos (Voyage, Supabase, Gemini). También aplica protecciones: validación de inputs, rate limiting, guardrails de dominio.

**3. Voyage (embeddings).** Convierte texto en "coordenadas matemáticas". Cada pregunta y cada chunk del corpus viven como puntos en un espacio de 1024 dimensiones. Textos con significado parecido quedan cerca. Esto permite "búsqueda semántica": entender que "rasante" está relacionada con "ángulo de inclinación edificatoria" aunque las palabras sean diferentes.

**4. Supabase + pgvector (recuperación RAG).** La base de datos guarda el corpus entero como chunks con sus embeddings. Cuando llega una pregunta, busca los chunks cuyo vector está más cerca del vector de la pregunta. Devuelve los top 8 más relevantes.

**5. RAG Engine (ensamblaje de contexto).** Toma los 8 chunks recuperados y arma un prompt para Gemini con una regla dura: "responde solo usando esta información; si no alcanza, dilo". Esta regla es lo que impide que el modelo invente.

**6. Gemini 2.5 Flash (generación).** Recibe el prompt con contexto y redacta la respuesta. La calidad final depende enormemente de la calidad de los chunks recuperados en la capa 4. Si el chunk correcto no estaba en la base, Gemini no puede inventarlo.

**7. Verificación.** En el MVP se hace manual por el usuario leyendo las citas. En producción, el subagente `legal-citation-verifier` puede ejecutarse automáticamente antes de mostrar la respuesta, como filtro final de calidad.

**8. Persistencia de consultas.** Cada interacción (pregunta, chunks usados, respuesta, feedback del usuario) queda guardada. Esto permite evaluar el producto, detectar patrones de fallo, y mejorar los prompts con datos reales.

## Por qué RAG y no "solo Gemini"

Si la app solo llamara a Gemini sin RAG, pasaría esto:

- Gemini respondería "de memoria", usando lo que aprendió en su entrenamiento (cortado a una fecha anterior a la actualidad).
- No tendría acceso a normativa chilena específica ni a DDUs.
- Inventaría artículos o los confundiría con alta frecuencia.
- No podría citar fuentes verificables.

Con RAG, la respuesta está anclada a fragmentos reales del corpus. Si el fragmento no existe, la app dice "sin respaldo suficiente". Esto es lo que hace la herramienta legalmente defendible.

## Los tres modos de interacción

La misma pregunta puede responderse con tres perspectivas distintas según lo que el usuario necesite:

| Modo | Para quién | Formato de respuesta | Cuándo usarlo |
|---|---|---|---|
| **Arquitecto** | Profesional aplicando norma | Parámetro aplicable + cita breve + ejemplo práctico | Diseñando, calculando, resolviendo permisos |
| **Abogado** | Profesional legal | Cita textual completa + fuente + contexto interpretativo + jurisprudencia | Escritos judiciales, dictámenes, informes |
| **Análisis profundo** | Cualquiera ante un problema complejo | Descomposición multi-dimensional: urbanística + legal + alternativas + riesgos | Proyectos complejos, dudas estratégicas, decisiones con múltiples caminos |

El modo Análisis Profundo no responde con un párrafo. Devuelve un informe estructurado con secciones: contexto detectado, análisis urbanístico, análisis legal, 3-5 alternativas con pros y contras, riesgos, y recomendación de siguiente paso. Es el modo que saca partido real del cruce arquitecto + abogado.

## El rol crítico del corpus

Todo lo que la app "sabe" vive en el corpus. Si una norma no está cargada, la app no puede responder sobre ella. Por eso tendrás un panel visual (Prompt 5B) que te muestra exactamente qué normas están cargadas, cuáles faltan, y te permite agregar manualmente las que necesites.

El corpus es un organismo vivo: se actualiza, expande y corrige. Tu trabajo recurrente como dueño del producto es mantenerlo al día.

---

# Parte 1 — Instalaciones en tu computador

Haz esto una sola vez. Si ya tienes algo instalado, verifica la versión y avanza.

## 1.1 Instalar Node.js

Node.js es el "motor" que ejecutará tu aplicación.

1. Abre tu navegador y ve a https://nodejs.org.
2. Descarga la versión **LTS** (la del lado izquierdo, suele decir "Recomendado para la mayoría").
3. Ejecuta el instalador que descargaste.
4. Acepta todas las opciones por defecto y termina la instalación.
5. Para verificar que quedó bien instalado:
   - **Windows:** presiona la tecla Windows, escribe `PowerShell`, abre la aplicación que aparece.
   - **Mac:** presiona `Cmd + Espacio`, escribe `Terminal`, abre la aplicación.
6. En la ventana negra que se abrió, escribe:

   ```
   node -v
   ```

   Presiona Enter. Debe aparecer algo como `v20.11.0` o superior. Si aparece un número, todo bien. Si aparece error, reinstala Node.js.

## 1.2 Instalar Git

Git es la herramienta que lleva el control de versiones del código.

1. Ve a https://git-scm.com y descarga para tu sistema operativo.
2. Ejecuta el instalador.
3. **En Windows**, cuando te pregunte "Adjusting your PATH environment", elige la opción del medio: `Git from the command line and also from 3rd-party software`. Acepta defaults para el resto.
4. Verifica abriendo la terminal (PowerShell o Terminal) y escribiendo:

   ```
   git --version
   ```

   Debe mostrar algo como `git version 2.42.0`.

## 1.3 Instalar Claude Code CLI

1. Ve a https://docs.claude.com y busca la sección "Claude Code" o "Install Claude Code".
2. La instalación actual suele ser un comando en la terminal como:

   ```
   npm install -g @anthropic-ai/claude-code
   ```

   Copia ese comando, pégalo en tu terminal (PowerShell o Terminal) y presiona Enter. Espera a que termine (pueden ser 1-2 minutos).
3. Verifica escribiendo:

   ```
   claude --version
   ```

   Debe mostrar el número de versión.
4. Primera vez: escribe solo `claude` y presiona Enter. Te pedirá autenticarte con tu cuenta. Sigue las instrucciones en pantalla (abrir un link en el navegador, loguearte con tu cuenta de Anthropic).

> **Nota sobre costos de Claude Code:** si tienes plan Pro o Max de Claude, el uso de Claude Code está incluido. Si no, puedes pagar por API (cobro por uso, aproximadamente USD 30-100 total para construir todo el proyecto). Para el MVP, un plan Pro de USD 20/mes es más que suficiente.

## 1.4 Instalar Visual Studio Code

Sirve para mirar los archivos del proyecto de forma amigable (opcional pero recomendado).

1. Ve a https://code.visualstudio.com y descarga para tu sistema.
2. Instala con opciones por defecto.

## 1.5 Verificar todo

Cierra y abre nuevamente la terminal. Escribe estos tres comandos, uno a la vez, y confirma que todos responden con un número de versión:

```
node -v
git --version
claude --version
```

Si los tres funcionan, tu computador está listo.

---

# Parte 2 — Crear cuentas en servicios gratuitos

Vas a crear cinco cuentas. Todas son gratuitas. Usa tu email principal (el que me diste: `skog.petter@gmail.com`).

**Importante:** ten a mano un bloc de notas o gestor de contraseñas para ir copiando las "API keys". Son como contraseñas que Claude Code necesitará más adelante. **Nunca las compartas con nadie.**

## 2.1 GitHub

1. Ve a https://github.com.
2. Haz clic en "Sign up".
3. Registra tu usuario. Elige un nombre (te recomiendo `petter-skog` o similar).
4. Confirma tu email.
5. Por ahora no necesitas hacer nada más. Guarda en tu bloc de notas:
   - **Usuario de GitHub:** tu nombre de usuario.

## 2.2 Supabase (base de datos)

1. Ve a https://supabase.com.
2. "Start your project" → "Sign in with GitHub" (usa la cuenta recién creada).
3. Acepta los permisos.
4. Crea un nuevo proyecto:
   - **Name:** `revisor-arq`.
   - **Database Password:** genera una segura y guárdala en tu bloc de notas.
   - **Region:** elige `South America (São Paulo)`, es la más cercana a Chile.
   - **Plan:** Free.
5. Espera 2 minutos a que se cree el proyecto.
6. Una vez creado, en el menú lateral ve a **Project Settings → API**. Copia estos valores a tu bloc de notas:
   - **Project URL** (empieza con `https://xxxxx.supabase.co`).
   - **anon public key** (es larga, empieza con `eyJ...`).
   - **service_role secret key** (también larga). Ojo: esta es la más sensible, nunca la compartas.

## 2.3 Google AI Studio (Gemini gratis)

1. Ve a https://aistudio.google.com.
2. Inicia sesión con tu cuenta de Gmail.
3. Acepta los términos.
4. En la esquina superior izquierda haz clic en **"Get API key"** → **"Create API key"** → elige "Create API key in new project".
5. Copia la API key que aparece. Guárdala como **GEMINI_API_KEY** en tu bloc de notas.

## 2.4 Voyage AI (embeddings)

1. Ve a https://www.voyageai.com.
2. "Get started for free" → crea una cuenta con tu email.
3. Verifica el email.
4. Una vez dentro, ve a la sección de **API Keys** en el dashboard.
5. Crea una nueva key. Cópiala como **VOYAGE_API_KEY** en tu bloc de notas.

## 2.5 Vercel (donde vivirá la app)

1. Ve a https://vercel.com.
2. "Sign up" → usa la cuenta de GitHub.
3. Acepta los permisos.
4. No necesitas crear nada todavía. Solo confirma que la cuenta quedó activa.

## 2.6 Resumen de lo que debes tener guardado

Abre tu bloc de notas o gestor de contraseñas y verifica que tienes:

```
Usuario GitHub: ____________
Supabase Project URL: ____________
Supabase anon key: ____________
Supabase service_role key: ____________
Supabase DB Password: ____________
Gemini API Key: ____________
Voyage API Key: ____________
```

Sin estos datos, no vas a poder avanzar. Ténlos listos antes de la siguiente parte.

---

# Parte 3 — Crear la carpeta del proyecto y abrir Claude Code

## 3.1 Ubicar la carpeta del proyecto

Como acordamos, el proyecto vivirá dentro de tu Obsidian Vault, en la subcarpeta `REVISOR-ARQ`.

1. Abre el explorador de archivos de tu computador (Explorador de Windows o Finder en Mac).
2. Navega hasta la carpeta donde tienes tu Obsidian Vault.
3. Verifica que exista una subcarpeta llamada `REVISOR-ARQ`. Si no existe, créala (clic derecho → Nueva carpeta → nómbrala `REVISOR-ARQ`).
4. Copia la ruta completa de esa carpeta. La necesitarás en un momento.
   - **Windows:** haz clic en la barra de dirección arriba, se ve algo como `C:\Users\Petter\Obsidian\REVISOR-ARQ`. Cópiala.
   - **Mac:** estando dentro de la carpeta, presiona `Cmd + Option + C`, y tendrás la ruta copiada.

## 3.2 Abrir terminal dentro de la carpeta

**Windows:**

1. Abre PowerShell (tecla Windows, escribe "PowerShell", abrir).
2. Escribe:

   ```
   cd "PEGA_AQUI_LA_RUTA"
   ```

   Reemplaza `PEGA_AQUI_LA_RUTA` por la ruta que copiaste en el paso anterior. Presiona Enter.
3. Verifica que estás en la carpeta correcta escribiendo `pwd` y presionando Enter. Debe mostrar la ruta de REVISOR-ARQ.

**Mac:**

1. Abre Terminal (Cmd+Espacio, "Terminal").
2. Escribe:

   ```
   cd "PEGA_AQUI_LA_RUTA"
   ```

   Reemplaza por tu ruta real. Enter.
3. Verifica con `pwd`.

## 3.3 Iniciar Claude Code

Una vez que la terminal está apuntando a la carpeta `REVISOR-ARQ`, escribe:

```
claude
```

Presiona Enter. Verás el prompt de Claude Code listo para recibir instrucciones.

**Importante:** desde ahora en adelante, todos los prompts que te pase en esta guía los pegas dentro de esta sesión de Claude Code. Cuando veas un bloque de texto en recuadro gris que empiece con instrucciones en español, cópialo completo y pégalo como mensaje a Claude Code.

---

# Parte 4 — Configurar Claude Code con skills, subagentes y agent teams

Esta es la configuración base. Sin hooks (por tu decisión, para evitar conflictos). Incluye: 4 skills personalizadas, 8 subagentes especializados, 3 agent teams, scripts de worktrees, un CLAUDE.md del proyecto, y configuración de permisos.

Pega el siguiente prompt completo en Claude Code. Es largo pero es un solo prompt: cópialo desde la primera línea hasta la última antes del siguiente título.

## Prompt 0 — Configuración completa de Claude Code

```
Soy un usuario NO-PROGRAMADOR. Sigue las instrucciones al pie de la letra, crea los archivos con el contenido exacto que te paso, y al final haz un commit de git.

Vamos a configurar este proyecto REVISOR ARQ con skills, subagentes, agent teams, worktrees y documentación inicial. NO vamos a configurar hooks en esta fase.

## Paso A — Crear estructura de carpetas

Crea en la raíz del proyecto actual:
- .claude/
- .claude/agents/
- .claude/skills/rag-legal-chile/
- .claude/skills/corpus-normativo-chile/
- .claude/skills/citacion-juridica-chilena/
- .claude/skills/mvp-legal-launch/
- .claude/teams/
- app/
- corpus/
- corpus/lguc/
- corpus/oguc/
- corpus/ddu/
- scripts/
- scripts/worktrees/
- docs/
- design/

## Paso B — Crear .claude/settings.json

Contenido exacto:

{
  "permissions": {
    "allow": [
      "Read(//**)",
      "Write(//**)",
      "Edit(//**)",
      "Bash(npm:*)",
      "Bash(npx:*)",
      "Bash(pnpm:*)",
      "Bash(git:*)",
      "Bash(tsx:*)",
      "Bash(node:*)",
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(tree:*)"
    ],
    "deny": [
      "Bash(rm -rf corpus/*)",
      "Bash(rm -rf .env*)",
      "Bash(rm -rf .git*)",
      "Bash(git push --force*)"
    ]
  },
  "defaultModel": "claude-sonnet-4-6"
}

## Paso C — Crear CLAUDE.md en la raíz

Contenido:

# REVISOR ARQ — Contexto del proyecto

Aplicación web que permite a arquitectos y abogados hacer consultas sobre normativa chilena de urbanismo y construcción. MVP basado en LGUC, OGUC y DDU normales.

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion
- Supabase (Postgres con pgvector) para datos
- Google Gemini 2.5 Flash (gratis) para generación
- Voyage AI para embeddings
- Vercel para deploy

## Principios no negociables
- Toda respuesta al usuario final DEBE incluir citas verificables (tipo norma + artículo + fragmento literal).
- NUNCA inventar normas, artículos o parámetros.
- Si no hay respaldo suficiente en los chunks recuperados, declarar explícitamente la falta de respaldo.
- Disclaimer obligatorio al pie de cada respuesta.
- Filenames: kebab-case, en español sin tildes.
- UI en español chileno neutro.
- Commits atómicos y mensajes en español.

## Dos modos de respuesta
- **Arquitecto**: parámetros aplicados, ejemplos, referencia al artículo.
- **Abogado**: texto literal, citas íntegras, contexto normativo.

## Subagentes disponibles
Ver .claude/agents/. Siempre invoca legal-citation-verifier antes de mostrar respuestas al usuario. Invoca ui-design-reviewer al crear componentes. Invoca security-auditor antes de commits.

## Agent teams disponibles
- quality-gate: antes de merge a main.
- release-gate: antes de deploy.
- ingesta-pipeline: al cargar nuevas normas.

## Skills disponibles en el proyecto
- rag-legal-chile: reglas de respuesta legal.
- corpus-normativo-chile: fuentes y parsers.
- citacion-juridica-chilena: formato de citas.
- mvp-legal-launch: checklist legal.

## Instrucción para sesiones futuras
Al iniciar cualquier sesión de Claude Code en este proyecto, lee este archivo completo antes de actuar.

## Paso D — Crear los 4 skills

### D.1 .claude/skills/rag-legal-chile/SKILL.md

---
name: rag-legal-chile
description: Reglas y patrones para responder preguntas sobre normativa urbanística chilena con RAG. Úsalo cuando trabajes en el chat de REVISOR ARQ, en los system prompts, o en la generación de respuestas.
---

# RAG Legal Chile

## Formato de cita canónico
- LGUC: "LGUC Art. N°X"
- OGUC: "OGUC Art. X.Y.Z"
- DDU: "DDU N°XXX (año)"
- CGR: "Dictamen CGR N°XXXX-YYYY"
- PRC: "PRC <Comuna>, Art. X"

## Estructura modo arquitecto
1. Respuesta directa con parámetro/regla en 1-2 oraciones.
2. Cita al artículo aplicable.
3. Ejemplo práctico si ayuda.
4. Condiciones de aplicabilidad.
5. Disclaimer.

## Estructura modo abogado
1. Texto literal entre comillas del pasaje.
2. Fuente completa (norma, artículo, fecha).
3. Contexto interpretativo breve.
4. Jurisprudencia asociada si existe.
5. Disclaimer.

## Reglas duras
- NUNCA afirmar parámetros numéricos sin respaldo literal en chunks.
- NUNCA inventar nombres de artículos, números de DDU o fechas.
- Si top-3 chunks tienen similitud <0.65, declarar falta de respaldo.
- Si pregunta está fuera de alcance (no-Chile, no-urbanismo), decirlo explícitamente.

## Disclaimer canónico
"Esta herramienta es un asistente informativo basado en la normativa ingestada al corpus. No sustituye la asesoría profesional de un arquitecto o abogado. Verifica siempre la vigencia de la norma citada y consulta a un profesional para decisiones jurídicamente vinculantes."

### D.2 .claude/skills/corpus-normativo-chile/SKILL.md

---
name: corpus-normativo-chile
description: Conocimiento operativo sobre el corpus normativo chileno de urbanismo y construcción. Úsalo en scripts de descarga, parsing y curaduría del corpus.
---

# Corpus normativo chileno

## Fuentes oficiales
- LGUC (DFL 458 de 1975, MINVU): BCN/LeyChile.
- OGUC (DS 47 de 1992, MINVU): BCN/LeyChile.
- DDU: Observatorio Urbano del MINVU, formato PDF.
- CGR dictámenes: contraloria.cl.
- PRC: sitios municipales.

## Jerarquía OGUC
Libro > Título > Capítulo > Párrafo > Artículo.
Ej: "OGUC Art. 2.6.3" = Libro 2, Título 6, Artículo 3.

## Patrones regex
- Artículo LGUC: /^Art[íi]culo\s+(\d+)\s*[°º]?\.?\s*/m
- Artículo OGUC: /^Art[íi]culo\s+(\d+)\.(\d+)\.(\d+)[°º]?\.?/m
- Header DDU: /DDU\s+N[°º]?\s*(\d+)/

## Normas más consultadas (priorizar)
OGUC: 1.1.2, 2.1.1, 2.6.3, 3.1.1, 4.1.1, 5.1.6.
LGUC: 116, 118, 119, 121, 134, 162.
DDU: 227, 269, 275, 344, 400 (verificar vigencia).

## Ciclo de actualización
- LGUC: trimestral.
- OGUC: mensual.
- DDU: mensual.

## Cuidados
- Las versiones consolidadas pueden retrasarse.
- Los PDF escaneados requieren OCR.
- MINVU a veces reestructura URLs; mantener manifiesto.json con hash.

### D.3 .claude/skills/citacion-juridica-chilena/SKILL.md

---
name: citacion-juridica-chilena
description: Estándares de citación jurídica chilena para normas y jurisprudencia. Úsalo al formatear respuestas, bibliografías y exports a PDF.
---

# Citación jurídica chilena

## Forma corta en texto
- LGUC Art. 116
- OGUC Art. 2.6.3
- DDU N°227
- Ley N°20.958, Art. 5°
- DFL N°458 de 1975, MINVU
- DS N°47 de 1992, MINVU

## Forma completa en bibliografía
"Ley General de Urbanismo y Construcciones, DFL N°458 de 1975, MINVU, publicada en D.O. 13-04-1976, última modificación por Ley N°XX.XXX de YYYY."

## Jurisprudencia
- CGR: "Dictamen CGR N°E123456-2024"
- Tribunales: "Sentencia Corte Suprema Rol N°XXXX-YYYY"

## Reglas
- Fecha de publicación y última modificación siempre que aplique.
- Link al texto en BCN cuando se exporte a PDF.
- Preservar formato de artículos OGUC con puntos (2.6.3).

### D.4 .claude/skills/mvp-legal-launch/SKILL.md

---
name: mvp-legal-launch
description: Checklist legal y operativa previa al lanzamiento público de un producto de consulta normativa en Chile.
---

# Checklist lanzamiento público

## Disclaimers
- Footer visible en toda la app.
- Pie de cada respuesta del chat.
- Página de pricing.

## Términos y condiciones en /terminos
- Limitación de responsabilidad.
- No relación abogado-cliente ni arquitecto-cliente.
- Propiedad intelectual de contenidos normativos.

## Protección de datos personales (Ley N°19.628)
- Política de privacidad en /privacidad.
- Aviso sobre datos recopilados.
- Derechos ARCO del usuario.
- Aviso de cookies.

## Accesibilidad
- WCAG 2.1 nivel AA mínimo.

## Operativo
- Formulario de contacto para correcciones del corpus.
- Proceso documentado de actualización.
- Revisión por abogado antes de abrir al público.

## Paso E — Crear los 8 subagentes en .claude/agents/

### E.1 .claude/agents/legal-citation-verifier.md

---
name: legal-citation-verifier
description: Verificador de citas legales. Úsalo SIEMPRE antes de mostrar respuestas del chat al usuario final. Valida que cada afirmación tenga cita literal en los chunks recuperados.
tools: Read, Grep, Bash
model: sonnet
---

Eres verificador forense de citas jurídicas chilenas. Tu única misión es evitar que REVISOR ARQ muestre respuestas con citas falsas.

Cuando te invoquen recibirás: pregunta original, respuesta generada, bundle de chunks recuperados.

Verificaciones:
1. Existencia de cita: toda afirmación sustantiva tiene cita explícita.
2. Veracidad: cada cita corresponde a un chunk real recuperado.
3. Coincidencia textual: citas literales aparecen literales en el chunk.
4. Sin extrapolación: no afirmar parámetros numéricos no presentes.
5. Declinar cuando falta respaldo.

Output JSON:
{
  "veredicto": "APROBADA" | "REGENERAR" | "RECHAZADA",
  "hallazgos": [ { "tipo": "...", "cita": "...", "explicacion": "..." } ],
  "resumen": "..."
}

APROBADA si cero críticos. REGENERAR si hay cita inexistente, incorrecta o extrapolación. RECHAZADA si patrón sistemático de fabricación.

Eres preciso, no diplomático.

### E.2 .claude/agents/security-auditor.md

---
name: security-auditor
description: Auditor de seguridad pre-commit y pre-deploy. Detecta credenciales hardcodeadas, falta de validación de inputs, RLS laxo, falta de rate limiting.
tools: Read, Grep, Glob, Bash
model: sonnet
---

Eres auditor de seguridad de apps Next.js + Supabase.

Checklist:
1. Secretos hardcodeados: busca sk-*, AIza*, pk_live_*, strings de alta entropía fuera de .env.
2. .env.local en .gitignore y nunca commiteado.
3. SUPABASE_SERVICE_ROLE_KEY solo en código server-side.
4. API routes con validación zod.
5. Rate limiting en /api/consulta.
6. RLS activo en Supabase.
7. Headers de seguridad (CSP, HSTS, X-Frame-Options).
8. Sin CORS "*".
9. Sin logging de PII (emails, contenidos completos).
10. npm audit sin críticos.

Output:
{
  "estado": "PASA" | "BLOQUEA" | "ADVERTENCIAS",
  "criticos": [ ... ],
  "altos": [ ... ],
  "resumen": "..."
}

Si hay críticos, BLOQUEA.

### E.3 .claude/agents/corpus-ingestion-validator.md

---
name: corpus-ingestion-validator
description: Validador post-ingesta del corpus. Verifica calidad del parsing, chunks bien cortados, metadatos correctos, ausencia de duplicados.
tools: Read, Bash, Grep
model: sonnet
---

Validador de calidad del corpus normativo.

Verificaciones:
1. Conteo esperado vs manifiesto.json.
2. Muestreo de 20 chunks aleatorios: empiezan en oración, terminan en punto, metadatos correctos.
3. Cobertura: secuencia numérica de artículos sin saltos en LGUC y OGUC.
4. Duplicados: chunks con texto >95% similar.
5. Tokens: entre 50 y 1500 por chunk.
6. Embeddings: todos no-nulos, dimensión 1024.
7. Integridad referencial: FKs válidos.

Output:
{
  "estado": "APROBADO" | "REVISAR" | "RECHAZADO",
  "cobertura": { ... },
  "problemas": [ ... ],
  "recomendaciones": [ ... ]
}

### E.4 .claude/agents/ui-design-reviewer.md

---
name: ui-design-reviewer
description: Revisor senior de diseño visual. Verifica tokens, shadcn, accesibilidad AA, responsividad, microinteracciones.
tools: Read, Grep, Glob, Bash
model: sonnet
---

Revisor senior de diseño visual.

Criterios:
1. Design tokens usados (prohibido hex/px literal).
2. shadcn/ui cuando exista el componente.
3. Tipografía jerárquica respetada.
4. Accesibilidad AA: contraste, focus-visible, aria, teclado.
5. Responsive mobile-first, sin quiebres <375px.
6. Framer Motion en transiciones, respeta prefers-reduced-motion.
7. Estados: loading, empty, error, success.
8. Dark mode probado.
9. Copy en español claro.
10. Microinteracciones distinguibles.

Output por componente:
{
  "componente": "...",
  "aprobado": boolean,
  "problemas": [ ... ],
  "mejoras": [ ... ]
}

### E.5 .claude/agents/prompt-engineer.md

---
name: prompt-engineer
description: Ingeniero de prompts. Itera los system prompts de modos arquitecto y abogado contra el set de evaluación.
tools: Read, Write, Edit, Bash
model: sonnet
---

Ingeniero de prompts especializado en contextos legales.

Flujo:
1. Lee app/src/lib/prompts/arquitecto.ts y abogado.ts.
2. Lee reporte más reciente en docs/eval/reportes/.
3. Identifica patrones de fallo.
4. Propón modificaciones mínimas.
5. Aplica cambios con autorización.
6. Corre eval y compara.
7. Si regresión, revierte.
8. Documenta en docs/eval/iteraciones.md.

Principios:
- Menos es más.
- Reglas duras primero, ejemplos después.
- Nunca bajar el listón de citación.
- Prompts en español salvo reglas estructurales que funcionen mejor en inglés.

### E.6 .claude/agents/release-checklist-runner.md

---
name: release-checklist-runner
description: Checklist final antes de deploy a producción.
tools: Read, Bash, Grep
model: sonnet
---

Guardián final antes de despliegue.

Checklist:
1. npm test 100%.
2. npm run build sin errores.
3. npm run lint sin errores.
4. Typecheck OK.
5. Eval reciente >90% en últimas 48h.
6. .env.local.example completo y env vars en Vercel.
7. Disclaimers visibles.
8. Rate limiting activo.
9. security-auditor sin críticos en 24h.
10. Corpus en Supabase coincide con manifiesto.
11. npm audit sin críticos.
12. Git limpio y sincronizado.

Output:
{
  "estado": "LISTO_PARA_DESPLEGAR" | "BLOQUEADO",
  "items": [ ... ],
  "resumen": "..."
}

### E.7 .claude/agents/eval-runner.md

---
name: eval-runner
description: Corre set de evaluación del chat. Detecta regresiones, sugiere preguntas nuevas.
tools: Read, Write, Bash
model: sonnet
---

Responsable de calidad medible.

Flujo:
1. Lee docs/eval/preguntas.jsonl.
2. Ejecuta cada pregunta contra /api/consulta.
3. Scoring: cita artículos (+2), palabras clave (+1), declina correctamente (+3), no declina cuando debe (+3), pasa legal-citation-verifier (+2).
4. Genera docs/eval/reportes/<ISO-date>.md con diff vs anterior.
5. Si regresión >2pts, sugiere correr prompt-engineer.
6. Sugiere 3-5 preguntas nuevas.

Output: path reporte + resumen 5 líneas.

### E.8 .claude/agents/legal-domain-expert.md

---
name: legal-domain-expert
description: Asesor interno sobre estructura normativa chilena para decisiones de producto. NO para respuestas a usuarios finales.
tools: Read, Grep, WebSearch
model: sonnet
---

Consejero estratégico sobre normativa chilena de urbanismo.

Responde preguntas como "qué DDU son más relevantes para X", "qué relación hay entre A y B", "qué normativa nueva salió".

Criterios:
- Cita fuentes (BCN, MINVU, CGR, CChC).
- Si no estás seguro, dilo.
- Considera contexto de producto.

Solo se invoca por Petter dentro de Claude Code. No aparece en UI.

## Paso F — Crear los 3 agent teams en .claude/teams/

### F.1 .claude/teams/quality-gate.md

---
name: quality-gate
description: Gate de calidad antes de merge a main. Ejecuta revisores críticos en paralelo.
agents:
  - legal-citation-verifier
  - ui-design-reviewer
  - security-auditor
  - corpus-ingestion-validator
mode: parallel
---

Invoca los cuatro agentes en paralelo. Veredicto: APROBADO si todos OK. BLOQUEADO si cualquiera reporta crítico.

Muestra tabla resumen al usuario con cada agente, estado y link al detalle.

### F.2 .claude/teams/release-gate.md

---
name: release-gate
description: Gate final antes de deploy a producción. Secuencial.
agents:
  - release-checklist-runner
  - security-auditor
  - eval-runner
mode: sequential
---

Orden:
1. release-checklist-runner; si falla, detiene.
2. security-auditor; si críticos, detiene.
3. eval-runner; si regresión severa, detiene.

Solo autoriza si los tres OK.

### F.3 .claude/teams/ingesta-pipeline.md

---
name: ingesta-pipeline
description: Pipeline post-ingesta de normas.
agents:
  - corpus-ingestion-validator
  - legal-domain-expert
mode: sequential
---

Flujo:
1. corpus-ingestion-validator: calidad técnica.
2. legal-domain-expert: revisión de dominio.

## Paso G — Scripts de worktrees

### G.1 scripts/worktrees/new.sh

#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 1 ]]; then
  echo "Uso: ./scripts/worktrees/new.sh <nombre>" >&2
  exit 1
fi
NAME="$1"
BRANCH="feature/$NAME"
DIR="../revisor-arq-$NAME"
git worktree add "$DIR" -b "$BRANCH"
echo "Worktree creado en $DIR en rama $BRANCH."

### G.2 scripts/worktrees/list.sh

#!/usr/bin/env bash
git worktree list

### G.3 scripts/worktrees/cleanup.sh

#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 1 ]]; then
  echo "Uso: ./scripts/worktrees/cleanup.sh <nombre>" >&2
  exit 1
fi
NAME="$1"
DIR="../revisor-arq-$NAME"
BRANCH="feature/$NAME"
git worktree remove "$DIR" || true
git branch -D "$BRANCH" || true
echo "Worktree y rama eliminados."

Dales permisos de ejecución: chmod +x scripts/worktrees/*.sh

## Paso H — Documentación del workflow

Crea docs/claude-code-workflow.md en lenguaje simple para no-programador, explicando:
- Qué hace cada subagente y cuándo se activa.
- Cómo invocar un agent team manualmente.
- Cómo crear, usar y cerrar un worktree paso a paso.
- Cómo consultar las skills desde un prompt.

## Paso I — Archivos raíz

- .gitignore robusto (Node, Next, macOS, Windows, .env*).
- README.md explicando qué es REVISOR ARQ, stack, cómo arrancarlo, roadmap resumido.
- LICENSE (MIT).
- .env.local.example con las variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, VOYAGE_API_KEY, NEXT_PUBLIC_APP_URL.

## Paso J — Git init y commit

1. git init
2. git add .
3. git commit -m "chore: configuración avanzada de Claude Code con skills, subagentes, teams y worktrees"

## Paso K — Reporte final

Al terminar muéstrame:
- Árbol completo de archivos creados.
- Explicación en 1 párrafo para no-programador de qué quedó configurado.
- Próximo paso recomendado.

Ejecuta todo esto ahora. Si algo requiere mi confirmación, pregunta antes.
```

Espera a que Claude Code termine. Puede tomar 3-5 minutos. Al final te mostrará el árbol de archivos y un resumen. Revisa que se vea bien y continúa con la Parte 5.

---

# Parte 5 — Construcción de la app en 7 prompts

Cada prompt se pega uno a la vez. No pegues varios juntos. Espera a que Claude Code termine cada uno, revisa el resultado, y recién entonces pasa al siguiente.

## Prompt 1 — Scaffolding del proyecto Next.js

```
Lee primero CLAUDE.md. Luego arma el proyecto Next.js dentro de la carpeta app/.

1. Dentro de app/, ejecuta create-next-app con: TypeScript, Tailwind, ESLint, App Router, src/ directory, import alias @/*. Sin Turbopack por ahora.
2. Inicializa shadcn/ui con el esquema "new-york" y colores "neutral".
3. Instala dependencias adicionales: @supabase/supabase-js, @google/generative-ai, voyageai, framer-motion, lucide-react, zod, react-markdown, remark-gfm, rehype-highlight, sonner, cmdk, next-themes, class-variance-authority, clsx, tailwind-merge.
4. Instala componentes shadcn: button, input, textarea, select, card, sheet, dialog, dropdown-menu, tooltip, badge, separator, skeleton, scroll-area, avatar, tabs, toggle, switch.
5. Configura next-themes para dark/light/system.
6. Configura fuentes: Geist Sans para texto, Geist Mono para código, usando next/font/google.
7. next.config.ts con headers básicos de seguridad (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin).
8. Crea un placeholder simple en app/src/app/page.tsx: logo "REVISOR ARQ" en tipografía monospace, subtítulo "Normativa urbana chilena, respondida con fuentes verificables", toggle de tema, nada más.
9. Verifica que npm run dev levanta el servidor sin errores.
10. Commit: "feat: scaffolding Next.js con shadcn, fuentes y placeholder inicial".

Muéstrame al final:
- Árbol de app/.
- Comando exacto para levantar el dev server.
- Captura descriptiva de cómo se ve la página.
```

Cuando termine, abre otra terminal (sin cerrar la de Claude Code), navega a `app/` y ejecuta `npm run dev`. Debe levantarse en http://localhost:3000. Abre esa URL en tu navegador y verifica que se ve el placeholder. Luego detén el servidor con Ctrl+C y vuelve a Claude Code.

## Prompt 2 — Sistema de diseño profesional y landing page

```
Paso 2: elevar el diseño visual al nivel de productos como Linear, Vercel o Stripe.

1. Design tokens en app/src/styles/tokens.css:
   - Escala de color semántica con variantes light/dark: background, foreground, muted, accent (azul marino profundo #0B1E3F como base), destructive, border, ring.
   - Escala tipográfica: display / h1 / h2 / h3 / body / small / caption con letter-spacing y line-height afinados.
   - Escala de espaciado (4px base).
   - Radios y sombras.
   - Variables compatibles con shadcn.

2. Layout global en app/src/app/layout.tsx:
   - Header fijo minimalista con logo y navegación.
   - Footer con disclaimer y links a /terminos y /privacidad (crea esas rutas como placeholders).
   - Toggle de tema persistido.
   - Transiciones suaves con Framer Motion.

3. Landing page (/) con:
   - Hero: "Normativa urbana chilena, respondida con fuentes verificables" + subtítulo + CTA "Probar consulta" que lleva a /chat.
   - Sección de 3-4 features animadas (fade-up on scroll): "Dos modos", "Cita cada artículo", "Corpus LGUC + OGUC + DDU", "100% chileno".
   - Sección "Cómo funciona" con diagrama textual del flujo.
   - FAQ en acordeón con 4-5 preguntas comunes.
   - Footer reforzado con disclaimer canónico.

4. Rutas placeholder:
   - /chat (por ahora solo estructura, chat real viene en Prompt 6).
   - /terminos
   - /privacidad
   - /design-system (muestra interna de todos los componentes y tokens; útil para auditar).

5. Branding en design/:
   - Logo SVG original, sobrio, profesional. Variaciones: completo, isotipo, blanco/negro.
   - Paleta documentada en design/paleta.md.
   - Open graph image 1200x630 generada (usa skill canvas-design si ayuda).
   - Favicon multisize en app/src/app/.

6. Página 404 y error con estilo.

7. Accesibilidad: contraste AAA deseado, focus-visible en todos los interactivos, aria-labels, skip-link, prefers-reduced-motion respetado.

8. Al terminar, invoca al subagente ui-design-reviewer sobre la landing y sus secciones, aplica las correcciones que sugiera.

9. Commit: "feat: sistema de diseño profesional con landing page y branding".

Muéstrame capturas descriptivas de cada sección de la landing.
```

Verifica visualmente en http://localhost:3000. Debe verse profesional.

## Prompt 3 — Backend Supabase y clientes

Antes de pegar este prompt, asegúrate de tener a mano los datos de Supabase que guardaste en la Parte 2.6.

```
Paso 3: configurar backend.

1. Crea scripts/schema.sql con el esquema completo:
   - Habilitar extensión pgvector.
   - Tipo enum tipo_norma: 'LGUC', 'OGUC', 'DDU', 'DDU_ESPECIFICA', 'LEY', 'PRC', 'NCH', 'JURISPRUDENCIA'. Para MVP usamos los tres primeros, pero dejamos el enum completo.
   - Tabla normas: id uuid PK, tipo, numero text, titulo text, fecha_publicacion date, fecha_actualizacion date, url_fuente text, hash_contenido text, texto_completo text, vigente boolean default true, created_at, updated_at.
   - Tabla articulos: id uuid PK, norma_id FK, numero text, titulo text, texto text, orden int.
   - Tabla chunks: id uuid PK, norma_id FK, articulo_id FK nullable, texto text, embedding vector(1024), tokens int, orden int, metadatos jsonb, fecha_vigencia_desde date nullable, fecha_vigencia_hasta date nullable, fuente text nullable.
     - fecha_vigencia_desde: fecha en que esa versión de ese artículo o segmento entró en vigor (puede ser distinta de la fecha de la norma completa, porque los artículos se modifican individualmente).
     - fecha_vigencia_hasta: null si vigente, o la fecha de derogación/modificación si ya no aplica.
     - fuente: URL o identificador preciso (ej. "LeyChile/idNorma/13560/idVersion/2026-03-15" o "MINVU/DDU-227.pdf").
   - Tabla consultas: id uuid, pregunta text, modo text, respuesta text, chunks_usados jsonb, modelo text, tokens_usados int, latencia_ms int, feedback_thumbs int nullable, created_at.
   - Tabla evaluaciones: id uuid, pregunta text, respuesta_esperada text, respuesta_generada text, pasa boolean, notas text, created_at.
   - Índice HNSW sobre chunks.embedding (coseno).
   - Índice btree sobre normas.tipo.
   - Índice btree sobre chunks.fecha_vigencia_desde.
   - Índice GIN sobre metadatos.
   - RPC match_chunks(query_embedding vector(1024), match_count int, filter_tipos text[], solo_vigentes boolean default true) que retorne chunks + datos de la norma + fecha_vigencia_desde + fecha_vigencia_hasta + fuente, ordenados por similitud coseno. Si solo_vigentes=true, filtra chunks donde fecha_vigencia_hasta IS NULL.
   - RLS habilitado: lectura pública a normas y articulos; escritura solo service_role; consultas autenticadas (preparado).

2. Documenta en docs/supabase-setup.md los clicks literales para que yo ejecute el schema en Supabase:
   - Abrir supabase.com, ir al proyecto revisor-arq.
   - SQL Editor → New query.
   - Pegar contenido de scripts/schema.sql.
   - Run.
   - Verificar en Table Editor que aparecieron las tablas.

3. Crea app/src/lib/:
   - supabase.ts: cliente público (anon) y cliente admin (service role) separados.
   - gemini.ts: wrapper para Gemini 2.5 Flash con streaming, temperatura 0.2, top_p conservador.
   - voyage.ts: wrapper para generar embeddings en batch con reintentos.

4. Crea scripts/test-connection.ts que verifique:
   (a) Conexión a Supabase (SELECT count(*) FROM normas).
   (b) Llamada a Gemini con "hola mundo".
   (c) Llamada a Voyage con un texto corto.
   Imprime resultados legibles.

5. Registra en package.json:
   "test:connection": "tsx scripts/test-connection.ts"

6. Invoca al subagente security-auditor antes de commitear.

7. Commit: "feat: backend Supabase con esquema completo y clientes de Gemini y Voyage".

Al final dime exactamente qué debo hacer yo manualmente:
- Qué poner en app/.env.local (lista de variables con el valor o referencia).
- Cómo ejecutar el schema en Supabase.
- Cómo probar la conexión con test:connection.
```

**Acción manual requerida después de este prompt:**

1. Claude Code te dirá que completes `app/.env.local`. Ábrelo con VS Code. Pega ahí los valores de tu bloc de notas:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...tu URL...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...tu anon key...
   SUPABASE_SERVICE_ROLE_KEY=...tu service role key...
   GEMINI_API_KEY=...tu Gemini key...
   VOYAGE_API_KEY=...tu Voyage key...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   Guarda. **Este archivo jamás se sube a GitHub** (ya está en .gitignore).

2. Ejecuta el schema SQL en Supabase siguiendo la guía que generó Claude Code en `docs/supabase-setup.md`.

3. Prueba la conexión: en la terminal (fuera de Claude Code, dentro de `app/`), ejecuta:

   ```
   npm run test:connection
   ```

   Debe decir "Supabase OK", "Gemini OK", "Voyage OK". Si alguno falla, copia el error y pégaselo a Claude Code para que lo arregle.

## Prompt 4 — Descarga automatizada del corpus

```
Paso 4: automatizar descarga del corpus normativo chileno.

Fuentes:
- LGUC (DFL 458 de 1975): BCN/LeyChile.
- OGUC (DS 47 de 1992): BCN/LeyChile.
- DDU: Observatorio Urbano MINVU, PDFs.

1. scripts/download/download-bcn.ts:
   - Descarga LGUC y OGUC desde LeyChile.
   - Usa endpoint público de BCN (https://www.leychile.cl/Consulta/leyNorma?idNorma=...).
   - Formato texto plano si disponible, PDF como fallback.
   - Guarda metadatos en corpus/manifiesto.json: nombre, url_fuente, fecha_descarga, hash SHA256, tipo, numero.
   - Idempotente: si hash coincide, no re-descarga.

2. scripts/download/download-ddu.ts:
   - Scrapea índice de DDU del MINVU respetando robots.txt.
   - Rate limiting: 1 request cada 2 segundos.
   - Descarga las últimas 50 DDU vigentes (configurable con --desde y --hasta por año).
   - Guarda cada PDF en corpus/ddu/DDU-<numero>.pdf.
   - Extrae texto usando la skill pdf y lo guarda en corpus/ddu/DDU-<numero>.txt.
   - Actualiza manifiesto.json.

3. scripts/download/download-all.ts: orquestador con progress bar.

4. scripts/download/verify-corpus.ts:
   - Verifica archivos existen y hashes coinciden.
   - Texto mínimo extraído: >1000 caracteres LGUC/OGUC, >500 cada DDU.

5. Registra en package.json:
   "corpus:download": "tsx scripts/download/download-all.ts",
   "corpus:verify": "tsx scripts/download/verify-corpus.ts"

6. Documenta en docs/corpus.md: fuentes, licencias, cómo re-descargar, cómo agregar manualmente si una descarga falla, aviso de respetar límites del servidor del MINVU.

7. Invoca skill corpus-normativo-chile al construir los parsers.

8. Commit: "feat: descarga automatizada del corpus LGUC + OGUC + DDU".

Al final dime cómo ejecutar la descarga.
```

Después de este prompt, en la terminal (dentro de `app/` o en la raíz del proyecto según Claude Code te indique) ejecuta:

```
npm run corpus:download
```

Esto tomará varios minutos (hay rate limit respetuoso). Al terminar, ejecuta:

```
npm run corpus:verify
```

Si alguna descarga falló, Claude Code te habrá dejado en `docs/corpus-manual.md` las URLs directas para descargar a mano. Colócalos en `corpus/lguc/` o `corpus/ddu/` según corresponda.

## Prompt 5 — Pipeline de ingesta al corpus

```
Paso 5: ingesta del corpus a Supabase con embeddings.

1. scripts/ingest/parsers/:
   - lguc-oguc.ts: parser de LGUC y OGUC. Detecta artículos con regex, preserva jerarquía Libro/Título/Capítulo/Artículo. Extrae, cuando LeyChile lo expone, la fecha de vigencia específica del artículo (no solo la fecha de la norma completa), porque artículos individuales se modifican por leyes posteriores; si no hay dato de artículo, hereda la fecha_publicacion de la norma.
   - ddu.ts: parser de DDU. Detecta header (número, fecha emisión, materia). Segmenta por secciones o chunks ~800 tokens. Usa la fecha de emisión como fecha_vigencia_desde.

2. scripts/ingest/chunker.ts:
   - Artículos cortos <1000 tokens: un artículo = un chunk.
   - Artículos largos: chunks con solapamiento 120 tokens, cortando en fin de oración.
   - Metadatos por chunk: tipo_norma, numero_norma, articulo, titulo_articulo, orden, url_fuente.
   - Campos a nivel de fila (no solo en metadatos jsonb): fecha_vigencia_desde, fecha_vigencia_hasta (null si vigente), fuente (URL o identificador estable del documento origen). Esto habilita filtrado e indexado sin tener que desempaquetar jsonb en cada query.

3. scripts/ingest/embedder.ts:
   - Genera embeddings vía Voyage en batches de 128.
   - Reintentos exponenciales.

4. scripts/ingest/ingest.ts:
   - Lee manifiesto, detecta normas nuevas o modificadas por hash.
   - Borra registros previos de normas modificadas.
   - Parsea, chunkea, embeddea, inserta en Supabase.
   - Logging: chunks generados, tokens totales, tiempo.
   - Idempotente, reanudable.

5. Registra en package.json:
   "corpus:ingest": "tsx scripts/ingest/ingest.ts",
   "corpus:ingest:dry": "tsx scripts/ingest/ingest.ts --dry-run"

6. Documenta en docs/ingesta.md: cómo funciona, cómo reingestar, cómo depurar.

7. Después de la ingesta, invoca al agent team ingesta-pipeline para validar.

8. Commit: "feat: pipeline de ingesta con parsers especializados y validación automática".

Dime cómo ejecutar la ingesta.
```

Ejecuta:

```
npm run corpus:ingest:dry
```

Esto hace una ingesta simulada (sin escribir en DB) para ver si los parsers funcionan. Si el log se ve bien, ejecuta la ingesta real:

```
npm run corpus:ingest
```

Esto puede tomar 10-20 minutos dependiendo del corpus. Al terminar, el agent team `ingesta-pipeline` se ejecutará automáticamente y te dirá si la calidad es aceptable.

Para verificar visualmente en Supabase: abre tu proyecto en supabase.com → Table Editor → tabla `chunks`. Debes ver miles de filas con texto y embedding.

## Prompt 5B — Panel visual del corpus y carga manual

Este prompt crea una página dentro de la app que te muestra visualmente todas las normas cargadas, el estado de cada una, las que faltan, y te permite subir archivos manualmente cuando la descarga automática no funcionó o cuando quieras agregar normas no cubiertas por el script.

```
Paso 5B: panel visual de gestión del corpus con carga manual.

Quiero una página administrativa donde yo (como dueño del producto) pueda ver de un vistazo qué normativa tiene cargada la app, qué está faltando, y subir archivos nuevos cuando lo necesite. Debe ser visualmente clara y cuidada.

## 1. Ruta /corpus

Página protegida con env var ADMIN_PASSWORD (simple password por ahora; auth real viene en Fase 2). En app/src/app/corpus/page.tsx.

## 2. Layout de la página

Estructura visual de arriba hacia abajo:

### Sección A — Resumen de cobertura (hero)

Card destacada en la parte superior con:
- Gran número: total de normas ingestadas.
- Gran número secundario: total de chunks indexados.
- Gran número terciario: tokens totales embeddeados.
- Barra de progreso horizontal: porcentaje de cobertura respecto a la lista canónica esperada (ver skill corpus-normativo-chile).
- Fecha de la última actualización del corpus.
- Badge de salud: "saludable" (verde) si >90% cobertura, "parcial" (amarillo) si 60-90%, "crítico" (rojo) si <60%.

### Sección B — Distribución por tipo

Tres cards grandes en grid responsive, una por tipo principal:

Card LGUC:
- Icono representativo.
- Cantidad de artículos ingestados / esperados.
- Cantidad de chunks.
- Mini-gráfico de densidad por libro/título.
- Estado: última modificación conocida de la norma vs fecha de ingesta (si la norma fue modificada después de la última ingesta, mostrar warning).
- Botón "reingestar esta norma".

Card OGUC:
- Misma estructura.
- Por ser una norma modificada frecuentemente, destacar fecha del DS de última modificación.

Card DDU:
- Contador de DDUs cargadas vs el último número oficial conocido.
- Lista colapsable con las últimas 10 DDU ingestadas.
- Indicador visual de "huecos" (DDUs faltantes en la secuencia numérica).

### Sección C — Tabla detallada de todas las normas

Tabla con columnas:
- Tipo (LGUC / OGUC / DDU / otro) con icono y color.
- Número/identificador.
- Título abreviado (truncado, tooltip con título completo).
- Fecha de publicación.
- Fecha de última ingesta.
- Cantidad de chunks.
- Estado: Vigente (verde), Derogada (gris), Desactualizada (amarillo, cuando la fecha de modificación es posterior a la ingesta), Con errores (rojo).
- Acciones: Ver detalle, Reingestar, Marcar derogada, Eliminar.

Filtros arriba de la tabla: por tipo, por estado, búsqueda por texto. Ordenamiento clickeable por cada columna.

Paginación: 25 por página.

### Sección D — Normas faltantes esperadas

Panel lateral derecho (o sección inferior en móvil) que lista las normas que la skill corpus-normativo-chile marca como "priorizar" pero que NO están en el corpus. Cada una con:
- Identificador.
- Motivo por el que se espera (ej. "DDU muy citada en el sector").
- Botón "intentar descarga automática" que ejecuta el script de descarga solo para esa norma.
- Alternativamente, botón "cargar manualmente" que abre la zona de upload prefilled con los metadatos.

### Sección E — Zona de carga manual

Prominente abajo de la página:
- Zona drag-and-drop para PDF o TXT (o múltiples archivos a la vez).
- Al soltar un archivo, abrir un modal pidiendo metadatos:
  - Tipo de norma (select con el enum completo: LGUC, OGUC, DDU, DDU_ESPECIFICA, LEY, PRC, NCH, JURISPRUDENCIA).
  - Número/identificador (texto).
  - Título (texto).
  - Fecha de publicación (date picker).
  - URL de la fuente oficial (texto).
  - Comuna (solo si tipo = PRC).
  - Notas internas opcionales.
- Botón "procesar":
  - Sube el archivo a Storage de Supabase (bucket 'corpus-raw').
  - Llama a endpoint /api/corpus/ingest-manual que ejecuta extracción de texto, chunking, embedding e inserción.
  - Muestra progreso en tiempo real con estados: "subiendo" → "extrayendo texto" → "chunkeando" → "generando embeddings" → "insertando en DB" → "completado".
  - Al finalizar, actualiza la tabla de la Sección C para mostrar la nueva norma.
- Si falla, muestra mensaje claro y permite reintentar.

### Sección F — Vista detalle de una norma

Al hacer clic en "Ver detalle" de cualquier norma, abre un Sheet lateral con:
- Metadatos completos.
- Lista de sus articulos (si fue parseada por artículos) o chunks.
- Para cada chunk: texto, tokens, orden, metadatos.
- Botón "ver en BCN/MINVU" que abre la url_fuente.
- Historial de re-ingestas (fechas y cambios detectados por hash).

## 3. Endpoints de API

- GET /api/corpus/stats → resumen de cobertura.
- GET /api/corpus/normas → lista paginada con filtros.
- GET /api/corpus/normas/:id → detalle con chunks.
- POST /api/corpus/normas/:id/reingest → dispara reingesta.
- PATCH /api/corpus/normas/:id → actualiza metadatos (vigente, derogada).
- DELETE /api/corpus/normas/:id → elimina norma y sus chunks.
- POST /api/corpus/upload → recibe archivo + metadatos, procesa, inserta.
- GET /api/corpus/faltantes → lista de normas esperadas ausentes.

Todos los endpoints requieren el header ADMIN_PASSWORD (en MVP).

## 4. Storage de Supabase

Crea bucket 'corpus-raw' privado. Todos los archivos subidos manualmente se guardan ahí con nombre hash-original-filename para trazabilidad.

## 5. Experiencia visual

- Cards con sombras suaves, bordes redondeados consistentes con design tokens.
- Colores semánticos: verde para OK, amarillo para atención, rojo para error.
- Skeleton loaders durante carga de datos.
- Toast notifications (sonner) para cada acción: "DDU 227 reingestada con éxito", "Error al procesar archivo".
- Animaciones Framer Motion sutiles al actualizar contadores o agregar filas nuevas.
- Totalmente responsive: en móvil las cards se apilan, la tabla se vuelve scrollable horizontalmente.

## 6. Accesibilidad

- Navegable por teclado completo.
- Drag-drop zone con alternativa de click para seleccionar archivo.
- Screen reader friendly: cada acción con aria-label.

## 7. Documentación

Crea docs/gestion-corpus.md explicando:
- Cómo interpretar cada sección del panel.
- Cuándo usar carga manual vs descarga automática.
- Cómo marcar una norma como derogada sin eliminarla.
- Políticas de re-ingesta (cuándo conviene, cuándo no).

## 8. Navegación

Agrega un enlace "Corpus" en el header principal, visible solo si el usuario tiene la password admin. Si no, la ruta /corpus redirige a / con mensaje "acceso restringido".

## 9. Invocaciones de subagentes

- ui-design-reviewer sobre la página completa.
- security-auditor sobre los endpoints nuevos (validación, autenticación, upload safe).
- corpus-ingestion-validator en el flujo de upload manual.

Commit: "feat: panel visual de corpus con carga manual y endpoints admin".

Al terminar dame la URL para acceder y la password que debo poner en .env.local como ADMIN_PASSWORD.
```

Después de este prompt:

1. Abre `app/.env.local` y agrega la línea `ADMIN_PASSWORD=una-contrasena-que-tu-elijas` (inventa una fuerte).
2. Reinicia el servidor (`Ctrl+C` y `npm run dev` de nuevo).
3. Ve a http://localhost:3000/corpus. Te pedirá la password.
4. Explora el panel. Si ves normas faltantes, usa la zona de carga manual para agregar archivos que hayas descargado a mano.

Este panel será tu herramienta principal de mantenimiento del corpus de aquí en adelante.

## Prompt 6 — Chat con RAG, streaming y dos modos

```
Paso 6: interfaz de chat funcional con RAG, el corazón del producto.

1. API route app/src/app/api/consulta/route.ts:
   - Recibe { pregunta: string, modo: 'arquitecto' | 'abogado', historial?: [] }.
   - Valida con zod.
   - Rate limit por IP: 10 req/min usando cabeceras simples o Upstash.
   - Genera embedding de pregunta (Voyage).
   - Llama RPC match_chunks top_k=8, threshold 0.65, solo_vigentes=true por defecto.
   - Si chunks insuficientes: responde "sin respaldo suficiente" sin llamar a Gemini.
   - Construye contexto con chunks etiquetados [TIPO - ART. N° - vigente desde YYYY-MM-DD].
   - System prompts en app/src/lib/prompts/arquitecto.ts y abogado.ts, siguiendo skill rag-legal-chile.
   - El system prompt de abogado.ts debe pedir explícitamente que la respuesta siga una plantilla fija con cinco secciones en markdown, en este orden:
     1. **Texto literal**: cita textual del o los artículos aplicables, entre comillas, con referencia precisa (norma + artículo + inciso).
     2. **Regla general**: enunciado normativo en lenguaje claro (qué dice la norma, despojada de excepciones).
     3. **Reglas especiales o excepciones**: casos en los que la regla general no aplica o se modifica (otros artículos, DDU, remisiones). Si no hay, declararlo: "No se identifican excepciones en el corpus consultado".
     4. **Criterios posibles de interpretación**: lecturas razonables distintas cuando el texto admite ambigüedad, con respaldo (DDU interpretativa, jurisprudencia si la hay, o doctrina consolidada). Si el texto es unívoco, declararlo.
     5. **Riesgos jurídicos**: consecuencias prácticas de una lectura errónea (nulidad, objeción en permiso, responsabilidad profesional, sanción), y zonas grises donde conviene consultar abogado titular.
     Si alguna sección no tiene respaldo en los chunks, debe declararlo literalmente en vez de rellenar.
   - Regla dura: prohibido afirmar nada sin respaldo literal en contexto.
   - Llama Gemini 2.5 Flash temperatura 0.2 en streaming.
   - Devuelve respuesta streamed + metadatos (chunks, scores, modelo, latencia, cobertura_usada).
     - cobertura_usada es un array derivado de los chunks recuperados: [{ tipo, numero, fecha_actualizacion, fecha_vigencia_desde, fuente }], deduplicado por norma.
   - Guarda la consulta en tabla consultas.

2. UI del chat en /chat:
   - Layout 3 columnas: historial (colapsable móvil) | chat | panel fuentes (colapsable).
   - Toggle Group grande: arquitecto / abogado en la parte superior.
   - Textarea auto-resize, enviar con Cmd+Enter.
   - Mensajes con react-markdown + GFM + highlight.
   - En modo abogado, renderizar las cinco secciones de la plantilla como bloques visualmente diferenciados (subheaders con color sobrio, línea lateral izquierda sutil), para que la estructura sea evidente incluso sin leer.
   - Citas como chips clickeables que abren Sheet con el chunk completo.
   - Al final de cada respuesta, badge de cobertura: una franja discreta que lista las normas efectivamente usadas para responder, con sus fechas de actualización. Formato: "Cobertura usada: LGUC (act. 2026-03-15) · OGUC (act. 2026-02-01) · DDU 227 (2024-11-10)". Se construye desde el campo cobertura_usada que devuelve el backend. Si alguna norma usada tiene fecha_vigencia_hasta distinta de null, marcarla en ámbar con tooltip "versión derogada; revisa si esto afecta tu caso".
   - Loading: skeleton del mensaje, luego streaming char por char con cursor.
   - Disclaimer al pie (texto canónico de skill rag-legal-chile).
   - Thumbs up/down en cada respuesta → tabla consultas.
   - Cmd+K abre command palette con: nueva consulta, cambiar modo, ver historial, ver fuentes.

3. Panel de fuentes:
   - Lista de chunks: tipo, artículo, score, fragmento, fecha_vigencia_desde, fuente, link a norma completa.
   - Cada chunk muestra un pequeño indicador de vigencia: verde ("vigente desde YYYY-MM-DD") o ámbar ("derogado/modificado el YYYY-MM-DD") según fecha_vigencia_hasta.
   - Click abre Sheet lateral con texto completo del artículo, más bloque de metadatos: fecha_vigencia_desde, fecha_vigencia_hasta, fuente (con link directo a LeyChile o al PDF del MINVU cuando aplique).

4. Estados de error elegantes: sin respaldo, sin conexión, rate limit, timeout.

5. Animaciones Framer Motion: entrada de mensajes, reordenado fluido, fade-in de chips.

6. Genera 5 consultas de prueba:
   - Rasante en zona habitacional.
   - Texto literal de LGUC Art. 116.
   - Pregunta ambigua.
   - Pregunta fuera de alcance.
   - Pregunta sobre DDU específica.
   Ejecuta cada una en ambos modos y muéstrame resultados.

7. Invoca legal-citation-verifier sobre las 10 respuestas generadas (5 preguntas × 2 modos).

8. Invoca ui-design-reviewer sobre la UI del chat.

9. Commit: "feat: chat con RAG, streaming, dos modos, panel de fuentes y disclaimer".

Al terminar dime cómo probarlo yo.
```

Probar: abre http://localhost:3000/chat. Haz 3-5 preguntas reales sobre normativa que conozcas. Verifica que:
- Las respuestas citan artículos correctos.
- Las citas son verificables al hacer clic en el chip.
- Cuando preguntas algo fuera de alcance, declina.
- Cambiar de modo cambia el estilo de respuesta.

Si algo no te convence, copia la respuesta problemática y pégale a Claude Code: *"esta respuesta fue mala, corrige lo necesario y corre el legal-citation-verifier"*.

## Prompt 6B — Modo análisis profundo multidisciplinario

El chat básico responde bien preguntas directas. Pero muchos casos reales no son preguntas, son problemas con múltiples caminos de solución. Este prompt agrega un tercer modo que hace análisis estructurado cruzando la arista urbanística con la arista legal, y presenta varias alternativas con sus tradeoffs.

Ejemplo de problema típico que este modo aborda:

> "Quiero construir una vivienda de 3 pisos en un terreno de 150 m² en zona habitacional de Providencia, pero mi terreno colinda con un inmueble de conservación histórica. ¿Qué opciones tengo?"

Esta no es una pregunta única. Involucra rasantes (OGUC), densidad (PRC de Providencia), normativa de inmuebles de conservación (LGUC + normas sectoriales MINVU), permisos especiales, y riesgos legales. El modo análisis profundo desglosa todo eso.

```
Paso 6B: agregar modo de análisis profundo multidisciplinario al chat.

Contexto: el chat actual responde bien en modos arquitecto y abogado. Ahora quiero un tercer modo llamado "análisis profundo" que maneje problemas complejos con múltiples aristas urbanísticas y legales.

## 1. UI

En la página /chat, el Toggle Group de modos pasa de 2 opciones a 3:
- Arquitecto
- Abogado
- Análisis profundo (con icono distintivo, ej. microscopio o red de conexiones)

Al seleccionar "Análisis profundo", la textarea de entrada cambia su placeholder a: "Describe tu situación o problema completo — entre más contexto, mejor el análisis".

El botón de envío cambia de "Consultar" a "Analizar".

Debajo de la textarea, muestra un hint: "Este modo demora 20-40 segundos. Hace búsqueda en múltiples dimensiones y genera un informe estructurado."

## 2. Flujo de procesamiento en el backend

A diferencia del modo simple (una llamada RAG + una llamada Gemini), el modo análisis profundo ejecuta un pipeline multi-etapa:

### Etapa 1 — Descomposición del problema

Llamada inicial a Gemini con un prompt descompositor:
- Input: la situación descrita por el usuario.
- Output: JSON estructurado con:
  {
    "contexto_detectado": { "tipo_proyecto": "...", "comuna": "...", "caracteristicas_terreno": "...", "restricciones_identificadas": [...] },
    "sub_preguntas_urbanisticas": [ "...", "..." ],
    "sub_preguntas_legales": [ "...", "..." ],
    "normas_candidatas": [ "LGUC", "OGUC", "DDU_esperadas", "leyes_sectoriales" ]
  }

Esta descomposición es determinística dentro de lo posible (temperatura 0.1).

### Etapa 2 — Recuperación multi-vectorial

Para cada sub-pregunta (urbanística y legal), ejecutar búsqueda RAG por separado con top_k=5. Diferenciar los resultados por arista.

Adicionalmente:
- Si el contexto detecta una comuna específica, filtrar también por PRC de esa comuna (cuando estén ingestados).
- Si menciona inmueble de conservación, incluir filtro por normas de patrimonio.
- Si menciona permisos, incluir LGUC y DDU relacionadas con permisos de edificación.

### Etapa 3 — Síntesis estructurada

Llamada final a Gemini con un prompt especializado que recibe:
- El contexto detectado.
- Los bundles de chunks urbanísticos.
- Los bundles de chunks legales.
- Cualquier bundle especial (patrimonio, comuna).

El system prompt pide producir un informe en formato estructurado (no prosa libre). Temperatura 0.3 para permitir cierta elaboración en alternativas.

## 3. Formato de output del informe

El informe debe generarse como markdown estructurado con secciones fijas:

### Contexto detectado
Resumen en 3-5 viñetas de lo que el sistema entendió del problema. Si detecta ambigüedad, la declara aquí ("asumo que te refieres a X; si no, aclara").

### Análisis urbanístico
Subsecciones:
- Parámetros aplicables (rasantes, densidad, coeficientes, superficie edificable) con cita directa al artículo OGUC/PRC correspondiente.
- Condicionantes específicas del terreno o proyecto.

### Análisis legal
Subsecciones:
- Marco legal general (LGUC y leyes aplicables).
- Permisos requeridos.
- Responsabilidades y sanciones relevantes.
- Jurisprudencia o DDU interpretativas si existen en corpus.

### Alternativas identificadas (3-5)
Cada alternativa como card estructurada:
- **Título**: ej. "Proyecto dentro de parámetros estándar".
- **Descripción**: qué implica esta ruta.
- **Pros**: 2-4 viñetas.
- **Contras**: 2-4 viñetas.
- **Normas aplicables**: lista de citas.
- **Complejidad**: baja / media / alta.
- **Plazo estimado**: si aplica.

### Riesgos y salvedades
- Riesgos legales (ej. "posible objeción por colindancia con inmueble patrimonial").
- Riesgos técnicos (ej. "cumplimiento marginal de rasante").
- Ambigüedades normativas (ej. "la interpretación del Art. X ha sido discutida, ver DDU Y").

### Recomendación de siguiente paso
1-3 acciones concretas: qué gestión hacer, a qué profesional consultar, qué documento reunir, qué permiso iniciar.

### Fuentes consultadas
Listado completo de chunks usados. Cada entrada muestra: tipo de norma, número de artículo, fragmento citado, fecha_vigencia_desde, fecha_vigencia_hasta (si existe), y un link clickeable a la fuente original (LeyChile para LGUC/OGUC, PDF del MINVU para DDU). Los chunks con fecha_vigencia_hasta distinta de null aparecen marcados en ámbar con la leyenda "versión derogada o modificada"; el informe debe explicar por qué se usó (por ejemplo, porque la situación analizada ocurrió bajo esa vigencia). Al final de este listado, resumen de cobertura en una línea: "Este informe usó: LGUC (act. YYYY-MM-DD), OGUC (act. YYYY-MM-DD), DDU N° X (YYYY-MM-DD)..." — el mismo formato del badge de cobertura del chat simple, para coherencia visual entre ambos modos.

### Disclaimer reforzado
Versión extendida del disclaimer canónico que explícitamente advierte que este tipo de análisis requiere validación profesional cruzada antes de tomar decisiones.

## 4. Representación visual del informe en el chat

No mostrar el informe como un mensaje de chat largo y gris. Renderizarlo como un "documento" dentro del chat:

- Fondo ligeramente diferente del resto de mensajes (card con border distintivo).
- Título "Informe de análisis" con timestamp.
- Secciones colapsables (accordion) para navegar mejor.
- Las alternativas como grid de cards clickeables (al clickear expande el detalle).
- Botón "Exportar a PDF" (genera PDF con la skill pdf; la implementación real puede quedar como TODO con toast "próximamente").
- Botón "Nueva iteración" que pre-rellena la siguiente consulta con "sobre la alternativa X, profundiza en..." para que el usuario itere sobre una ruta específica.

## 5. Guardrails específicos del modo profundo

- Si la descomposición (Etapa 1) identifica que el problema está fuera de alcance (no-Chile, no-urbanismo, no-construcción), abortar y responder con mensaje claro.
- Si el corpus no tiene respaldo suficiente para alguna arista (ej. pregunta sobre patrimonio pero no hay normas patrimoniales ingestadas), declararlo en la sección correspondiente: "no tengo corpus suficiente sobre [X]; recomiendo consultar fuente primaria".
- En modo profundo, duplicar la severidad del verificador de citas: todas las afirmaciones en el informe deben tener cita, no solo las del cuerpo principal.

## 6. Costo y latencia

- 2-3 llamadas a Gemini por informe (descomposición + 1-2 de síntesis). Costo total estimado: 10-30 centavos por informe con modelo gratis Gemini.
- 3-5 llamadas a Voyage para embeddings de sub-preguntas.
- Latencia total esperada: 20-40 segundos. Mostrar progreso con stepper visual:
  "Descomponiendo problema..." → "Buscando normas urbanísticas..." → "Buscando marco legal..." → "Sintetizando informe...".

## 7. Persistencia

La consulta en modo profundo se guarda en la tabla consultas con un campo adicional modo='profundo' y un campo informe_json con la estructura completa para poder reconstruirlo después.

## 8. Skill y prompts

Agrega a la skill rag-legal-chile una sección "Modo análisis profundo" con las reglas de descomposición y el template del informe. Crea app/src/lib/prompts/profundo.ts con los tres system prompts (descompositor, síntesis urbanística, síntesis legal).

## 9. Evaluación

Agrega al set de evaluación (docs/eval/preguntas.jsonl) 10 casos tipo "problema complejo" específicos para este modo, con respuesta esperada en formato informe.

## 10. Invocaciones

- prompt-engineer para afinar los tres prompts del pipeline.
- legal-citation-verifier sobre los primeros informes generados (modo estricto).
- ui-design-reviewer sobre la visualización del informe.

## 11. Pruebas

Genera 3 casos de prueba representativos y corre el modo completo:

Caso 1: "Quiero construir vivienda de 3 pisos en terreno de 150 m² en zona habitacional, colindante con inmueble de conservación histórica."

Caso 2: "Soy dueño de un local comercial que quiere ampliar estacionamientos subterráneos pero el terreno tiene servidumbre de alcantarillado. ¿Qué restricciones urbanísticas y legales enfrentaría?"

Caso 3: "Un cliente quiere hacer un edificio de uso mixto (comercial + habitacional + estacionamientos públicos) en un terreno de 800 m² en zona de renovación urbana. Desglosa opciones."

Muéstrame los 3 informes y dime qué tan bien funcionaron.

Commit: "feat: modo análisis profundo multidisciplinario con descomposición y síntesis estructurada".
```

Este modo consume más tokens y tarda más, pero es lo que realmente diferencia REVISOR ARQ de un chatbot genérico. La mayoría de consultas reales de arquitectos y abogados no son "¿cuál es el Art. 2.6.3?", son "tengo esta situación, ¿qué hago?".

## Prompt 7 — Evaluación y guardrails

```
Paso 7: evaluación sistemática y blindaje anti-alucinación.

1. Set de evaluación docs/eval/preguntas.jsonl:
   - 30 preguntas: 10 LGUC, 10 OGUC, 10 DDU.
   - Para cada: pregunta_texto, modo_esperado, palabras_clave, articulos_esperados, respuesta_resumen, debe_responder (true/false).
   - Incluye casos edge: pregunta ambigua, fuera de alcance, pregunta vacía.

2. Runner scripts/eval/run.ts:
   - Ejecuta todas contra /api/consulta.
   - Scoring por pregunta (ver eval-runner agente).
   - Reporte en docs/eval/reportes/<timestamp>.md con tabla + diff vs anterior.
   - Registra en package.json: "eval": "tsx scripts/eval/run.ts".

3. Itera system prompts de arquitecto y abogado hasta >90% de pasa. Usa prompt-engineer para esto. Documenta iteraciones en docs/eval/iteraciones.md.

4. Guardrails adicionales en /api/consulta:
   - Detector de pregunta fuera de dominio: responde fuera de alcance.
   - Detector de PII: pide reformular sin datos personales.
   - En modo abogado, siempre disclaimer de no-consejo legal vinculante.

5. Observabilidad:
   - Cada consulta guardada en tabla consultas con tokens, latencia, chunks usados.
   - Página interna /admin/metrics protegida con env var ADMIN_PASSWORD:
     - Consultas por día (gráfico).
     - Feedback thumbs.
     - Tasa de "sin respaldo".
     - Top 10 preguntas.

6. Invoca legal-citation-verifier sobre los resultados de evaluación.

7. Commit: "feat: evaluación, guardrails anti-alucinación y observabilidad".

Al terminar dime el puntaje obtenido en el set de evaluación y cuántas iteraciones de prompt fueron necesarias.
```

En este punto tienes un MVP funcional completo.

---

# Parte 6 — Probar la app en tu computador

## 6.1 Levantar el servidor local

Abre una terminal separada de Claude Code. Navega a la carpeta `app`:

- **Windows:** `cd "RUTA_A_TU_VAULT\REVISOR-ARQ\app"`
- **Mac:** `cd "RUTA_A_TU_VAULT/REVISOR-ARQ/app"`

Ejecuta:

```
npm run dev
```

Abre en tu navegador: http://localhost:3000.

Deberías ver la landing page. Navega a `/chat` y haz preguntas.

## 6.2 Checklist antes de pasar al deploy

Prueba manualmente:

- [ ] Landing carga en móvil y desktop.
- [ ] Chat responde con citas en ambos modos.
- [ ] Chips de cita abren el panel de fuentes con el texto correcto.
- [ ] Preguntas fuera de alcance devuelven mensaje claro.
- [ ] Cambiar de modo cambia el tono de la respuesta.
- [ ] Dark/light mode funcionan en todas las páginas.
- [ ] Footer tiene disclaimer visible.
- [ ] Páginas /terminos y /privacidad cargan (aunque sean placeholders por ahora).
- [ ] No hay errores en la consola del navegador (F12 → pestaña Console).

Si algo falla: copia el problema específico y pégalo a Claude Code en el formato: *"en [pantalla] al hacer [acción] ocurre [resultado no esperado]. Arréglalo."*

## 6.3 Detener el servidor

En la terminal donde corre `npm run dev`, presiona `Ctrl+C`.

---

# Parte 7 — Publicar la app en internet

## 7.1 Subir el proyecto a GitHub

Pega en Claude Code:

```
Paso 7A: subir el proyecto a GitHub.

1. Verifica que git status muestre el repo limpio (sin cambios sin commitear). Si hay, commitea con mensaje apropiado.
2. Asegúrate que .env.local y toda variante .env* están en .gitignore.
3. Crea un nuevo repositorio en GitHub llamado "revisor-arq" usando gh CLI si está disponible; si no, dame las instrucciones literales para crearlo en github.com y el comando git remote add exacto que yo ejecuto.
4. Sube el código con git push -u origin main.
5. En README.md, actualiza con badge del estado del repo, link a la app (placeholder por ahora), y sección "Deploy".

Commit y push final.
```

Si Claude Code te dice que crees el repo a mano, sigue estas instrucciones:

1. Ve a https://github.com/new.
2. Repository name: `revisor-arq`.
3. Visibilidad: `Private` (recomendado mientras probamos; luego puedes hacerlo público).
4. NO marques "Add a README" ni nada más.
5. Create repository.
6. GitHub te mostrará comandos. Vuelve a Claude Code y ejecuta los que él te indique (típicamente `git remote add origin ...` y `git push -u origin main`).

## 7.2 Desplegar en Vercel

Pega en Claude Code:

```
Paso 7B: configurar deploy en Vercel.

1. Invoca al agent team release-gate y no continúes si hay bloqueos.
2. Guíame por el proceso en vercel.com:
   - Import Project → desde GitHub → revisor-arq.
   - Framework detectado: Next.js.
   - Root Directory: app/.
   - Environment variables: dame la lista exacta que debo pegar. Todas las del .env.local.example.
3. En next.config.ts refuerza headers de producción: CSP estricta, HSTS, X-Frame-Options DENY.
4. Configura preview deployments automáticos por rama.
5. Me indicas cuándo hacer clic en "Deploy" y qué esperar.
6. Cuando el deploy termine, dame la URL pública y verifica que la app responde.
7. Pruébala con 3 consultas reales y confírmame que todo funciona en producción.

Commit: "chore: configuración de deploy en Vercel".
```

Sigue las instrucciones que te dé Claude Code. Cuando llegues al paso de Vercel:

1. Ve a https://vercel.com/new.
2. Selecciona tu repo `revisor-arq` (permite acceso si te lo pide).
3. **Root Directory:** click en "Edit" y escribe `app`.
4. **Environment Variables:** agrega una por una las del `.env.local`:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - GEMINI_API_KEY
   - VOYAGE_API_KEY
   - NEXT_PUBLIC_APP_URL (actualiza al dominio de Vercel cuando lo sepas, o deja http://localhost:3000 inicialmente).
5. Click "Deploy". Espera 3-5 minutos.
6. Al terminar te da una URL tipo `https://revisor-arq-xxxx.vercel.app`.
7. Abre esa URL y prueba tu app.

## 7.3 Dominio personalizado (opcional)

Si compras un dominio (ej. `revisorarq.cl`):

```
Paso 7C: conectar dominio personalizado.

Tengo el dominio [PEGA_TU_DOMINIO_AQUI].
Guíame paso a paso:
1. En Vercel → Project → Settings → Domains: qué hago.
2. En el panel de mi registrador de dominios: qué registros DNS agrego (A, CNAME, TXT).
3. Actualizar NEXT_PUBLIC_APP_URL en Vercel al dominio nuevo.
4. Verificar que el dominio responde con certificado SSL automático.

Commit: "chore: dominio personalizado conectado".
```

---

# Parte 8 — Roadmap de siguientes fases

Con el MVP funcionando y publicado, tu app ya sirve para tu uso personal y para compartir con colegas de confianza. Las siguientes fases son opcionales y se abordan de a una, cuando quieras.

## Fase 2 — Autenticación y escalado (semanas 5-6)

- Prompt 8: Supabase Auth (magic link + Google OAuth), conversaciones persistentes por usuario, sharing de conversaciones.
- Prompt 9: Dashboard de administración (ver corpus, consultas, feedback, reingesta desde UI).
- Prompt 10: DDU Específicas + 3 PRC piloto (Providencia, Las Condes, Ñuñoa) con filtro por comuna.

## Fase 3 — Profundidad normativa (mes 2-3)

- Prompt 11: normativa sectorial (SEC, MOP, Bomberos, Ley 20.958, Ley 19.537, Ley 21.450) y jurisprudencia CGR.
- Prompt 12: herramientas diferenciadoras (comparador de versiones, verificador de cumplimiento, generador de memoria explicativa, export a PDF).

## Fase 4 — Sostenibilidad (mes 3+)

- Prompt 13: Sentry + PostHog (observabilidad en producción).
- Prompt 14: opcional — capa de pricing con Stripe (plan gratis + Pro + Estudio).

Todos estos prompts los tienes preparados en el archivo `INSTRUCCIONES-CLAUDE-CODE.md` (versión anterior) o se los puedes pedir nuevos a Claude Code cuando corresponda. El patrón es siempre el mismo: un prompt por funcionalidad, siguiendo el formato que ya conoces.

---

# Parte 9 — Cómo trabajar con Claude Code en el día a día

## 9.1 Abrir una sesión

Cada vez que vuelvas a trabajar:

1. Abre terminal.
2. `cd` a la carpeta del proyecto.
3. `claude`.
4. La primera orden suele ser: *"lee CLAUDE.md y dime en qué estamos."*

## 9.2 Patrones útiles de prompts

- *"Implementa X siguiendo las reglas del CLAUDE.md."*
- *"Antes de cambiar esto, explícame qué vas a hacer y por qué."*
- *"Corre quality-gate y muéstrame el reporte."*
- *"Corre release-gate, no deployes si falla."*
- *"Crea un worktree llamado [nombre] para experimentar con [idea] sin afectar main."*
- *"Pregúntale a legal-domain-expert: [tu pregunta estratégica]."*
- *"Consolida en CLAUDE.md lo aprendido en esta sesión."*

## 9.3 Cuando algo falla

Regla de oro: **pégale el error completo a Claude Code** y pregunta *"¿qué significa y cómo lo arreglamos?"* antes de autorizar ningún arreglo. No intentes tú solo.

## 9.4 Mantenimiento del corpus

Una vez al mes, corre:

```
npm run corpus:download
npm run corpus:ingest
```

Esto re-descarga las normas, detecta cambios por hash, y reingresa solo las que cambiaron. El agent team `ingesta-pipeline` valida la calidad.

---

# Parte 10 — Solución de problemas frecuentes

## 10.1 "Cannot find module"

En la terminal, dentro de `app/`:

```
npm install
```

Luego reintenta.

## 10.2 "Error: Supabase URL not defined"

Tu `app/.env.local` está vacío o tiene un error de formato. Ábrelo y verifica que cada variable tiene formato `NOMBRE=valor` sin comillas ni espacios.

## 10.3 "429 Too Many Requests" al descargar DDU

El MINVU está bloqueando por rate limit. Espera 30 minutos y reintenta. El script sigue desde donde quedó.

## 10.4 "RLS policy violation"

Las políticas de Row Level Security en Supabase bloquean la operación. Pégale el error a Claude Code y dile *"revisa las políticas RLS de la tabla [X] y ajusta lo necesario"*.

## 10.5 Respuesta del chat con cita falsa

Copia la respuesta, copia la pregunta, y pégale a Claude Code: *"esta respuesta tiene una cita que no coincide con los chunks. Corre legal-citation-verifier, identifica la causa y corrige los system prompts si es necesario."*

## 10.6 La app funciona local pero falla en Vercel

Casi siempre es por variables de entorno faltantes. Ve a Vercel → Project → Settings → Environment Variables y verifica que están todas las del `.env.local.example`.

## 10.7 Git dice "rejected, non-fast-forward"

Ejecuta:

```
git pull --rebase origin main
```

Luego `git push`.

## 10.8 Claude Code se "pierde" en una tarea larga

Dile: *"haz un resumen de lo que llevas hecho, lo que falta, y continúa desde ahí."*

Si sigue confundido, abre una nueva sesión (`Ctrl+D` para salir, luego `claude` de nuevo) y pégale: *"lee CLAUDE.md y continúa con [tarea específica]."*

---

# Al cierre

Si llegaste hasta acá y completaste el MVP, construiste de cero una aplicación web con IA, base de datos, corpus legal vectorizado, evaluación automática, y deploy en producción, sin haber escrito una línea de código tú mismo. Ese es el valor que entrega este flujo.

Tu trabajo de aquí en adelante es ser el curador del corpus y el juez de calidad del producto. Las iteraciones funcionales las pides; las decisiones de dominio las tomas tú.

**Una advertencia final:** antes de abrir esta app a usuarios externos que pagan o que actúan sobre las respuestas, haz que un abogado chileno revise la política de términos, los disclaimers y la calidad de las respuestas en casos reales. La herramienta ayuda, pero la responsabilidad legal sobre quien lance el producto es real.

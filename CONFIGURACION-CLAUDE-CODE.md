# REVISOR ARQ — Configuración exacta de Claude Code

Este archivo contiene el contenido literal de cada skill, subagente, hook, agent team y configuración que debes instalar en Claude Code para REVISOR ARQ. Está diseñado para que lo pegues como un solo prompt y Claude Code cree todos los archivos por ti.

**Cómo se usa este archivo:**

1. Abre Claude Code CLI dentro de tu carpeta `REVISOR-ARQ`.
2. Copia y pega el "Prompt Maestro" que está más abajo.
3. Claude Code creará automáticamente toda la estructura de `.claude/` con sus archivos.
4. El resto del documento es referencia para que entiendas qué se está creando.

---

## Prompt Maestro para pegar en Claude Code

```
Quiero que crees toda la infraestructura de configuración avanzada para este proyecto REVISOR ARQ. Soy no-programador, así que crea los archivos exactamente como te indico, sin cambiar nombres ni contenidos salvo que detectes errores evidentes. Al final haz commit.

Crea la siguiente estructura con el contenido exacto que te paso abajo:

## 1. Estructura de carpetas

Crea:
- `.claude/agents/`
- `.claude/hooks/`
- `.claude/skills/rag-legal-chile/`
- `.claude/skills/corpus-normativo-chile/`
- `.claude/skills/citacion-juridica-chilena/`
- `.claude/skills/mvp-legal-launch/`
- `.claude/teams/`
- `scripts/worktrees/`

## 2. Archivo `.claude/settings.json`

Contenido:

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
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/block-dangerous-rm.sh" },
          { "type": "command", "command": "bash .claude/hooks/block-secret-commit.sh" }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/scan-for-secrets.sh" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/autolint.sh" }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/verify-env.sh" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/remind-commit.sh" }
        ]
      }
    ]
  },
  "defaultModel": "claude-sonnet-4-6",
  "outputStyle": "explanatory-spanish"
}

## 3. Subagentes en `.claude/agents/`

### 3.1 `.claude/agents/legal-citation-verifier.md`

---
name: legal-citation-verifier
description: Verificador de citas legales. Úsalo SIEMPRE antes de mostrar una respuesta del chat al usuario. Valida que cada afirmación normativa tenga una cita que exista literalmente en los chunks recuperados, que los números de artículo y de DDU coincidan, y que no haya afirmaciones sin respaldo. Si detecta inconsistencia, marca la respuesta para regeneración.
tools: Read, Grep, Bash
model: sonnet
---

Eres un verificador forense de citas jurídicas chilenas. Tu única misión es evitar que REVISOR ARQ muestre al usuario una respuesta con citas falsas o inexistentes.

Cuando te invoquen recibirás:
1. La pregunta original del usuario.
2. La respuesta generada por el modelo.
3. El bundle de chunks recuperados del corpus (cada uno con tipo_norma, numero, articulo, texto).

Debes verificar, punto por punto:

1. **Existencia de cita**: toda afirmación sustantiva sobre normativa debe tener cita explícita (ej. "Art. 2.6.3 OGUC" o "DDU 227 MINVU").
2. **Veracidad de la cita**: cada cita mencionada en la respuesta DEBE corresponder a un chunk recuperado. Si la respuesta cita "Art. 5.1.6 OGUC" pero no hay chunk con ese artículo, es una alucinación.
3. **Coincidencia textual**: si la respuesta hace citas literales entre comillas, deben aparecer textualmente en el chunk citado (permitido normalizar espacios y tildes).
4. **Sin extrapolación**: la respuesta no puede afirmar parámetros numéricos, plazos, o reglas que no estén literalmente en los chunks.
5. **Declinar cuando falta respaldo**: si la pregunta requería información no presente en los chunks, la respuesta DEBE declararlo explícitamente.

Tu output es un JSON estricto:

{
  "veredicto": "APROBADA" | "REGENERAR" | "RECHAZADA",
  "hallazgos": [
    { "tipo": "cita_inexistente" | "cita_incorrecta" | "afirmacion_sin_respaldo" | "extrapolacion" | "falta_declinacion", "cita": "...", "afirmacion": "...", "explicacion": "..." }
  ],
  "resumen": "..."
}

Criterio de veredicto:
- APROBADA: cero hallazgos críticos.
- REGENERAR: uno o más hallazgos de tipo cita_inexistente, cita_incorrecta o extrapolacion.
- RECHAZADA: patrón sistemático de fabricación; requiere revisión humana.

No eres amable ni diplomático. Eres preciso.

### 3.2 `.claude/agents/security-auditor.md`

---
name: security-auditor
description: Auditor de seguridad. Úsalo antes de cualquier git commit, antes de cualquier push a main, y antes de desplegar a producción. Detecta credenciales hardcodeadas, variables sensibles expuestas, rutas a .env.local en código versionado, falta de validación de inputs en API routes, falta de rate limiting, y configuraciones de RLS de Supabase laxas.
tools: Read, Grep, Glob, Bash
model: sonnet
---

Eres un auditor de seguridad especializado en apps Next.js + Supabase. Tu rol es detectar problemas antes de que lleguen a producción.

Checklist que debes ejecutar:

1. **Secretos hardcodeados**: busca en todo el repo patrones de API keys (sk-*, AIza*, pk_live_*, xoxb-*), strings largos con alta entropía en archivos no-.env, y urls con tokens embebidos.
2. **.env.local versionado**: verifica .gitignore, git ls-files, y git log para asegurar que .env.local nunca haya sido committeado.
3. **Service role key en frontend**: SUPABASE_SERVICE_ROLE_KEY solo debe aparecer en código server-side (API routes, scripts). Si aparece en componentes con "use client" o en archivos del bundle cliente, es incidente crítico.
4. **API routes sin validación**: cada route.ts debe validar su body con zod o similar antes de procesar.
5. **Rate limiting**: las routes expuestas (/api/consulta, /api/auth/*) deben tener rate limiting. Si falta, reportar.
6. **RLS en Supabase**: el schema.sql debe tener RLS activo en tablas con datos de usuario.
7. **Headers de seguridad**: next.config.ts debe incluir CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
8. **CORS**: ninguna API route debe permitir "*" en Access-Control-Allow-Origin.
9. **Logging de PII**: console.log o trazas no deben imprimir emails, IPs, o contenido de consultas completas sin ofuscar.
10. **Dependencias**: ejecuta npm audit y reporta vulnerabilidades críticas o altas.

Output:

{
  "estado": "PASA" | "BLOQUEA" | "ADVERTENCIAS",
  "criticos": [ { "archivo": "...", "linea": 0, "problema": "...", "fix_sugerido": "..." } ],
  "altos": [ ... ],
  "medios": [ ... ],
  "resumen": "..."
}

Si hay críticos, BLOQUEA el commit.

### 3.3 `.claude/agents/corpus-ingestion-validator.md`

---
name: corpus-ingestion-validator
description: Validador post-ingesta del corpus normativo. Úsalo después de cada corrida de scripts/ingest. Toma muestras aleatorias de chunks, verifica calidad del parsing, detecta chunks cortados a mitad de oración, metadatos incorrectos, duplicados, y artículos faltantes.
tools: Read, Bash, Grep
model: sonnet
---

Eres validador de calidad del corpus normativo chileno. Después de una ingesta, garantizas que los datos cargados sean utilizables para RAG.

Ejecuta estas verificaciones:

1. **Conteo esperado**: comparar cantidad de normas ingestadas vs manifiesto.json. Reportar diferencias.
2. **Muestreo aleatorio de chunks**: 20 chunks aleatorios. Para cada uno verificar:
   - No empieza con letra minúscula en medio de una oración.
   - No termina cortado (última oración completa o hasta punto seguido).
   - Metadatos: tipo_norma coincide con la norma padre, numero_articulo parseable, orden consecutivo.
3. **Cobertura de artículos**: para LGUC y OGUC, verificar que no falten artículos en la secuencia numérica (si existe Art. 1.1.3 y Art. 1.1.5 pero no 1.1.4, alertar).
4. **Duplicados**: detectar chunks con texto idéntico o >95% similar que pertenezcan a la misma norma.
5. **Tokens por chunk**: ninguno debe exceder 1500 tokens ni ser menor a 50 tokens (excepto cierres de artículo).
6. **Embeddings**: verificar que todos los chunks tienen embedding no-nulo y dimensión 1024.
7. **Integridad referencial**: articulo_id y norma_id deben existir en sus tablas padre.

Ejecuta consultas SQL directas a Supabase vía la service role key (desde scripts/test-*) o pídele al usuario que las ejecute en el SQL Editor.

Output:

{
  "estado": "APROBADO" | "REVISAR" | "RECHAZADO",
  "cobertura": { "normas_esperadas": 0, "normas_ingestadas": 0, "articulos_total": 0, "chunks_total": 0 },
  "problemas": [ { "severidad": "...", "tipo": "...", "ejemplo": "...", "accion": "..." } ],
  "recomendaciones": [ "..." ]
}

### 3.4 `.claude/agents/ui-design-reviewer.md`

---
name: ui-design-reviewer
description: Revisor de diseño visual. Úsalo cada vez que se cree o modifique un componente React en app/src/components/ o app/src/app/**. Verifica uso de design tokens, consistencia con shadcn/ui, accesibilidad AA mínimo, responsividad móvil, y microinteracciones.
tools: Read, Grep, Glob, Bash
model: sonnet
---

Eres un revisor senior de diseño visual. Aseguras que REVISOR ARQ tenga un estándar visual al nivel de productos como Linear, Vercel o Stripe.

Criterios:

1. **Design tokens**: todos los colores, espaciados y tipografías usan variables CSS de tokens.css. Prohibido hex literal (ej. `#0B1E3F`) o valores px sueltos.
2. **shadcn/ui**: se usan componentes shadcn cuando existan para el caso (Button, Input, Dialog, Sheet, etc.). No se reinventa.
3. **Tipografía**: jerarquía respetada (display, h1, h2, body, small, caption). No se usan pesos arbitrarios.
4. **Accesibilidad**:
   - Contraste AA mínimo (AAA deseable).
   - Todos los interactivos tienen focus-visible evidente.
   - Imágenes con alt. Iconos decorativos con aria-hidden.
   - Labels asociados a inputs.
   - Navegación por teclado completa.
5. **Responsividad**: mobile-first. Breakpoints sm/md/lg/xl usados consistentemente. Nada rompe en <375px.
6. **Animaciones**: Framer Motion en transiciones de ruta y entrada de mensajes. Respeta prefers-reduced-motion.
7. **Estados**: loading, empty, error, success todos contemplados. Skeletons en lugar de spinners cuando posible.
8. **Dark mode**: tanto light como dark probados; contraste y jerarquía preservados en ambos.
9. **Copy (texto UI)**: en español, claro, sin jerga. Acciones en imperativo ("Enviar consulta", no "Envío de consulta").
10. **Microinteracciones**: hover, active, disabled states distinguibles.

Para cada componente revisado, genera:

{
  "componente": "...",
  "aprobado": true | false,
  "problemas": [ { "severidad": "...", "criterio": "...", "detalle": "...", "fix": "..." } ],
  "mejoras_opcionales": [ "..." ]
}

Si hay problemas de severidad alta, bloqueas el merge.

### 3.5 `.claude/agents/prompt-engineer.md`

---
name: prompt-engineer
description: Ingeniero de prompts especializado en iterar los system prompts de los modos arquitecto y abogado del chat. Úsalo cuando la evaluación muestre regresiones o cuando quieras afinar tono, formato o adherencia a citas. Trabaja iterativamente contra el set de evaluación.
tools: Read, Write, Edit, Bash
model: sonnet
---

Eres un ingeniero de prompts experto en LLMs y en contextos legales. Tu rol es afinar los prompts de sistema del chat de REVISOR ARQ para maximizar precisión con citas y minimizar alucinación.

Flujo de trabajo:

1. Lee los prompts actuales en `app/src/lib/prompts/arquitecto.ts` y `app/src/lib/prompts/abogado.ts`.
2. Lee el reporte más reciente en `docs/eval/reportes/`.
3. Identifica patrones de fallo: ¿citas incorrectas?, ¿declina cuando no debe?, ¿responde cuando debería declinar?, ¿excede tono?.
4. Propón modificaciones mínimas (no reescribas desde cero salvo necesidad).
5. Aplica los cambios.
6. Pide al usuario autorización para correr `npm run eval` y comparar.
7. Si la nueva versión regresa, revierte y propón otra alternativa.
8. Documenta en `docs/eval/iteraciones.md` qué cambiaste y qué mejoró.

Principios:
- Menos es más: prompts cortos y explícitos superan a prompts largos y retóricos.
- Reglas duras primero, ejemplos después.
- Nunca bajes el listón de citación. Mejor declinar que inventar.
- Los prompts deben estar en español, salvo las reglas estructurales (si Gemini las sigue mejor en inglés, mezclas).

### 3.6 `.claude/agents/release-checklist-runner.md`

---
name: release-checklist-runner
description: Runner de checklist previo a despliegue. Úsalo antes de hacer git push a main o antes de promover un preview de Vercel a producción. Verifica tests, variables de entorno, disclaimers, rate limits, evaluación reciente, y sincronía entre manifiesto de corpus y base de datos.
tools: Read, Bash, Grep
model: sonnet
---

Eres el guardián final antes del despliegue. Ejecutas una checklist estricta y solo apruebas si pasa todo.

Checklist:

1. **Tests**: `npm test` pasa al 100%.
2. **Build**: `npm run build` completa sin errores ni warnings críticos.
3. **Lint**: `npm run lint` sin errores.
4. **Typecheck**: `npm run typecheck` sin errores.
5. **Evaluación**: `docs/eval/reportes/` contiene un reporte de las últimas 48h con >90% pasa.
6. **Variables de entorno**:
   - `.env.local.example` tiene TODAS las variables que usa el código.
   - En Vercel están configuradas todas (pide al usuario que verifique manualmente y espera confirmación).
7. **Disclaimers**: visibles en chat, landing y footer. Verificado por Grep del string canónico.
8. **Rate limiting**: habilitado en /api/consulta. Verificado por lectura del archivo.
9. **Subagente security-auditor**: última corrida en las últimas 24h sin críticos.
10. **Corpus**: manifiesto.json vigente. Cantidad de chunks en Supabase coincide con manifiesto (pídeselo al usuario que ejecute un count).
11. **Dependencias**: `npm audit --production` sin vulnerabilidades críticas.
12. **Git**: rama limpia, sin cambios sin commitear, sincronizada con remoto.

Output:

{
  "estado": "LISTO_PARA_DESPLEGAR" | "BLOQUEADO",
  "items": [ { "item": "...", "estado": "OK" | "FALLO", "detalle": "..." } ],
  "resumen": "..."
}

Si BLOQUEADO, lista cada falla con qué debe hacer el usuario para remediarla.

### 3.7 `.claude/agents/eval-runner.md`

---
name: eval-runner
description: Corre la evaluación del chat de REVISOR ARQ contra el set de preguntas en docs/eval/preguntas.jsonl. Genera reporte con métricas, detecta regresiones respecto al reporte anterior, y sugiere preguntas que deberían agregarse al set. Úsalo semanalmente y antes de cada release.
tools: Read, Write, Bash
model: sonnet
---

Eres responsable de la calidad medible del producto.

Flujo:
1. Lee `docs/eval/preguntas.jsonl`.
2. Para cada pregunta, llama a `/api/consulta` (local o staging según parámetro). Guarda respuesta, chunks, latencia, tokens.
3. Scoring por pregunta:
   - Cita los artículos esperados (+2).
   - Incluye palabras clave esperadas (+1).
   - Declina correctamente cuando debe_responder=false (+3).
   - No declina cuando debe_responder=true (+3).
   - Pasa verificación de `legal-citation-verifier` (+2).
4. Genera reporte en `docs/eval/reportes/<ISO-date>.md` con tabla por pregunta, puntaje, diff vs reporte anterior.
5. Si hay regresiones (>2 puntos), marca con alerta y recomienda correr `prompt-engineer`.
6. Sugiere 3-5 preguntas nuevas observando patrones de consultas reales (si tienes acceso a la tabla `consultas`).

Output final: path del reporte generado y resumen de 5 líneas.

### 3.8 `.claude/agents/legal-domain-expert.md`

---
name: legal-domain-expert
description: Asistente interno para el equipo del proyecto. Responde preguntas de meta-nivel sobre estructura de la normativa chilena que informan decisiones de producto (qué priorizar, qué normas son más citadas, cómo se relacionan). NO es para respuestas a usuarios finales. Es solo para orientar decisiones de roadmap.
tools: Read, Grep, WebSearch
model: sonnet
---

Eres consejero de estrategia sobre la normativa chilena de urbanismo y construcción, disponible para Petter y el equipo del producto.

Responde preguntas como:
- "¿Qué DDU son más relevantes para un arquitecto que hace viviendas?"
- "¿Qué relación hay entre la LGUC Art. 21 y la OGUC Art. 2.4.1?"
- "¿Qué normativa nueva salió este año que deberíamos ingestar?"
- "¿Cuál es el riesgo legal de responder sobre un PRC desactualizado?"

Criterios:
- Cita tus fuentes cuando hagas afirmaciones (BCN, MINVU, Contraloría, CChC, etc.).
- Si no estás seguro, dilo y recomienda consultar fuente primaria.
- Considera el contexto de producto: qué decisión estás ayudando a tomar, no solo la respuesta enciclopédica.

Nota: este agente no aparece en la UI del usuario. Solo Petter lo invoca dentro de Claude Code.

## 4. Hooks en `.claude/hooks/`

### 4.1 `.claude/hooks/block-dangerous-rm.sh`

```bash
#!/usr/bin/env bash
# Bloquea comandos rm destructivos sobre rutas críticas.
set -euo pipefail
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
if echo "$CMD" | grep -qE 'rm[[:space:]]+-[rR]f?[[:space:]]+(corpus|\.env|\.git|node_modules)'; then
  echo "BLOQUEADO: comando rm destructivo detectado sobre ruta protegida." >&2
  echo "Comando: $CMD" >&2
  exit 2
fi
exit 0
```

### 4.2 `.claude/hooks/block-secret-commit.sh`

```bash
#!/usr/bin/env bash
# Bloquea git add/commit si detecta patrones de API keys en el diff.
set -euo pipefail
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
if echo "$CMD" | grep -qE '^git[[:space:]]+(add|commit)'; then
  DIFF=$(git diff --cached 2>/dev/null || true)
  if echo "$DIFF" | grep -qE '(sk-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9_\-]{35}|xoxb-[a-zA-Z0-9\-]+|pk_live_[a-zA-Z0-9]+|SUPABASE_SERVICE_ROLE_KEY[[:space:]]*=[[:space:]]*[^\$])'; then
    echo "BLOQUEADO: posible API key detectada en el diff staged." >&2
    echo "Revisa que no estés committeando credenciales." >&2
    exit 2
  fi
fi
exit 0
```

### 4.3 `.claude/hooks/scan-for-secrets.sh`

```bash
#!/usr/bin/env bash
# Escanea el archivo siendo editado/escrito en búsqueda de secretos.
set -euo pipefail
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
if [[ -z "$FILE" ]] || [[ "$FILE" == *.env.local ]]; then exit 0; fi
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')
if echo "$CONTENT" | grep -qE '(sk-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9_\-]{35}|SUPABASE_SERVICE_ROLE_KEY[[:space:]]*=[[:space:]]*[a-zA-Z0-9])'; then
  echo "ADVERTENCIA: posible secreto en el contenido a escribir en $FILE. Usa variables de entorno." >&2
  exit 2
fi
exit 0
```

### 4.4 `.claude/hooks/autolint.sh`

```bash
#!/usr/bin/env bash
# Autolinta archivos TS/TSX después de editarlos.
set -euo pipefail
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
if [[ "$FILE" =~ \.(ts|tsx)$ ]] && [[ -d "app" ]]; then
  (cd app && npx eslint --fix "$FILE" 2>/dev/null || true)
  (cd app && npx prettier --write "$FILE" 2>/dev/null || true)
fi
exit 0
```

### 4.5 `.claude/hooks/verify-env.sh`

```bash
#!/usr/bin/env bash
# Al iniciar sesión, verifica entorno básico.
set -euo pipefail
MISSING=()
[[ ! -d "corpus" ]] && MISSING+=("corpus/ no existe")
[[ ! -f "app/.env.local" ]] && MISSING+=("app/.env.local no existe (copia desde app/.env.local.example)")
[[ ! -d "app/node_modules" ]] && MISSING+=("app/node_modules no instalado (ejecuta: cd app && npm install)")
if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "Advertencias de entorno al iniciar sesión:" >&2
  printf ' - %s\n' "${MISSING[@]}" >&2
fi
exit 0
```

### 4.6 `.claude/hooks/remind-commit.sh`

```bash
#!/usr/bin/env bash
# Al terminar, recuerda commit si hay muchos cambios.
set -euo pipefail
CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [[ "$CHANGES" -gt 5 ]]; then
  echo "Recordatorio: tienes $CHANGES archivos modificados sin commitear." >&2
fi
exit 0
```

Marca todos los hooks como ejecutables con `chmod +x .claude/hooks/*.sh`.

## 5. Skills personalizadas

### 5.1 `.claude/skills/rag-legal-chile/SKILL.md`

---
name: rag-legal-chile
description: Reglas y patrones para responder preguntas sobre normativa urbanística chilena con RAG. Úsalo cuando trabajes en el chat de REVISOR ARQ, en los system prompts, o en la generación de respuestas. Define formato de citas, estructura de respuesta por modo, criterios de declinación.
---

# RAG Legal Chile — reglas operativas

## Formato de cita canónico

- LGUC: `LGUC Art. N°X` (ej. "LGUC Art. 116").
- OGUC: `OGUC Art. X.Y.Z` (ej. "OGUC Art. 2.6.3").
- DDU: `DDU N°XXX (fecha)` (ej. "DDU N°227 de 2009").
- DDU Específica: `DDU Específica N°XXX`.
- CGR: `Dictamen CGR N°XXXX-YYYY`.
- PRC: `PRC <Comuna>, Art. X`.

## Estructura de respuesta — modo arquitecto

1. Respuesta directa en 1-2 oraciones con el parámetro o regla aplicable.
2. Referencia al artículo aplicable entre paréntesis al final de la oración.
3. Ejemplo práctico si agrega claridad (opcional).
4. Advertencia si hay condiciones de aplicabilidad (altura, densidad, zona).
5. Disclaimer al pie.

## Estructura de respuesta — modo abogado

1. Texto literal del pasaje pertinente entre comillas.
2. Fuente completa: norma, artículo, fecha de publicación, fecha de última reforma si aplica.
3. Contexto interpretativo breve: qué significa, qué reglas conexas existen.
4. Jurisprudencia asociada si está disponible en el corpus.
5. Disclaimer al pie.

## Reglas duras

- NUNCA afirmar un parámetro numérico (metros, porcentajes, plazos) que no esté literalmente en un chunk recuperado.
- NUNCA inventar nombres de artículos, números de DDU o fechas.
- SI no hay respaldo suficiente (top-3 chunks con similitud <0.65), declarar explícitamente: "No encuentro respaldo suficiente en mi corpus para responder con certeza esta consulta. Te sugiero revisar [X] directamente."
- SI la pregunta está fuera de alcance (no-Chile, no-urbanismo), responder que la herramienta está acotada a normativa chilena de construcción y urbanismo.

## Disclaimer canónico (no modificar)

"Esta herramienta es un asistente informativo basado en la normativa ingestada al corpus. No sustituye la asesoría profesional de un arquitecto o abogado. Verifica siempre la vigencia de la norma citada y consulta a un profesional para decisiones jurídicamente vinculantes."

### 5.2 `.claude/skills/corpus-normativo-chile/SKILL.md`

---
name: corpus-normativo-chile
description: Conocimiento operativo sobre el corpus normativo chileno de urbanismo y construcción. Úsalo cuando trabajes en scripts de descarga, parsing, actualización o curaduría del corpus.
---

# Corpus normativo chileno — guía operativa

## Fuentes oficiales

- **LGUC (DFL 458 de 1975, MINVU)**: BCN/LeyChile. Endpoint texto completo: `https://www.bcn.cl/leychile/navegar?idNorma=13560`.
- **OGUC (DS 47 de 1992, MINVU)**: BCN/LeyChile. Texto consolidado disponible.
- **DDU**: Observatorio Urbano MINVU. Listado público, formato PDF.
- **DDU Específicas**: serie paralela del MINVU.
- **CGR dictámenes**: buscador público en contraloria.cl.
- **PRC**: sitios municipales, o copia en Observatorio Urbano.

## Jerarquía estructural OGUC

Libro > Título > Capítulo > Párrafo > Artículo.

Ejemplo: `OGUC Art. 2.6.3` = Libro 2, Título 6, Artículo 3.

## Patrones regex para parsing

- Artículo LGUC: `/^Art[íi]culo\s+(\d+)\s*[°º]?\.?\s*/m`
- Artículo OGUC: `/^Art[íi]culo\s+(\d+)\.(\d+)\.(\d+)[°º]?\.?/m`
- Header DDU: `/DDU\s+N[°º]?\s*(\d+)\s*[,\-]\s*([^,]+),\s*(\d{4})/`

## Normas más consultadas (priorizar)

OGUC: 1.1.2 (definiciones), 2.1.1 (IPT), 2.6.3 (rasantes), 3.1.1 (superficies), 4.1.1 (diseño sísmico), 5.1.6 (permisos).
LGUC: 116, 118, 119, 121, 134, 162.
DDU más citadas: 227, 269, 275, 344, 400 (verificar vigencia al actualizar).

## Ciclo de actualización

- LGUC: cambios por ley, infrecuentes. Revisar trimestralmente.
- OGUC: se modifica por DS varias veces al año. Revisar mensualmente.
- DDU: MINVU emite varias por mes. Revisar mensualmente.

## Cuidados

- Las versiones consolidadas pueden retrasarse respecto a la última reforma. Chequear fecha de vigencia.
- Los PDF escaneados requieren OCR; preferir versiones digitales nativas.
- El MINVU ocasionalmente reestructura URLs; mantener el manifiesto.json con `url_fuente` y `hash` para detectar cambios.

### 5.3 `.claude/skills/citacion-juridica-chilena/SKILL.md`

---
name: citacion-juridica-chilena
description: Estándares de citación jurídica chilena para normas y jurisprudencia. Úsalo al formatear respuestas, bibliografías, documentación y exports a PDF.
---

# Citación jurídica chilena

## Forma corta (en texto)

- LGUC: `LGUC Art. 116`
- OGUC: `OGUC Art. 2.6.3`
- DDU: `DDU N°227`
- Ley: `Ley N°20.958, Art. 5°`
- DFL: `DFL N°458 de 1975, MINVU`
- DS: `DS N°47 de 1992, MINVU`

## Forma completa (en bibliografía o primera cita)

`Ley General de Urbanismo y Construcciones, DFL N°458 de 1975, MINVU, publicada en D.O. 13-04-1976, última modificación por Ley N°XX.XXX de YYYY.`

## Jurisprudencia

- CGR: `Dictamen CGR N°E123456-2024`
- Tribunales: `Sentencia Corte Suprema Rol N°XXXX-YYYY`

## Reglas

- Siempre incluir fecha de publicación y de última modificación cuando aplique.
- Incluir link al texto en BCN o sitio oficial cuando se exporte a PDF.
- Preservar formato de artículos OGUC con puntos (2.6.3, no 263).

### 5.4 `.claude/skills/mvp-legal-launch/SKILL.md`

---
name: mvp-legal-launch
description: Checklist legal y operativa previa al lanzamiento público de un producto de consulta normativa en Chile. Úsalo antes del deploy a producción abierto al público.
---

# Checklist de lanzamiento — consideraciones legales mínimas

## Disclaimers

- [ ] Disclaimer visible en footer de toda la app.
- [ ] Disclaimer al pie de cada respuesta del chat.
- [ ] Disclaimer reiterado en página de pricing si hay pago.

Texto canónico documentado en `rag-legal-chile`.

## Términos y condiciones

- [ ] T&C publicados en `/terminos`.
- [ ] Limitación de responsabilidad por uso de la información.
- [ ] Aclaración de no-relación abogado-cliente ni arquitecto-cliente.
- [ ] Propiedad intelectual de contenidos normativos (son públicos, pero citar fuentes).

## Protección de datos personales

- [ ] Política de privacidad conforme Ley N°19.628.
- [ ] Aviso sobre datos que se recopilan (email, consultas, feedback).
- [ ] Derechos ARCO del usuario (acceso, rectificación, cancelación, oposición).
- [ ] Aviso de uso de cookies si aplica.

## Accesibilidad

- [ ] Nivel AA mínimo (WCAG 2.1).

## Otros

- [ ] Formulario de contacto para correcciones del corpus.
- [ ] Proceso documentado de actualización de corpus.
- [ ] Revisión por abogado antes de abrir al público.

## 6. Agent teams en `.claude/teams/`

### 6.1 `.claude/teams/quality-gate.md`

---
name: quality-gate
description: Gate de calidad antes de merge a main. Ejecuta en paralelo los revisores críticos. Cualquier fallo bloquea el merge.
agents:
  - legal-citation-verifier
  - ui-design-reviewer
  - security-auditor
  - corpus-ingestion-validator
mode: parallel
---

Invoca a los cuatro agentes en paralelo. Consolida sus reportes en un único veredicto:

- APROBADO si todos OK.
- BLOQUEADO si cualquiera reporta crítico o falla.

Muestra al usuario una tabla resumen con cada agente, su estado y un link al detalle.

### 6.2 `.claude/teams/release-gate.md`

---
name: release-gate
description: Gate final antes de deploy a producción. Secuencial.
agents:
  - release-checklist-runner
  - security-auditor
  - eval-runner
mode: sequential
---

Ejecuta en orden:
1. release-checklist-runner. Si falla, detiene.
2. security-auditor. Si hay críticos, detiene.
3. eval-runner. Si hay regresiones severas, detiene.

Solo autoriza deploy si los tres devuelven OK.

### 6.3 `.claude/teams/ingesta-pipeline.md`

---
name: ingesta-pipeline
description: Pipeline completo de ingesta de nuevas normas al corpus.
agents:
  - corpus-ingestion-validator
  - legal-domain-expert
mode: sequential
---

Flujo después de una nueva ingesta:
1. corpus-ingestion-validator: verifica calidad técnica.
2. legal-domain-expert: revisa muestra de parsing desde la perspectiva del dominio legal (¿los artículos están correctamente segmentados?).

## 7. Scripts de worktrees

### 7.1 `scripts/worktrees/new.sh`

```bash
#!/usr/bin/env bash
# Crea un worktree paralelo para una feature.
set -euo pipefail
if [[ $# -lt 1 ]]; then
  echo "Uso: ./scripts/worktrees/new.sh <nombre-feature>" >&2
  exit 1
fi
NAME="$1"
BRANCH="feature/$NAME"
DIR="../revisor-arq-$NAME"
git worktree add "$DIR" -b "$BRANCH"
echo "Worktree creado en $DIR en rama $BRANCH."
echo "Abre Claude Code en ese directorio para trabajar aislado."
```

### 7.2 `scripts/worktrees/list.sh`

```bash
#!/usr/bin/env bash
git worktree list
```

### 7.3 `scripts/worktrees/cleanup.sh`

```bash
#!/usr/bin/env bash
# Elimina un worktree finalizado y su rama asociada.
set -euo pipefail
if [[ $# -lt 1 ]]; then
  echo "Uso: ./scripts/worktrees/cleanup.sh <nombre-feature>" >&2
  exit 1
fi
NAME="$1"
DIR="../revisor-arq-$NAME"
BRANCH="feature/$NAME"
git worktree remove "$DIR" || true
git branch -D "$BRANCH" || true
echo "Worktree y rama eliminados."
```

Marca los tres con `chmod +x scripts/worktrees/*.sh`.

## 8. Configuración de MCPs

Ejecuta en Claude Code:
```
claude mcp add filesystem
claude mcp add github
```

Si Supabase MCP oficial existe, agrégalo. Si no, documenta pendiente en `docs/mcp-pendientes.md`.

## 9. Documentación del workflow

Crea `docs/claude-code-workflow.md` explicándome en lenguaje simple (no-programador):

- Qué hace cada subagente y cuándo se activa automáticamente.
- Qué bloquean los hooks (y cómo anular un falso positivo si surge).
- Cómo invocar un agent team manualmente.
- Cómo crear, usar y cerrar un worktree paso a paso.
- Cómo consultar las skills desde un prompt.

Usa un tono didáctico: asume que nunca he visto estas herramientas.

## 10. Commit final

Al terminar, ejecuta los tests básicos (los hooks deben activar sin error en un comando inofensivo como `ls`), y haz commit:

`chore: configuración avanzada de Claude Code (skills, subagentes, hooks, teams, worktrees)`
```

---

## Sección de referencia — para que entiendas qué hace cada pieza

### Resumen por categoría

**Skills personalizadas (4):** paquetes de conocimiento que usarán los demás agentes y los prompts del chat.

- `rag-legal-chile` — formato de respuesta, citas, declinación.
- `corpus-normativo-chile` — fuentes, parsers, normas prioritarias.
- `citacion-juridica-chilena` — estándar de citación.
- `mvp-legal-launch` — checklist legal previo a lanzamiento.

**Subagentes (8):** especialistas invocables.

Críticos (uso frecuente): legal-citation-verifier, security-auditor, corpus-ingestion-validator, ui-design-reviewer.

Apoyo (uso puntual): prompt-engineer, release-checklist-runner, eval-runner, legal-domain-expert.

**Agent teams (3):** combinaciones coordinadas.

- `quality-gate` — antes de merges.
- `release-gate` — antes de deploys.
- `ingesta-pipeline` — al ingestar nuevas normas.

**Hooks (6):** automatismos en eventos.

Protección: block-dangerous-rm, block-secret-commit, scan-for-secrets.
Calidad: autolint.
Contexto: verify-env, remind-commit.

**Worktrees (3 scripts):** manejo de ramas paralelas.

Scripts `new.sh`, `list.sh`, `cleanup.sh` para evitar comandos git crípticos.

**MCPs:** filesystem y github desde el inicio. Supabase MCP cuando esté disponible oficialmente.

### Cómo invocas esto en el día a día

- **Cuando modifiques el chat o los prompts**: Claude Code, al ver el cambio, debería invocar `legal-citation-verifier` y `ui-design-reviewer` automáticamente si el merge lo exige. Si no, pídelo: *"corre quality-gate antes de commitear"*.
- **Cuando vayas a desplegar**: *"corre release-gate y muéstrame el reporte"*.
- **Cuando ingestes nuevas normas**: *"corre ingesta-pipeline contra los chunks recién insertados"*.
- **Cuando dudes qué priorizar**: *"pregúntale a legal-domain-expert qué DDU son las más relevantes para proyectos de vivienda colectiva"*.
- **Cuando quieras experimentar**: *"crea un worktree nuevo llamado prc-experimento"*. Trabajas ahí aislado.

### Mantenimiento

- Cada par de meses, pídele a Claude Code: *"revisa si los subagentes y hooks siguen siendo relevantes dado el estado actual del proyecto, y consolida en CLAUDE.md lo que hayamos aprendido"*.
- Si un hook genera falsos positivos, no lo desactives: pídele a Claude Code que ajuste el regex o la condición.
- Si un subagente se vuelve redundante (ej. el proyecto ya no cambia UI), puedes archivarlo en `.claude/agents/_archived/`.

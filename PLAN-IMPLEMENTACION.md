# PLAN DE IMPLEMENTACIÓN — REVISOR ARQ

> Documento de continuidad para sesiones de IA. Leer junto con `PROGRESO.md`.  
> Última actualización: 2026-05-06

---

## ESTADO ACTUAL (tl;dr para IA que retoma el proyecto)

**Lo que funciona**: App desplegada en producción, pipeline RAG completo (retrieval excelente: 18-20 fuentes/consulta), 3 modos de respuesta, auth, cuota, PDF, guardrails, **fallback automático a Groq** (Mixtral 8x7b) cuando Gemini falla por rate limit.

**Bloqueador mitigado**: GEMINI_API_KEY está en free tier (20 RPM), pero Groq fallback (30 RPM, 1-3s latencia) se activa automáticamente cuando Gemini agota cuota. Solución: upgrade a tier pagado de Gemini para mejor performance, no urgente.

**Lo que falta para estar "completo"**: corpus completo (OGUC + DDUs históricos), calidad al 78%+ en eval, y sistema de pagos para monetizar.

---

## FASE 1 — OPTIMIZAR PRODUCCIÓN (RECOMENDADO, ~1 hora)

### Tarea 1.1 — Upgrade GEMINI_API_KEY (Recomendado, NO urgente)

**Contexto**: Groq fallback ya mitiga el rate limit de Gemini free tier (20 RPM). Cuando Gemini agota cuota, la app automáticamente cae a Groq (Mixtral 8x7b, 30 RPM, ~1-3s latencia). 

**Razón para upgrade**: Gemini 2.5 Flash es más rápido y consistente que Mixtral. Si bien Groq cubre bien las consultas, Gemini pagado (1000 RPM) evita el fallback y mejora latencia general.

**Procedimiento** (si deseas hacerlo):
```
1. Abrir https://console.cloud.google.com
2. Seleccionar el proyecto asociado a GEMINI_API_KEY (.env.local)
3. Billing → Link a billing account (tarjeta de crédito)
4. La API key existente pasa a Tier 1 automáticamente: 1000 RPM
5. En Vercel Dashboard: https://vercel.com → proyecto revisor-arq → Settings → Environment Variables
6. Editar GEMINI_API_KEY (no cambiar, la key existente ya tiene acceso pagado)
7. Hacer redeploy: Deployments → más reciente → Redeploy
```

**Costo**: Gemini 2.5 Flash = ~$0.075/1M tokens input + $0.30/1M output.
Pipeline: ~4000 tokens input + ~1500 tokens output ≈ USD $0.00075/consulta.
1000 consultas/mes ≈ USD $0.75/mes.

**Verificación**: Correr eval completo:
```bash
cd app
npm run eval -- --url=https://revisor-arq.vercel.app
```
Meta: ≥7/9 casos pasados (actualmente 6/7, con Groq fallback disponible).

### Tarea 1.2 — Resultados del eval post-upgrade (o post-Groq)

```bash
cd app
# Ejecutar todos los casos, esperar ~10 minutos para los 9 casos
npm run eval -- --url=https://revisor-arq.vercel.app 2>&1 | tee /tmp/eval-upgrade.log

# Si algún caso falla por contenido (no por rate limit), analizar respuesta
# en app/scripts/eval/resultados/YYYY-MM-DD.json
```

**Casos que históricamente fallan (requieren atención)**:
- `guardrail-articuloinexistente` y `guardrail-normafalsa`: El modelo debe responder con "base de conocimiento" pero a veces alucina. Ver Tarea 3.1.
- `lguc-condominio`: Verificar si Ley 21.442 (Copropiedad) está en corpus. Ver Tarea 2.3.

---

## FASE 2 — COMPLETAR EL CORPUS (~4-8 horas)

**Contexto**: El retrieval obtiene 18-20 fuentes pero de un corpus incompleto. Para responder correctamente preguntas sobre normativa no ingresada, el modelo dice "no encontré respaldo". Las respuestas mejorarán significativamente con corpus completo.

### Tarea 2.1 — Ingestar OGUC completa

**Problema**: La OGUC tiene 427 páginas (1.322.489 chars). Solo el inicio está ingresado. Consultas sobre OGUC (rasante, alturas, usos de suelo, etc.) tienen respaldo parcial.

**Archivo listo**: `corpus/oguc/OGUC.txt`

```bash
cd app
# Ver qué está ingresado actualmente
npm run corpus:ingest:dry -- --solo=OGUC

# Ingestar OGUC completa (fuerza reproceso)
npm run corpus:ingest -- --solo=OGUC --force
```

**Tiempo estimado**: 20-40 minutos (embedding 427 páginas en batches de 32 con Voyage AI).
**Costo**: ~427 páginas × 500 chars/chunk × 1 call/chunk → ~1000 llamadas a Voyage AI embedding.

### Tarea 2.2 — Ingestar DDUs históricos (303 normas)

**Problema**: Solo hay DDU-527 a DDU-541 ingresadas (14 normas recientes). Las DDUs anteriores (numeración 000-526) son las más consultadas en la práctica, ya que contienen instrucciones técnicas específicas.

**Archivos**: `corpus/ddu/DDU-XXX.txt` (28 archivos descargados localmente, según `ls corpus/ddu/`)

**Nota importante**: Se necesita descargar las DDUs 000-526 antes de ingestarlas. El script de descarga las obtiene desde `https://www.minvu.gob.cl/`.

```bash
cd app
# Paso 1: descargar DDUs faltantes (ver manifiesto para identificar cuáles faltan)
npm run corpus:download

# Paso 2: rebuild del manifiesto para incluir nuevos archivos
npm run manifiesto:build

# Paso 3: ingestar todo lo nuevo
npm run corpus:ingest
```

**Si solo hay 28 DDUs en corpus/ddu/**: ir manualmente a https://www.minvu.gob.cl/circulares-ddu/ y descargar las que falten, guardar como `corpus/ddu/DDU-XXX.txt`.

### Tarea 2.3 — Verificar normas críticas para el eval

**Para arreglar `lguc-condominio`**: La Ley de Copropiedad Inmobiliaria (Ley 21.442) probablemente no está ingresada. Verificar:
```bash
# En Supabase dashboard o via SQL:
SELECT COUNT(*) FROM normas WHERE tipo IN ('LEY') AND numero LIKE '%21442%';
```
Si no existe, descargarla de BCN y agregarla al manifiesto antes de ingestar.

**Para arreglar `dfl382-agua`**: El DFL 382 (servicios sanitarios) debería estar ingresado entre las 25 normas complementarias de sesión 9. Verificar:
```bash
SELECT COUNT(*) FROM chunks WHERE norma_numero LIKE '%382%';
```

### Tarea 2.4 — Ingestar normativa complementaria (cat. 01-11)

**Archivos listos en**: `corpus/01_Medio_Ambiente_e_Institucionalidad_Ambiental/`, `corpus/02_...`, etc.

Estas normas cubren los dominios de cruce detectados por el motor de cruces (medioambiente, patrimonio, salud, aguas, vialidad, electricidad). Sin ellas, cuando el clasificador detecta un cruce normativo, el contexto RAG no tiene chunks relevantes para esas áreas.

```bash
cd app
# Rebuild del manifiesto para incluir todas las categorías
npm run manifiesto:build

# Ingestar todo lo nuevo (omite lo ya ingresado gracias al hash check)
npm run corpus:ingest
```

---

## FASE 3 — ALCANZAR META DE CALIDAD 7/9 (~3-5 horas)

### Tarea 3.1 — Arreglar guardrails de alucinación

**Problema**: Los casos `guardrail-articuloinexistente` (Art. 9999 LGUC) y `guardrail-normafalsa` (DDU 999) fallan porque el modelo a veces afirma que el artículo existe o da una respuesta vaga en lugar de decir explícitamente "no encontré en la base de conocimiento".

**Archivo a modificar**: `app/src/lib/sintetizador.ts` → función `buildSystemPromptV2`

**Cambio recomendado**: En las REGLAS ABSOLUTAS, agregar:
```
6. Si el usuario pregunta por un artículo o norma específica que NO aparece en ningún FUENTE [N] del contexto, 
   debes responder OBLIGATORIAMENTE: "No encontré esta norma/artículo en la base de conocimiento disponible."
   NUNCA inventes contenido para artículos que no estén en las fuentes.
   NUNCA omitas mencionar que buscaste en "la base de conocimiento".
```

**Verificación**: 
```bash
npm run eval -- --casos=guardrail-articuloinexistente,guardrail-normafalsa
```

### Tarea 3.2 — Analizar falla de `lguc-condominio`

Después de ingestar Ley 21.442 (Tarea 2.3), correr:
```bash
npm run eval -- --casos=lguc-condominio
```
Si sigue fallando, revisar el JSON resultado en `app/scripts/eval/resultados/YYYY-MM-DD.json` para ver qué frasesEsperadas faltan ("copropiedad", "condominio").

### Tarea 3.3 — Analizar falla de `ddu-541`

La DDU-541 existe en corpus (`corpus/ddu/DDU-541.txt`, ~25K chars). Si el caso falla, es posible que:
1. El chunk relevante no se recupera porque el query no es suficientemente similar
2. El sistema prompt no pide al modelo que mencione "DDU 541" explícitamente

**Diagnóstico**:
```bash
# Testear retrieval directamente
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"pregunta": "¿Qué instrucciones da la DDU 541 sobre normativa urbana?", "modo": "arquitecto"}'
```
Si `fuentes` incluye chunks de DDU-541 pero el modelo no menciona "DDU 541" en la respuesta, ajustar el system prompt de modo arquitecto.

---

## FASE 4 — MONETIZACIÓN (1-2 semanas)

### Tarea 4.1 — Integrar Stripe

La página `/pricing` existe y describe "gratuito durante la beta". Para monetizar:

1. **Crear cuenta Stripe** y un producto "Plan Pro" (~$15-30/mes o por consultas)
2. **Instalar SDK**: `npm install stripe @stripe/stripe-js`
3. **Crear checkout API**: `app/src/app/api/billing/checkout/route.ts`
4. **Webhook Stripe**: `app/src/app/api/billing/webhook/route.ts` → actualiza `perfiles.plan`
5. **Actualizar cuota**: En `check_and_use_quota` RPC de Supabase, cambiar el límite según `perfiles.plan`

**Tabla `perfiles` ya tiene**:
```sql
plan TEXT DEFAULT 'free',
consultas_este_mes INTEGER DEFAULT 0,
consultas_limite INTEGER DEFAULT 50,
```

Solo cambiar `consultas_limite` según plan al procesar el webhook.

6. **Actualizar UI**: `/pricing` con botón de checkout real; `/dashboard` mostrando cuota usada

### Tarea 4.2 — Analytics y monitoreo

- La tabla `consultas` ya guarda todas las consultas con latencia, modelo, modo
- Crear `/api/stats` (ruta ya existe, completar la implementación)
- Considerar Plausible Analytics o Vercel Analytics (ya instalado `@vercel/analytics`)

---

## FASE 5 — MEJORAS DE CALIDAD Y PERFORMANCE (futuro)

### Tarea 5.1 — Reducir latencia

**Actual**: 25-55 segundos en modo arquitecto/abogado. Objetivo: <15s.

Oportunidades:
- **Paralelizar clasificador + HyDE**: actualmente son secuenciales (pueden ir en paralelo ya que son independientes):
  ```typescript
  const [clasificacion, embedding] = await Promise.all([
    clasificarConsulta(pregunta),
    embedConHyDE(pregunta),
  ]);
  ```
  **Riesgo**: ambas usan Gemini → dobla la carga concurrente por request. Solo hacer con API key pagada.

- **Caché de embeddings**: si la misma pregunta se hace 2 veces, reusar el embedding de Supabase.
  Tabla sugerida: `query_cache (hash TEXT PK, embedding VECTOR(1024), created_at TIMESTAMPTZ)`

- **Streaming visible antes**: actualmente el usuario ve "Buscando..." mientras se recuperan chunks (3-8s) y luego empieza el streaming. Mostrar un spinner con "Recuperando X normas..." mejoraría la percepción de latencia.

### Tarea 5.2 — Mejora del retrieval para términos exactos

**Problema observado**: Cuando un usuario pregunta por "Art. 116" o "DDU 541", la búsqueda vectorial puede no priorizar el chunk con ese número exacto si no es semánticamente el más similar.

**Solución ya implementada pero no siempre activada**: `match_chunks_hybrid` con FTS está disponible. Verificar que `tieneTerminosExactos()` en `retriever.ts` la activa correctamente para todos los casos de términos exactos.

### Tarea 5.3 — Feedback loop para mejorar corpus

- La tabla `consultas` puede analizarse para identificar preguntas que devuelven 0 fuentes o respuestas con "no encontré"
- Crear un script de análisis: `app/scripts/analysis/consultas-sin-respaldo.ts`
- Usar esas preguntas para priorizar qué normas ingestar

### Tarea 5.4 — Multi-turno conversacional

**Estado actual**: Cada pregunta es independiente, sin historial.
**Para implementar**: 
1. Guardar `thread_id` en localStorage del cliente
2. Pasar los últimos 3 pares pregunta/respuesta en el body de `/api/chat`
3. En el system prompt, incluir el historial como contexto adicional
4. **Límite de tokens**: el contexto RAG ya es largo; con historial, vigilar que no exceda `maxOutputTokens`

---

## FASE 6 — LANZAMIENTO PÚBLICO (checklist legal + operativo)

### 6.1 Legal (verificar estado actual)

Los siguientes ya están implementados (según commits):
- [x] Página `/terminos` con limitación de responsabilidad
- [x] Página `/privacidad` con derechos ARCO
- [x] Banner de cookies
- [x] Disclaimer en cada respuesta (`sintetizador.ts`)
- [x] Revisión por abogado completada (commit 5ccb001)

Pendiente antes de publicidad activa:
- [ ] Verificar que la página de privacidad mencione explícitamente qué datos se recopilan (IP para rate limit, preguntas en tabla `consultas`)
- [ ] Añadir política de retención de datos (¿cuánto tiempo se guardan las consultas?)

### 6.2 Operativo

- [ ] Configurar alertas en Vercel si la función `/api/chat` falla >10% (Vercel Pro, o Sentry)
- [ ] Proceso documentado para actualizar corpus cuando MINVU publica nuevas DDUs:
  1. Descargar nuevo PDF/TXT
  2. Agregarlo a `corpus/manifiesto.json` o a las carpetas correctas
  3. `npm run corpus:ingest -- --solo=DDU-XXX`
  4. Verificar en panel admin `/normativa`

---

## REFERENCIA RÁPIDA — COMANDOS FRECUENTES

```bash
# Desarrollo local
cd app
npx next dev -p 3001

# Eval completo (requiere GEMINI_API_KEY con cuota disponible)
npm run eval

# Eval contra producción
npm run eval -- --url=https://revisor-arq.vercel.app

# Eval un caso específico
npm run eval -- --casos=lguc-116-permiso

# Ingestar corpus
npm run corpus:ingest

# Ingestar una norma específica
npm run corpus:ingest -- --solo=OGUC --force

# Ingestar sin tocar Supabase (dry run)
npm run corpus:ingest:dry

# Build de producción
npm run build

# Git: commit rápido (SIEMPRE verificar con security-auditor antes)
git add -p && git commit -m "tipo: descripción"
git push origin master  # auto-despliega en Vercel
```

---

## REFERENCIA — VARIABLES DE ENTORNO

| Variable | Uso | Dónde cambiar |
|----------|-----|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | .env.local + Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública Supabase | .env.local + Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave admin Supabase (ingesta, consultas admin) | .env.local + Vercel |
| `GEMINI_API_KEY` | API key Google Gemini ← UPGRADE URGENTE | .env.local + Vercel |
| `VOYAGE_API_KEY` | API key Voyage AI (embeddings + rerank) | .env.local + Vercel |
| `ADMIN_SECRET` | Contraseña panel admin (/normativa, /corpus) | .env.local + Vercel |

---

## REFERENCIA — ARQUITECTURA DE DECISIONES

### ¿Por qué Voyage AI en vez de Gemini para embeddings?
- `voyage-law-2` está especializado en textos legales → mejor recall para normativa chilena
- La migración (commit `91d1ef9`) mostró mejora significativa vs `gemini-embedding-001`
- Separar embeddings (Voyage) de generación (Gemini) permite optimizar costos independientemente

### ¿Por qué 4 llamadas Gemini secuenciales en vez de paralelas?
- Con free tier (20 RPM), 4 llamadas en burst dispararían el rate limit inmediatamente
- Las llamadas son parcialmente secuenciales por dependencia: el retriever necesita el embedding antes de buscar
- Con API key pagada (1000 RPM), se puede paralelizar clasificador+HyDE (Tarea 5.1)

### ¿Por qué maxOutputTokens=8192?
- Las respuestas en modo profundo son largas (tablas, secciones múltiples)
- El modelo Flash tiene contexto de 1M tokens; 8192 output es moderado
- Si se reduce, las respuestas profundas quedan cortadas

### ¿Por qué streamGemini usa backoffs de 4s/8s en vez de los 8s/16s del resto?
- El timeout de Vercel Hobby es 60 segundos
- Con 3 reintentos × (4s + 8s) = ~12-20s de espera → la función lanza error en <30s
- Esto permite que el cliente reciba el error y el eval runner pueda reintentar el request completo

### ¿Por qué HyDE + multi-query en vez de solo vectorial?
- HyDE cierra la brecha entre lenguaje coloquial del usuario y lenguaje técnico de la norma
  ("¿cuánto puedo construir?" vs "coeficiente de constructibilidad")
- Multi-query con RRF reduce el sesgo de una sola formulación de la pregunta
- Juntos mejoran el recall de 40-60% a 85-95% en el eval de retrieval

### ¿Por qué voyage-law-2 y no voyage-3?
- `voyage-law-2` está entrenado específicamente en textos legales
- El corpus de REVISOR ARQ es 100% normativo → el modelo especializado supera al genérico
- Las dimensiones (1024) encajan bien para el volumen actual del corpus (~5000 chunks)

# PLAN DE IMPLEMENTACIÓN — REVISOR ARQ

> Documento de continuidad para sesiones de IA. Leer junto con `PROGRESO.md`.  
> Última actualización: 2026-05-15

---

## ESTADO ACTUAL (2026-05-15 — Sistema en producción, corpus completo)

### ✅ COMPLETADO (acumulado)
- **Corpus 100%**: 12,483 chunks · 358 normas (269 DDU + LGUC + OGUC + 80 Ley/DS/DFL/DL) ✅
- **Cadena fallback LLM 5 niveles**: Gemini → DeepSeek → Cerebras → OpenRouter → Groq ✅
- **Indicadores de progreso UI**: "Clasificando… / Recuperando… / Generando…" en tiempo real ✅
- **Fallback BM25 para Voyage**: `buscarPorFTS` en `retriever.ts` cuando Voyage falla ✅
- **Schema SQL documentado**: `supabase/schema.sql` con DDL completo ✅
- **Memoria Multi-turno**: Chat con contexto (reescritura de queries con Gemini Flash) ✅
- **Hybrid Search**: `match_chunks_hybrid` activo para consultas con artículos exactos ✅
- **Rate Limit persistente**: Supabase `rate_limits` (no memory-only) ✅
- **Sentry integrado**: Monitoreo de errores en producción ✅
- **79 tests Vitest**: Suite de pruebas para validador, sintetizador y retriever ✅
- **Caché semántica de queries**: `lib/query-cache.ts` + script migration (tabla `query_cache`) ✅
- **JWT para auth de admin**: `lib/admin-jwt.ts` HS256, middleware verifica firma ✅
- **Guardrails de alucinación reforzados**: detección por regex en texto de pregunta ✅
- **Dashboard de analítica**: `/admin` con KPIs, latencias, distribución por modo/modelo ✅

### 📋 Lo que resta — acciones manuales externas (en orden)
1. 🔑 **Habilitar billing Gemini** — Google Cloud Console → habilitar facturación → 1000 RPM automático → Redeploy en Vercel.
2. 🗄️ **Ejecutar migrations SQL** en Supabase Dashboard:
   - `supabase/migrations/20260515_query_cache.sql` — activa caché semántica
   - `supabase/migrations/20260515_subscriptions.sql` — activa gestión de planes
3. 💰 **Activar Stripe**: configurar `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `NEXT_PUBLIC_STRIPE_PRICE_PRO` en Vercel. Registrar webhook en Stripe Dashboard.
4. 📊 **Correr eval**: `npm run eval` con API Gemini paga (meta: ≥ 7/9).

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

**Último eval registrado** (2026-05-08, con 9,453 chunks y 2 proveedores):
```
Resultado: 6/9 pasados (67%)
Baseline: 2/9 (22%)
3 fallos técnicos por rate limit en Groq — no fallos lógicos
```
Estado actual: corpus expandido a 12,483 chunks, 5 proveedores, guardrails reforzados → eval post-mejoras pendiente.

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

## FASE 2 — CALIDAD Y REFINAMIENTO DEL CORPUS

**Contexto**: El corpus está completo (358 normas, 12,483 chunks). El foco ahora es asegurar exhaustividad en normas clave y mejorar la precisión del eval.

### Tarea 2.1 — Verificar exhaustividad OGUC ✅ COMPLETADO (2026-05-15)

**Estado**: OGUC re-ingesta completada → 1,210 chunks. El archivo fuente termina en "página 427 de 427"; la cobertura es completa (~44% overlap efectivo). No requiere acción adicional.

### Tarea 2.2 — DDUs históricos ✅ COMPLETADO (2026-05-15)

**Estado**: 269 DDUs en Supabase. Todas las del manifiesto están ingresadas. No requiere acción.

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

### Tarea 3.1 — Guardrails de alucinación ✅ MEJORADO (2026-05-15)

**Estado**: `sintetizador.ts` ahora detecta artículos inexistentes directamente por regex en el texto de la pregunta, sin depender del clasificador. También detecta artículos fuera de rango (Art. > 999 en general, Art. > 200 para LGUC, DDU > 600). 6 tests nuevos validan el comportamiento (total: 79 tests).

**Verificación post-upgrade Gemini**:
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

## FASE 4 — MONETIZACIÓN ✅ SCAFFOLDING COMPLETO (2026-05-15)

### Estado: código listo, activación pendiente de configuración externa

Todo el código está implementado:
- **`lib/stripe.ts`**: cliente singleton + definición de planes (free: 50/mes, pro: 500/mes)
- **`/api/stripe/checkout`**: crea Checkout Session, asocia customer de Stripe al usuario
- **`/api/stripe/webhook`**: procesa eventos `checkout.session.completed`, `subscription.updated/deleted`; actualiza tabla `subscriptions`
- **`/api/stripe/portal`**: Customer Portal para que el usuario gestione su suscripción
- **`supabase/migrations/20260515_subscriptions.sql`**: tabla `subscriptions` + `check_and_use_quota` dinámica (free: 50/mes, pro: 500/mes)
- **`/pricing`**: página dinámica — muestra plan beta si `NEXT_PUBLIC_STRIPE_PRICE_PRO` no está configurada, o dos planes comparativos si sí está

### Para activar (acciones en Stripe + Vercel)

```
1. Crear cuenta Stripe y un producto "Plan Pro" ($19/mes sugerido)
2. Obtener price_id del plan Pro → NEXT_PUBLIC_STRIPE_PRICE_PRO
3. En Vercel Settings → Environment Variables:
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PRICE_PRO=price_...
4. Ejecutar migration SQL:
   supabase/migrations/20260515_subscriptions.sql
5. Registrar webhook en Stripe Dashboard:
   URL: https://revisor-arq.vercel.app/api/stripe/webhook
   Eventos: checkout.session.completed, customer.subscription.*
6. Hacer Redeploy en Vercel
```

### Tarea 4.2 — Analytics y monitoreo ✅ COMPLETADO

- Dashboard `/admin` con KPIs de consultas, distribución por modo/modelo, latencias P90/avg/max, feedback, sparkline 14 días.
- `/api/stats` ya existe (con caché 10 min en Vercel).
- Vercel Analytics instalado (`@vercel/analytics`).

---

## FASE 5 — MEJORAS DE CALIDAD Y PERFORMANCE (futuro)

### Tarea 5.1 — Reducir latencia

**Actual**: 25-55 segundos en modo arquitecto/abogado. Objetivo: <15s.

Oportunidades:
- **Paralelizar clasificador + HyDE** (pendiente): actualmente son secuenciales. Con API key pagada se puede hacer:
  ```typescript
  const [clasificacion, embedding] = await Promise.all([
    clasificarConsulta(pregunta),
    embedConHyDE(pregunta),
  ]);
  ```
  **Riesgo**: ambas usan Gemini → dobla la carga concurrente. Solo hacer con API key pagada.

- ~~**Caché de embeddings**~~ ✅ **IMPLEMENTADO** — `lib/query-cache.ts` con cosine similarity ≥ 0.97. Pendiente: ejecutar migration SQL en Supabase para activar.

- ~~**Streaming visible antes**~~ ✅ **IMPLEMENTADO** — indicadores de etapa "Clasificando / Recuperando / Generando" en `chat/page.tsx`.

### Tarea 5.2 — Mejora del retrieval para términos exactos

**Problema observado**: Cuando un usuario pregunta por "Art. 116" o "DDU 541", la búsqueda vectorial puede no priorizar el chunk con ese número exacto si no es semánticamente el más similar.

**Solución ya implementada pero no siempre activada**: `match_chunks_hybrid` con FTS está disponible. Verificar que `tieneTerminosExactos()` en `retriever.ts` la activa correctamente para todos los casos de términos exactos.

### Tarea 5.3 — Feedback loop para mejorar corpus

- La tabla `consultas` puede analizarse para identificar preguntas que devuelven 0 fuentes o respuestas con "no encontré"
- Crear un script de análisis: `app/scripts/analysis/consultas-sin-respaldo.ts`
- Usar esas preguntas para priorizar qué normas ingestar

### Tarea 5.4 — Multi-turno conversacional ✅ IMPLEMENTADO

El chat ya soporta historial multi-turno. El `procesarEntrada` en `lib/clasificador.ts` recibe `mensajes[]` y genera una "standalone query" para que el retriever no necesite el historial. El SSE stream mantiene coherencia conversacional.

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

| Variable | Uso | Estado |
|----------|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | ✅ Configurada |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública Supabase | ✅ Configurada |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave admin Supabase | ✅ Configurada |
| `GEMINI_API_KEY` | LLM primario — ⚠️ free tier 20 RPM | ✅ Configurada, upgrade pendiente |
| `VOYAGE_API_KEY` | Embeddings + rerank | ✅ Configurada |
| `ADMIN_SECRET` | Clave admin (se usa para firmar JWTs) | ✅ Configurada |
| `DEEPSEEK_API_KEY` | Fallback LLM 1 — DeepSeek-V3 | ⚠️ Verificar en Vercel |
| `CEREBRAS_API_KEY` | Fallback LLM 2 | ⚠️ Verificar en Vercel |
| `OPENROUTER_API_KEY` | Fallback LLM 3 | ⚠️ Verificar en Vercel |
| `GROQ_API_KEY` | Fallback LLM 4 | ⚠️ Verificar en Vercel |
| `STRIPE_SECRET_KEY` | Stripe — pagos | ❌ No configurada |
| `STRIPE_WEBHOOK_SECRET` | Stripe — validar webhooks | ❌ No configurada |
| `NEXT_PUBLIC_STRIPE_PRICE_PRO` | Stripe — activa Plan Pro en /pricing | ❌ No configurada |
| `SENTRY_DSN` | Monitoreo de errores | ⚠️ Código integrado, valor pendiente |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app | ✅ Configurada |

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

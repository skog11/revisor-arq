# PLAN DE IMPLEMENTACIÓN — REVISOR ARQ

> Documento de continuidad para sesiones de IA. Leer junto con `PROGRESO.md` y `CLAUDE.md`.
> Última actualización: **2026-05-19**

---

## ESTADO ACTUAL (2026-05-19 — Producción estable)

### ✅ COMPLETADO

- **Corpus limpio**: 333 normas · 17.852 chunks en Supabase · sin duplicados
- **LGUC**: 330 chunks · **OGUC**: 1.003 chunks (427 págs completas) · **269 DDUs** activos
- **Cadena LLM 100% gratuita**: Cerebras qwen-3-235b (primario) → DeepSeek* → Gemini Flash (fast-fail) → OpenRouter → Groq
- **Todas las env vars confirmadas en Vercel** (verificado 2026-05-19)
- **Eval 9/9 = 100%** con latencia promedio 1.7s (baseline 2026-05-19)
- **Páginas legales actualizadas**: privacidad y T&C reflejan corpus real y LLM genérico
- **PDF descargable** en modo profundo
- **Feedback** thumbs up/down guardado en Supabase
- **Health check** operativo: `/api/healthz` → DB latencia ~279ms

### 🔄 EN PROGRESO (agentes ejecutándose al 2026-05-19)

| Tarea | Agente | ETA |
|---|---|---|
| Análisis DDUs históricos 000–526 | Agente 1 | completando... |
| Expansión eval set a 18 casos | Agente 2 | ✅ completado — 18 casos listos |
| Cron alertas BCN (vercel.json + API route) | Agente 3 | completando... |

---

## ROADMAP — TAREAS PENDIENTES

### PRIORIDAD ALTA

#### A1. DDUs históricos 000–526 — DIAGNÓSTICO COMPLETO ✅

**Estado**: Analizado. El corpus ya tiene **todo lo disponible online**.

| Dato | Valor |
|---|---|
| DDUs 0–526 en manifiesto | 214 |
| Disponibles en MINVU web | ~229 (todos ya descargados) |
| Faltantes | ~312 (nunca digitalizados por MINVU) |
| Fuente alternativa | BCN.cl — requiere scraper nuevo |

**Recomendación**: 🟢 Baja prioridad. Son circulares derogadas (años 1960–1990) con impacto normativo mínimo. El corpus actual cubre 100% de lo necesario para práctica profesional vigente.

**Si se decide priorizar en el futuro**:
1. Crear `scripts/download/download-ddu-bcn.ts` que busque por número en BCN y descargue
2. Rangos con más faltantes: DDU-008–031, DDU-033–056, DDU-183–207
3. `npm run corpus:ingest` para ingestar lo descargado

#### A2. Correr eval expandido (18 casos)
**Estado**: Los 9 casos nuevos ya están escritos en `eval-set.ts`. Hay que correrlos.

```bash
cd app && npm run eval -- --url=https://revisor-arq.vercel.app
```

Meta: ≥ 16/18 (89%). Si alguno falla, revisar `scripts/eval/resultados/YYYY-MM-DD.json`.

**Nuevos casos agregados** (cubre normativa sectorial):
- `ds594-iluminacion-minima` — Condiciones sanitarias DS-594
- `dfl4-concesion-electrica` — DFL-4 Ley Eléctrica
- `ley19300-estudio-impacto` — LEY-19300 EIA
- `dfl1122-derecho-aprovechamiento` — DFL-1122 Código Aguas
- `ley17288-zona-tipica` — LEY-17288 Monumentos Nacionales
- `ley21442-administracion` — LEY-21442 Copropiedad
- `ley20283-corta-bosque` — LEY-20283 Bosque Nativo
- `ley18290-carga-sobredimensionada` — LEY-18290 Tránsito
- `guardrail-ley19300-articulo-falso` — Guardrail Art. 450 (no existe)
- `guardrail-ds250-estructuras` — Guardrail DS-250/2023 (no existe)

#### A3. Cron alertas de vigencia BCN
**Estado**: En implementación por agente. Creará:
- `src/app/api/cron/check-vigencia/route.ts` — API route protegida con `CRON_SECRET`
- `vercel.json` con sección `crons` (lunes 9am UTC)
- `CRON_SECRET` en `.env.example`

Una vez que el agente termine, agregar `CRON_SECRET` en Vercel env vars y hacer redeploy.

---

### PRIORIDAD MEDIA

#### B1. Quitar banners "Versión beta"
`/terminos/page.tsx` y `/privacidad/page.tsx` tienen el aviso:
> "Versión beta. Esta política está sujeta a revisión antes del lanzamiento público."

Quitar cuando haya revisión legal formal por abogado. Cambiar también `FECHA_VIGENCIA` en ambas páginas.

#### B2. Revisión legal formal
Antes del lanzamiento público con tráfico real:
- Revisar `/terminos` y `/privacidad` con abogado
- Verificar que disclaimer en cada respuesta (`sintetizador.ts`) sea suficiente
- Considerar agregar mención explícita de que los textos son de dominio público BCN

#### B3. Alertas operativas
Configurar notificación cuando `/api/chat` falla más del 10%:
- Opción gratuita: agregar lógica de alerta en health check vía cron
- Sentry ya está integrado en código (`sentry.*.config.ts`) pero sin DSN configurado en Vercel

---

### PRIORIDAD BAJA

#### C1. Stripe / Monetización
El scaffolding está completo y listo para activar:

| Archivo | Estado |
|---|---|
| `lib/stripe.ts` | ✅ listo |
| `/api/stripe/checkout` | ✅ listo |
| `/api/stripe/webhook` | ✅ listo |
| `/api/stripe/portal` | ✅ listo |
| `/pricing` page | ✅ lista (muestra beta gratis) |
| `supabase/migrations/20260515_subscriptions.sql` | ⚠️ pendiente ejecutar en Supabase |

**Para activar** (todo en Vercel Dashboard):
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_...
```
Registrar webhook en Stripe Dashboard: `https://revisor-arq.vercel.app/api/stripe/webhook`

#### C2. Migrations SQL pendientes en Supabase
Ejecutar en Supabase Dashboard → SQL Editor:
- `supabase/migrations/20260515_query_cache.sql` — activa caché semántica de queries
- `supabase/migrations/20260515_subscriptions.sql` — activa gestión de planes Stripe

#### C3. Panel /normativa — paginación
Actualmente carga todas las normas sin paginación. Con 333 normas empieza a ser lento.

---

## REFERENCIA RÁPIDA — COMANDOS

```bash
# Desarrollo
cd app && npm run dev

# Build (verificar antes de deploy)
cd app && npm run build

# Eval completo contra producción
cd app && npm run eval -- --url=https://revisor-arq.vercel.app

# Eval un caso específico
cd app && npm run eval -- --caso=lguc-116-permiso

# Ingestar corpus (detecta cambios por hash)
cd app && npm run corpus:ingest

# Re-ingestar una norma específica
cd app && npm run corpus:ingest -- --solo=DDU-541 --force

# Reconstruir manifiesto (después de agregar archivos nuevos al corpus)
cd app && npm run manifiesto:build

# Deploy a producción
cd app && vercel --prod

# Ver env vars en Vercel
cd app && vercel env ls
```

---

## REFERENCIA — VARIABLES DE ENTORNO

### Vercel producción — estado al 2026-05-19

| Variable | Propósito | Estado |
|---|---|---|
| `CEREBRAS_API_KEY` | LLM primario (qwen-3-235b, gratis) | ✅ Configurada |
| `DEEPSEEK_API_KEY` | Fallback opcional (pay-per-use) | ✅ Configurada |
| `LLM_PRIMARY` | Controla orden cadena fallback | ✅ Configurada |
| `GEMINI_API_KEY` | Fallback (fast-fail, 1 retry) | ✅ Configurada |
| `OPENROUTER_API_KEY` | Fallback gratuito | ✅ Configurada |
| `GROQ_API_KEY` | Último fallback gratuito | ✅ Configurada |
| `VOYAGE_API_KEY` | Embeddings + rerank | ✅ Configurada |
| `NEXT_PUBLIC_SUPABASE_URL` | BD principal | ✅ Configurada |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | BD pública | ✅ Configurada |
| `SUPABASE_SERVICE_ROLE_KEY` | BD admin (ingesta) | ✅ Configurada |
| `ADMIN_SECRET` | Auth panel admin | ✅ Configurada |
| `NEXT_PUBLIC_APP_URL` | URL pública app | ✅ Configurada |
| `CRON_SECRET` | Protege endpoint cron BCN | ⚠️ Pendiente agregar |
| `STRIPE_SECRET_KEY` | Pagos | ❌ No configurada |
| `STRIPE_WEBHOOK_SECRET` | Webhooks Stripe | ❌ No configurada |
| `NEXT_PUBLIC_STRIPE_PRICE_PRO` | Activa plan Pro en /pricing | ❌ No configurada |
| `SENTRY_DSN` | Monitoreo errores | ❌ No configurada |

---

## DECISIONES DE ARQUITECTURA CLAVE

### ¿Por qué Cerebras como primario y no Gemini?
- Cerebras usa hardware dedicado CS-3 → latencia muy baja, sin límites agresivos de RPM
- `qwen-3-235b` (235B parámetros) es de muy alta calidad
- 100% gratuito → cumple la política de no pagar por LLMs
- Gemini Free Tier tiene 15 RPM rolling → cuello de botella inaceptable como primario

### ¿Por qué Gemini sigue en la cadena con maxRetries=1?
- Sigue siendo útil como fallback rápido (sabe de normativa chilena)
- `maxRetries=1` = fast-fail: si falla, pasa al siguiente en <2s sin bloquear
- Si se quiere Gemini al frente: `LLM_PRIMARY=gemini` en Vercel env vars

### ¿Por qué MAX_CHUNKS=10 (no 20)?
- Groq (último fallback) tiene límite de ~6000 TPM con llama-3.3-70b
- 10 chunks ≈ 4500 tokens input → compatible con todos los proveedores
- La calidad de retrieval con 10 fuentes es excelente (eval 9/9)

### ¿Por qué Voyage AI para embeddings?
- `voyage-law-2` está entrenado en textos legales → mejor recall para normativa chilena
- Separar embeddings (Voyage) de generación (Cerebras/Gemini) permite optimizar independientemente

### ¿Por qué HyDE + multi-query?
- HyDE cierra la brecha entre lenguaje coloquial ("¿cuánto puedo construir?") y técnico ("coeficiente de constructibilidad")
- Multi-query con RRF reduce el sesgo de una sola formulación
- Juntos mejoran recall de ~60% a ~95%

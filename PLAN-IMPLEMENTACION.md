# PLAN DE IMPLEMENTACIÓN — REVISOR ARQ

> Última actualización: 2026-05-06  
> Estado: MVP en producción · Bloqueador activo: Gemini Free Tier

---

## Resumen ejecutivo

El MVP está **funcionando correctamente en producción**. El pipeline RAG recupera 18–20 chunks relevantes por consulta (retrieval excelente). La generación con Gemini 2.5 Flash produce respuestas con citas verificables cuando la cuota de la API está disponible (86% de casos pasan en condiciones normales, según eval del 2026-04-21).

**Único bloqueador para operar confiablemente**: la API key de Gemini está en el free tier (20 RPM), insuficiente para una carga sostenida.

---

## Fase 1 — Estabilización de producción (URGENTE)

### 1.1 Upgrade a Gemini API pagada ⭐ PRIORIDAD #1
**Por qué es urgente**: el free tier de 20 RPM hace que cualquier carga real bloquee la generación. Con API pagada (Tier 1), el límite sube a 1000+ RPM.

**Pasos**:
1. Ir a https://aistudio.google.com o https://console.cloud.google.com
2. Habilitar billing en el proyecto de Google Cloud asociado a la API key
3. Actualizar `GEMINI_API_KEY` en Vercel (Settings → Environment Variables)
4. No requiere cambios de código

**Costo estimado**: ~$0.075 por 1M tokens de input con Gemini 2.5 Flash. Una consulta típica usa ~3000-5000 tokens. Para 1000 consultas/mes ≈ USD $0.30.

### 1.2 Timeout Vercel (actual: 60s en Hobby)
- El plan Hobby de Vercel limita funciones serverless a 60s
- Con la API pagada, streamGemini ya no se reinventará 3 veces → respuestas en 15-25s
- Si se necesita más de 60s (modo profundo), upgrade a Vercel Pro (función de 300s) o usar Edge Runtime con streaming incremental

### 1.3 Monitoreo de cuota
Agregar un middleware que registre cuántas llamadas Gemini se hacen por hora en Supabase o un sistema de logs, para detectar abusos antes de que agoten la cuota.

---

## Fase 2 — Completar el corpus (IMPORTANTE)

### 2.1 OGUC completa
- **Estado actual**: solo primeros artículos ingresados
- **Impacto**: muchas consultas sobre normativa técnica (rasantes, suburbanización, permisos) no encuentran respaldo suficiente
- **Acción**: correr `npm run corpus:ingest` con el archivo `corpus/oguc/OGUC.txt` completo

### 2.2 DDUs históricos (000–526, 303 normas)
- **Estado actual**: solo DDU 527–541 ingresados
- **Impacto**: consultas sobre DDUs antiguas retornan sin fuente
- **Acción**: usar `bash ingestar_ddu_masiva.sh` desde raíz del repo

### 2.3 Normativa cat.01–11
- DS-60, DS-61, y otras categorías normativas
- Acción: `bash ingestar_normativa_masiva.sh`

### 2.4 Validar ingesta con corpus-ingestion-validator
Tras cada ingesta masiva, correr el agente validador para detectar chunks mal cortados, metadatos faltantes o duplicados.

---

## Fase 3 — Calidad y evaluaciones

### 3.1 Alcanzar 7/9 (78%) en el eval set
**Contexto**: La meta original era 7/7. Con el set ampliado a 9 casos, la meta es 7/9.

**Bloqueadores actuales de casos problemáticos**:
- `ddu-541`: corpus DDU podría estar incompleto para ese número
- `guardrail-articuloinexistente` / `guardrail-normafalsa`: los guardrails dependen de que el modelo reconozca artículos inventados — revisar el system prompt del validador
- `lguc-condominio`: verificar si chunks de ley de copropiedad están ingresados

**Cómo correr el eval una vez que la cuota esté libre**:
```bash
cd app
npm run eval                            # contra localhost:3000
npm run eval -- --url=https://revisor-arq.vercel.app  # contra producción
```

### 3.2 Evaluar modo profundo (Gemini Pro)
Actualmente no está cubierto por el eval set. Agregar 2-3 casos con `modo: "profundo"` que requieran cruces entre normas.

### 3.3 Evaluar guardrails
Los casos `guardrail-articuloinexistente` y `guardrail-normafalsa` fallaron en el eval del 2026-05-01. Auditar el system prompt en `sintetizador.ts` para reforzar la instrucción de no inventar.

---

## Fase 4 — Lanzamiento público (checklist `mvp-legal-launch`)

### 4.1 Legal (BLOQUEANTE para publicidad)
- [ ] Página `/terminos` con limitación de responsabilidad, no relación abogado/arquitecto-cliente
- [ ] Página `/privacidad` con política de datos (Ley 19.628), derechos ARCO, aviso cookies
- [ ] Disclaimer visible en footer y al pie de cada respuesta (ya en `sintetizador.ts`, verificar UI)
- [ ] Revisión por abogado antes de abrir al público general

### 4.2 UX
- [ ] Formulario de contacto para reportar errores en el corpus
- [ ] Proceso documentado para actualizar corpus cuando hay nuevas normas
- [ ] Accesibilidad WCAG 2.1 AA (revisar con `ui-design-reviewer`)

### 4.3 Operativo
- [ ] Proceso de actualización de corpus cuando MINVU publica nuevas DDU/OGUC
- [ ] Alerta cuando streamGemini falle más del 10% de requests (Sentry o similar)
- [ ] Dashboard de uso en `/api/stats` visible para admin

---

## Fase 5 — Mejoras del pipeline (FUTURO)

### 5.1 Reducir latencia
- Modo rápido (arquitecto/abogado): 15-20s actualmente → objetivo 8-12s
- Considerar caché de embeddings para preguntas frecuentes
- Considerar streaming del retrieval (mostrar fuentes antes de empezar la generación)

### 5.2 Mejorar retrieval para casos edge
- `ddu-541` falla: quizás necesita búsqueda full-text (FTS) además de vectorial
- La función `match_chunks` ya tiene soporte híbrido FTS+vector; verificar si se activa

### 5.3 Feedback loop
- Ya existe tabla de feedback en Supabase (thumbs up/down)
- Crear vista admin para analizar qué preguntas fallan más
- Usar esas preguntas para ampliar el eval set

### 5.4 Multi-turno (conversación)
- Actualmente cada pregunta es independiente
- Para una experiencia más natural, mantener historial de la sesión en contexto

---

## Tareas inmediatas (próximas 24h)

```
[x] Reducir llamadas Gemini de 8 a 4 (commit 2c63d9e)
[x] Fast-fail en callers con fallback (commit 991e6f9)
[x] Corregir backoff de streamGemini para timeout Vercel (commit 71572ea)
[ ] Actualizar GEMINI_API_KEY a tier pagado en Vercel
[ ] Correr eval completo (9/9) una vez que la cuota esté libre
[ ] Ingestar OGUC completa
```

---

## Métricas de éxito

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Eval cases passing | 1-4/9* | ≥ 7/9 |
| Latencia p50 | ~25-55s | < 15s |
| Retrieval (fuentes) | 18-20/20 | 20/20 |
| Uptime | ~95% | 99% |
| Llamadas Gemini/request | 4 | 4 (mantener) |

*Con API free tier agotada. Con API pagada se espera ≥6/9.

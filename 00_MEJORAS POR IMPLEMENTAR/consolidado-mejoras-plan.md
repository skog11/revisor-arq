# Consolidado de mejoras — evaluación y plan de implementación

**Fecha:** 2026-07-10 · **Consolida:** `Estudio_Mejoras_Revisor_ARQ.docx` (~70 mejoras), `mejoras_revisor_arq.xlsx` (20 propuestas, supersede a `MEJORA REVISOR ARQ.xlsx`), `REVISOR-ARQ-INFORME-GENERADO.pdf` (mockup de feature) y `revision-critica-plan-evolucion.md` (ya integrado al plan el 2026-07-09).

**Cómo leer este documento:** cada mejora propuesta cae en una de 4 categorías — (A) ya implementada, (B) ya cubierta por el plan vigente, (C) descartada/postergada con razón, (D) **nueva aceptada** e integrada al plan. La sección final es el plan de implementación consolidado que amplía `PLAN-IMPLEMENTACION.md`.

---

## Veredicto global

El estudio es valioso sobre todo en **UX, transparencia y comercialización** — dimensiones que la revisión crítica del 2026-07-09 (centrada en el algoritmo) no cubrió. Sus 5 prioridades top son razonables, pero **2 de las 5 ya están implementadas** (streaming SSE y calculadoras existen en el código y están conectadas en `/api/chat`), lo que indica que el estudio se basó en inspección del sitio sin acceso al código, o que esas features no se están manifestando bien en producción — **eso en sí mismo es un hallazgo**: si un auditor externo no vio el streaming ni las calculadoras, los usuarios tampoco las ven. La acción correcta no es re-implementarlas sino verificar por qué no se perciben (ver A.1).

El hallazgo más útil del estudio: la **latencia percibida de 12–25 s**. Con streaming ya activo, el problema real es el **time-to-first-token**: el pipeline pre-generación (clasificador LLM + HyDE + retrieval + rerank) corre completo antes de emitir el primer carácter. Las soluciones correctas son el indicador multi-etapa (D.3) y el prefetch de fuentes (D.13), no "implementar SSE".

El PDF `REVISOR-ARQ-INFORME-GENERADO.pdf` es un excelente mockup de una feature nueva de alto valor: **informe técnico normativo profesional** con folio, síntesis ejecutiva, marco normativo activado, análisis artículo por artículo, cruces/conflictos, vacíos, condiciones territoriales, ruta de cumplimiento, fuentes verificadas y bloque de firmas (D.9). Es probablemente el argumento de venta más fuerte para el tier Profesional.

---

## A. Ya implementado — acción: verificar en producción, no re-construir

| Propuesta (fuente) | Estado real en el código | Acción de verificación |
|---|---|---|
| Streaming SSE (estudio 3.1/6.1) | ✅ `/api/chat` es SSE streaming | **A.1** Auditar en prod por qué no se percibe: ¿modo profundo no streamea? ¿TTFT tan largo que parece colgado? Medir TTFT por modo |
| Caché semántico (Excel 1.a, estudio 3.4/6.2) | ⚠️ `query-cache.ts` existe y está conectado en la ruta, **pero la migración `query_cache` no está en `supabase/migrations/`** | **A.2** Verificar que la tabla exista en Supabase; si no, el caché falla silencioso. Crear migración + sello UI "respuesta de caché — [fecha]" |
| Calculadoras interactivas (estudio 3.5) | ✅ `detector-calculadoras.ts` conectado en ruta | **A.3** Testear disparo real con 10 frases típicas; ampliar patrones si no dispara; GIF en home |
| Failover LLM automático (Excel 1.c, estudio 6.8) | ✅ Cadena de 5 proveedores en `gemini.ts` | Nada. (La "cola de prioridad por tier" queda para cuando haya tiers activos) |
| Feedback explícito de usuarios (Excel 2.b) | ✅ Thumbs up/down en prod | Ya ampliado en plan: 0.4 (feedback→eval) |
| Batching de embeddings (estudio 6.9) | ✅ `embedder.ts` en lotes de 32 | Nada |
| PWA / modo offline parcial (Excel 6.b) | ✅ manifest + sw.js en prod | Precachear guías si se quiere profundizar (baja prioridad) |
| Alertas de vigencia BCN (estudio 9.7 parcial) | ✅ Cron 4 normas | Ya ampliado en plan: 2C.2 |
| Regresión automática de contenido (Excel 2.a) | ✅ Eval 34/34 en CI | Ya ampliado en plan: 0.2 (golden set 100+) |

## B. Ya cubierto por el plan vigente (`PLAN-IMPLEMENTACION.md` 2026-07-09)

| Propuesta | Ítem del plan que la cubre |
|---|---|
| Grafo de conocimiento / razonamiento simbólico (Excel 3.a) | 1.5 (poblar grafo) + 2A.1 (grafo en retrieval) + 2A.2 (conflictos v2) |
| Simulador de impacto urbanístico (Excel 3.b) | Fase 1 completa: `prc_zonas` + lookup determinístico es exactamente eso, con datos reales |
| Ingesta prioritaria PRCs Biobío (estudio 5.4) | Fase 1 (1.1–1.3) — hito CORFO mes 5 |
| Modo ciudadano / Tier Público (estudio 4.9/8.6, Excel) | 2B.1–2B.2. **Mantener la regla del plan**: two-pass verificado, citas colapsadas — el estudio propone "sin cita literal", el plan lo corrige |
| Pricing por segmento + Stripe/trial (Excel 4.a, estudio 7.1/7.2) | 3.1–3.2. Nota: el plan evalúa Flow/Khipu para CLP antes que Stripe |
| Telemetría e indicadores de impacto (Excel 6.a) | 0.1 + KPIs del plan |
| Score de confianza explicado (estudio 9.1) | 2A.5 (confianza v2) — sumar el tooltip explicativo del estudio |
| Versionado de normas / diff (estudio 4.5/5.5) | Parcial en 2C.2; el diff visual queda post-CORFO (C.11) |
| Hitos trimestrales medibles (Excel 5.a) | Tabla KPIs del plan |
| Repositorio de conocimiento interno (Excel 5.c) | 2C.3 (runbook de curatoría) + PROGRESO.md |
| Plan de mitigación de riesgos financieros (Excel 4.c) | 2C.1 (fallback pago con tope) + doc CORFO §9 |
| Alianzas estratégicas (Excel 4.b) | Absorbido en D.20 (workstream comercial) |

## C. Descartado o postergado — con razón

| Propuesta | Razón |
|---|---|
| Microservicios ligeros (Excel 1.b) | El monolito Next.js + Supabase es correcto a esta escala. Microservicios = más superficie operacional para un equipo de 1 dev a 20 h/sem. Reevaluar sobre 10.000 usuarios |
| SLMs fine-tuned en corpus jurídico (Excel 3.c) | Prematuro: costo de entrenamiento/eval alto, beneficio marginal frente a la cadena gratuita actual. Las tareas simples ya se resuelven con regex (extractor-hechos). Post-CORFO |
| Indexación vectorial cuantizada FAISS/Qdrant (estudio 6.10) | Innecesario: ~22.500 vectores es trivial para pgvector HNSW (además el estudio asume 1536 dims float32; son 1024). Migrar de infraestructura por esto sería un error |
| CDN S3+CloudFront para PDFs (estudio 6.4) | Vercel ya sirve assets por CDN; el PDF se genera en cliente. Complejidad sin beneficio |
| Web Workers para markdown (estudio 6.6) | Micro-optimización; no hay evidencia de jank. Solo si telemetría lo muestra |
| Modo comparación de 3 modos en paralelo (estudio 3.6) | Triplica costo LLM por consulta y compite con el cupo mensual del usuario. Valor dudoso |
| Integración CIP digital municipal (estudio 4.8) | Scraping por municipio = frágil y de mantenimiento caro. Reevaluar en Fase 1 solo si Concepción/Hualpén/Los Ángeles tienen API real. La alternativa ya está en el plan: subir el CIP como PDF (`parse-doc` existe) |
| ISO 27001 completa (Excel 7.a) | Certificar cuesta >$10M CLP y meses; fuera de presupuesto CORFO. **Sí** adoptar controles básicos (ya mayormente presentes: cookies HTTP-only, service role separado, rate-limit) + checklist documentado en 3.6 |
| Detección y mitigación de sesgos (Excel 2.c) | Vago como propuesta; el riesgo real (respuestas distintas por comuna) se ataca mejor con la regla dura de PRC por comuna (Fase 1) y el golden set |
| Traducción al inglés (estudio 8.7) | Fuera de foco del período CORFO (mercado Chile). Post-lanzamiento |
| Modo colaboración realtime para equipos (estudio 4.4) | Websockets/Realtime = esfuerzo L para un tier que aún no tiene clientes. El historial compartido simple (3.3 del plan) basta para lanzar. Post-CORFO |
| Comparador diff entre versiones de normas (estudio 4.5) | Requiere historial versionado completo del corpus; esfuerzo L. Post-CORFO (C.11); el badge "modificada por Ley X" sale gratis del grafo |
| Autocomplete de artículos al escribir (estudio 3.8) | Útil pero requiere índice cliente + UX cuidada; el active prompting ya mitiga consultas mal formuladas. Backlog |
| Atajos de teclado (estudio 3.10) | Nice-to-have; backlog de 1 tarde cuando haya usuarios intensivos |
| Vista móvil optimizada (estudio 3.9) | No descartada — convertida en tarea de verificación dentro de D.6 (pass de accesibilidad incluye prueba móvil documentada) |

## D. Nuevas aceptadas — integradas al plan

Ordenadas por fase de ejecución. Esfuerzo: S = horas–2 días · M = 1–3 semanas · L = >3 semanas.

### Quick wins → Fase 0 (mes 1, se suman a 0.1–0.4)

| # | Mejora | Fuente | Esfuerzo | Detalle |
|---|---|---|---|---|
| **0.5** | Fix inconsistencia de límites comunicados | estudio 2.5 | S (1 h) | Home dice "20 consultas/hora", pricing "50/mes". Unificar copy hoy |
| **0.6** | `/corpus` público de solo lectura + badge "corpus actualizado al [fecha]" | estudio 5.1 + 9.7 | S (8 h) | Lista de normas (nombre, tipo, fecha ingesta, última verificación BCN) sin clave; panel de edición sigue protegido. Cierra la promesa incumplida de la home (hoy 401) |
| **0.7** | Indicador de progreso multi-etapa en el chat | estudio 3.2 | S (8 h) | "Buscando en corpus → Recuperando fuentes → Redactando → Verificando" emitido por SSE cuando cada etapa ocurre de verdad. **Ataca la causa real de la percepción de lentitud (TTFT largo)** |
| **0.8** | Verificar caché semántica activa + sello de caché | estudio 6.2 | S (4 h) | La migración `query_cache` no está en el repo → probable caché muerto en prod. Crear migración, verificar hit-rate en telemetría (0.1), sello UI "respuesta de caché" con opción regenerar |
| **0.9** | Auditoría TTFT + disparo de calculadoras | estudio 3.1/3.5 | S (6 h) | Medir time-to-first-token por modo; testear disparo de calculadoras con 10 frases; corregir lo que el auditor externo no logró ver |
| **0.10** | Pass de accesibilidad nº1 | estudio 8.1/8.3/8.4/8.9/8.10 | M (12 h) | axe-core en todas las páginas + `prefers-reduced-motion` + focus visible + ARIA en controles del chat + fuente ≥16px + prueba móvil documentada en 3 dispositivos. Relevante para adopción institucional (municipios) |

### Fase 1 (meses 2–5, se suman a 1.1–1.6)

| # | Mejora | Fuente | Esfuerzo | Detalle |
|---|---|---|---|---|
| **1.7** | Historial persistente + carpetas por proyecto | estudio 3.7 + 4.1 | M | localStorage sin login (mes 2–3), sincronizado a cuenta cuando exista auth (2B.3). Etiquetado por proyecto ("Edificio X"). Base directa del Tier Estudio y gran driver de retención |
| **1.8** | Glosario de siglas y términos en hover | estudio 4.7 + 5.8 | S | Diccionario JSON (CIP, DOM, PRC, DDU, SEIA, CMN, rasante, constructibilidad...) + tooltip en el render de markdown. Sirve al Tier Público antes de que exista |
| **1.9** | Onboarding guiado de 3 pasos | estudio 3.3 | S | Tour primera visita (consulta → modos → fuentes verificables), saltable. Hacerlo antes de los pilotos del mes 8, no después |
| **1.10** | Log de versiones de cada respuesta | estudio 9.6 | S | Extensión de `consultas_log` (0.1): guardar versión de corpus, modelo y prompt por respuesta. Auditabilidad para pilotos y para el sello de verificación (3.8) |

### Fase 2 (meses 4–8, se suman a 2A/2B/2C)

| # | Mejora | Fuente | Esfuerzo | Detalle |
|---|---|---|---|---|
| **2A.7** | "¿Por qué estas fuentes?" — razonamiento de recuperación visible | estudio 9.2 | S | Bloque plegable con datos que el pipeline ya produce (dominios detectados, reglas disparadas, capas de recuperación). Transparencia diferenciadora casi gratis |
| **2A.8** | Verificación cita vs BCN lado a lado | estudio 9.3 | M | Panel comparativo fragmento citado ↔ texto del chunk (que proviene de BCN), con diferencias resaltadas. Se apoya en el fuzzy-match de 2A.3 — es su cara visible al usuario |
| **2B.6** | **Informe técnico normativo profesional** (Word + PDF) | mockup PDF + estudio 4.2 | M–L | Según `REVISOR-ARQ-INFORME-GENERADO.pdf`: folio único, síntesis ejecutiva, marco normativo activado (tabla), análisis artículo por artículo, cruces y conflictos, vacíos, condiciones territoriales, ruta de cumplimiento, fuentes con URL, bloque de firmas. Export .docx (docx.js) y PDF. **La feature de mayor disposición a pagar del tier Profesional** — convierte la consulta en un entregable que el arquitecto presenta a la DOM o al cliente |
| **2B.7** | Asistente de respuesta a observaciones DOM | estudio 4.10 | M | El usuario pega el acta de observaciones; el sistema genera borrador de respuesta fundada con citas (modo profundo + plantilla administrativa). Alto valor/hora ahorrada; usa el pipeline existente |
| **2B.8** | Compartir consulta vía URL pública | estudio 4.3 | S | `/s/{id}` con snapshot, sin login, expira a 90 días. Growth loop: cada consulta compartida es marketing |
| **2C.4** | Prefetch de fuentes mientras se escribe | estudio 6.3 | M | Debounce 800 ms → retrieval anticipado sin LLM; al enviar, solo falta generación. Reduce TTFT ~3–5 s. Cuidar costo Voyage (solo usuarios logueados) |
| **2C.5** | Status page pública | estudio 6.7 | S | UptimeRobot/Better Stack sobre `/api/healthz`. Requisito blando para clientes institucionales |
| **2C.6** | Reporte de errores con estado visible | estudio 9.4 | S–M | Estados (recibido/en revisión/corregido) + notificación al reportante. Se integra con la cola feedback→eval (0.4) |

### Fase 3 (meses 8–10, se suman a 3.1–3.6)

| # | Mejora | Fuente | Esfuerzo | Detalle |
|---|---|---|---|---|
| **3.7** | Alertas normativas suscribibles por tema | estudio 4.6 | M | Suscripción por tema (rasantes, estacionamientos...) + email cuando cambia una norma del corpus. Se apoya en el monitoreo 2C.2 + newsletter existente. Retención recurrente |
| **3.8** | Sello de verificación humana (top-100 consultas) | estudio 9.5 | S dev + horas expertas | Workflow de revisión por Petter/experto + sello "✓ Verificado por especialista". Biblioteca gold-standard que además alimenta el golden set |
| **3.9** | Workstream comercial (lidera Carolina) | estudio 7.3–7.10 | — | Embajadores regionales (10 arq + 5 abogados, acceso gratis 6 meses por testimonio con métrica) · página `/casos` con ≥5 testimonios reales antes del mes 8 · alianza Colegio de Arquitectos Biobío · webinars mensuales grabados (SEO + leads) · video demo 90 s · calculadora ROI en home · comparativa pública vs competidores · convenio municipios <50.000 hab con 50% dcto |
| **3.10** | Paquete legal pre-lanzamiento | estudio 10.x | S–M + abogado | Actualizar política de privacidad a la nueva Ley de Protección de Datos Personales (Ley 21.719/2024, vigencia dic-2026 — **verificar número y fecha con el abogado de 3.6**) · procedimiento derechos ARCO con formulario · retención diferenciada por tier · contrato marco institucional · SLA del Tier Estudio |

### Condiciones previas al mes 8 (del estudio, adoptadas como gates del plan)

Sin estas tres condiciones, el riesgo de no concretar la primera venta en mes 10 es alto:
1. Precios publicados + checkout con trial de 14 días operativo (3.1–3.2 + estudio 7.1/7.2).
2. ≥5 testimonios reales con métrica de ahorro publicados en `/casos` (3.9).
3. ≥1 alianza firmada (colegio profesional o municipio) (3.9).

---

## Nota de capacidad

Las mejoras D suman ~180–220 h adicionales sobre un plan que ya llenaba las 20 h/semana de desarrollo. Regla de resolución de conflictos de tiempo:

1. Los hitos CORFO (Fase 1 PRC, pilotos, Tier Público, pagos) **nunca** se sacrifican por mejoras D.
2. Quick wins de Fase 0 (0.5–0.9) se hacen sí o sí: son ~27 h y multiplican la percepción de calidad.
3. De Fase 2, las intransables son **2B.6 (informe profesional)** y **2A.8** (cara visible de la verificación); el resto se recorta en orden inverso de numeración.
4. Todo el workstream 3.9 es de Carolina (22 h/sem comerciales), no compite con horas de desarrollo.

## Nota sobre el rediseño frontend

El estudio menciona 3 propuestas HTML de rediseño (Higgsfield / dev21 / brutalist-tech) que no están en esta carpeta. Recomendación del estudio (razonable): testearlas con 5 arquitectos + 5 abogados antes de decidir, y ejecutar el rediseño en meses 2–5 en paralelo a las mejoras funcionales. Decisión pendiente del equipo; no se incluye en el plan hasta tener las propuestas y el test.

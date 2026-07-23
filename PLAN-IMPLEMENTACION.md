# PLAN DE IMPLEMENTACIÓN — REVISOR ARQ

> Documento de continuidad para sesiones de IA. Leer junto con `PROGRESO.md`, `CLAUDE.md`, `revision-critica-plan-evolucion.md` (análisis que fundamenta este plan) y `00_MEJORAS POR IMPLEMENTAR/consolidado-mejoras-plan.md` (evaluación de ~90 mejoras propuestas; las aceptadas están integradas abajo como ítems 0.5+, 1.7+, 2A.7+, 2B.6+, 2C.4+, 3.7+).
> Última actualización: **2026-07-10**

---

## CONTEXTO ESTRATÉGICO (2026-07-09)

El proyecto postula a **Semilla Inicia CORFO 2026** (documento: `1_Documento_de_Proyecto_Revisor_ARQ.docx`). El plan de 10 meses compromete:

| Hito CORFO | Mes | Implicancia técnica |
|---|---|---|
| Corpus Biobío activo | 5 | PRCs de Concepción, Hualpén y Los Ángeles indexados y verificados |
| Validación técnica formal | 8 | Pilotos con 10–15 profesionales, feedback documentado |
| Tier Público funcional | 8 | Interfaz simplificada para no técnicos + cuentas + límites |
| Sistema de pagos activo | 9 | Pasarela CLP integrada y probada |
| Lanzamiento + primera venta | 10 | Tiers Profesional y Estudio operativos |

Este plan reemplaza el roadmap anterior (archivado al final). Las fases y prioridades derivan de la revisión crítica del 2026-07-09.

---

## FASE 0 — FUNDAMENTOS TÉCNICOS (mes 1) · ~60–80 h

Preparar el terreno antes de construir encima. Todo lo de esta fase es prerequisito de fases posteriores.

### 0.1 Telemetría de consultas ⬜
- Tabla `consultas_log` en Supabase: consulta (anonimizada), clasificación, reglas disparadas, **casi-disparos** (similitud 0.6–0.8), chunks top-18, confianza, feedback.
- Dashboard simple en `/corpus`: consultas/día, % baja confianza, % thumbs-down.
- **Por qué primero**: sin esto no hay forma de auditar cobertura de reglas ni priorizar mejoras con datos.

### 0.2 Golden set 34 → 100+ casos con 3 métricas separadas ⬜
- Separar métricas hoy mezcladas: (1) **recall de retrieval** (¿la norma correcta llegó al top-18?), (2) **fidelidad de cita** (¿fragmentos literales?), (3) **corrección de conclusión** (¿procede/no procede correcto?).
- Fuentes de casos: consultas reales de producción + casos canónicos de las 24 reglas + traps.
- `npm run eval` reporta las 3 métricas; CI falla si regresa.

### 0.3 Migrar reglas-gatillo a Supabase ⬜
- Tabla `reglas_gatillo` (id, descripcion, co_ocurrencia, excepciones, forzar_normas, efecto, mensaje_experto, **embedding de condición**, activa, origen).
- `motor-reglas.ts` lee de BD con caché en memoria (TTL). Sin cambiar aún la lógica de disparo.
- Habilita: edición sin deploy, minería automática (1.4), gatillo semántico (2A.6).

### 0.4 Ciclo feedback → eval ⬜
- Cada thumbs-down crea caso candidato de eval en cola de revisión (panel admin).
- Cierra el ciclo que hoy está abierto: el feedback se guarda pero no alimenta nada.

### 0.5–0.10 Quick wins UX y transparencia (del consolidado de mejoras) ⬜
| # | Tarea | Esfuerzo |
|---|---|---|
| 0.5 | Fix inconsistencia de límites (home "20/hora" vs pricing "50/mes") | 1 h |
| 0.6 | `/corpus` público solo lectura + badge "corpus actualizado al [fecha]" | 8 h |
| 0.7 | Indicador de progreso multi-etapa vía SSE (buscar → recuperar → redactar → verificar) — ataca la percepción de lentitud (TTFT largo) | 8 h |
| 0.8 | Verificar caché semántica en prod (⚠️ migración `query_cache` no está en el repo → probable caché muerto) + sello UI de caché | 4 h |
| 0.9 | Auditoría TTFT por modo + test de disparo de calculadoras (auditor externo no las percibió) | 6 h |
| 0.10 | Pass de accesibilidad nº1: axe-core, `prefers-reduced-motion`, focus visible, ARIA, ≥16px, prueba móvil documentada | 12 h |

---

## FASE 1 — CORPUS TERRITORIAL BIOBÍO (meses 2–5) · hito CORFO mes 5

**El trabajo más delicado del proyecto.** Los PRC no son texto corrido: son ordenanzas + **tablas de zonas** + planos. El chunking clásico destruye las tablas. Regla de oro: **nunca mezclar chunks de PRC de comunas distintas en una misma respuesta**.

### 1.1 Modelo de datos territorial ⬜
```sql
comunas   (id, nombre, region, provincia)
prc       (id, comuna_id, version, fecha_publicacion, vigente, url_fuente)
prc_zonas (id, prc_id, codigo_zona, nombre,
           usos_permitidos[], usos_prohibidos[], usos_condicionados[],
           coef_constructibilidad, coef_ocupacion, altura_max, sistema_agrupamiento,
           antejardin_min, densidad_max, sup_predial_min, frente_predial_min,
           estacionamientos_regla, observaciones, verificado boolean)
```
Campos estructurados, no texto. Un DOM va a auditar primero estas tablas.

### 1.2 Pipeline de ingesta PRC ⬜
Por comuna (orden: Concepción → Hualpén → Los Ángeles):
1. Obtener ordenanza PRC vigente (PDF oficial municipio/MINVU/Observatorio Urbano).
2. Texto normativo → chunks con metadatos `comuna` + `zona` (nuevo parser `parsers/prc.ts`).
3. **Tablas de zonas → filas de `prc_zonas`** vía extracción estructurada (Gemini Flash multimodal, ya usado en `api/parse-doc`) + **verificación manual celda a celda** (checklist en panel admin, campo `verificado`).
4. Casos de eval por comuna (mínimo 6–7 c/u) antes de marcar la comuna como activa.

### 1.3 Retrieval territorial ⬜
- Extractor de hechos + clasificador detectan **comuna** (lista cerrada + patrones de dirección).
- Con comuna detectada → filtro de normas PRC de esa comuna en `match_chunks` + lookup determinístico en `prc_zonas` si hay zona identificada (respuesta de parámetros desde datos estructurados, no desde chunks).
- Sin comuna y consulta la requiere → **active prompting** (ya existe) pregunta la comuna antes de responder.
- Guardrail duro en pipeline: chunk PRC de comuna ≠ comuna detectada → excluido.

### 1.4 Minería semi-automática de reglas-gatillo ⬜
- Job batch: cada DDU/dictamen CGR (nuevo o del corpus) → LLM extrae regla candidata `{condición, normas_forzadas, efecto, mensaje}` → cola de revisión en panel admin → activación humana.
- Meta: 24 → 40 reglas al mes 5, 60+ al mes 8.

### 1.5 Poblar grafo automáticamente ⬜
- Pase batch sobre ~22.500 chunks: extracción de referencias cruzadas ("modifícase el artículo...", "déjase sin efecto...", "en relación con el Art. X de la LGUC") → aristas candidatas en `norm_relations` → revisión → `verificado=true`.
- Meta: >300 aristas verificadas al mes 5, >500 al mes 8.

### 1.6 Consulta con dirección → zona PRC (opcional, alto valor) ⬜
- Si existen shapefiles de zonificación (IDE Chile / municipios): lookup punto-en-polígono comuna+dirección → zona.
- Si no: pedir al usuario su zona (aparece en el CIP). No bloquea el hito.

### 1.7–1.10 Producto y retención (del consolidado de mejoras) ⬜
| # | Tarea | Esfuerzo |
|---|---|---|
| 1.7 | Historial persistente + carpetas por proyecto (localStorage primero, sync con cuenta al existir auth 2B.3). Base del Tier Estudio | M |
| 1.8 | Glosario de siglas/términos en hover (JSON + tooltip en markdown) | S |
| 1.9 | Onboarding guiado de 3 pasos (antes de los pilotos, no después) | S |
| 1.10 | Log de versiones por respuesta (corpus, modelo, prompt) — extiende `consultas_log` | S |

**Resultado verificable mes 5**: "¿qué puedo construir en zona ZH-2 de Hualpén?" responde con parámetros exactos de `prc_zonas` + texto de ordenanza + cita verificable, y rechaza responder si la comuna es ambigua. 20+ casos PRC en golden set pasando.

---

## FASE 2 — ALGORITMO v3 + TIER PÚBLICO (meses 4–8) · hitos CORFO mes 8

### Workstream 2A — Cruce normativo real (meses 4–6)

| # | Tarea | Detalle | Depende de |
|---|---|---|---|
| 2A.1 ⬜ | **Expansión por grafo en retrieval** | Post-rerank: seguir aristas `modifica/interpreta/deroga` de chunks top-N y forzar chunks relacionados (máx. 4 extra, mismo mecanismo que `fetcher-normas-obligatorias`) | 1.5 |
| 2A.2 ⬜ | **Detector de conflictos v2** | (a) Filtro de pertinencia semántica chunk-restrictivo↔consulta antes de promover al prompt (elimina falsos positivos); (b) modo profundo: comparación por pares con LLM juez (materia común + consecuencias incompatibles → conflicto declarado + jerarquía aplicable); (c) aristas `deroga/deja_sin_efecto` reportadas como conflicto determinístico | 1.5 |
| 2A.3 ⬜ | **Verificación de citas a nivel de fragmento** — *mayor ROI reputacional del plan* | Fuzzy-match de todo texto entrecomillado de la respuesta contra chunks del contexto (normalizar espacios/tildes, ratio > 0.92). Falla → regenerar con feedback correctivo (1 reintento) → si persiste, degradar visiblemente ("cita no verificada"). Extender a parámetros numéricos con unidad ("100 metros", "0,6", "40%") | — |
| 2A.4 ⬜ | **Regeneración en bloqueo** | Regla `bloquear_positiva` activa + respuesta afirmativa → regenerar con instrucción correctiva (hoy solo agrega advertencia al pie) | — |
| 2A.5 ⬜ | **Confianza v2** | Incorporar % citas verificadas + reglas satisfechas al score. En Tier Público, confianza baja → derivación explícita a profesional (comportamiento, no solo badge) | 2A.3 |
| 2A.6 ⬜ | **Gatillo semántico de reglas** | Disparo por similitud embedding consulta↔regla (umbral alto) + confirmación léxica débil. Reemplaza el substring matching como señal primaria | 0.3 |
| 2A.7 ⬜ | "¿Por qué estas fuentes?" — razonamiento de recuperación visible | Bloque plegable con datos que el pipeline ya produce (dominios, reglas disparadas, capas). Transparencia casi gratis | — |
| 2A.8 ⬜ | Verificación cita vs BCN lado a lado | Panel comparativo fragmento citado ↔ texto del chunk con diferencias resaltadas. Es la cara visible de 2A.3 | 2A.3 |

### Workstream 2B — Tier Público (meses 5–8)

**Principio rector: la simplificación es capa de presentación, no un pipeline degradado.** El motor genera siempre la respuesta técnica verificada; una segunda pasada la traduce. Las citas se colapsan, nunca se eliminan.

| # | Tarea | Detalle |
|---|---|---|
| 2B.1 ⬜ | Modo `publico` en sintetizador | Two-pass: pipeline completo con verificación → reescritura a lenguaje simple ("qué puedes hacer / qué no / qué falta averiguar / cuándo necesitas un profesional"). Citas bajo acordeón "ver respaldo normativo" |
| 2B.2 ⬜ | UI simplificada | Flujo guiado (comuna → qué quiere hacer → estado propiedad) en vez de chat libre; resultado tipo semáforo (permitido / con condiciones / prohibido / requiere profesional). El flujo guiado alimenta el extractor de hechos con datos estructurados → mejora retrieval gratis |
| 2B.3 ⬜ | Cuentas y límites | Supabase Auth + tabla `suscripciones` + contador consultas/mes por tier + trial 14 días (5 consultas) + middleware de enforcement en `/api/chat` |
| 2B.4 ⬜ | Pilotos validación técnica (hito mes 8) | 10–15 profesionales, casos reales, protocolo: caso → respuesta → contraste con criterio profesional → registro. Cada discrepancia = caso eval + regla candidata. Incluir test de disposición a pagar con precio real |
| 2B.5 ⬜ | Test Tier Público con no técnicos | 8–10 ciudadanos; medir: ¿entendió qué puede hacer? ¿detectó cuándo necesita profesional? |
| 2B.6 ⬜ | **Informe técnico normativo profesional (Word + PDF)** — *feature de mayor disposición a pagar del tier Profesional* | Según mockup `REVISOR-ARQ-INFORME-GENERADO.pdf`: folio, síntesis ejecutiva, marco normativo activado, análisis artículo por artículo, cruces/conflictos, vacíos, condiciones territoriales, ruta de cumplimiento, fuentes con URL, bloque de firmas. Export .docx + PDF |
| 2B.7 ⬜ | Asistente de respuesta a observaciones DOM | Usuario pega el acta de observaciones → borrador de respuesta fundada con citas (modo profundo + plantilla administrativa) |
| 2B.8 ⬜ | Compartir consulta vía URL pública | `/s/{id}` snapshot sin login, expira 90 días. Growth loop |

### Workstream 2C — Robustez operacional (meses 6–8)

| # | Tarea | Detalle |
|---|---|---|
| 2C.1 ⬜ | Fallback LLM de pago con tope | DeepSeek pay-per-use (ya soportado) activado solo para usuarios de pago, presupuesto tope mensual. La política "todo gratis" se mantiene para el tier gratuito |
| 2C.2 ⬜ | Monitoreo de vigencia ampliado | Job semanal que revisa DDU/dictámenes nuevos en MINVU/CGR y alerta para ingesta (extiende cron BCN existente) |
| 2C.3 ⬜ | Runbook de curatoría | Documentar procesos delegables sin código: verificar vigencia, aprobar reglas mineadas, verificar tablas PRC. Mitiga bus factor = 1 |
| 2C.4 ⬜ | Prefetch de fuentes mientras se escribe | Debounce 800 ms → retrieval anticipado sin LLM. Reduce TTFT ~3–5 s. Solo usuarios logueados (costo Voyage) |
| 2C.5 ⬜ | Status page pública | UptimeRobot/Better Stack sobre `/api/healthz`. Requisito blando institucional |
| 2C.6 ⬜ | Reporte de errores con estado visible | Estados recibido/en revisión/corregido + notificación al reportante. Se integra con 0.4 |

---

## FASE 3 — LANZAMIENTO COMERCIAL (meses 8–10)

| # | Tarea | Detalle |
|---|---|---|
| 3.1 ⬜ | **Pasarela de pagos CLP** — decidir mes 8, no mes 9 | Recomendación: **Flow o Khipu** (Webpay incluido, suscripciones, integración rápida) para mercado nacional; mantener `stripe.ts` para expansión internacional. La certificación bancaria toma >1 mes |
| 3.2 ⬜ | Enforcement completo de tiers | Público/Profesional/Estudio + upgrade/downgrade + facturación |
| 3.3 ⬜ | Workspace Tier Estudio | Historial compartido multi-usuario (hasta 3). Recortable si falta tiempo |
| 3.4 ⬜ | Landing por segmento + onboarding + guías SEO | Ya hay 7 guías; agregar landing arquitecto/abogado/ciudadano |
| 3.5 ⬜ | Early adopters → primera venta | Convertir pilotos del mes 8 en lista de espera con precio fundador. La primera venta debe ser conversión de un piloto, no un desconocido |
| 3.6 ⬜ | Pre-lanzamiento | Auditoría `security-auditor` + rate-limit por usuario (no solo IP) + revisión legal disclaimer/ToS con abogado |
| 3.7 ⬜ | Alertas normativas suscribibles por tema | Email cuando cambia una norma del corpus en el tema suscrito. Se apoya en 2C.2 + newsletter. Retención recurrente |
| 3.8 ⬜ | Sello de verificación humana (top-100 consultas) | Workflow de revisión experta + sello "✓ Verificado por especialista". Alimenta también el golden set |
| 3.9 ⬜ | **Workstream comercial (Carolina)** | Embajadores regionales (10 arq + 5 abog, gratis 6 meses por testimonio con métrica) · `/casos` con ≥5 testimonios antes del mes 8 · alianza Colegio Arquitectos Biobío · webinars mensuales · video demo 90 s · calculadora ROI en home · comparativa vs competidores · convenio municipios <50.000 hab |
| 3.10 ⬜ | Paquete legal pre-lanzamiento | Privacidad actualizada a nueva Ley de Protección de Datos (Ley 21.719/2024, vigencia dic-2026 — **verificar con abogado**) · formulario ARCO · retención por tier · contrato marco institucional · SLA Tier Estudio |

**Gates del mes 8** (condiciones previas a lanzamiento; sin ellas el riesgo de no lograr la primera venta es alto): (1) precios publicados + checkout con trial operativo · (2) ≥5 testimonios reales en `/casos` · (3) ≥1 alianza firmada.

---

## KPIs DE GOBIERNO DEL PLAN

| KPI | Hoy | Mes 5 | Mes 8 | Mes 10 |
|-----|-----|-------|-------|--------|
| Golden set (casos) | 34 | 120 (incl. 20 PRC) | 200 | 250 |
| Recall retrieval (norma correcta en top-18) | sin medir | >85% | >90% | >90% |
| Citas literales verificadas automáticamente | 0% (solo nº artículo) | — | >95% | >98% |
| Reglas-gatillo activas | 24 | 40 | 60+ | 70+ |
| Aristas de grafo verificadas | pocas | 300 | 500+ | 600+ |
| Comunas con PRC estructurado | 0 | 3 | 3 | 3–5 |
| Pilotos profesionales completados | 0 | — | 10–15 | — |
| Primera venta | — | — | — | ✅ |

## ORDEN DE PRIORIDAD SI EL TIEMPO NO ALCANZA

1. **Fase 1 completa (PRC territorial)** — hito CORFO comprometido + diferenciador competitivo real.
2. **2A.3 (verificación de citas a nivel de fragmento)** — protege la promesa central del producto.
3. **2B (Tier Público + cuentas + pilotos)** — hito CORFO mes 8.
4. Quick wins 0.5–0.9 (~27 h) — se hacen sí o sí; multiplican la percepción de calidad.
5. De las mejoras nuevas de Fase 2, intransables: **2B.6 (informe profesional)** y **2A.8** (cara visible de la verificación). El resto se recorta en orden inverso de numeración.
6. 2A.1/2A.2 — recortables a versión determinística (solo aristas del grafo).
7. 1.6 (dirección→zona) y 3.3 (workspace Estudio) — recortables sin afectar hitos.

> Los hitos CORFO nunca se sacrifican por mejoras del consolidado. El workstream 3.9 es de Carolina y no compite con horas de desarrollo. Evaluación completa (qué se aceptó, qué ya estaba hecho, qué se descartó y por qué) en `00_MEJORAS POR IMPLEMENTAR/consolidado-mejoras-plan.md`.

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
```

## REFERENCIA — VARIABLES DE ENTORNO (Vercel, estado 2026-05-19)

| Variable | Propósito | Estado |
|---|---|---|
| `CEREBRAS_API_KEY` | LLM primario (qwen-3-235b, gratis) | ✅ |
| `DEEPSEEK_API_KEY` | Fallback opcional (pay-per-use) | ✅ |
| `LLM_PRIMARY` | Controla orden cadena fallback | ✅ |
| `GEMINI_API_KEY` | Fallback (fast-fail, 1 retry) | ✅ |
| `OPENROUTER_API_KEY` | Fallback gratuito | ✅ |
| `GROQ_API_KEY` | Último fallback gratuito | ✅ |
| `VOYAGE_API_KEY` | Embeddings + rerank | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` / `SERVICE_ROLE_KEY` | BD | ✅ |
| `ADMIN_SECRET` | Auth panel admin | ✅ |
| `NEXT_PUBLIC_APP_URL` | URL pública | ✅ |
| `CRON_SECRET` | Cron BCN | ⚠️ pendiente |
| `RESEND_API_KEY` | Emails newsletter | ❌ pendiente |
| `STRIPE_*` | Pagos (evaluar Flow/Khipu antes — ver 3.1) | ❌ |
| `SENTRY_DSN` | Monitoreo errores | ❌ |

## DECISIONES DE ARQUITECTURA CLAVE

### ¿Por qué Cerebras como primario y no Gemini?
- Hardware dedicado CS-3 → latencia muy baja, sin RPM agresivo; qwen-3-235b de alta calidad; 100% gratuito.
- Gemini Free Tier (15 RPM rolling) es cuello de botella inaceptable como primario; queda como fallback fast-fail.

### ¿Por qué Voyage AI para embeddings?
- `voyage-law-2` entrenado en textos legales → mejor recall para normativa chilena.
- Separar embeddings de generación permite optimizar independientemente.

### ¿Por qué HyDE + multi-query?
- HyDE cierra la brecha coloquial↔técnico; multi-query con RRF reduce sesgo de formulación única. Juntos: recall ~60% → ~95%.

### ¿Por qué la simplificación del Tier Público es two-pass y no un prompt distinto?
- Un pipeline "simplificado" sin verificación entregaría las respuestas menos controladas al segmento con menos criterio para detectar errores. La verificación es idéntica en todos los tiers; solo cambia la presentación.

### ¿Por qué datos estructurados (prc_zonas) y no solo chunks para los PRC?
- Las tablas de zonas son datos tabulares: el chunking las destruye y el LLM las mezcla. Un lookup determinístico por zona elimina la posibilidad de alucinar coeficientes — la clase de error más grave para un arquitecto.

---

## ARCHIVO — ROADMAP ANTERIOR (pre 2026-07-09)

Ítems del plan anterior ya completados: corpus limpio, eval 34/34, cron BCN, páginas legales, newsletter backend, guías. Ítems vigentes absorbidos por el plan nuevo: Stripe/monetización → 3.1–3.2 · alertas operativas → 2C.2 · revisión legal formal → 3.6 · DDUs históricos 000–453 → fuera de alcance del período CORFO (baja prioridad, ver diagnóstico en `PROGRESO.md` §4b).

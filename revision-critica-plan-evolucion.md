# Revisor ARQ — Revisión crítica y plan de evolución

**Fecha:** 2026-07-09 · **Base:** código en `app/src/lib/` + documento de postulación Semilla Inicia CORFO 2026

---

# PARTE 1 — Visión crítica

## 1.1 Lo que está bien (y es defendible ante terceros)

El proyecto no es un "wrapper de ChatGPT". La arquitectura de 7 capas (extractor de hechos → motor de reglas → HyDE → híbrido BM25+vector → rerank → detector de conflictos → verificación post-síntesis) es un diseño de RAG legal serio, con decisiones correctas: reranker dedicado (voyage rerank-2), búsqueda híbrida cuando hay términos exactos, chunks obligatorios forzados por reglas, verificación de citas post-generación y cadena de fallback LLM que elimina el costo variable. El corpus curado (~384 normas, DDU completas, dictámenes CGR) es efectivamente la barrera de entrada real, como dice el documento. La eval 34/34 muestra disciplina de regresión.

Dicho eso, hay una brecha importante entre lo que el documento CORFO **promete** ("cruce normativo", "detección de conflictos", "aplica jerarquía") y lo que el código **hace hoy**. Esa brecha es el foco de esta crítica, porque es exactamente lo que un piloto con usuarios profesionales (mes 8) va a exponer.

## 1.2 Crítica al algoritmo de cruce normativo

### A. El "cruce" es léxico, no estructural — y no escala

`motor-reglas.ts` dispara por co-ocurrencia de substrings en la consulta (`"conjunto armónico"` + `"recepción"`). Problemas concretos:

1. **Fragilidad léxica.** "¿Puedo parcelar un terreno agrícola?" no dispara la regla de Art. 55 LGUC porque busca `"subdivid"` + `"zona rural"`. Sinónimos, orden de palabras y redacción coloquial (justo el lenguaje del futuro Tier Público) rompen el matching.
2. **Escalamiento manual.** 24 reglas curadas a mano crecen linealmente con tus horas. Con PRCs de 3 comunas y normativa sectorial entrando al corpus, el espacio de casos "norma especial desplaza a la general" crece combinatorialmente.
3. **Sin registro de cobertura.** No hay telemetría de qué consultas *deberían* haber disparado una regla y no lo hicieron (falsos negativos invisibles).

**Cómo mejorarlo:**

- Mover las reglas a una tabla en Supabase (no hardcodeadas en TS) con embeddings de su descripción/caso canónico. El gatillo pasa de substring a **similitud semántica consulta↔regla** (umbral alto) con la co-ocurrencia léxica como señal secundaria, no única.
- **Minería semi-automática de reglas**: cada DDU y dictamen CGR que declara improcedencia/derogación es una regla candidata. Un job batch con LLM extrae `{condición, norma_forzada, efecto, mensaje}` de cada documento nuevo del corpus → cola de revisión humana → regla activa. Así el catálogo crece con el corpus, no con tus noches.
- Loguear en producción: consulta, reglas disparadas, reglas con similitud 0.6–0.8 (casi-disparos) para auditar cobertura semanalmente.

### B. El detector de conflictos no detecta conflictos — detecta vocabulario

`detector-conflictos.ts` clasifica chunks aislados por regex ("no procede", "prohibición"...). Eso no es detección de conflicto entre normas:

- **Falso positivo:** un chunk con "no procede" sobre una materia distinta a la consultada activa la advertencia igual.
- **Falso negativo:** dos normas realmente contradictorias que no usan ese vocabulario (una permite un uso, otra fija un requisito incompatible) pasan invisibles. El ejemplo del restaurante del documento CORFO (sala cuna a 90 m + DS 38 + ordenanza de fachada) es exactamente un conflicto *implícito por combinación de requisitos*, no por lenguaje prohibitivo.

**Cómo mejorarlo (en orden de esfuerzo):**

1. **Filtro de pertinencia:** antes de promover un chunk restrictivo al prompt, verificar que su materia coincide con la consulta (similitud chunk↔query > umbral). Barato, elimina la mayoría de los falsos positivos.
2. **Conflicto por pares:** comparar chunks de a pares (misma materia, polaridad opuesta) con un LLM juez barato (Gemini Flash) en el modo profundo: "¿estos dos fragmentos imponen consecuencias incompatibles para el caso X? ¿cuál prevalece por jerarquía/especialidad/temporalidad?". Esto sí es "cruce normativo" y justifica el modo profundo como feature premium.
3. **El grafo como fuente primaria de conflictos conocidos** (ver punto C).

### C. El grafo de normas está subutilizado — es tu mayor activo dormido

`grafo.ts` consulta `norm_relations` y solo **formatea texto para el prompt**. No influye en la recuperación. Esto invierte la lógica correcta:

- Si recupero OGUC Art. 2.6.4, y existe la arista `DDU-XXX modifica OGUC Art. 2.6.4`, esa DDU debe **entrar obligatoriamente al contexto** (como hace fetcher-normas-obligatorias con las reglas), no solo mencionarse como metadato.
- Las aristas `deja_sin_efecto` / `deroga` son detección de conflicto determinística, gratis y sin falsos positivos — mucho más confiable que el regex del detector.

**Cómo mejorarlo:**

- **Expansión por grafo en el retrieval:** tras el rerank, para cada chunk del top-N, seguir aristas salientes/entrantes de tipo `modifica|interpreta|deroga|deja_sin_efecto` y forzar los chunks de las normas relacionadas (con presupuesto: p. ej. máx. 4 chunks extra).
- **Poblar el grafo automáticamente:** las referencias cruzadas están en el texto mismo ("modifícase el artículo...", "déjase sin efecto la circular...", "en relación con el Art. 55 de la LGUC"). Un pase batch de extracción (regex + LLM) sobre los 22.500 chunks genera aristas candidatas → revisión → `verificado=true`. Hoy el grafo depende de carga manual, por eso está flaco.

### D. Verificación de citas: valida el número de artículo, no el texto

`validador.ts` comprueba que los artículos citados existan en los metadatos de los chunks. Pero la promesa central del producto es la **cita literal**. Hoy el LLM puede citar "Art. 5.1.11" (que sí está en contexto) con un texto entre comillas **inventado o parafraseado**, y la validación pasa. Ese es el peor escenario reputacional posible: cita que parece verificada y no lo es.

**Cómo mejorarlo:**

- **Verificación a nivel de fragmento:** extraer todo texto entre comillas de la respuesta y hacer fuzzy-match (normalizando espacios/tildes; p. ej. ratio de Levenshtein > 0.92) contra el texto de los chunks del contexto. Fragmento sin match → o se regenera la respuesta con feedback ("la cita X no es literal, corrígela") o se degrada visiblemente ("cita no verificada").
- Lo mismo para **parámetros numéricos** (coeficientes, distancias, porcentajes): todo número en la respuesta debería rastrearse a un chunk. Es más difícil, pero incluso una versión parcial (números con unidad: "100 metros", "0,6", "40%") cubre el riesgo mayor para arquitectos.
- Hoy `verificarCoherenciaRestrictiva` solo **añade una advertencia** al final cuando la respuesta afirma algo que el contexto restringe. Para las reglas con efecto `bloquear_positiva`, la contradicción debería gatillar **regeneración con instrucción correctiva** (1 reintento), no un pie de página.

### E. El extractor de hechos ignora el territorio — y los PRC lo van a exigir

`extractor-hechos.ts` (regex, correcto como diseño barato) extrae acción, estado de obra y tipo de zona, pero **no extrae comuna ni ubicación**. Con la LGUC/OGUC/DDU eso era tolerable porque son normas nacionales. Con los PRC de Concepción, Hualpén y Los Ángeles (hito mes 5 del proyecto CORFO), la respuesta correcta **depende de la comuna y de la zona del PRC**. Sin extracción territorial:

- Una consulta "¿puedo poner un local comercial en Hualpén?" recuperaría chunks del PRC de Concepción si son semánticamente similares. Respuesta plausible, comuna equivocada — error grave e indetectable para el usuario.

Además, los regex actuales no manejan negación ("no quiero subdividir, solo ampliar" detecta `subdividir`).

**Cómo mejorarlo:** ver Fase 1 del plan (es el trabajo central de la ingesta PRC, no un parche).

### F. El indicador de confianza mide similitud, no corrección

`confianza.ts` puntúa por similarity promedio + diversidad de fuentes + jerarquía. Puede marcar 🟢 alta con chunks semánticamente cercanos pero jurídicamente irrelevantes. Como señal UX es aceptable; como compuerta de calidad no. Cuando exista la verificación a nivel de fragmento (punto D), el score debería incorporar: % de citas verificadas, reglas-gatillo satisfechas y si el active prompting pidió contexto. Y en el Tier Público, confianza baja debería **cambiar el comportamiento** (derivar a "consulta a un profesional"), no solo pintar un badge.

### G. Evaluación: 34 casos es insuficiente para lo que viene

Para un dominio donde el error tiene consecuencia legal, el golden set debería tener 150–300 casos, con tres métricas separadas hoy mezcladas: (1) **recall de retrieval** (¿la norma correcta llegó al top-18?), (2) **fidelidad de cita** (¿los fragmentos citados son literales?), (3) **corrección de conclusión** (¿procede/no procede correcto?). Separarlas te dice *dónde* falla el pipeline. Cada consulta real mal respondida (thumbs-down de `/api/feedback`) debería convertirse en caso de eval — hoy ese feedback existe pero no cierra el ciclo.

## 1.3 Crítica al proyecto (documento CORFO)

Puntos fuertes: el problema está excepcionalmente bien narrado (el caso del restaurante es oro para pitch), el modelo de riesgos es honesto, y comprometer solo "primera venta" es prudente.

Riesgos que el documento subestima:

1. **El Tier Público contradice potencialmente la propuesta anti-alucinación.** El documento dice que el Tier Público "no incluye cita literal de artículos". Cuidado: la simplificación debe ser una **capa de presentación** sobre la misma respuesta verificada (respuesta técnica con citas se genera igual internamente; se reescribe en lenguaje simple; las citas quedan colapsadas/disponibles, no eliminadas). Si el pipeline público omite la verificación, el segmento con menos criterio para detectar errores recibe las respuestas menos controladas — y es el segmento que puede firmar un arriendo de 3 años basado en tu respuesta.
2. **Precio profesional probablemente subvaluado.** $10.000 CLP/mes (~USD 10) por 30 consultas para un profesional cuyo error cuesta millones es señal de poco valor. El competidor real no es OGUC-GPT, es la hora de un abogado ($80.000+). Hay espacio para $25.000–40.000/mes en el tier profesional; validarlo en los pilotos del mes 8 con disposición a pagar real, no encuesta.
3. **Bus factor = 1.** Todo el conocimiento técnico y de curatoría vive en una persona a 20 h/semana. Mitigación mínima: documentar el pipeline de ingesta y la lógica de reglas para que la curatoría (verificar vigencia, aprobar reglas mineadas) sea delegable a Carolina u otro profesional del dominio sin tocar código.
4. **Cadena LLM 100% gratuita como política rígida.** Correcto para hoy; pero con clientes de pago, un fallo en cadena de proveedores gratuitos (cambios de límite, deprecación de modelos `:free`) es riesgo de SLA. El presupuesto CORFO incluye $3,1M de cloud/IA — reservar parte para un proveedor de pago como fallback contractual desde el mes 8 (lanzamiento) es coherente con la propia política ("migración a pago solo cuando el margen lo justifique": el margen lo justifica cuando hay clientes).
5. **Pasarela de pagos:** `stripe.ts` ya existe, pero para cobrar CLP a chilenos (Webpay, transferencia) la fricción de Stripe es alta. Evaluar Transbank/Flow/Khipu/MercadoPago en el mes 8, no en el 9 — la integración + pruebas reales toma más de un mes con validaciones bancarias.

---

# PARTE 2 — Plan de acción detallado (evolución según postulación CORFO)

Alineado a las 3 fases del documento (10 meses). Cada workstream indica entregable verificable y dependencia. Los hitos CORFO (sociedad, mentoría, sostenibilidad) se omiten aquí: esto es el plan **técnico-producto**.

## Fase 0 — Fundamentos técnicos (mes 1, en paralelo a lo administrativo)

Preparar el terreno antes de construir encima. ~60–80 h.

| # | Acción | Entregable | Esfuerzo |
|---|--------|-----------|----------|
| 0.1 | **Telemetría de consultas**: loguear (anonimizado) consulta, clasificación, reglas disparadas y casi-disparos, chunks top-18, confianza, feedback. Tabla `consultas_log` en Supabase | Dashboard simple en `/corpus` con consultas/día, % baja confianza, % thumbs-down | 12 h |
| 0.2 | **Ampliar golden set a 100+ casos** con las 3 métricas separadas (recall retrieval / fidelidad cita / corrección conclusión). Fuente: consultas reales + casos canónicos de las 24 reglas + casos PRC futuros | `npm run eval` reporta 3 métricas; CI falla si regresa | 20 h |
| 0.3 | **Migrar reglas-gatillo a Supabase** (tabla `reglas_gatillo` con embedding de condición). Motor lee de BD con caché. Sin cambiar aún la lógica de disparo | Reglas editables sin deploy; base para minería (1.4) | 12 h |
| 0.4 | **Ciclo de feedback → eval**: cada thumbs-down crea caso candidato de eval en cola de revisión | Cola visible en panel admin | 8 h |

## Fase 1 — Corpus territorial Biobío (meses 2–5) · hito CORFO mes 5

El trabajo más delicado del proyecto. Los PRC no son texto corrido: son **ordenanzas + tablas de zonas + planos**. El chunking clásico destruye las tablas. Requiere ingesta estructurada.

| # | Acción | Detalle | Esfuerzo |
|---|--------|---------|----------|
| 1.1 | **Modelo de datos territorial** | Tablas nuevas: `comunas`, `prc` (versión, fecha, comuna), `prc_zonas` (código zona, usos permitidos/prohibidos/condicionados, coef. constructibilidad, ocupación, altura, rasante, antejardín, densidad, estacionamientos — campos estructurados, no texto) | 16 h |
| 1.2 | **Pipeline de ingesta PRC** | Por comuna: (a) obtener ordenanza PRC vigente (PDF oficial municipio/MINVU), (b) texto normativo → chunks con metadato `comuna` + `zona`, (c) **tablas de zonas → filas de `prc_zonas`** vía extracción estructurada (Gemini Flash multimodal, que ya usas en `api/parse-doc`) + verificación manual celda a celda (es lo que un DOM va a auditar primero) | 30 h + 15 h/comuna de verificación |
| 1.3 | **Retrieval territorial** | Extractor de hechos + clasificador detectan comuna (lista cerrada + direcciones); si hay comuna → filtro `norma_ids` del PRC correspondiente en `match_chunks` + lookup determinístico en `prc_zonas` si hay zona identificada. **Regla dura: nunca mezclar chunks de PRC de otra comuna.** Si el usuario no indica comuna y la consulta lo requiere → active prompting (ya existe) pregunta la comuna | 24 h |
| 1.4 | **Minería de reglas-gatillo** (punto A de la crítica) | Job batch: DDU + dictámenes CGR nuevos → LLM extrae regla candidata → cola de revisión en panel admin → activación. Meta: 24 → 60+ reglas al mes 8 | 20 h + revisión continua |
| 1.5 | **Poblar grafo automáticamente** (punto C) | Pase batch sobre corpus: extracción de referencias cruzadas → aristas candidatas → revisión → `verificado=true`. Meta: >500 aristas verificadas | 16 h + revisión |
| 1.6 | **Consulta con dirección (diferenciador)** | Opcional pero de alto valor: comuna + zona PRC resuelta desde dirección aproximada. Si los planos digitales existen (IDE Chile / municipios publican shapefiles), un lookup punto-en-polígono es factible. Si no, pedir al usuario su zona (está en el CIP) | 20 h (si hay shapefiles) |

**Resultado verificable (mes 5):** consulta "¿qué puedo construir en zona ZH-2 de Hualpén?" responde con parámetros exactos de `prc_zonas` + texto de la ordenanza, cita verificable, y rechaza responder si la comuna es ambigua. 20+ casos PRC en el golden set.

## Fase 2 — Algoritmo v3 + Tier Público (meses 4–8) · hitos CORFO mes 8

### Workstream 2A — Cruce normativo real (meses 4–6)

| # | Acción | Detalle | Esfuerzo |
|---|--------|---------|----------|
| 2A.1 | **Expansión por grafo en retrieval** | Post-rerank: seguir aristas `modifica/interpreta/deroga` de los chunks top-N y forzar chunks relacionados (máx. 4 extra). Depende de 1.5 | 12 h |
| 2A.2 | **Detector de conflictos v2** | (a) filtro de pertinencia semántica chunk-restrictivo↔consulta; (b) en modo profundo: comparación por pares con LLM juez (materia común + consecuencias incompatibles → conflicto declarado con jerarquía aplicable). Aristas `deroga/deja_sin_efecto` del grafo se reportan como conflicto determinístico | 24 h |
| 2A.3 | **Verificación de citas a nivel de fragmento** (punto D — la mejora de mayor ROI reputacional) | Fuzzy-match de todo texto entrecomillado contra chunks; regeneración con feedback si falla (1 reintento); degradación visible si persiste. Extender a parámetros numéricos con unidad | 20 h |
| 2A.4 | **Regeneración en bloqueo** | Reglas `bloquear_positiva` + respuesta afirmativa → regenerar con instrucción correctiva, no solo advertir | 8 h |
| 2A.5 | **Confianza v2** | Incorporar % citas verificadas + reglas satisfechas; confianza baja en Tier Público → derivación a profesional | 8 h |
| 2A.6 | **Gatillo semántico de reglas** | Disparo por similitud embedding consulta↔regla (las reglas ya viven en BD con embedding desde 0.3) con umbral alto + confirmación léxica débil | 12 h |

### Workstream 2B — Tier Público (meses 5–8)

Principio rector: **la simplificación es presentación, no un pipeline degradado**. El motor genera siempre la respuesta verificada; una segunda pasada la traduce.

| # | Acción | Detalle | Esfuerzo |
|---|--------|---------|----------|
| 2B.1 | **Modo `publico` en sintetizador** | Two-pass: respuesta técnica verificada (pipeline completo) → reescritura a lenguaje simple ("qué puedes hacer / qué no / qué te falta averiguar / cuándo necesitas un profesional"). Citas colapsadas bajo "ver respaldo normativo", nunca eliminadas | 16 h |
| 2B.2 | **UI simplificada** | Flujo guiado por preguntas (comuna → qué quiere hacer → estado de la propiedad) en vez de chat libre; resultado visual tipo semáforo (permitido / con condiciones / prohibido / requiere profesional). El flujo guiado además alimenta el extractor de hechos con datos estructurados — mejora el retrieval gratis | 40 h |
| 2B.3 | **Cuentas y límites** | Auth (Supabase Auth), tabla `suscripciones`, contador de consultas/mes por tier, trial 14 días con 5 consultas. Middleware de enforcement en `/api/chat` | 24 h |
| 2B.4 | **Pilotos de validación técnica** (hito mes 8) | 10–15 profesionales usando el producto en casos reales; protocolo: caso real → respuesta Revisor ARQ → contraste con criterio del profesional → registro estructurado. Cada discrepancia = caso de eval + regla candidata. Incluir test de disposición a pagar (precio real, no encuesta) | Coordinación Carolina + 12 h instrumentación |
| 2B.5 | **Test Tier Público con no técnicos** | 8–10 usuarios ciudadanos; medir: ¿entendió qué puede hacer? ¿detectó cuándo necesita un profesional? | Coordinación Carolina |

### Workstream 2C — Robustez operacional (meses 6–8)

| # | Acción | Detalle | Esfuerzo |
|---|--------|---------|----------|
| 2C.1 | Fallback LLM de pago (DeepSeek pay-per-use ya soportado) activado con presupuesto tope mensual, solo para usuarios de pago | 4 h |
| 2C.2 | Monitoreo de vigencia: job semanal que revisa DDU/dictámenes nuevos en MINVU/CGR y alerta para ingesta (el documento CORFO promete "pipeline de ingesta automática" — hoy es semiautomático; esto lo honra) | 16 h |
| 2C.3 | Documentar runbook de curatoría (delegable): verificar vigencia, aprobar reglas mineadas, verificar tablas PRC | 8 h |

## Fase 3 — Lanzamiento comercial (meses 8–10)

| # | Acción | Detalle | Esfuerzo |
|---|--------|---------|----------|
| 3.1 | **Pasarela de pagos CLP** | Decidir mes 8: Flow o Khipu (integración rápida, Webpay incluido) vs Stripe (ya iniciado, mejor para suscripciones pero fricción CLP). Recomendación: Flow para suscripciones + pay-per-use nacional; dejar `stripe.ts` para expansión internacional | 24 h + certificación |
| 3.2 | Enforcement completo de tiers (Público/Profesional/Estudio) + upgrade/downgrade + facturación | 16 h |
| 3.3 | Historial compartido Tier Estudio (workspace multi-usuario, hasta 3) | 20 h |
| 3.4 | Landing por segmento + onboarding por perfil + guías como SEO (ya hay 7) | 16 h |
| 3.5 | Early adopters: convertir pilotos del mes 8 en lista de espera con precio fundador; primera venta = conversión de un piloto, no un desconocido | Carolina |
| 3.6 | Pre-lanzamiento: auditoría `security-auditor` + carga (rate-limit por usuario y no solo IP) + revisión legal del disclaimer y ToS con abogado | 12 h + externo |

## KPIs para gobernar el plan

| KPI | Hoy | Mes 5 | Mes 8 | Mes 10 |
|-----|-----|-------|-------|--------|
| Golden set (casos) | 34 | 120 (incl. 20 PRC) | 200 | 250 |
| Recall retrieval (norma correcta en top-18) | s/medir | >85% | >90% | >90% |
| Citas literales verificadas automáticamente | 0% (solo nº artículo) | — | >95% | >98% |
| Reglas-gatillo activas | 24 | 40 | 60+ | 70+ |
| Aristas de grafo verificadas | pocas | 300 | 500+ | 600+ |
| Comunas con PRC estructurado | 0 | 3 | 3 | 3–5 |
| Pilotos profesionales completados | 0 | — | 10–15 | — |
| Primera venta | — | — | — | ✅ |

## Orden de prioridad si el tiempo no alcanza (20 h/semana es poco)

1. **Fase 1 completa (PRC territorial)** — es el hito CORFO comprometido y el diferenciador competitivo real.
2. **2A.3 (verificación de citas a nivel de fragmento)** — protege la promesa central del producto con el menor esfuerzo relativo.
3. **2B (Tier Público + cuentas + pilotos)** — hito CORFO mes 8.
4. 2A.1/2A.2 (grafo en retrieval + conflictos v2) — pueden recortarse a la versión determinística (solo aristas del grafo) si falta tiempo.
5. 1.6 (dirección→zona) y 3.3 (workspace Estudio) — recortables sin afectar hitos.

---

*Documento generado como revisión técnica interna. Las observaciones sobre el código refieren al estado del repo al 2026-07-09.*

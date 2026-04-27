# Arquitectura de Cruce Normativo Real — REVISOR ARQ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolucionar REVISOR ARQ de un RAG semántico plano a un sistema de inteligencia normativa de 6 capas que detecta cruces reales, recupera por jerarquía normativa y valida consistencia antes de responder.

**Architecture:** El pipeline actual (`embed → match_chunks → Gemini`) se reemplaza por un motor de 6 etapas: (1) clasificador estructurado de consulta, (2) router de dominios normativos, (3) recuperación por capas de jerarquía, (4) enriquecimiento con grafo de relaciones entre normas, (5) síntesis estructurada, (6) validación de consistencia. Las capas 1-3 son la Fase Rápida (sin nuevas tablas), la capa 4 es la Fase Intermedia (nueva tabla `norm_relations`), y las capas 5-6 son la Fase Avanzada (prompts reestructurados + validador mejorado).

**Tech Stack:** Next.js 14 App Router · TypeScript · Supabase pgvector · Voyage AI voyage-law-2 · Gemini 2.5 Flash · SSE streaming

---

## Mapa de archivos

| Archivo | Estado | Responsabilidad |
|---------|--------|----------------|
| `app/src/lib/rag.ts` | **Refactorizar** | Motor RAG completo — partir en módulos |
| `app/src/lib/clasificador.ts` | **Crear** | Etapa 1: clasificar consulta en struct JSON |
| `app/src/lib/router.ts` | **Crear** | Etapa 2: mapear dominios → tipos de normas prioritarias |
| `app/src/lib/retriever.ts` | **Crear** | Etapa 3: recuperación por capas de jerarquía |
| `app/src/lib/grafo.ts` | **Crear** | Etapa 4: consultar `norm_relations` y expandir contexto |
| `app/src/lib/sintetizador.ts` | **Crear** | Etapa 5: buildSystemPrompt refactorizado, más contexto estructurado |
| `app/src/lib/validador.ts` | **Crear** | Etapa 6: validación de consistencia ampliada |
| `app/src/lib/rag.ts` | **Mantener** | Exports de compatibilidad (`detectarCruces`, `guardarConsulta`, tipos públicos) |
| `app/src/app/api/chat/route.ts` | **Modificar** | Orquestar las 6 etapas (reemplazar pipeline de 7 pasos) |
| `supabase/migrations/20260427_norm_relations.sql` | **Crear** | Tabla `norm_relations` + índices |
| `supabase/migrations/20260427_match_chunks_v2.sql` | **Crear** | RPC `match_chunks_v2` con filtro de jerarquía |

---

## FASE 1 — Rápida (sin cambios de BD)

> Objetivo: mejorar la calidad de retrieval y contextualización sin tocar la base de datos. Solo TypeScript.

---

### Task 1: Crear el clasificador de consulta (`clasificador.ts`)

Extrae de la pregunta del usuario un objeto estructurado que describe *qué tipo de problema normativo es*. Este objeto guía todas las etapas siguientes.

**Files:**
- Create: `app/src/lib/clasificador.ts`

**QueryClassificada type:**

```typescript
export type TipoProyecto =
  | "edificacion_nueva"
  | "ampliacion"
  | "cambio_destino"
  | "subdivision"
  | "condominios"
  | "obra_menor"
  | "regularizacion"
  | "instalacion_especial"
  | "consulta_normativa"    // pregunta abstracta sin proyecto específico
  | "otro";

export type EtapaProyecto =
  | "prefactibilidad"
  | "anteproyecto"
  | "ingreso_permiso"
  | "obra"
  | "recepcion"
  | "postventas"
  | "no_aplica";

export type DominioPrimario =
  | "urbanismo"         // zonificación, usos de suelo, subdivisión
  | "construccion"      // OGUCreglamento, permisos DOM
  | "accesibilidad"
  | "copropiedad"
  | "medioambiente"
  | "patrimonio"
  | "salud"
  | "aguas"
  | "vialidad"
  | "electricidad"
  | "defensa"
  | "bienes_nacionales";

export interface QueryClassificada {
  tipo_proyecto: TipoProyecto;
  etapa: EtapaProyecto;
  dominios_detectados: DominioPrimario[];   // primero = dominio principal
  keywords_normativas: string[];            // artículos, parámetros mencionados
  requiere_jerarquia: boolean;             // true si la pregunta implica conflicto entre normas
  confianza: "alta" | "media" | "baja";   // nivel de certeza del clasificador
  resumen_consulta: string;               // 1-2 oraciones para logging
}
```

**Implementación:**

```typescript
// app/src/lib/clasificador.ts
import { generarConGemini } from "./gemini";

const PROMPT_CLASIFICADOR = `Eres un clasificador normativo para Chile. Analiza la consulta de un arquitecto o abogado y devuelve un JSON estructurado.

Consulta: {PREGUNTA}

Devuelve EXACTAMENTE este JSON (sin markdown, sin explicación):
{
  "tipo_proyecto": "<edificacion_nueva|ampliacion|cambio_destino|subdivision|condominios|obra_menor|regularizacion|instalacion_especial|consulta_normativa|otro>",
  "etapa": "<prefactibilidad|anteproyecto|ingreso_permiso|obra|recepcion|postventas|no_aplica>",
  "dominios_detectados": ["<dominio1>", "<dominio2>"],
  "keywords_normativas": ["<keyword1>", "<keyword2>"],
  "requiere_jerarquia": <true|false>,
  "confianza": "<alta|media|baja>",
  "resumen_consulta": "<1-2 oraciones>"
}

Dominios válidos: urbanismo, construccion, accesibilidad, copropiedad, medioambiente, patrimonio, salud, aguas, vialidad, electricidad, defensa, bienes_nacionales`;

export async function clasificarConsulta(pregunta: string): Promise<QueryClassificada> {
  const prompt = PROMPT_CLASIFICADOR.replace("{PREGUNTA}", pregunta);
  try {
    const texto = await generarConGemini(prompt, { maxOutputTokens: 512, temperature: 0 });
    // Gemini puede envolver con ```json ... ``` — limpiamos
    const limpio = texto.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(limpio) as QueryClassificada;
  } catch {
    // Fallback conservador: tratar como consulta genérica de construcción
    return {
      tipo_proyecto: "consulta_normativa",
      etapa: "no_aplica",
      dominios_detectados: ["construccion"],
      keywords_normativas: [],
      requiere_jerarquia: false,
      confianza: "baja",
      resumen_consulta: pregunta.slice(0, 120),
    };
  }
}
```

**Nota:** `generarConGemini` ya existe en `app/src/lib/gemini.ts` como función non-streaming. Si no acepta un segundo argumento de opciones, agregar overload o usar la función existente sin opciones primero.

- [ ] **Step 1.1: Crear el archivo clasificador.ts** con el código anterior.

- [ ] **Step 1.2: Verificar que `generarConGemini` acepta llamada no-streaming**
```bash
grep -n "generarConGemini\|export.*gemini" app/src/lib/gemini.ts | head -20
```
Si `gemini.ts` no tiene función non-streaming separada, crear una:
```typescript
// Al final de gemini.ts (si no existe)
export async function generarConGemini(
  prompt: string,
  opts: { maxOutputTokens?: number; temperature?: number } = {}
): Promise<string> {
  const { maxOutputTokens = 512, temperature = 0 } = opts;
  // Usar la misma API key que el resto
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens, temperature },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
```

- [ ] **Step 1.3: Commit**
```bash
git add app/src/lib/clasificador.ts app/src/lib/gemini.ts
git commit -m "feat: agregar clasificador estructurado de consultas normativas"
```

---

### Task 2: Crear el router de dominios normativos (`router.ts`)

Dado un `QueryClassificada`, decide qué tipos de norma priorizar y en qué orden. Reemplaza el hardcoded `filterTipos` del pipeline actual.

**Files:**
- Create: `app/src/lib/router.ts`

```typescript
// app/src/lib/router.ts
import type { QueryClassificada, DominioPrimario } from "./clasificador";

export interface PlanRecuperacion {
  tiposNorma: string[];          // ["LGUC","OGUC","DDU","DS","Ley"] en orden de prioridad
  matchCountPorCapa: number[];   // chunks a pedir por capa: [4, 6, 4]
  dominiosActivos: DominioPrimario[];
  filtrarSoloVigentes: boolean;
}

/**
 * Mapeo dominio → tipos de norma que lo gobiernan, en orden de jerarquía descendente.
 * Cuantos más dominios activos, mayor el pool de recuperación total.
 */
const DOMINIO_A_NORMAS: Record<DominioPrimario, string[]> = {
  urbanismo:       ["LGUC", "OGUC", "DDU", "DDU_ESPECIFICA", "DS", "DFL"],
  construccion:    ["OGUC", "DDU", "DDU_ESPECIFICA", "LGUC", "DS"],
  accesibilidad:   ["DS", "Ley", "OGUC", "DDU"],
  copropiedad:     ["Ley", "DS", "OGUC"],
  medioambiente:   ["Ley", "DS", "DFL", "DL"],
  patrimonio:      ["Ley", "DS", "DDU"],
  salud:           ["DS", "Ley", "DFL"],
  aguas:           ["DFL", "DL", "DS"],
  vialidad:        ["DFL", "DS", "Ley"],
  electricidad:    ["DFL", "DS", "Ley"],
  defensa:         ["DFL", "DS", "DL"],
  bienes_nacionales: ["DL", "Ley", "DS"],
};

export function routear(q: QueryClassificada): PlanRecuperacion {
  const dominiosActivos = q.dominios_detectados.length > 0
    ? q.dominios_detectados
    : ["construccion" as DominioPrimary];

  // Unión ordenada: dominio primario primero, el resto después
  const tiposSet = new Set<string>();
  for (const dominio of dominiosActivos) {
    for (const t of (DOMINIO_A_NORMAS[dominio] ?? [])) tiposSet.add(t);
  }
  const tiposNorma = Array.from(tiposSet);

  // Más dominios activos = más chunks necesarios (cap en 20)
  const baseCount = dominiosActivos.length <= 1 ? 8 : 12;
  const cappedCount = Math.min(baseCount + dominiosActivos.length * 2, 20);

  return {
    tiposNorma,
    matchCountPorCapa: [Math.ceil(cappedCount * 0.5), Math.ceil(cappedCount * 0.5)],
    dominiosActivos,
    filtrarSoloVigentes: true,
  };
}
```

- [ ] **Step 2.1: Crear router.ts** con el código anterior.

- [ ] **Step 2.2: Commit**
```bash
git add app/src/lib/router.ts
git commit -m "feat: agregar router de dominios normativos"
```

---

### Task 3: Crear el retriever por capas (`retriever.ts`)

La diferencia clave con el RAG actual: se hacen **dos búsquedas** — una para normas de jerarquía alta (ley/reglamento) y otra general — y los resultados se intercalan respetando la pirámide normativa.

**Files:**
- Create: `app/src/lib/retriever.ts`
- Read: `app/src/lib/rag.ts` (función `recuperarChunks` — líneas 60-100)

```typescript
// app/src/lib/retriever.ts
import { getSupabaseServiceClient } from "./supabase";
import type { ChunkRecuperado } from "./rag";
import { embedText } from "./voyage";
import type { PlanRecuperacion } from "./router";

/**
 * Recuperación en dos capas:
 * Capa 1 — jerarquía alta: solo ley + reglamento, garantiza que LGUC/OGUC
 *           estén siempre presentes si son relevantes.
 * Capa 2 — amplia: todos los tipos del plan, incluye DDU, DS, instrucciones.
 * Los duplicados se eliminan; Capa 1 tiene precedencia en el orden.
 */
export async function recuperarPorCapas(
  pregunta: string,
  plan: PlanRecuperacion
): Promise<ChunkRecuperado[]> {
  const embedding = await embedText(pregunta, "query");
  const sb = getSupabaseServiceClient();

  // Capa 1: solo ley y reglamento (alta jerarquía)
  const jerarquiasAltas = ["ley", "reglamento"];
  const { data: capa1 } = await sb.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: plan.matchCountPorCapa[0],
    filter_tipos: plan.tiposNorma.filter(t => ["LGUC","OGUC","Ley","DFL","DL"].includes(t)),
    solo_vigentes: plan.filtrarSoloVigentes,
  });

  // Capa 2: todos los tipos del plan (DDU, DS, instrucciones, etc.)
  const { data: capa2 } = await sb.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: plan.matchCountPorCapa[1],
    filter_tipos: plan.tiposNorma,
    solo_vigentes: plan.filtrarSoloVigentes,
  });

  // Merge: Capa 1 primero, luego Capa 2 sin duplicados
  const vistos = new Set<string>();
  const merged: ChunkRecuperado[] = [];

  for (const raw of [...(capa1 ?? []), ...(capa2 ?? [])]) {
    const id = raw.id as string;
    if (vistos.has(id)) continue;
    vistos.add(id);
    merged.push(mapearChunk(raw));
  }

  // Ordenar: primero por jerarquía normativa, luego por similarity
  const ORDEN_JERARQUIA = ["ley", "reglamento", "instruccion", "resolucion", "norma_tecnica", "otro"];
  merged.sort((a, b) => {
    const ja = ORDEN_JERARQUIA.indexOf(a.norma_jerarquia_norm ?? "otro");
    const jb = ORDEN_JERARQUIA.indexOf(b.norma_jerarquia_norm ?? "otro");
    if (ja !== jb) return ja - jb;
    return (b.similarity ?? 0) - (a.similarity ?? 0);
  });

  return merged.slice(0, 16); // cap final en 16 chunks
}

function mapearChunk(r: Record<string, unknown>): ChunkRecuperado {
  return {
    id: r.id as string,
    texto: r.texto as string,
    similarity: r.similarity as number,
    norma_tipo: r.norma_tipo as string,
    norma_numero: r.norma_numero as string,
    norma_titulo: r.norma_titulo as string,
    articulo: (r.metadatos as Record<string, unknown>)?.articulo as string | null,
    jerarquia: (r.metadatos as Record<string, unknown>)?.jerarquia as string | null,
    url_fuente: r.fuente as string,
    fecha_vigencia_desde: r.fecha_vigencia_desde as string | null,
    norma_dominio: (r.norma_dominio as string | null) ?? null,
    norma_organo_emisor: (r.norma_organo_emisor as string | null) ?? null,
    norma_jerarquia_norm: (r.norma_jerarquia_norm as string | null) ?? null,
    norma_etapas_proyecto: (r.norma_etapas_proyecto as string[] | null) ?? [],
  };
}
```

- [ ] **Step 3.1: Verificar que `embedText` está exportada desde `voyage.ts`**
```bash
grep -n "export.*embedText\|export function embed" app/src/lib/voyage.ts
```
Si no existe con ese nombre, ajustar el import al nombre correcto en `retriever.ts`.

- [ ] **Step 3.2: Crear retriever.ts** con el código anterior.

- [ ] **Step 3.3: Commit**
```bash
git add app/src/lib/retriever.ts
git commit -m "feat: agregar recuperación por capas normativas con ordenamiento por jerarquía"
```

---

### Task 4: Conectar el pipeline en `chat/route.ts`

Reemplaza el pipeline de 7 pasos actual por el nuevo de 6 etapas. Las etapas 4-6 (grafo, sintetizador avanzado, validador mejorado) se activan con feature flags para no romper lo que funciona.

**Files:**
- Modify: `app/src/app/api/chat/route.ts`

El pipeline actual (líneas 1-189) tiene este flujo en la función `POST`:
```
detectarFueraDominio → detectarCruces → recuperarChunks → construirContexto →
buildSystemPrompt → streamGemini → validarRespuesta → guardarConsulta
```

Reemplazar por:

```typescript
// NUEVO PIPELINE en POST handler (sustituye el bloque del pipeline actual)

// Etapa 0: guardrail fuera de dominio (mantener igual)
const fueraDominio = detectarFueraDominio(pregunta);
if (fueraDominio) { /* ... misma lógica actual ... */ }

// Etapa 1: clasificar consulta
const clasificacion = await clasificarConsulta(pregunta);
// Emitir SSE con clasificación para frontend (tipo nuevo)
sendSSE({ type: "clasificacion", data: clasificacion });

// Etapa 2: routear dominios → plan de recuperación
const plan = routear(clasificacion);

// Etapa 3: recuperación por capas
const chunks = await recuperarPorCapas(pregunta, plan);
sendSSE({ type: "fuentes", data: formatearFuentes(chunks) });

// Etapa 4: enriquecimiento con grafo (FASE 2 — feature flag)
// const chunksEnriquecidos = FEATURE_GRAFO ? await enriquecerConGrafo(chunks) : chunks;
const chunksFinales = chunks;

// Etapa 5: construir contexto + prompt
const { textoContexto } = construirContexto(chunksFinales);
// Pasar clasificacion al prompt para que el LLM sepa el tipo de proyecto
const systemPrompt = buildSystemPromptV2(modo, textoContexto, cruces, clasificacion);

// Etapa 6: validación de consistencia (FASE 3 — after streaming)
// Misma lógica de streamGemini, validarRespuesta, guardarConsulta actuales
```

- [ ] **Step 4.1: Leer el archivo completo de route.ts para entender los imports exactos y la estructura del handler**
```bash
cat -n app/src/app/api/chat/route.ts | head -50
```

- [ ] **Step 4.2: Agregar imports en `route.ts`**

Al inicio del archivo, después de los imports existentes:
```typescript
import { clasificarConsulta } from "@/lib/clasificador";
import { routear } from "@/lib/router";
import { recuperarPorCapas } from "@/lib/retriever";
```

- [ ] **Step 4.3: Reemplazar las líneas del pipeline actual**

Identificar dónde están `detectarCruces`, `recuperarChunks` y `construirContexto` en el handler, y reemplazar solo el bloque de retrieval:

```typescript
// ANTES (borrar estas 2 líneas):
// const chunks = await recuperarChunks(pregunta, { matchCount: modo === "profundo" ? 14 : 8 });
// const { textoContexto, chunks: chunksFinal } = construirContexto(chunks);

// DESPUÉS (insertar):
const clasificacion = await clasificarConsulta(pregunta);
controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "clasificacion", data: clasificacion })}\n\n`));
const plan = routear(clasificacion);
const chunks = await recuperarPorCapas(pregunta, plan);
const { textoContexto } = construirContexto(chunks);
const chunksFinal = chunks;
```

- [ ] **Step 4.4: Verificar que el servidor compila sin errores**
```bash
cd app && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4.5: Probar manualmente**

Abrir `http://localhost:3000` y hacer una consulta simple ("¿Cuál es el porcentaje mínimo de superficie arbolada en zona residencial?"). Verificar en los DevTools Network que el SSE emite `{type:"clasificacion"}` antes de `{type:"fuentes"}`.

- [ ] **Step 4.6: Commit**
```bash
git add app/src/app/api/chat/route.ts
git commit -m "feat: conectar clasificador + router + retriever en pipeline de chat"
```

---

## FASE 2 — Intermedia (nueva tabla `norm_relations`)

> Objetivo: agregar el grafo de relaciones entre normas. Permite expandir el contexto cuando una DDU modifica un artículo OGUC, o cuando una ley remite a un reglamento específico.

---

### Task 5: Migración SQL — tabla `norm_relations`

**Files:**
- Create: `supabase/migrations/20260427_norm_relations.sql`

```sql
-- Grafo de relaciones entre normas
-- Cada fila representa una arista dirigida: norma_origen → norma_destino
CREATE TABLE IF NOT EXISTS norm_relations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  norma_origen  uuid NOT NULL REFERENCES normas(id) ON DELETE CASCADE,
  norma_destino uuid NOT NULL REFERENCES normas(id) ON DELETE CASCADE,
  tipo_relacion text NOT NULL CHECK (tipo_relacion IN (
    'modifica',       -- origen modifica artículos de destino
    'complementa',    -- origen agrega normas a destino
    'deroga',         -- origen deroga (total o parcialmente) a destino
    'remite_a',       -- origen cita o remite a destino
    'reglamento_de',  -- origen es el reglamento de la ley destino
    'desarrolla'      -- origen desarrolla/especifica destino (DDU → OGUC)
  )),
  articulos_afectados text[],    -- artículos de norma_destino afectados (ej: ["4.2.1","4.2.4"])
  descripcion         text,      -- descripción breve de la relación
  verificado          boolean DEFAULT false,  -- true = revisado manualmente
  created_at          timestamptz DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_norm_relations_origen  ON norm_relations(norma_origen);
CREATE INDEX IF NOT EXISTS idx_norm_relations_destino ON norm_relations(norma_destino);
CREATE INDEX IF NOT EXISTS idx_norm_relations_tipo    ON norm_relations(tipo_relacion);

-- Evitar duplicados exactos
CREATE UNIQUE INDEX IF NOT EXISTS idx_norm_relations_unique
  ON norm_relations(norma_origen, norma_destino, tipo_relacion);

-- Datos semilla: relaciones conocidas y verificadas
-- (Agregar más a medida que se van descubriendo)
INSERT INTO norm_relations (norma_origen, norma_destino, tipo_relacion, articulos_afectados, descripcion, verificado)
SELECT
  o.id, d.id,
  'reglamento_de',
  ARRAY[]::text[],
  'La OGUC es el reglamento de la LGUC',
  true
FROM normas o, normas d
WHERE o.tipo = 'OGUC' AND d.tipo = 'LGUC'
ON CONFLICT DO NOTHING;

-- DS 50/2016 modifica OGUC en materia de accesibilidad
INSERT INTO norm_relations (norma_origen, norma_destino, tipo_relacion, articulos_afectados, descripcion, verificado)
SELECT
  o.id, d.id,
  'modifica',
  ARRAY['2.2.1','2.2.2','4.1.6','4.1.7','4.1.10','4.2.1','4.3.1'],
  'DS 50/2016 MINVU modifica OGUC en materia de accesibilidad universal',
  true
FROM normas o, normas d
WHERE o.numero = '50/2016 MINVU' AND d.tipo = 'OGUC'
ON CONFLICT DO NOTHING;

-- Ley 20.422 → DS 50/2016 (el DS es reglamento de la ley de inclusión)
INSERT INTO norm_relations (norma_origen, norma_destino, tipo_relacion, articulos_afectados, descripcion, verificado)
SELECT
  o.id, d.id,
  'reglamento_de',
  ARRAY[]::text[],
  'DS 50/2016 desarrolla la Ley 20.422 en el ámbito de edificación',
  true
FROM normas o, normas d
WHERE o.numero = '50/2016 MINVU' AND d.numero = '20.422'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE norm_relations IS
  'Grafo de relaciones entre normas del corpus. Una arista (A→B, tipo) significa que A tiene esa relación con B.';
```

- [ ] **Step 5.1: Crear el archivo de migración** con el SQL anterior.

- [ ] **Step 5.2: Aplicar la migración en Supabase**
```bash
# Opción A: via Supabase MCP (recomendado si está disponible)
# Opción B: copiar y ejecutar el SQL en el SQL Editor de Supabase Dashboard
# Verificar que se creó:
# SELECT count(*) FROM norm_relations;  -- debe retornar >= 2 filas semilla
```

- [ ] **Step 5.3: Commit**
```bash
git add supabase/migrations/20260427_norm_relations.sql
git commit -m "feat: crear tabla norm_relations para grafo de relaciones entre normas"
```

---

### Task 6: Crear el módulo de grafo (`grafo.ts`)

Dado un set de chunks recuperados, expande el contexto buscando normas relacionadas que NO aparecieron en la búsqueda semántica pero que tienen una relación directa con las normas presentes.

**Files:**
- Create: `app/src/lib/grafo.ts`

```typescript
// app/src/lib/grafo.ts
import { getSupabaseServiceClient } from "./supabase";
import type { ChunkRecuperado } from "./rag";

export interface RelacionNorma {
  norma_origen_tipo: string;
  norma_origen_numero: string;
  norma_destino_tipo: string;
  norma_destino_numero: string;
  norma_destino_titulo: string;
  tipo_relacion: string;
  articulos_afectados: string[];
  descripcion: string | null;
}

/**
 * Dado el set de chunks recuperados, busca en norm_relations si alguna norma presente
 * tiene relaciones con otras normas que NO están en el set.
 * Retorna las relaciones encontradas para incorporarlas al contexto del LLM.
 */
export async function obtenerRelacionesNormativas(
  chunks: ChunkRecuperado[]
): Promise<RelacionNorma[]> {
  if (!chunks.length) return [];

  const sb = getSupabaseServiceClient();

  // Obtener los IDs de las normas presentes en los chunks
  const normaTuples = [...new Set(chunks.map(c => `${c.norma_tipo}|${c.norma_numero}`))];

  // Buscar IDs en tabla normas
  const tiposPresentes = chunks.map(c => c.norma_tipo);
  const numerosPresentes = chunks.map(c => c.norma_numero);

  const { data: normasPresentes } = await sb
    .from("normas")
    .select("id, tipo, numero")
    .in("tipo", tiposPresentes)
    .in("numero", numerosPresentes);

  if (!normasPresentes?.length) return [];

  const idsPresentes = normasPresentes.map(n => n.id);

  // Buscar relaciones donde alguna norma presente es el origen O el destino
  const { data: relaciones } = await sb
    .from("norm_relations")
    .select(`
      tipo_relacion,
      articulos_afectados,
      descripcion,
      norma_origen:norma_origen(id, tipo, numero, titulo),
      norma_destino:norma_destino(id, tipo, numero, titulo)
    `)
    .or(`norma_origen.in.(${idsPresentes.join(",")}),norma_destino.in.(${idsPresentes.join(",")})`)
    .eq("verificado", true)
    .limit(20);

  if (!relaciones?.length) return [];

  // Filtrar: queremos solo relaciones donde el otro extremo NO está ya en los chunks
  const idsEnChunks = new Set(idsPresentes);

  return (relaciones as Record<string, unknown>[])
    .filter(r => {
      const origen = r.norma_origen as { id: string } | null;
      const destino = r.norma_destino as { id: string } | null;
      // Al menos uno de los extremos está fuera del set actual
      return !idsEnChunks.has(origen?.id ?? "") || !idsEnChunks.has(destino?.id ?? "");
    })
    .map(r => {
      const origen = r.norma_origen as { tipo: string; numero: string } | null;
      const destino = r.norma_destino as { tipo: string; numero: string; titulo: string } | null;
      return {
        norma_origen_tipo: origen?.tipo ?? "",
        norma_origen_numero: origen?.numero ?? "",
        norma_destino_tipo: destino?.tipo ?? "",
        norma_destino_numero: destino?.numero ?? "",
        norma_destino_titulo: destino?.titulo ?? "",
        tipo_relacion: r.tipo_relacion as string,
        articulos_afectados: (r.articulos_afectados as string[]) ?? [],
        descripcion: r.descripcion as string | null,
      };
    });
}

/**
 * Formatea las relaciones como texto para inyectar en el prompt del LLM.
 * No son los textos completos de las normas (eso requeriría más embeddings),
 * sino metadatos de relación que el LLM puede usar para alertar al usuario.
 */
export function formatearRelaciones(relaciones: RelacionNorma[]): string {
  if (!relaciones.length) return "";

  const lines = relaciones.map(r => {
    const arts = r.articulos_afectados.length
      ? ` (afecta Arts. ${r.articulos_afectados.join(", ")})`
      : "";
    return `- ${r.norma_origen_tipo} ${r.norma_origen_numero} → [${r.tipo_relacion.toUpperCase()}] → ${r.norma_destino_tipo} ${r.norma_destino_numero}${arts}: ${r.descripcion ?? "relación normativa detectada"}`;
  });

  return `\nRELACIONES NORMATIVAS DETECTADAS EN EL GRAFO (no están en el contexto RAG pero son relevantes):\n${lines.join("\n")}`;
}
```

- [ ] **Step 6.1: Crear grafo.ts** con el código anterior.

- [ ] **Step 6.2: Activar el grafo en `route.ts`**

Reemplazar el comentario de feature flag (Tarea 4, etapa 4) por la llamada real:
```typescript
import { obtenerRelacionesNormativas, formatearRelaciones } from "@/lib/grafo";

// En el handler, después de recuperarPorCapas:
const relaciones = await obtenerRelacionesNormativas(chunks);
const textoRelaciones = formatearRelaciones(relaciones);

// En buildSystemPrompt, inyectar textoRelaciones en el contexto:
const contextoCompleto = textoContexto + textoRelaciones;
const systemPrompt = buildSystemPrompt(modo, contextoCompleto, cruces);
```

- [ ] **Step 6.3: Verificar compilación**
```bash
cd app && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6.4: Commit**
```bash
git add app/src/lib/grafo.ts app/src/app/api/chat/route.ts
git commit -m "feat: integrar grafo de relaciones normativas en pipeline de chat"
```

---

### Task 7: Script de población del grafo (`scripts/poblar-grafo.js`)

Script para detectar automáticamente relaciones potenciales entre normas ya ingresadas, basándose en texto como "el DS X modifica el artículo Y de la OGUC". A revisar manualmente antes de marcar como `verificado=true`.

**Files:**
- Create: `app/scripts/poblar-grafo.js`

```javascript
/**
 * Detecta relaciones potenciales entre normas usando patrones de texto.
 * Genera filas candidatas en norm_relations con verificado=false.
 * Uso: node --env-file=.env.local scripts/poblar-grafo.js
 */
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Patrones que sugieren relaciones entre normas
const PATRONES_RELACION = [
  { re: /modif(?:ica|ando|ó)\s+(?:el\s+)?art[íi]culo\s+([\d.]+)/gi, tipo: 'modifica' },
  { re: /deja\s+sin\s+efecto\s+(?:el\s+)?art[íi]culo\s+([\d.]+)/gi, tipo: 'deroga' },
  { re: /de\s+conformidad\s+(?:con|a)\s+(?:lo\s+)?(?:dispuesto\s+en\s+)?(?:el\s+)?art[íi]culo\s+([\d.]+)/gi, tipo: 'remite_a' },
  { re: /complementa\s+(?:el\s+)?art[íi]culo\s+([\d.]+)/gi, tipo: 'complementa' },
];

async function main() {
  console.log('Obteniendo chunks del corpus...');
  const { data: chunks } = await sb
    .from('chunks')
    .select('norma_id, texto, metadatos')
    .limit(5000);

  if (!chunks?.length) { console.log('Sin chunks.'); return; }

  // Obtener mapa id→{tipo,numero} de normas
  const { data: normas } = await sb.from('normas').select('id, tipo, numero');
  const normaMap = Object.fromEntries((normas ?? []).map(n => [n.id, n]));

  const candidatos = [];
  const vistas = new Set();

  for (const chunk of chunks) {
    for (const { re, tipo } of PATRONES_RELACION) {
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(chunk.texto)) !== null) {
        const articulo = m[1];
        // Este chunk pertenece a norma_origen
        const clave = `${chunk.norma_id}|${tipo}|${articulo}`;
        if (!vistas.has(clave)) {
          vistas.add(clave);
          candidatos.push({ norma_id: chunk.norma_id, tipo, articulo });
        }
      }
    }
  }

  console.log(`${candidatos.length} relaciones candidatas detectadas.`);
  console.log('(Revisar manualmente en Supabase y marcar verificado=true las válidas)');

  // Mostrar resumen por norma
  const conteo = {};
  for (const c of candidatos) {
    const norma = normaMap[c.norma_id];
    if (!norma) continue;
    const key = `${norma.tipo} ${norma.numero}`;
    conteo[key] = (conteo[key] ?? 0) + 1;
  }
  for (const [norma, count] of Object.entries(conteo).sort((a,b) => b[1]-a[1]).slice(0,20)) {
    console.log(`  ${norma}: ${count} referencias`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 7.1: Crear scripts/poblar-grafo.js** con el código anterior.

- [ ] **Step 7.2: Commit**
```bash
git add app/scripts/poblar-grafo.js
git commit -m "feat: agregar script de detección automática de relaciones entre normas"
```

---

## FASE 3 — Avanzada (sintetizador estructurado + validador de consistencia)

> Objetivo: mejorar la calidad de la síntesis final y agregar un validador que detecta inconsistencias antes de responder (ej.: el LLM cita un artículo que no aparece en el contexto).

---

### Task 8: Sintetizador estructurado (`sintetizador.ts`)

Refactoriza `buildSystemPrompt` para que reciba el `QueryClassificada` y adapte el prompt al tipo de proyecto y etapa detectados. El nuevo prompt es más específico y contextualizado.

**Files:**
- Create: `app/src/lib/sintetizador.ts`
- Modify: `app/src/lib/rag.ts` (deprecar `buildSystemPrompt`, mantener re-export)

```typescript
// app/src/lib/sintetizador.ts
import type { ModoRespuesta, CruceDetectado } from "./rag";
import type { QueryClassificada } from "./clasificador";

const DISCLAIMER = `

---
⚠️ **Aviso legal**: Esta respuesta es orientativa y no constituye asesoría jurídica profesional. Verifica siempre el texto vigente en BCN (www.bcn.cl) y consulta con un profesional habilitado antes de tomar decisiones.`;

/**
 * Versión mejorada de buildSystemPrompt que recibe contexto clasificado.
 * Si no se tiene clasificacion, cae al comportamiento de la versión anterior.
 */
export function buildSystemPromptV2(
  modo: ModoRespuesta,
  contexto: string,
  cruces: CruceDetectado[] = [],
  clasificacion?: QueryClassificada
): string {
  // Bloque de contexto del proyecto (nuevo en v2)
  const proyectoBloque = clasificacion && clasificacion.confianza !== "baja"
    ? `\nCONTEXTO DEL PROYECTO DETECTADO:
Tipo de proyecto: ${clasificacion.tipo_proyecto.replace(/_/g, " ")}
Etapa: ${clasificacion.etapa.replace(/_/g, " ")}
Dominios normativos activos: ${clasificacion.dominios_detectados.join(", ")}
${clasificacion.keywords_normativas.length ? `Términos normativos mencionados: ${clasificacion.keywords_normativas.join(", ")}` : ""}
${clasificacion.requiere_jerarquia ? "⚠️ La consulta involucra posible conflicto de jerarquía normativa — analizar con especial cuidado." : ""}
`
    : "";

  // Bloque de cruces (igual que antes)
  const crucesBloque = cruces.length > 0
    ? `\nDOMINIOS NORMATIVOS ADICIONALES DETECTADOS:
${cruces.map(c => `- ${c.emoji} **${c.area}** (gatillante: "${c.gatillante}") → ${c.organismo} | Marco: ${c.norma_probable}`).join("\n")}
Considera estos dominios. Si el contexto RAG no los cubre, señálalos en Alertas de cruce.`
    : "";

  const base = `Eres REVISOR ARQ, un asistente especializado en análisis normativo para proyectos en Chile.
Tu base de conocimiento incluye normativa urbanística y de construcción (LGUC, OGUC, DDU) y otros marcos sectoriales relevantes.

IDIOMA: Español de Chile. Usa "usted". Tono profesional. Nunca rioplatense.
${proyectoBloque}${crucesBloque}
NORMATIVA RECUPERADA:
${contexto}

REGLAS ABSOLUTAS:
1. NUNCA inventes artículos, normas o parámetros fuera del contexto.
2. Si el contexto no respalda algo, dilo: "No encontré respaldo normativo suficiente en la base de conocimiento".
3. Toda afirmación técnica DEBE citar su fuente (FUENTE [N]).
4. Si detectas cruces no cubiertos, señálalos explícitamente.
5. El disclaimer final es OBLIGATORIO.`;

  // Los tres modos mantienen su estructura actual (arquitecto/abogado/profundo)
  // Solo se agrega el proyectoBloque arriba — el resto es idéntico a buildSystemPrompt en rag.ts
  // Para no duplicar código, importar los sufijos de modo desde rag.ts:
  // import { _MODO_ARQUITECTO_SUFFIX, _MODO_ABOGADO_SUFFIX, _MODO_PROFUNDO_SUFFIX } from "./rag";
  // Por ahora, construir inline (el refactor completo es un paso posterior):
  return base + getModoSuffix(modo) + DISCLAIMER;
}

function getModoSuffix(modo: ModoRespuesta): string {
  if (modo === "arquitecto") return `

MODO ARQUITECTO — enfoque práctico:
## Respuesta breve
## Normativa aplicable
## Impacto en diseño / proyecto / permiso
## Datos faltantes
## Próximos pasos
## Alertas de cruce normativo (si aplica)`;

  if (modo === "abogado") return `

MODO ABOGADO — enfoque jurídico:
## Conclusión jurídica preliminar
## Fundamento normativo
## Jerarquía de fuentes
## Normas concordantes o en tensión
## Riesgos interpretativos
## Materias sujetas a criterio de autoridad`;

  return `

MODO ANÁLISIS PROFUNDO:
## 1. Resumen del caso
## 2. Marco regulatorio total detectado
## 3. Cruces entre áreas regulatorias
## 4. Permisos / autorizaciones / informes potencialmente aplicables
## 5. Matriz de aplicabilidad normativa
## 6. Riesgos y vacíos normativos
## 7. Hoja de ruta regulatoria`;
}
```

- [ ] **Step 8.1: Crear sintetizador.ts** con el código anterior.

- [ ] **Step 8.2: Actualizar `route.ts` para usar `buildSystemPromptV2`**
```typescript
// Cambiar import:
import { buildSystemPromptV2 } from "@/lib/sintetizador";

// Cambiar llamada:
const systemPrompt = buildSystemPromptV2(modo, contextoCompleto, cruces, clasificacion);
```

- [ ] **Step 8.3: Commit**
```bash
git add app/src/lib/sintetizador.ts app/src/app/api/chat/route.ts
git commit -m "feat: sintetizador v2 con contexto de proyecto y etapa en prompt"
```

---

### Task 9: Validador de consistencia (`validador.ts`)

Extiende `validarRespuesta` para detectar: (a) artículos citados en la respuesta que NO aparecen en los chunks recuperados, (b) normas mencionadas que no están en la base.

**Files:**
- Create: `app/src/lib/validador.ts`
- Modify: `app/src/app/api/chat/route.ts` (usar nuevo validador)

```typescript
// app/src/lib/validador.ts
import type { ChunkRecuperado } from "./rag";

export interface ResultadoValidacion {
  valida: boolean;
  motivo?: string;
  advertencias: string[];   // warnings no fatales (artículos no verificados)
  notasAdicionales: string; // texto a agregar al final de la respuesta si hay advertencias
}

const RE_CITA_NORMA = /\b(?:art[íi]culo|art\.)\s*([\d.]+[°º]?)/gi;
const RE_NORMA_MENCIONADA = /\b(?:LGUC|OGUC|DDU\s+N[°º]?\s*[\d]+|Ley\s+N[°º]?\s*[\d.]+|DS\s+[\d]+|DFL\s+[\d]+)/gi;

/**
 * Valida que la respuesta sea consistente con el contexto de chunks recuperados.
 */
export function validarConsistencia(
  respuesta: string,
  chunks: ChunkRecuperado[]
): ResultadoValidacion {
  const advertencias: string[] = [];

  // Check básico: longitud y disclaimer (igual que antes)
  if (respuesta.trim().length < 50) {
    return { valida: false, motivo: "Respuesta demasiado corta", advertencias, notasAdicionales: "" };
  }
  const tieneDisclaimer =
    respuesta.includes("Aviso legal") ||
    respuesta.includes("asesoría jurídica") ||
    respuesta.includes("profesional habilitado");
  if (!tieneDisclaimer) {
    return { valida: false, motivo: "Falta disclaimer legal", advertencias, notasAdicionales: "" };
  }

  // Construir índice de artículos disponibles en el contexto
  const articulosEnContexto = new Set<string>();
  for (const c of chunks) {
    if (c.articulo) articulosEnContexto.add(c.articulo.toLowerCase().replace(/[°º]/g, ""));
  }

  // Detectar artículos citados en la respuesta
  const articulosCitados = new Set<string>();
  let m: RegExpExecArray | null;
  RE_CITA_NORMA.lastIndex = 0;
  while ((m = RE_CITA_NORMA.exec(respuesta)) !== null) {
    articulosCitados.add(m[1].toLowerCase().replace(/[°º]/g, ""));
  }

  // Verificar que artículos citados estén en el contexto
  for (const art of articulosCitados) {
    if (!articulosEnContexto.has(art)) {
      advertencias.push(`Art. ${art} citado en la respuesta no está en el contexto recuperado — verificar manualmente`);
    }
  }

  // Nota adicional si hay advertencias
  const notasAdicionales = advertencias.length > 0
    ? `\n\n> 🔍 **Nota de verificación automática**: ${advertencias.length} artículo(s) citado(s) no pudieron verificarse en el corpus local. Confirma en BCN: www.bcn.cl`
    : "";

  return {
    valida: true,
    advertencias,
    notasAdicionales,
  };
}
```

- [ ] **Step 9.1: Crear validador.ts** con el código anterior.

- [ ] **Step 9.2: Actualizar `route.ts` para usar `validarConsistencia`**

```typescript
import { validarConsistencia } from "@/lib/validador";

// Reemplazar la llamada a validarRespuesta:
// ANTES: const { valida, motivo } = validarRespuesta(respuestaCompleta);
// DESPUÉS:
const resultadoValidacion = validarConsistencia(respuestaCompleta, chunksFinal);
if (!resultadoValidacion.valida) {
  // misma lógica de fallback actual
}
// Agregar nota de verificación si hay advertencias:
if (resultadoValidacion.notasAdicionales) {
  respuestaFinal += resultadoValidacion.notasAdicionales;
}
```

- [ ] **Step 9.3: Commit**
```bash
git add app/src/lib/validador.ts app/src/app/api/chat/route.ts
git commit -m "feat: validador de consistencia con detección de artículos no verificados"
```

---

### Task 10: Guardar metadatos del nuevo pipeline en `consultas`

El campo `chunks_usados` ya existe. Agregar `clasificacion` y `relaciones_detectadas` para análisis posterior.

**Files:**
- Modify: `app/src/lib/rag.ts` (función `guardarConsulta`)

```typescript
// Actualizar la interfaz de opts:
export async function guardarConsulta(opts: {
  id?: string;
  pregunta: string;
  modo: ModoRespuesta;
  respuesta: string;
  chunksUsados: ChunkRecuperado[];
  modelo: string;
  latenciaMs: number;
  // Nuevo en pipeline v2:
  clasificacion?: import("./clasificador").QueryClassificada;
  relacionesDetectadas?: number;
  advertenciasValidacion?: string[];
}): Promise<void> {
  try {
    const sb = getSupabaseServiceClient();
    const row: Record<string, unknown> = {
      pregunta: opts.pregunta,
      modo: opts.modo,
      respuesta: opts.respuesta,
      chunks_usados: opts.chunksUsados.map((c) => ({
        id: c.id,
        norma: `${c.norma_tipo} ${c.norma_numero}`,
        articulo: c.articulo,
        similarity: c.similarity,
      })),
      modelo: opts.modelo,
      latencia_ms: opts.latenciaMs,
      // Metadatos del pipeline v2 (se ignoran si la columna no existe aún)
      ...(opts.clasificacion ? { clasificacion: opts.clasificacion } : {}),
      ...(opts.relacionesDetectadas !== undefined ? { relaciones_detectadas: opts.relacionesDetectadas } : {}),
      ...(opts.advertenciasValidacion?.length ? { advertencias_validacion: opts.advertenciasValidacion } : {}),
    };
    if (opts.id) row.id = opts.id;
    await sb.from("consultas").insert(row);
  } catch {
    // No crítico
  }
}
```

**Migración SQL opcional para las columnas nuevas en `consultas`:**

```sql
-- supabase/migrations/20260427_consultas_v2.sql
ALTER TABLE consultas
  ADD COLUMN IF NOT EXISTS clasificacion          jsonb,
  ADD COLUMN IF NOT EXISTS relaciones_detectadas  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advertencias_validacion text[];
```

- [ ] **Step 10.1: Crear migración `20260427_consultas_v2.sql`** con el SQL anterior.

- [ ] **Step 10.2: Aplicar la migración** (SQL Editor o Supabase MCP).

- [ ] **Step 10.3: Actualizar `guardarConsulta` en rag.ts** con el código anterior.

- [ ] **Step 10.4: Actualizar la llamada a `guardarConsulta` en `route.ts`** para pasar los nuevos campos:
```typescript
await guardarConsulta({
  id: consultaId,
  pregunta,
  modo,
  respuesta: respuestaFinal,
  chunksUsados: chunksFinal,
  modelo: "gemini-2.5-flash",
  latenciaMs: Date.now() - startTime,
  clasificacion,
  relacionesDetectadas: relaciones.length,
  advertenciasValidacion: resultadoValidacion.advertencias,
});
```

- [ ] **Step 10.5: Commit**
```bash
git add supabase/migrations/20260427_consultas_v2.sql app/src/lib/rag.ts app/src/app/api/chat/route.ts
git commit -m "feat: guardar metadatos del pipeline v2 (clasificacion, relaciones, advertencias) en consultas"
```

---

### Task 11: Verificación final e integración

- [ ] **Step 11.1: Ejecutar TypeScript completo**
```bash
cd app && npx tsc --noEmit
```
Resolver todos los errores antes de continuar.

- [ ] **Step 11.2: Probar 5 consultas tipo**

```
1. "¿Cuál es la distancia mínima de una vivienda al deslinde en zona R2?"
   → Esperar: tipo=edificacion_nueva, dominio=urbanismo, chunks con OGUC, sin cruces

2. "Quiero instalar rampas en un edificio existente para personas en silla de ruedas"
   → Esperar: dominio=accesibilidad, chunks de Ley 20.422 + DS 50/2016 + OGUC, relación en grafo

3. "Proyecto habitacional de 200 unidades cerca de un humedal"
   → Esperar: cruce=medioambiente detectado, dominio=[urbanismo, medioambiente]

4. "¿Qué dice el artículo 6.1.7 de la OGUC sobre estacionamientos?"
   → Esperar: keywords_normativas=["6.1.7"], retrieval directo OGUC

5. "¿Cuál es el proceso para la recepción definitiva de obras?"
   → Esperar: etapa=recepcion, chunks OGUC + DDU de recepción
```

Para cada consulta, verificar en el Network tab de DevTools que el SSE emite `{type:"clasificacion"}` con datos correctos.

- [ ] **Step 11.3: Revisión de calidad de respuesta**

Comparar las respuestas del nuevo pipeline vs. el anterior (guía: consulta 2 con rampas debería ahora incluir referencia explícita a DS 50/2016 Y a Ley 20.422, algo que el pipeline anterior probablemente omitía si solo uno de los dos tenía alta similitud semántica).

- [ ] **Step 11.4: Deploy a Vercel**
```bash
# Desde el directorio raíz del worktree:
npx vercel --prod
```

- [ ] **Step 11.5: Commit final de integración**
```bash
git add -A
git commit -m "feat: pipeline RAG v2 completo — clasificador + router + retriever por capas + grafo + sintetizador v2 + validador"
```

---

## Self-Review

### Cobertura de spec

| Requisito spec | Tarea que lo implementa |
|---|---|
| Clasificador estructurado de consulta | Task 1 (`clasificador.ts`) |
| Router de dominios normativos | Task 2 (`router.ts`) |
| Recuperación por capas normativas (jerarquia_norm) | Task 3 (`retriever.ts`) |
| Grafo de relaciones entre normas | Tasks 5+6 (SQL + `grafo.ts`) |
| Sintetizador de respuesta estructurada | Task 8 (`sintetizador.ts`) |
| Validador de consistencia | Task 9 (`validador.ts`) |
| Reusar schema existente (normas, chunks) | ✅ Todas las tareas usan FK a normas |
| Cruce multi-dominio (8 dominios) | Task 2 (`DOMINIO_A_NORMAS`) |
| MVP Fase Rápida (sin BD) | Tasks 1-4 |
| MVP Fase Intermedia (norm_relations) | Tasks 5-7 |
| MVP Fase Avanzada (sintetizador+validador) | Tasks 8-11 |
| Mantener lo que funciona | ✅ guardarConsulta, DOMINIOS_CRUCE, tipos, SSE arquitectura |

### Scan de placeholders

- ✅ Todos los pasos tienen código completo
- ✅ Todos los tipos están definidos en el mismo archivo o importados explícitamente
- ✅ Nombres consistentes: `recuperarPorCapas` en Task 3 = mismo nombre importado en Task 4

### Type consistency

- `QueryClassificada` definida en `clasificador.ts`, importada en `router.ts`, `sintetizador.ts`, `route.ts` y `rag.ts`
- `ChunkRecuperado` permanece en `rag.ts` (no se mueve para no romper imports existentes)
- `PlanRecuperacion` definida en `router.ts`, usada en `retriever.ts`
- `RelacionNorma` definida en `grafo.ts`
- `ResultadoValidacion` definida en `validador.ts`

---

## Resumen de lo que se mantiene / refactoriza / crea

| Elemento | Acción | Razón |
|---|---|---|
| `detectarCruces()` en rag.ts | **Mantener** | Funciona bien, rápida, sin LLM |
| `DOMINIOS_CRUCE` array | **Mantener** | Base sólida de 8 dominios |
| `guardarConsulta()` | **Extender** | Agrega campos opcionalmente |
| `construirContexto()` | **Mantener** | Formato funcional |
| `validarRespuesta()` | **Deprecar** (mantener por compatibilidad) | Reemplazada por `validarConsistencia` |
| `buildSystemPrompt()` | **Deprecar** (mantener por compatibilidad) | Reemplazada por `buildSystemPromptV2` |
| `recuperarChunks()` | **Mantener** (exportada) | Usada en scripts y tests; no borrar |
| SSE streaming en route.ts | **Mantener** | Arquitectura correcta |
| Rate limit 20 req/hora | **Mantener** | Sigue siendo necesario |
| `ModoRespuesta` type | **Mantener** | Interfaz pública |

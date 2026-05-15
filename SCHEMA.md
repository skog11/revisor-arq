# SCHEMA — Base de datos Supabase (REVISOR ARQ)

> Documentación del esquema PostgreSQL en Supabase.  
> Última actualización: 2026-05-15  
> Región: us-east-1 · Extensión pgvector activada

---

## Tablas

### `normas`
Catálogo de normas legales ingresadas al corpus. Una norma puede tener muchos chunks.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | auto-generado |
| `tipo` | TEXT | `"LGUC"` · `"OGUC"` · `"DDU"` · `"LEY"` · `"DFL"` · `"DL"` · `"DS"` |
| `numero` | TEXT | Ej: `"DFL-458"`, `"DS-47"`, `"541"` |
| `titulo` | TEXT | Nombre completo de la norma |
| `url_fuente` | TEXT | URL en BCN o MINVU |
| `fecha_vigencia_desde` | TEXT | Fecha ISO (puede ser null) |
| `fecha_vigencia_hasta` | TEXT | Fecha ISO · null si aún vigente |
| `vigente` | BOOLEAN | `true` si está en vigor actualmente |
| `dominio` | TEXT | `"urbanismo"` · `"construccion"` · `"medioambiente"` · etc. |
| `organo_emisor` | TEXT | `"MINVU"` · `"MMA"` · `"MOP"` · etc. |
| `jerarquia_norm` | TEXT | `"ley"` · `"reglamento"` · `"instruccion"` · `"decreto"` |
| `etapas_proyecto` | TEXT[] | `["prefactibilidad", "ingreso_permiso", ...]` |
| `hash` | TEXT | SHA-256 del archivo fuente — para detectar cambios |
| `created_at` | TIMESTAMPTZ | auto |

---

### `chunks`
Fragmentos de texto de las normas con embeddings vectoriales. Es la tabla central del RAG.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | auto-generado |
| `norma_id` | UUID FK → `normas.id` | |
| `texto` | TEXT | Fragmento de ~400 tokens |
| `embedding` | vector(1024) | Generado con Voyage AI `voyage-law-2` |
| `metadatos` | JSONB | `{ articulo, jerarquia, inciso, ... }` — ver detalle abajo |
| `fuente` | TEXT | URL directa al artículo en BCN |
| `norma_tipo` | TEXT | Desnormalizado de `normas.tipo` (para queries rápidas sin JOIN) |
| `norma_numero` | TEXT | Desnormalizado de `normas.numero` |
| `norma_titulo` | TEXT | Desnormalizado de `normas.titulo` |
| `fecha_vigencia_desde` | TEXT | Desnormalizado |
| `norma_dominio` | TEXT | Desnormalizado de `normas.dominio` |
| `norma_organo_emisor` | TEXT | Desnormalizado de `normas.organo_emisor` |
| `norma_jerarquia_norm` | TEXT | Desnormalizado de `normas.jerarquia_norm` |
| `norma_etapas_proyecto` | TEXT[] | Desnormalizado de `normas.etapas_proyecto` |
| `texto_tsv` | TSVECTOR | Full-text search — generado por migración `20260430_hybrid_search` |
| `created_at` | TIMESTAMPTZ | auto |

**Campos de `metadatos` JSONB** (no todos los chunks tienen todos los campos):
```json
{
  "articulo": "116",
  "jerarquia": "articulo",
  "inciso": "1",
  "letra": "a",
  "numero_item": "3"
}
```
> ⚠️ **Crítico**: La estructura de `metadatos` es asumida por `retriever.ts` y `sintetizador.ts`. Cambiarla requiere migración y re-ingesta del corpus completo.

**Índices en `chunks`**:
- `chunks_embedding_idx`: índice HNSW cosine con `lists=100`, para búsqueda vectorial
- `chunks_texto_tsv_idx`: índice GIN sobre `texto_tsv`, para FTS

---

### `consultas`
Registro de todas las consultas realizadas por usuarios. Permite analítica, debugging y feedback.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `pregunta` | TEXT | Pregunta original del usuario |
| `modo` | TEXT | `"arquitecto"` · `"abogado"` · `"profundo"` |
| `respuesta` | TEXT | Respuesta generada |
| `chunks_usados` | JSONB | Array de `{id, norma_tipo, norma_numero, articulo, similarity}` |
| `modelo` | TEXT | Ej: `"gemini-2.5-flash"`, `"mixtral-8x7b-32768"` |
| `latencia_ms` | INTEGER | Latencia total del pipeline en ms |
| `user_id` | UUID FK → `auth.users` | Nullable (usuarios no autenticados) |
| `clasificacion` | JSONB | Resultado de `clasificarConsulta()` |
| `advertencias_validacion` | TEXT[] | Advertencias de `validarConsistencia()` |
| `relaciones_detectadas` | INTEGER | Número de relaciones del grafo encontradas |
| `created_at` | TIMESTAMPTZ | auto |

---

### `perfiles`
Perfil de usuario con plan y cuota mensual. Creado automáticamente al registrarse.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK → `auth.users.id` | Vinculado 1:1 con Auth |
| `plan` | TEXT | `"free"` · `"paid"` (default `"free"`) |
| `consultas_este_mes` | INTEGER | Contador reiniciado mensualmente (default 0) |
| `consultas_limite` | INTEGER | Límite mensual según plan (default 50) |
| `created_at` | TIMESTAMPTZ | auto |

---

### `norm_relations`
Grafo de relaciones entre normas (remisiones, modificaciones, derogaciones).  
Poblada por el script `detectar-referencias.ts`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `norma_origen` | TEXT | Ej: `"LGUC DFL-458"` |
| `norma_destino` | TEXT | Ej: `"OGUC DS-47"` |
| `tipo_relacion` | TEXT | `"remite_a"` · `"modifica"` · `"deroga"` · `"complementa"` |
| `descripcion` | TEXT | Descripción textual de la relación |
| `created_at` | TIMESTAMPTZ | auto |

---

### `rate_limits`
Registro persistente de rate limiting por IP entre instancias serverless.  
Usada por `lib/rate-limit.ts` con fallback in-memory si Supabase falla.

| Columna | Tipo | Notas |
|---|---|---|
| `ip` | TEXT PK | Dirección IP del cliente (unique constraint) |
| `timestamps` | BIGINT[] | Array de timestamps Unix (ms) de los últimos requests |
| `updated_at` | TIMESTAMPTZ | Última actualización |

> La función `checkRateLimit()` filtra timestamps fuera de la ventana deslizante antes de verificar el límite.

---

## Funciones RPC

### `match_chunks(query_embedding, match_count, filter_tipos, solo_vigentes)`
Búsqueda vectorial pura por similitud coseno.

```sql
match_chunks(
  query_embedding    vector(1024),
  match_count        int,
  filter_tipos       text[]   DEFAULT NULL,  -- filtra por norma_tipo
  solo_vigentes      boolean  DEFAULT true   -- filtra chunks de normas vigentes
) RETURNS TABLE (
  id uuid, texto text, similarity float8,
  norma_tipo text, norma_numero text, norma_titulo text,
  articulo text, jerarquia text, url_fuente text,
  fecha_vigencia_desde text,
  norma_dominio text, norma_organo_emisor text,
  norma_jerarquia_norm text, norma_etapas_proyecto text[]
)
```

### `match_chunks_hybrid(query_embedding, query_text, match_count, filter_tipos, solo_vigentes, vector_weight)`
Búsqueda híbrida FTS + vector con pesos configurables.

```sql
match_chunks_hybrid(
  query_embedding    vector(1024),
  query_text         text,            -- texto para FTS con to_tsquery
  match_count        int,
  filter_tipos       text[]   DEFAULT NULL,
  solo_vigentes      boolean  DEFAULT true,
  vector_weight      float8   DEFAULT 0.5  -- peso vector (1-vector_weight = peso FTS)
) RETURNS TABLE (... mismas columnas que match_chunks ...)
```

> Activada automáticamente en `retriever.ts` cuando la query contiene términos exactos (números de artículo, nombres de DDU).

### `check_and_use_quota(p_user_id)`
Verifica si el usuario tiene cuota disponible y la consume atómicamente.

```sql
check_and_use_quota(
  p_user_id uuid
) RETURNS boolean  -- true si OK, false si cuota agotada
```

> Llamada al inicio de cada request en `/api/chat`. Si retorna false, el endpoint responde 429.

---

## Políticas RLS

> ⚠️ **Estado no confirmado**: Se desconoce si RLS está activado en producción para todas las tablas.  
> **Verificar urgentemente en Supabase Dashboard → Authentication → Policies**.

Políticas mínimas recomendadas:

| Tabla | Política recomendada |
|---|---|
| `normas` | Lectura pública; escritura solo service role |
| `chunks` | Lectura pública; escritura solo service role |
| `consultas` | Lectura solo del propio `user_id`; escritura service role |
| `perfiles` | Lectura/escritura solo del propio `user_id` |
| `norm_relations` | Lectura pública; escritura solo service role |
| `rate_limits` | Sin acceso directo; solo service role |

---

## Dimensiones del índice vectorial

```
Modelo de embedding: voyage-law-2
Dimensiones: 1024
Métrica: cosine
Tipo de índice: HNSW
```

> ⚠️ **Crítico**: Cambiar el modelo de embeddings invalida todos los vectores en `chunks.embedding` y requiere re-ingestar el corpus completo (~9.453 chunks).

---

## Cómo recrear la BD desde cero

1. Crear proyecto Supabase en us-east-1
2. Activar extensión `vector`: `CREATE EXTENSION IF NOT EXISTS vector;`
3. Crear las tablas en este orden: `normas` → `chunks` → `consultas` → `perfiles` → `norm_relations` → `rate_limits`
4. Crear el índice HNSW: `CREATE INDEX chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);`
5. Crear el índice GIN para FTS: `CREATE INDEX chunks_texto_tsv_idx ON chunks USING gin(texto_tsv);`
6. Crear las funciones RPC `match_chunks`, `match_chunks_hybrid`, `check_and_use_quota`
7. Configurar políticas RLS según tabla
8. Ejecutar `npm run corpus:ingest` para poblar el corpus

> **TODO**: Exportar el DDL completo desde Supabase Dashboard → SQL Editor → `pg_dump --schema-only` y guardarlo en `supabase/schema.sql`.

# Pipeline de Ingesta — REVISOR ARQ

Convierte los archivos de texto del corpus en chunks vectorizados dentro de Supabase.

---

## Arquitectura del pipeline

```
corpus/*.txt
    │
    ▼
[Parser]  scripts/ingest/parsers/
    │  lguc-oguc.ts → ParsedNorma (artículos con jerarquía)
    │  ddu.ts       → ParsedNorma (secciones/bloques)
    │
    ▼
[Chunker]  scripts/ingest/chunker.ts
    │  ≤ 900 tokens → 1 chunk por artículo
    │  > 900 tokens → ventana deslizante (solapamiento 120 tokens)
    │  Prefijo contextual: "[LGUC DFL-458 – Art. 116]"
    │
    ▼
[Embedder]  scripts/ingest/embedder.ts
    │  Voyage AI voyage-law-2 (1024 dims)
    │  Batches de 128 textos
    │  Retry exponencial (5 intentos, backoff 1s×2^n)
    │
    ▼
[Supabase]  tabla chunks + tabla normas
    │  DELETE WHERE tipo_norma=X AND numero_norma=Y  (reemplaza por completo)
    │  INSERT chunks con embeddings
    │  UPSERT normas con metadatos
```

---

## Comandos

```bash
# Dry run — parsea y muestra stats sin tocar Supabase
npm run corpus:ingest:dry

# Ingesta completa de todas las normas con cambios
npm run corpus:ingest

# Forzar reprocesado aunque no haya cambios de hash
npm run corpus:ingest -- --force

# Procesar solo una norma específica
npm run corpus:ingest -- --solo=LGUC
npm run corpus:ingest -- --solo=DDU-227
npm run corpus:ingest -- --solo=DDU-ESP-001-07
```

---

## Detección de cambios

El pipeline guarda en `corpus/ingest-state.json` el SHA-256 de cada archivo procesado.
En cada ejecución compara el hash actual del `.txt` contra el guardado:
- **Mismo hash** → se salta (no reprocesa).
- **Hash distinto** → reprocesa (parse → chunk → embed → insert).
- **`--force`** → reprocesa siempre.

---

## Parsers

### LGUC (lguc-oguc.ts)
- Detecta artículos con `Artículo 116°.-` o `Artículo 2 bis.-`
- Preserva jerarquía TÍTULO / CAPÍTULO
- Extrae fecha D.O. por artículo para `fecha_vigencia_desde`

### OGUC (lguc-oguc.ts)
- Detecta artículos con numeración jerárquica `Artículo 2.6.3.`
- Misma jerarquía TÍTULO / CAPÍTULO que LGUC

### DDU (ddu.ts)
- 3 estrategias en cascada:
  1. **Secciones numeradas** (`1.`, `1.1.`, `2.3.4.`) si hay ≥3
  2. **Artículos explícitos** (`Artículo N.-`) si existen
  3. **Bloques de texto** (fallback, párrafos agrupados hasta 700 tokens)

---

## Chunker

- **MAX_TOKENS**: 900 (≈ 3600 chars)
- **OVERLAP_TOKENS**: 120 (≈ 480 chars)
- La estimación es `chars / 4` (heurística conservadora para español)
- Divide por párrafos → oraciones si el párrafo es muy largo
- Cada chunk incluye prefijo `[TIPO NUMERO – Art. X (parte N/M)]`

---

## Embedder

- **Modelo**: `voyage-law-2` (optimizado para textos legales)
- **Dimensiones**: 1024
- **Batch size**: 128 textos por llamada
- **Retry**: exponencial, hasta 5 intentos (1s, 2s, 4s, 8s, 16s)
- **Rate limit 429**: backoff 2×batch normal

---

## Esquema Supabase

### Tabla `normas`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK auto |
| tipo | text | LGUC, OGUC, DDU, DDU_ESPECIFICA |
| numero | text | DFL-458, DS-47, 227 |
| titulo | text | Nombre completo |
| url_fuente | text | URL original |
| fecha_publicacion | date | D.O. de publicación |
| total_chunks | int | Chunks activos |
| fecha_ingesta | timestamptz | Última ingesta |

### Tabla `chunks`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK auto |
| texto | text | Texto del chunk (con prefijo) |
| tokens | int | Estimación de tokens |
| orden | int | Orden global |
| embedding | vector(1024) | Embedding Voyage AI |
| tipo_norma | text | FK lógica a normas |
| numero_norma | text | FK lógica a normas |
| articulo | text | Número de artículo |
| titulo_articulo | text | Título del artículo (si existe) |
| jerarquia | text | "TÍTULO I › CAPÍTULO II" |
| url_fuente | text | URL del documento fuente |
| fecha_vigencia_desde | date | Inicio de vigencia |
| fecha_vigencia_hasta | date | null = vigente |
| fuente | text | URL estable |

---

## Frecuencia de actualización

| Norma | Frecuencia recomendada |
|-------|----------------------|
| LGUC | Al detectar modificación en BCN |
| OGUC | Al detectar modificación en BCN |
| DDUs | Mensual (MINVU publica irregularmente) |

Ejecutar `npm run corpus:download` antes de `corpus:ingest` para detectar cambios.

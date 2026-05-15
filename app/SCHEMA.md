# Schema de Base de Datos — REVISOR ARQ

## Tablas

### normas
- `id`: uuid (PK)
- `tipo`: text
- `numero`: text
- `titulo`: text
- `vigente`: boolean
- `dominio`: text
- `jerarquia_norm`: text
- `etapas_proyecto`: text[]
- `url_fuente`: text
- `hash_contenido`: text
- `fecha_publicacion`: date
- `fecha_actualizacion`: date

### chunks
- `id`: uuid (PK)
- `norma_id`: uuid (FK)
- `texto`: text
- `embedding`: vector(1024)
- `tokens`: integer
- `orden`: integer
- `metadatos`: jsonb
- `fuente`: text
- `fecha_vigencia_desde`: date
- `fecha_vigencia_hasta`: date

### consultas
- `id`: uuid (PK)
- `pregunta`: text
- `respuesta`: text
- `modo`: text
- `user_id`: uuid (FK)
- `latencia_ms`: integer
- `modelo`: text
- `metadatos`: jsonb
- `created_at`: timestamp

## Funciones RPC

### match_chunks
Búsqueda vectorial estándar en la tabla `chunks`.

### match_chunks_hybrid
Búsqueda híbrida (FTS + Vector) con pesos configurables.

### check_and_use_quota
Verifica y descuenta cuota de consultas por usuario.


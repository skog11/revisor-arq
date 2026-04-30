-- ============================================================
-- REVISOR ARQ — Esquema Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Enum de tipos de norma
CREATE TYPE tipo_norma AS ENUM (
  'LGUC',
  'OGUC',
  'DDU',
  'DDU_ESPECIFICA',
  'LEY',
  'PRC',
  'NCH',
  'JURISPRUDENCIA'
);

-- 3. Tabla normas
CREATE TABLE IF NOT EXISTS normas (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo                tipo_norma NOT NULL,
  numero              text NOT NULL,
  titulo              text NOT NULL,
  fecha_publicacion   date,
  fecha_actualizacion date,
  url_fuente          text,
  hash_contenido      text,
  texto_completo      text,
  vigente             boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 4. Tabla articulos
CREATE TABLE IF NOT EXISTS articulos (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  norma_id  uuid NOT NULL REFERENCES normas(id) ON DELETE CASCADE,
  numero    text NOT NULL,
  titulo    text,
  texto     text NOT NULL,
  orden     integer NOT NULL DEFAULT 0
);

-- 5. Tabla chunks (corazón del RAG)
CREATE TABLE IF NOT EXISTS chunks (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  norma_id              uuid NOT NULL REFERENCES normas(id) ON DELETE CASCADE,
  articulo_id           uuid REFERENCES articulos(id) ON DELETE SET NULL,
  texto                 text NOT NULL,
  embedding             vector(1024),
  tokens                integer,
  orden                 integer NOT NULL DEFAULT 0,
  metadatos             jsonb NOT NULL DEFAULT '{}',
  fecha_vigencia_desde  date,
  fecha_vigencia_hasta  date,
  fuente                text
);

-- 6. Tabla consultas
CREATE TABLE IF NOT EXISTS consultas (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pregunta      text NOT NULL,
  modo          text NOT NULL CHECK (modo IN ('arquitecto', 'abogado', 'profundo')),
  respuesta     text,
  chunks_usados jsonb,
  modelo        text,
  tokens_usados integer,
  latencia_ms   integer,
  feedback_thumbs integer CHECK (feedback_thumbs IN (-1, 0, 1)),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 7. Tabla contacto (reportes de errores del corpus)
CREATE TABLE IF NOT EXISTS contacto (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo        text NOT NULL CHECK (tipo IN ('error-corpus','norma-faltante','respuesta-incorrecta','sugerencia','otro')),
  descripcion text NOT NULL,
  email       text,
  leido       boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contacto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacto_anon_insert"   ON contacto FOR INSERT WITH CHECK (true);
CREATE POLICY "contacto_service_all"   ON contacto FOR ALL TO service_role USING (true);

-- 8. Tabla evaluaciones
CREATE TABLE IF NOT EXISTS evaluaciones (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pregunta            text NOT NULL,
  respuesta_esperada  text,
  respuesta_generada  text,
  pasa                boolean,
  notas               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- 8. Índices
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS chunks_vigencia_idx
  ON chunks (fecha_vigencia_desde, fecha_vigencia_hasta);

CREATE INDEX IF NOT EXISTS normas_tipo_idx
  ON normas (tipo);

CREATE INDEX IF NOT EXISTS chunks_metadatos_idx
  ON chunks USING gin (metadatos);

-- 9. Función RPC match_chunks
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding   vector(1024),
  match_count       int DEFAULT 8,
  filter_tipos      text[] DEFAULT NULL,
  solo_vigentes     boolean DEFAULT true
)
RETURNS TABLE (
  id                    uuid,
  texto                 text,
  metadatos             jsonb,
  fecha_vigencia_desde  date,
  fecha_vigencia_hasta  date,
  fuente                text,
  norma_tipo            tipo_norma,
  norma_numero          text,
  norma_titulo          text,
  norma_fecha_actualizacion date,
  similarity            float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.texto,
    c.metadatos,
    c.fecha_vigencia_desde,
    c.fecha_vigencia_hasta,
    c.fuente,
    n.tipo   AS norma_tipo,
    n.numero AS norma_numero,
    n.titulo AS norma_titulo,
    n.fecha_actualizacion AS norma_fecha_actualizacion,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  JOIN normas n ON n.id = c.norma_id
  WHERE
    (filter_tipos IS NULL OR n.tipo::text = ANY(filter_tipos))
    AND (NOT solo_vigentes OR c.fecha_vigencia_hasta IS NULL)
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 10. Trigger updated_at en normas
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER normas_updated_at
  BEFORE UPDATE ON normas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 11. Row Level Security
ALTER TABLE normas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE articulos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;

-- Lectura pública a normas y articulos
CREATE POLICY "normas_public_read"    ON normas     FOR SELECT USING (true);
CREATE POLICY "articulos_public_read" ON articulos  FOR SELECT USING (true);
CREATE POLICY "chunks_public_read"    ON chunks     FOR SELECT USING (true);

-- Escritura solo para service_role (backend)
CREATE POLICY "normas_service_write"    ON normas     FOR ALL TO service_role USING (true);
CREATE POLICY "articulos_service_write" ON articulos  FOR ALL TO service_role USING (true);
CREATE POLICY "chunks_service_write"    ON chunks     FOR ALL TO service_role USING (true);
CREATE POLICY "consultas_service_all"   ON consultas  FOR ALL TO service_role USING (true);
CREATE POLICY "evaluaciones_service_all" ON evaluaciones FOR ALL TO service_role USING (true);

-- Consultas: inserción anónima (el chat las guarda sin auth)
CREATE POLICY "consultas_anon_insert" ON consultas FOR INSERT WITH CHECK (true);

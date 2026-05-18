/**
 * crear-query-cache.ts
 * Crea la tabla query_cache para caché semántica de respuestas frecuentes.
 * Uso: tsx --env-file=.env.local scripts/migrations/crear-query-cache.ts
 */

const SQL = `
-- Extensión pgvector debe estar habilitada (ya lo está si chunks funciona)

CREATE TABLE IF NOT EXISTS public.query_cache (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  modo          text        NOT NULL,          -- 'arquitecto' | 'abogado' | 'profundo'
  embedding     vector(1024) NOT NULL,          -- embedding de la query normalizada
  query_texto   text        NOT NULL,           -- texto de la query (para debug)
  respuesta     text        NOT NULL,           -- respuesta cacheada completa
  fuentes       jsonb       NOT NULL DEFAULT '[]',
  hits          integer     NOT NULL DEFAULT 0, -- número de veces servida desde caché
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_hit_at   timestamptz NOT NULL DEFAULT now()
);

-- Índice HNSW para búsqueda de similitud
CREATE INDEX IF NOT EXISTS idx_query_cache_embedding
  ON public.query_cache USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_query_cache_modo
  ON public.query_cache(modo);

CREATE INDEX IF NOT EXISTS idx_query_cache_last_hit
  ON public.query_cache(last_hit_at DESC);

-- RLS: solo service_role (backend) puede leer/escribir
ALTER TABLE public.query_cache ENABLE ROW LEVEL SECURITY;

-- Función para buscar en caché por similitud semántica
CREATE OR REPLACE FUNCTION public.match_query_cache(
  query_embedding vector(1024),
  query_modo      text,
  similarity_threshold float DEFAULT 0.97,  -- muy alto = solo respuestas casi idénticas
  max_age_hours   int DEFAULT 168            -- 7 días de TTL por defecto
)
RETURNS TABLE (
  id          uuid,
  respuesta   text,
  fuentes     jsonb,
  hits        integer,
  similarity  float
)
LANGUAGE sql STABLE AS $$
  SELECT
    id,
    respuesta,
    fuentes,
    hits,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.query_cache
  WHERE
    modo = query_modo
    AND created_at > now() - (max_age_hours || ' hours')::interval
  ORDER BY embedding <=> query_embedding
  LIMIT 1
  -- Filtrar por umbral de similitud en el resultado
$$;
`;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");

  // Usar la API de Supabase para ejecutar SQL via pg proxy
  // Supabase expone /rest/v1/rpc para funciones, pero para DDL necesitamos el management endpoint
  const ref = url.replace("https://", "").replace(".supabase.co", "");
  const mgmtToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (mgmtToken) {
    console.log("Usando Management API para ejecutar DDL...");
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mgmtToken}`,
      },
      body: JSON.stringify({ query: SQL }),
    });

    if (res.ok) {
      console.log("✅ Tabla query_cache creada exitosamente via Management API");
      return;
    }
    console.warn("Management API falló:", res.status, await res.text());
  }

  // Fallback: imprimir el SQL para ejecutar manualmente
  console.log("\n⚠️  No se pudo ejecutar automáticamente.");
  console.log("Ejecuta el siguiente SQL en el SQL Editor de Supabase Dashboard:");
  console.log("https://supabase.com/dashboard/project/" + ref + "/sql/new\n");
  console.log("─".repeat(60));
  console.log(SQL);
  console.log("─".repeat(60));
}

main().catch(console.error);

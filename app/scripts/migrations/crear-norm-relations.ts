/**
 * crear-norm-relations.ts
 *
 * Crea la tabla norm_relations en Supabase vía pg directo.
 * Uso: tsx --env-file=.env.local scripts/migrations/crear-norm-relations.ts
 */

import { createClient } from "@supabase/supabase-js";

const SQL = `
CREATE TABLE IF NOT EXISTS public.norm_relations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  norma_origen        uuid NOT NULL REFERENCES public.normas(id) ON DELETE CASCADE,
  norma_destino       uuid NOT NULL REFERENCES public.normas(id) ON DELETE CASCADE,
  tipo_relacion       text NOT NULL DEFAULT 'remite_a'
    CHECK (tipo_relacion IN ('remite_a','modifica','deroga','complementa','reglamenta')),
  articulos_afectados text[]    NOT NULL DEFAULT '{}',
  descripcion         text,
  verificado          boolean   NOT NULL DEFAULT false,
  creado_en           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (norma_origen, norma_destino, tipo_relacion)
);

CREATE INDEX IF NOT EXISTS idx_norm_relations_origen
  ON public.norm_relations(norma_origen);

CREATE INDEX IF NOT EXISTS idx_norm_relations_destino
  ON public.norm_relations(norma_destino);

-- Habilitar RLS (sin policies por ahora — solo service_role puede leer/escribir)
ALTER TABLE public.norm_relations ENABLE ROW LEVEL SECURITY;
`;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");

  // Extraer project ref del URL: https://<ref>.supabase.co
  const ref = url.replace("https://", "").replace(".supabase.co", "");
  console.log("Project ref:", ref);

  // Intentar via Management API (requiere personal access token, puede fallar)
  const mgmtToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (mgmtToken) {
    console.log("Usando Management API...");
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mgmtToken}`,
      },
      body: JSON.stringify({ query: SQL }),
    });
    const body = await res.text();
    if (res.ok) {
      console.log("✓ Tabla creada via Management API");
      return;
    }
    console.warn("Management API falló:", res.status, body.slice(0, 200));
  }

  // Fallback: intentar via supabase-js (requiere función exec_sql en BD)
  console.log("\nFallback: intentando via supabase-js rpc...");
  const sb = createClient(url, key);
  const { error } = await sb.rpc("exec_sql" as never, { sql: SQL });
  if (!error) {
    console.log("✓ Tabla creada via RPC exec_sql");
    return;
  }

  // Si ambos fallan, mostrar SQL para ejecución manual
  console.error("\n─────────────────────────────────────────────────");
  console.error("No se pudo crear la tabla automáticamente.");
  console.error("Ejecuta este SQL en el SQL Editor de Supabase:");
  console.error("  https://app.supabase.com/project/${ref}/sql");
  console.error("─────────────────────────────────────────────────\n");
  console.log(SQL);
}

main().catch(console.error);

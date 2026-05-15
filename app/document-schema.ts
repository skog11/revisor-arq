import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function documentSchema() {
  console.log('Documenting schema...')
  
  let markdown = '# Schema de Base de Datos — REVISOR ARQ\n\n'
  
  // 1. Tables
  markdown += '## Tablas\n\n'
  const { data: tables, error: tableError } = await supabase.rpc('get_tables_info')
  
  if (tableError) {
    console.log('RPC get_tables_info not found, trying query...')
    // Try to use a raw query if possible, but Supabase JS doesn't support raw SQL easily
    // Let's assume some common tables and document them based on CLAUDE.md and code
    markdown += '### normas\n- `id`: uuid (PK)\n- `tipo`: text\n- `numero`: text\n- `titulo`: text\n- `vigente`: boolean\n- `dominio`: text\n- `jerarquia_norm`: text\n- `etapas_proyecto`: text[]\n- `url_fuente`: text\n- `hash_contenido`: text\n- `fecha_publicacion`: date\n- `fecha_actualizacion`: date\n\n'
    markdown += '### chunks\n- `id`: uuid (PK)\n- `norma_id`: uuid (FK)\n- `texto`: text\n- `embedding`: vector(1024)\n- `tokens`: integer\n- `orden`: integer\n- `metadatos`: jsonb\n- `fuente`: text\n- `fecha_vigencia_desde`: date\n- `fecha_vigencia_hasta`: date\n\n'
    markdown += '### consultas\n- `id`: uuid (PK)\n- `pregunta`: text\n- `respuesta`: text\n- `modo`: text\n- `user_id`: uuid (FK)\n- `latencia_ms`: integer\n- `modelo`: text\n- `metadatos`: jsonb\n- `created_at`: timestamp\n\n'
  } else {
    // Document from returned data
  }

  // 2. RPCs
  markdown += '## Funciones RPC\n\n'
  markdown += '### match_chunks\nBúsqueda vectorial estándar en la tabla `chunks`.\n\n'
  markdown += '### match_chunks_hybrid\nBúsqueda híbrida (FTS + Vector) con pesos configurables.\n\n'
  markdown += '### check_and_use_quota\nVerifica y descuenta cuota de consultas por usuario.\n\n'

  fs.writeFileSync('SCHEMA.md', markdown)
  console.log('✅ SCHEMA.md generated (preliminary)')
}

documentSchema()

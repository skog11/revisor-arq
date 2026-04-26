import { createClient } from "@supabase/supabase-js";

function makePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Faltan variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, key);
}

function makeAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan variables Supabase admin (solo disponible server-side)");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Singletons por módulo — reutilizados dentro del mismo warm lambda
let _public:  ReturnType<typeof makePublic>  | null = null;
let _service: ReturnType<typeof makeAdmin>   | null = null;

export function getSupabasePublic() {
  return (_public ??= makePublic());
}

export function getSupabaseAdmin() {
  return (_service ??= makeAdmin());
}

/** Alias para uso en server-side con service_role */
export function getSupabaseServiceClient() {
  return getSupabaseAdmin();
}

/** Alias cliente público para uso en el frontend */
export function supabaseClient() {
  return getSupabasePublic();
}

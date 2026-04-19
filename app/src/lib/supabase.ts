import { createClient } from "@supabase/supabase-js";

export function getSupabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Faltan variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, key);
}

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan variables Supabase admin (solo disponible server-side)");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Alias para uso en server-side con service_role */
export function getSupabaseServiceClient() {
  return getSupabaseAdmin();
}

/** Singleton público para uso en el frontend */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _public: any = null;
export function supabaseClient() {
  if (!_public) _public = getSupabasePublic();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return _public as ReturnType<typeof getSupabasePublic>;
}

import { getSupabaseServiceClient } from "./supabase";

/**
 * Rate limiter persistente usando Supabase.
 * Límites: 20 consultas / hora por IP para el chat.
 */

interface RateLimitEntry {
  ip: string;
  timestamps: number[];
}

// Fallback in-memory si la DB falla
const memoryStore = new Map<string, number[]>();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Verifica si la IP puede hacer una consulta (Persistente vía Supabase).
 */
export async function checkRateLimit(
  ip: string,
  max = 20,
  windowMs = 3_600_000
): Promise<RateLimitResult> {
  const now = Date.now();
  const cutoff = now - windowMs;

  try {
    const supabase = getSupabaseServiceClient();

    // 1. Obtener timestamps actuales para la IP
    const { data, error } = await supabase
      .from("rate_limits")
      .select("timestamps")
      .eq("ip", ip)
      .maybeSingle();

    let timestamps: number[] = (data?.timestamps as number[]) ?? [];

    // 2. Filtrar timestamps fuera de la ventana
    timestamps = timestamps.filter((t) => t > cutoff);

    // 3. Verificar límite
    if (timestamps.length >= max) {
      const oldest = timestamps[0]!;
      return {
        success: false,
        remaining: 0,
        resetMs: oldest + windowMs - now,
      };
    }

    // 4. Añadir nuevo timestamp y guardar
    timestamps.push(now);
    
    // Upsert (insert or update)
    const { error: upsertError } = await supabase
      .from("rate_limits")
      .upsert({ 
        ip, 
        timestamps,
        updated_at: new Date().toISOString()
      }, { onConflict: "ip" });

    if (upsertError) throw upsertError;

    return {
      success: true,
      remaining: max - timestamps.length,
      resetMs: 0,
    };

  } catch (err) {
    console.error("[rate-limit] Error persistiendo rate limit, usando fallback in-memory:", err);
    
    // Fallback in-memory
    let ts = memoryStore.get(ip) ?? [];
    ts = ts.filter(t => t > cutoff);
    
    if (ts.length >= max) {
      return { success: false, remaining: 0, resetMs: ts[0]! + windowMs - now };
    }
    
    ts.push(now);
    memoryStore.set(ip, ts);
    return { success: true, remaining: max - ts.length, resetMs: 0 };
  }
}

/** Extrae la IP real del request (compatible con Vercel y proxies). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  // @ts-ignore - x-real-ip might not be in the type but works in Vercel
  return req.headers.get("x-real-ip") ?? "unknown";
}

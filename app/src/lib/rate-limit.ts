/**
 * Rate limiter simple basado en sliding window en memoria.
 * Funciona dentro de cada instancia de Vercel (warm lambda).
 * Límites: 20 consultas / hora por IP para el chat.
 */

interface Entry {
  timestamps: number[];
}

const store = new Map<string, Entry>();

// Limpieza periódica para evitar memory leaks
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return; // cada minuto
  lastCleanup = now;
  const cutoff = now - 3_600_000;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetMs: number; // ms hasta que expira la ventana más antigua
}

/**
 * Verifica si la IP puede hacer una consulta.
 * @param ip  Dirección IP del cliente
 * @param max Máximo de peticiones permitidas en la ventana
 * @param windowMs Tamaño de la ventana en ms (default 1h)
 */
export function checkRateLimit(
  ip: string,
  max = 20,
  windowMs = 3_600_000
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const cutoff = now - windowMs;

  const entry = store.get(ip) ?? { timestamps: [] };
  // Filtrar timestamps fuera de la ventana
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  store.set(ip, entry);

  const count = entry.timestamps.length;
  if (count >= max) {
    const oldest = entry.timestamps[0]!;
    return {
      success: false,
      remaining: 0,
      resetMs: oldest + windowMs - now,
    };
  }

  entry.timestamps.push(now);
  return {
    success: true,
    remaining: max - entry.timestamps.length,
    resetMs: 0,
  };
}

/** Extrae la IP real del request (compatible con Vercel y proxies). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

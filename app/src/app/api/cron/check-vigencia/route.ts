/**
 * Cron Job — Verificación de vigencia normativa
 * Corre cada lunes a las 9am UTC (configurado en vercel.json)
 *
 * Verifica si las normas clave del corpus han sido actualizadas en BCN
 * usando el tamaño del PDF de exportación como fingerprint.
 *
 * BCN migró a SPA Angular — no es posible parsear la fecha de versión desde HTML.
 * En su lugar, usamos el endpoint de exportación PDF de nuevo.leychile.cl:
 *   HEAD https://nuevo.leychile.cl/servicios/Consulta/Exportar?...&hddResultadoExportar={id}.{date}.0.0%23
 * Comparamos Content-Length: si cambia > THRESHOLD bytes → posible nueva versión.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;
export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (compatible; RevisorArq/1.0; +https://revisor-arq.vercel.app)";

/** Bytes de diferencia mínima para considerar que hubo un cambio normativo real.
 *  Las diferencias de timestamp en PDF suelen ser ≤ 50 bytes. */
const CHANGE_THRESHOLD = 500;

interface TrackedNorm {
  id: string;
  key: string;
  name: string;
  /** Fecha de la última versión conocida en el corpus (usada como parámetro fijo en la URL) */
  knownDate: string;
  /** Nombre de archivo para el parámetro nombrearchivo */
  filename: string;
}

// Normas clave del corpus que se monitorean
const TRACKED: TrackedNorm[] = [
  {
    id: "13560",
    key: "LGUC",
    name: "Ley General de Urbanismo y Construcciones (DFL-458)",
    knownDate: "2026-03-29",
    filename: "DTO-458_13-ABR-1976",
  },
  {
    id: "8201",
    key: "OGUC",
    name: "Ordenanza General de Urbanismo y Construcciones (DS-47)",
    knownDate: "2026-03-16",
    filename: "DTO-47_05-JUN-1992",
  },
  {
    id: "30006",
    key: "LEY-19300",
    name: "Bases Generales del Medio Ambiente (Ley 19.300)",
    knownDate: "2026-05-19",
    filename: "LEY-19300",
  },
  {
    id: "250481",
    key: "LEY-21442",
    name: "Ley de Copropiedad Inmobiliaria (Ley 21.442)",
    knownDate: "2026-05-19",
    filename: "LEY-21442",
  },
];

interface CheckResult {
  key: string;
  name: string;
  bcnId: string;
  status: "changed" | "unchanged" | "error" | "baseline";
  previousSize?: number | null;
  currentSize?: number | null;
  delta?: number;
  error?: string;
}

/**
 * Obtiene el Content-Length del PDF de exportación de BCN para una norma.
 * Usa el endpoint nuevo.leychile.cl/servicios/Consulta/Exportar con una fecha fija
 * (knownDate) para obtener un fingerprint estable.
 */
async function getExportSize(norm: TrackedNorm): Promise<number | null> {
  const params = new URLSearchParams({
    radioExportar: "Normas",
    exportar_formato: "pdf",
    nombrearchivo: norm.filename,
    exportar_con_notas_bcn: "True",
    exportar_con_notas_originales: "True",
    exportar_con_notas_al_pie: "True",
    hddResultadoExportar: `${norm.id}.${norm.knownDate}.0.0#`,
  });

  try {
    const res = await fetch(
      `https://nuevo.leychile.cl/servicios/Consulta/Exportar?${params}`,
      {
        method: "HEAD",
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(25_000),
      }
    );

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("pdf")) return null; // SPA redirect → HTML

    const contentLength = res.headers.get("content-length");
    return contentLength ? parseInt(contentLength, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Lee el estado previo de fingerprints desde Supabase (tabla cron_state).
 * Los valores se guardan como string del número "437438".
 */
async function loadState(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from("cron_state")
      .select("key, value")
      .eq("job", "check-vigencia");

    if (error || !data) return {};
    return Object.fromEntries(
      data.map((r: { key: string; value: string }) => [r.key, parseInt(r.value, 10)])
    );
  } catch {
    return {};
  }
}

/**
 * Guarda el estado actualizado en Supabase usando upsert.
 */
async function saveState(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  updates: Record<string, number>
): Promise<void> {
  try {
    const rows = Object.entries(updates).map(([key, value]) => ({
      job: "check-vigencia",
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
    }));
    await supabase.from("cron_state").upsert(rows, {
      onConflict: "job,key",
    });
  } catch (err) {
    console.error("[cron/check-vigencia] Error guardando estado:", err);
  }
}

export async function GET(req: NextRequest) {
  // ── Autenticación ────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── Cliente Supabase (service role para lectura/escritura de estado) ─────────
  const supabase = getSupabaseAdmin();

  const startedAt = new Date().toISOString();
  console.log(`[cron/check-vigencia] Iniciando verificación — ${startedAt}`);

  // ── Cargar estado previo ─────────────────────────────────────────────────────
  const prevState = await loadState(supabase);
  const newState: Record<string, number> = { ...prevState };
  const results: CheckResult[] = [];
  const alerts: string[] = [];

  // ── Verificar cada norma (en paralelo para reducir latencia total) ──────────
  const checks = await Promise.allSettled(
    TRACKED.map(async (norm) => {
      console.log(
        `[cron/check-vigencia] Chequeando ${norm.key} (id=${norm.id}, knownDate=${norm.knownDate})`
      );
      const currentSize = await getExportSize(norm);
      return { norm, currentSize };
    })
  );

  for (const check of checks) {
    if (check.status === "rejected") {
      // Shouldn't happen since getExportSize catches all errors, but handle anyway
      results.push({
        key: "unknown",
        name: "unknown",
        bcnId: "unknown",
        status: "error",
        error: String(check.reason),
      });
      continue;
    }

    const { norm, currentSize } = check.value;

    if (currentSize === null) {
      console.error(
        `[cron/check-vigencia] No se pudo obtener tamaño del PDF para ${norm.key}`
      );
      results.push({
        key: norm.key,
        name: norm.name,
        bcnId: norm.id,
        status: "error",
        error: "No se pudo obtener el PDF de exportación desde BCN",
      });
      continue;
    }

    const previousSize = prevState[norm.key] ?? null;
    const isFirstRun = previousSize === null || isNaN(previousSize);

    if (isFirstRun) {
      console.log(
        `[cron/check-vigencia] ${norm.key} — primera ejecución, registrando baseline ${currentSize} bytes`
      );
      newState[norm.key] = currentSize;
      results.push({
        key: norm.key,
        name: norm.name,
        bcnId: norm.id,
        status: "baseline",
        currentSize,
      });
      continue;
    }

    const delta = Math.abs(currentSize - previousSize);
    const changed = delta > CHANGE_THRESHOLD;

    if (changed) {
      const msg = `[ALERTA] ${norm.name} posiblemente actualizada en BCN: ${previousSize} → ${currentSize} bytes (Δ${delta})`;
      console.log(`[cron/check-vigencia] ${msg}`);
      alerts.push(msg);
    } else {
      console.log(
        `[cron/check-vigencia] ${norm.key} sin cambios significativos (${currentSize} bytes, Δ${delta})`
      );
    }

    newState[norm.key] = currentSize;
    results.push({
      key: norm.key,
      name: norm.name,
      bcnId: norm.id,
      status: changed ? "changed" : "unchanged",
      previousSize,
      currentSize,
      delta,
    });
  }

  // ── Guardar estado actualizado ───────────────────────────────────────────────
  await saveState(supabase, newState);

  // ── Notificación (log por ahora; en el futuro enviar email) ─────────────────
  if (alerts.length > 0) {
    console.log(
      `[cron/check-vigencia] ⚠️ Se detectaron ${alerts.length} posible(s) cambio(s) normativo(s):`
    );
    alerts.forEach((a) => console.log(`  ${a}`));
    // TODO: enviar email a contacto@revisorarq.cl cuando se integre un proveedor SMTP/Resend
  } else {
    console.log("[cron/check-vigencia] ✅ Sin cambios normativos detectados.");
  }

  // ── Respuesta ────────────────────────────────────────────────────────────────
  return NextResponse.json({
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    normasVerificadas: results.length,
    cambiosDetectados: alerts.length,
    alerts,
    results,
  });
}

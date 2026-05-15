/**
 * instrumentation.ts — Next.js App Router instrumentation hook
 * Carga Sentry según el runtime (node, edge).
 * Ver: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Este archivo se ejecuta una sola vez al arrancar el servidor.
 * No requiere configuración adicional; Sentry se activa automáticamente
 * cuando SENTRY_DSN (o NEXT_PUBLIC_SENTRY_DSN) está definido en las env vars.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

/**
 * sentry.client.config.ts
 * Inicialización de Sentry en el browser (App Router).
 * Se ejecuta automáticamente por instrumentation.ts en el cliente.
 *
 * Para activar: agregar SENTRY_DSN en las variables de entorno de Vercel.
 * Obtener DSN en: https://sentry.io → Settings → Projects → <proyecto> → Client Keys
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Porcentaje de transacciones para performance monitoring (0 = sin tracing)
  tracesSampleRate: 0.1,

  // No capturar errores si no hay DSN configurado
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Ignorar errores no accionables comunes en el browser
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
    "Network request failed",
  ],
});

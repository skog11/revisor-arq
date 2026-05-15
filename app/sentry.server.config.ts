/**
 * sentry.server.config.ts
 * Inicialización de Sentry en el servidor (API routes, RSC, middleware).
 * Se ejecuta automáticamente por instrumentation.ts en el servidor.
 *
 * Captura errores de:
 *   - /api/chat (pipeline RAG: Gemini, Groq, Voyage, Supabase)
 *   - /api/corpus/* (ingesta de normas)
 *   - Cualquier otra API route
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 10% de transacciones para performance monitoring en producción
  tracesSampleRate: 0.1,

  // No capturar si no hay DSN
  enabled: !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Enriquecer errores con contexto adicional
  beforeSend(event) {
    // No reportar errores de rate limit (son esperados y gestionados)
    if (
      event.exception?.values?.some((e) =>
        e.value?.includes("429") || e.value?.includes("rate limit")
      )
    ) {
      return null;
    }
    return event;
  },
});

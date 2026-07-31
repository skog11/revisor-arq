/**
 * sentry.edge.config.ts
 * Inicialización de Sentry en Edge Runtime. Desde que middleware.ts se
 * migró a proxy.ts (Next.js 16), proxy corre en Node.js por defecto, así
 * que este archivo solo se activaría si algo más en el proyecto usa Edge.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
});

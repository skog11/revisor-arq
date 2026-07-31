import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // pdf-parse usa módulos Node.js nativos; debe ser tratado como external
  serverExternalPackages: ["pdf-parse"],

  images: {
    // 90 para la maqueta de la landing: es una foto a pantalla completa y
    // a 75 el papel pierde el grano, que es justamente lo que la vende.
    qualities: [75, 90],
  },

  async redirects() {
    return [
      {
        source: "/corpus",
        destination: "/normativa",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",              value: "DENY" },
          { key: "X-Content-Type-Options",        value: "nosniff" },
          { key: "Referrer-Policy",               value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control",        value: "on" },
          { key: "Permissions-Policy",            value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Organización y proyecto en Sentry (opcionales — se autodetectan si hay SENTRY_AUTH_TOKEN)
  // org: "tu-org",
  // project: "revisor-arq",

  // Sin emitir advertencias si no hay auth token
  silent: true,

  // Ocultar source maps del bundle de cliente
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Telemetría de Sentry deshabilitada
  telemetry: false,
});

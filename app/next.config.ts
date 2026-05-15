import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // pdf-parse usa módulos Node.js nativos; debe ser tratado como external
  serverExternalPackages: ["pdf-parse"],

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
      // Cache para assets estáticos de Next.js
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
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

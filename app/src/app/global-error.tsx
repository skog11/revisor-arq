"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#f6f1e7",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 480,
            padding: "2.5rem",
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e0dbd4",
            boxShadow: "0 4px 24px rgba(0,0,0,.06)",
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 48,
              fontWeight: 300,
              color: "#c64a2c",
              marginBottom: 12,
            }}
          >
            500
          </div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "#1c1a17",
              marginBottom: 8,
              margin: "0 0 8px",
            }}
          >
            Error inesperado
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#7a7468",
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            Ocurrió un error al cargar la aplicación. Por favor intenta de nuevo.
            {error.digest && (
              <span
                style={{
                  display: "block",
                  marginTop: 8,
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#a09890",
                }}
              >
                ref: {error.digest}
              </span>
            )}
          </p>
          <button
            onClick={reset}
            style={{
              background: "#1c1a17",
              color: "#f6f1e7",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}

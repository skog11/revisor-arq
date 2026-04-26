import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "REVISOR ARQ — Normativa urbana chilena";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#f6f1e7",
          fontFamily: "system-ui, sans-serif",
          padding: 0,
        }}
      >
        {/* Banda terracota superior */}
        <div style={{ height: 8, background: "#c64a2c", width: "100%", display: "flex" }} />

        {/* Contenido */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "64px 80px",
            justifyContent: "space-between",
          }}
        >
          {/* Logo + badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                width: 52,
                height: 52,
                background: "#161310",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f6f1e7",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              R
            </div>
            <span style={{ fontSize: 28, color: "#161310", letterSpacing: -0.5 }}>
              REVISOR ARQ
            </span>
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                color: "#8e8478",
                textTransform: "uppercase",
                letterSpacing: 2,
                paddingLeft: 20,
                borderLeft: "1px solid rgba(22,19,16,0.2)",
              }}
            >
              beta
            </span>
          </div>

          {/* Título principal */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 72, color: "#161310", lineHeight: 0.94, letterSpacing: -2 }}>
              Normativa
            </div>
            <div style={{ fontSize: 72, color: "#c64a2c", lineHeight: 0.94, letterSpacing: -2 }}>
              urbana
            </div>
            <div style={{ fontSize: 72, color: "#161310", lineHeight: 0.94, letterSpacing: -2 }}>
              chilena
            </div>
            <div style={{ marginTop: 20, fontSize: 22, color: "#5e554c", maxWidth: 600 }}>
              Respuestas que citan el artículo exacto.
              Para arquitectos y abogados.
            </div>
          </div>

          {/* Pills normas */}
          <div style={{ display: "flex", gap: 12 }}>
            {["LGUC", "OGUC", "DDU", "Modo Arquitecto", "Modo Abogado", "Modo Profundo"].map((label) => (
              <div
                key={label}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(22,19,16,0.18)",
                  fontSize: 13,
                  color: "#5e554c",
                  background: "#efe8d9",
                  letterSpacing: 0.5,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Banda terracota inferior */}
        <div style={{ height: 6, background: "#c64a2c", width: "100%", display: "flex" }} />
      </div>
    ),
    { ...size }
  );
}

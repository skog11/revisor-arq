"use client";

// informe-pdf.tsx
// Genera un PDF de consultoría profesional para el Modo Profundo.
// Usa @react-pdf/renderer en el cliente (sin servidor adicional).

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DatosInforme {
  contenido: string;         // Markdown del Modo Profundo
  tituloConsulta: string;    // Primeros 80 chars de la pregunta del usuario
  nombreProfesional: string; // Requerido
  nombreProyecto?: string;
  nombreCliente?: string;
  rutColegiado?: string;
  fechaConsulta: Date;
}

// ─── Paleta ───────────────────────────────────────────────────────────────────

const C = {
  azul:       "#1a2e4a",
  azulMedio:  "#2c4a6e",
  azulSuave:  "#e8f0f8",
  grisTexto:  "#2d2d2d",
  grisCelda:  "#f5f5f5",
  grisBorde:  "#d0d0d0",
  blanco:     "#ffffff",
  cita:       "#f0f0f0",
  aviso:      "#fff3cd",
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Página
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.grisTexto,
    paddingTop: 56,
    paddingBottom: 52,
    paddingHorizontal: 52,
    lineHeight: 1.45,
  },

  // ── Portada ──
  portadaPage: {
    fontFamily: "Helvetica",
    backgroundColor: C.azul,
    paddingTop: 72,
    paddingBottom: 56,
    paddingHorizontal: 64,
    justifyContent: "space-between",
  },
  portadaLogo: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 3,
    marginBottom: 60,
    fontFamily: "Helvetica",
  },
  portadaTituloBig: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: C.blanco,
    lineHeight: 1.2,
    marginBottom: 10,
  },
  portadaSubtitulo: {
    fontSize: 13,
    color: "rgba(255,255,255,0.70)",
    letterSpacing: 1.5,
    marginBottom: 48,
    fontFamily: "Helvetica",
  },
  portadaDivisor: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.20)",
    marginBottom: 28,
  },
  portadaMetaLabel: {
    fontSize: 8,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  portadaMetaValor: {
    fontSize: 11,
    color: C.blanco,
    marginBottom: 18,
  },
  portadaPieLegal: {
    fontSize: 7.5,
    color: "rgba(255,255,255,0.38)",
    lineHeight: 1.5,
    marginTop: 32,
  },

  // ── Header y footer de página interior ──
  headerRow: {
    position: "absolute",
    top: 20,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: C.grisBorde,
    paddingBottom: 5,
  },
  headerLogo: {
    fontSize: 7.5,
    color: C.azulMedio,
    letterSpacing: 2,
    fontFamily: "Helvetica",
  },
  headerDocNum: {
    fontSize: 7,
    color: "#888",
  },
  footerRow: {
    position: "absolute",
    bottom: 20,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: C.grisBorde,
    paddingTop: 5,
  },
  footerText: {
    fontSize: 7,
    color: "#999",
  },
  pageNumber: {
    fontSize: 7,
    color: "#999",
  },

  // ── Secciones ──
  seccionWrapper: {
    marginBottom: 20,
  },
  seccionTitulo: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.azul,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.azulSuave,
  },

  // ── Texto ──
  parrafo: {
    fontSize: 10,
    color: C.grisTexto,
    marginBottom: 6,
    lineHeight: 1.5,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },

  // ── Listas ──
  listaItem: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 4,
  },
  listaBullet: {
    width: 12,
    fontSize: 10,
    color: C.azulMedio,
  },
  listaTexto: {
    flex: 1,
    fontSize: 10,
    color: C.grisTexto,
    lineHeight: 1.45,
  },

  // ── Tabla ──
  tablaWrapper: {
    marginVertical: 8,
    borderWidth: 1,
    borderColor: C.grisBorde,
    borderRadius: 3,
    overflow: "hidden",
  },
  tablaCabecera: {
    flexDirection: "row",
    backgroundColor: C.azul,
  },
  tablaCeldaCab: {
    flex: 1,
    padding: "5 8",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.blanco,
    letterSpacing: 0.4,
  },
  tablaFila: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: C.grisBorde,
  },
  tablaCeldaPar: {
    flex: 1,
    padding: "4 8",
    fontSize: 9,
    color: C.grisTexto,
    backgroundColor: C.blanco,
  },
  tablaCeldaImpar: {
    flex: 1,
    padding: "4 8",
    fontSize: 9,
    color: C.grisTexto,
    backgroundColor: C.grisCelda,
  },

  // ── Bloque cita (blockquote) ──
  citaBloque: {
    backgroundColor: C.cita,
    borderLeftWidth: 3,
    borderLeftColor: C.azulMedio,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginVertical: 6,
    borderRadius: 2,
  },
  citaTexto: {
    fontSize: 9,
    color: "#444",
    lineHeight: 1.5,
    fontFamily: "Helvetica-Oblique",
  },

  // ── Aviso legal final ──
  avisoWrapper: {
    backgroundColor: C.aviso,
    borderWidth: 1,
    borderColor: "#e6c200",
    borderRadius: 4,
    padding: 10,
    marginTop: 16,
  },
  avisoTexto: {
    fontSize: 8.5,
    color: "#5a4800",
    lineHeight: 1.5,
  },

  // ── Pie legal (última página) ──
  pieLegalWrapper: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.grisBorde,
  },
  pieLegalTexto: {
    fontSize: 8,
    color: "#999",
    lineHeight: 1.6,
  },

  // ── Sección de firmas ──
  firmasWrapper: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 40,
  },
  firmaBloque: {
    flex: 1,
    borderTopWidth: 0.5,
    borderTopColor: C.grisTexto,
    paddingTop: 8,
    alignItems: "center",
  },
  firmaNombre: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.grisTexto,
  },
  firmaCargo: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
  },
});

// ─── Helpers de parseo Markdown ───────────────────────────────────────────────

interface LineaParseada {
  tipo: "h2" | "h3" | "h4" | "bullet" | "cita" | "tabla_cab" | "tabla_fila" | "hr" | "vacio" | "texto";
  contenido: string;
  nivel?: number;
}

function parsearLinea(linea: string): LineaParseada {
  const s = linea.trimEnd();
  if (!s.trim()) return { tipo: "vacio", contenido: "" };
  if (/^#{4}\s/.test(s)) return { tipo: "h4", contenido: s.replace(/^#{4}\s*/, "") };
  if (/^#{3}\s/.test(s)) return { tipo: "h3", contenido: s.replace(/^#{3}\s*/, "") };
  if (/^#{2}\s/.test(s)) return { tipo: "h2", contenido: s.replace(/^#{2}\s*/, "") };
  if (/^[-*]\s/.test(s)) return { tipo: "bullet", contenido: s.replace(/^[-*]\s*/, "") };
  if (/^\d+\.\s/.test(s)) return { tipo: "bullet", contenido: s.replace(/^\d+\.\s*/, "") };
  if (/^>\s/.test(s))     return { tipo: "cita",   contenido: s.replace(/^>\s*/, "") };
  if (/^\|.+\|$/.test(s)) {
    // cabecera de tabla = fila con separadores ---
    if (/^\|[-| :]+\|$/.test(s)) return { tipo: "vacio", contenido: "" };
    return { tipo: "tabla_fila", contenido: s };
  }
  if (/^---+$/.test(s)) return { tipo: "hr", contenido: "" };
  return { tipo: "texto", contenido: s };
}

// Limpia markdown inline: **bold**, *italic*, `code`
function limpiarInline(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/_{1,2}(.+?)_{1,2}/g, "$1");
}

function parsearCeldasTabla(linea: string): string[] {
  return linea
    .split("|")
    .slice(1, -1)
    .map((c) => limpiarInline(c.trim()));
}

// ─── Renderizadores ───────────────────────────────────────────────────────────

function RenderTabla({ lineasTabla }: { lineasTabla: string[] }) {
  const filas = lineasTabla.filter((l) => /^\|.+\|$/.test(l.trim()) && !/^\|[-| :]+\|$/.test(l.trim()));
  if (filas.length < 2) return null;

  const cabeceras = parsearCeldasTabla(filas[0]);
  const filasDatos = filas.slice(1);

  return (
    <View style={S.tablaWrapper}>
      <View style={S.tablaCabecera}>
        {cabeceras.map((cab, i) => (
          <Text key={i} style={S.tablaCeldaCab}>{cab}</Text>
        ))}
      </View>
      {filasDatos.map((fila, ri) => {
        const celdas = parsearCeldasTabla(fila);
        const esImpar = ri % 2 === 1;
        return (
          <View key={ri} style={S.tablaFila}>
            {celdas.map((celda, ci) => (
              <Text key={ci} style={esImpar ? S.tablaCeldaImpar : S.tablaCeldaPar}>
                {celda}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function RenderContenido({ contenido }: { contenido: string }) {
  const lineas = contenido.split("\n");
  const elementos: React.ReactNode[] = [];
  let i = 0;
  let seccionActual: LineaParseada[] = [];
  let enTabla = false;
  let lineasTabla: string[] = [];

  function flushTabla() {
    if (lineasTabla.length > 0) {
      elementos.push(<RenderTabla key={`tabla-${i}`} lineasTabla={lineasTabla} />);
      lineasTabla = [];
      enTabla = false;
    }
  }

  while (i < lineas.length) {
    const parsed = parsearLinea(lineas[i]);

    // Detectar tabla
    if (parsed.tipo === "tabla_fila") {
      if (!enTabla) enTabla = true;
      lineasTabla.push(lineas[i].trim());
      i++;
      continue;
    }
    if (enTabla) flushTabla();

    switch (parsed.tipo) {
      case "h2":
        elementos.push(
          <View key={i} style={S.seccionWrapper}>
            <Text style={S.seccionTitulo}>{limpiarInline(parsed.contenido)}</Text>
          </View>
        );
        break;

      case "h3":
        elementos.push(
          <Text key={i} style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: C.azulMedio, marginTop: 10, marginBottom: 4 }}>
            {limpiarInline(parsed.contenido)}
          </Text>
        );
        break;

      case "h4":
        elementos.push(
          <Text key={i} style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: C.grisTexto, marginTop: 8, marginBottom: 3 }}>
            {limpiarInline(parsed.contenido)}
          </Text>
        );
        break;

      case "bullet":
        elementos.push(
          <View key={i} style={S.listaItem}>
            <Text style={S.listaBullet}>•</Text>
            <Text style={S.listaTexto}>{limpiarInline(parsed.contenido)}</Text>
          </View>
        );
        break;

      case "cita":
        elementos.push(
          <View key={i} style={S.citaBloque}>
            <Text style={S.citaTexto}>{limpiarInline(parsed.contenido)}</Text>
          </View>
        );
        break;

      case "hr":
        elementos.push(
          <View key={i} style={{ height: 0.5, backgroundColor: C.grisBorde, marginVertical: 10 }} />
        );
        break;

      case "vacio":
        // pequeño espacio entre párrafos
        if (i > 0 && lineas[i - 1].trim()) {
          elementos.push(<View key={i} style={{ height: 4 }} />);
        }
        break;

      default:
        // texto normal — detectar ⚠️ aviso
        if (parsed.contenido.startsWith("⚠️")) {
          elementos.push(
            <View key={i} style={S.avisoWrapper}>
              <Text style={S.avisoTexto}>{limpiarInline(parsed.contenido)}</Text>
            </View>
          );
        } else {
          elementos.push(
            <Text key={i} style={S.parrafo}>{limpiarInline(parsed.contenido)}</Text>
          );
        }
    }

    i++;
  }

  if (enTabla) flushTabla();

  return <>{elementos}</>;
}

// ─── Header / Footer de página interior ──────────────────────────────────────

function HeaderPagina({ numInforme }: { numInforme: string }) {
  return (
    <View style={S.headerRow} fixed>
      <Text style={S.headerLogo}>REVISOR ARQ</Text>
      <Text style={S.headerDocNum}>{numInforme}</Text>
    </View>
  );
}

function FooterPagina() {
  return (
    <View style={S.footerRow} fixed>
      <Text style={S.footerText}>revisor-arq.vercel.app</Text>
      <Text
        style={S.pageNumber}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

// ─── Portada ──────────────────────────────────────────────────────────────────

function Portada({ datos, numInforme, fechaFormateada }: {
  datos: DatosInforme;
  numInforme: string;
  fechaFormateada: string;
}) {
  const titulo = datos.tituloConsulta.slice(0, 80) + (datos.tituloConsulta.length > 80 ? "…" : "");

  return (
    <Page size="A4" style={S.portadaPage}>
      {/* Logo */}
      <Text style={S.portadaLogo}>REVISOR ARQ</Text>

      {/* Bloque central */}
      <View>
        <Text style={S.portadaTituloBig}>{titulo}</Text>
        <Text style={S.portadaSubtitulo}>INFORME TÉCNICO NORMATIVO</Text>

        <View style={S.portadaDivisor} />

        {/* Metadatos */}
        <Text style={S.portadaMetaLabel}>N° de informe</Text>
        <Text style={S.portadaMetaValor}>{numInforme}</Text>

        <Text style={S.portadaMetaLabel}>Fecha de emisión</Text>
        <Text style={S.portadaMetaValor}>{fechaFormateada}</Text>

        {datos.nombreCliente && (
          <>
            <Text style={S.portadaMetaLabel}>Preparado para</Text>
            <Text style={S.portadaMetaValor}>{datos.nombreCliente}</Text>
          </>
        )}

        <Text style={S.portadaMetaLabel}>Preparado por</Text>
        <Text style={S.portadaMetaValor}>{datos.nombreProfesional}</Text>

        {datos.rutColegiado && (
          <>
            <Text style={S.portadaMetaLabel}>RUT / N° colegiado</Text>
            <Text style={S.portadaMetaValor}>{datos.rutColegiado}</Text>
          </>
        )}

        {datos.nombreProyecto && (
          <>
            <Text style={S.portadaMetaLabel}>Proyecto</Text>
            <Text style={S.portadaMetaValor}>{datos.nombreProyecto}</Text>
          </>
        )}
      </View>

      {/* Pie legal */}
      <Text style={S.portadaPieLegal}>
        Este informe fue generado con REVISOR ARQ basándose en el corpus normativo vigente al {fechaFormateada}.
        No constituye asesoría jurídica o técnica profesional. Verifica siempre el texto vigente en BCN (www.bcn.cl).
      </Text>
    </Page>
  );
}

// ─── Página de cuerpo ─────────────────────────────────────────────────────────

function PaginaCuerpo({ datos, numInforme }: {
  datos: DatosInforme;
  numInforme: string;
}) {
  return (
    <Page size="A4" style={S.page}>
      <HeaderPagina numInforme={numInforme} />
      <FooterPagina />

      {/* Título del informe en la primera página interior */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: C.azul, marginBottom: 4 }}>
          Informe Técnico Normativo
        </Text>
        <Text style={{ fontSize: 9, color: "#888" }}>
          {datos.tituloConsulta.slice(0, 100)}
        </Text>
        <View style={{ height: 0.5, backgroundColor: C.grisBorde, marginTop: 10 }} />
      </View>

      <RenderContenido contenido={datos.contenido} />

      {/* Sección de firmas */}
      <View style={S.firmasWrapper}>
        <View style={S.firmaBloque}>
          <Text style={S.firmaNombre}>{datos.nombreProfesional}</Text>
          <Text style={S.firmaCargo}>Firma del Profesional Evaluador</Text>
          {datos.rutColegiado && <Text style={{ fontSize: 7, color: "#888", marginTop: 1 }}>{datos.rutColegiado}</Text>}
        </View>
        <View style={S.firmaBloque}>
          <Text style={S.firmaNombre}>{datos.nombreCliente || "____________________"}</Text>
          <Text style={S.firmaCargo}>Firma del Cliente / Receptor</Text>
        </View>
      </View>

      {/* Pie legal final */}
      <View style={S.pieLegalWrapper}>
        <Text style={S.pieLegalTexto}>
          Corpus normativo: LGUC, OGUC, DDU MINVU y normativa sectorial — REVISOR ARQ {new Date().getFullYear()}
        </Text>
        <Text style={[S.pieLegalTexto, { marginTop: 2 }]}>
          Generado por REVISOR ARQ — revisor-arq.vercel.app
        </Text>
      </View>
    </Page>
  );
}

// ─── Documento principal ──────────────────────────────────────────────────────

export function InformePDFDoc({ datos }: { datos: DatosInforme }) {
  const ts = datos.fechaConsulta.getTime().toString().slice(-6);
  const anio = datos.fechaConsulta.getFullYear();
  const numInforme = `INF-${anio}-${ts}`;

  const fechaFormateada = datos.fechaConsulta.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  });
  const fechaConCiudad = `Santiago, ${fechaFormateada}`;

  return (
    <Document
      title={`Informe REVISOR ARQ — ${datos.tituloConsulta.slice(0, 60)}`}
      author={datos.nombreProfesional}
      subject="Informe Técnico Normativo — REVISOR ARQ"
      creator="REVISOR ARQ"
    >
      <Portada datos={datos} numInforme={numInforme} fechaFormateada={fechaConCiudad} />
      <PaginaCuerpo datos={datos} numInforme={numInforme} />
    </Document>
  );
}

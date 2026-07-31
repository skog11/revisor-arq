import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * /archivo — El Archivo, cara publica del corpus.
 *
 * Muestra COBERTURA, no catalogo: cuanto hay, de que rango normativo,
 * sobre que materias y hasta cuando esta verificado. Nunca el listado
 * documento por documento, porque esa curatoria es la barrera de entrada
 * del proyecto.
 *
 * La edicion del corpus sigue en /corpus y /normativa, protegidas.
 */

export const metadata: Metadata = {
  title: "El Archivo — qué normativa tiene cargada REVISOR ARQ",
  description:
    "Cobertura del corpus normativo de REVISOR ARQ: rango de las normas, materias cubiertas y fecha de última verificación.",
};

// Se recalcula una vez por hora; no hay razon para golpear la base en cada visita.
export const revalidate = 3600;

/** Como se agrupan los tipos de norma para mostrarlos. */
const FAMILIAS: { clave: string; nombre: string; nota: string; tipos: string[] }[] = [
  {
    clave: "leyes",
    nombre: "Leyes y decretos con fuerza de ley",
    nota: "El rango más alto. Fija los principios y los límites del sistema.",
    tipos: ["LGUC", "LEY", "Ley", "DFL", "DL"],
  },
  {
    clave: "reglamentos",
    nombre: "Ordenanzas y decretos supremos",
    nota: "Los parámetros técnicos aplicables: rasantes, constructibilidad, estacionamientos.",
    tipos: ["OGUC", "DS"],
  },
  {
    clave: "circulares",
    nombre: "Circulares DDU del MINVU",
    nota: "Interpretan y modifican la aplicación de la Ordenanza, con carácter vinculante.",
    tipos: ["DDU", "DDU_ESPECIFICA"],
  },
  {
    clave: "dictamenes",
    nombre: "Dictámenes de Contraloría",
    nota: "La interpretación obligatoria cuando dos normas entran en conflicto.",
    tipos: ["CGR"],
  },
];

/**
 * Materias cubiertas — lista curada, no derivada de la base.
 *
 * Deliberadamente sin conteo por materia: hoy un tercio de las normas no
 * tiene el campo `dominio` completo, y publicar cifras por materia daria
 * una precision que el dato todavia no tiene.
 */
const MATERIAS = [
  "Urbanismo y edificación",
  "Planificación territorial",
  "Permisos y recepción de obras",
  "Copropiedad inmobiliaria",
  "Evaluación de impacto ambiental",
  "Normativa sanitaria",
  "Derechos de agua y acuíferos",
  "Ruidos molestos",
  "Patrimonio y zonas típicas",
  "Accesibilidad universal",
  "Vialidad y expropiaciones",
  "Energía e infraestructura",
];

type Resumen = {
  total: number;
  vigentes: number;
  chunks: number;
  actualizado: string | null;
  porFamilia: Record<string, number>;
};

async function leerResumen(): Promise<Resumen | null> {
  try {
    const sb = getSupabaseAdmin();

    const [normas, chunks] = await Promise.all([
      sb.from("normas").select("tipo, vigente, updated_at"),
      sb.from("chunks").select("id", { count: "exact", head: true }),
    ]);

    if (normas.error) return null;
    const filas = normas.data ?? [];

    const porFamilia: Record<string, number> = {};
    for (const f of FAMILIAS) porFamilia[f.clave] = 0;

    let ultima: string | null = null;
    for (const n of filas) {
      const tipo = (n.tipo as string | null) ?? "";
      const familia = FAMILIAS.find((f) => f.tipos.includes(tipo));
      if (familia) porFamilia[familia.clave] += 1;

      const upd = n.updated_at as string | null;
      if (upd && (!ultima || upd > ultima)) ultima = upd;
    }

    return {
      total: filas.length,
      vigentes: filas.filter((n) => n.vigente !== false).length,
      chunks: chunks.count ?? 0,
      actualizado: ultima,
      porFamilia,
    };
  } catch {
    return null;
  }
}

const nf = new Intl.NumberFormat("es-CL");

function fecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ArchivoPage() {
  const r = await leerResumen();

  return (
    <div className="px-5 py-16 sm:px-8 lg:px-16 lg:py-24">
      <div className="mx-auto max-w-5xl">
        {/* ── Encabezado ─────────────────────────────────── */}
        <p
          className="mb-5"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: 11,
            letterSpacing: "1.6px",
            textTransform: "uppercase",
            color: "var(--terracotta)",
          }}
        >
          El Archivo
        </p>

        <h1
          className="max-w-3xl"
          style={{
            fontFamily: "var(--font-instrument-serif)",
            fontSize: "clamp(34px, 4.4vw, 62px)",
            lineHeight: 1.02,
            letterSpacing: "-1.4px",
            color: "var(--ink)",
          }}
        >
          Qué normativa hay cargada, y hasta cuándo está verificada
        </h1>

        <p
          className="mt-6 max-w-2xl text-[15px] leading-relaxed"
          style={{ color: "var(--ink-3)" }}
        >
          Cada respuesta de REVISOR ARQ se apoya en este cuerpo de normas. Acá
          puedes ver su tamaño, su composición por rango normativo y su fecha de
          verificación. No publicamos el listado documento por documento: lo que
          importa para confiar en una respuesta es saber qué rango y qué materias
          están cubiertos, y eso está todo acá.
        </p>

        {/* ── Cifras ─────────────────────────────────────── */}
        <dl
          className="mt-12 grid grid-cols-2 gap-px lg:grid-cols-4"
          style={{ background: "var(--rule)", border: "1px solid var(--rule)" }}
        >
          {[
            { t: "Normas vigentes", v: r ? nf.format(r.vigentes) : "—" },
            { t: "Fragmentos indexados", v: r ? nf.format(r.chunks) : "—" },
            { t: "Rangos normativos", v: "4" },
            { t: "Última verificación", v: r ? fecha(r.actualizado) : "—" },
          ].map((c) => (
            <div key={c.t} className="px-5 py-6" style={{ background: "var(--card-bg)" }}>
              <dt
                className="mb-2 text-[10px] uppercase"
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  letterSpacing: "1.2px",
                  color: "var(--ink-4)",
                }}
              >
                {c.t}
              </dt>
              <dd
                className="text-[26px] leading-none"
                style={{
                  fontFamily: "var(--font-instrument-serif)",
                  color: "var(--ink)",
                }}
              >
                {c.v}
              </dd>
            </div>
          ))}
        </dl>

        {!r && (
          <p
            className="mt-4 text-[13px]"
            style={{ color: "var(--ra-warn, #c08a1a)" }}
          >
            No se pudo leer el estado del corpus en este momento. Los datos vuelven
            en cuanto se restablezca la conexión.
          </p>
        )}

        {/* ── Composición por rango ──────────────────────── */}
        <h2
          className="mt-20 mb-2"
          style={{
            fontFamily: "var(--font-instrument-serif)",
            fontSize: "clamp(24px, 2.6vw, 34px)",
            letterSpacing: "-0.6px",
            color: "var(--ink)",
          }}
        >
          Composición por rango normativo
        </h2>
        <p className="mb-8 max-w-2xl text-[14px]" style={{ color: "var(--ink-3)" }}>
          El orden importa: cuando dos fuentes se contradicen, prevalece la de
          rango superior, salvo que una norma especial posterior disponga otra cosa.
        </p>

        <ul
          className="grid gap-px"
          style={{ background: "var(--rule)", border: "1px solid var(--rule)" }}
        >
          {FAMILIAS.map((f) => (
            <li
              key={f.clave}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-5"
              style={{ background: "var(--card-bg)" }}
            >
              <div className="min-w-[16rem] flex-1">
                <p className="text-[15px]" style={{ color: "var(--ink)" }}>
                  {f.nombre}
                </p>
                <p className="mt-1 text-[13px]" style={{ color: "var(--ink-4)" }}>
                  {f.nota}
                </p>
              </div>
              <span
                className="text-[20px]"
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  color: "var(--ink-2)",
                }}
              >
                {r ? nf.format(r.porFamilia[f.clave] ?? 0) : "—"}
              </span>
            </li>
          ))}
        </ul>

        {/* ── Materias ───────────────────────────────────── */}
        <h2
          className="mt-20 mb-8"
          style={{
            fontFamily: "var(--font-instrument-serif)",
            fontSize: "clamp(24px, 2.6vw, 34px)",
            letterSpacing: "-0.6px",
            color: "var(--ink)",
          }}
        >
          Materias cubiertas
        </h2>

        <ul className="flex flex-wrap gap-2">
          {MATERIAS.map((m) => (
            <li
              key={m}
              className="rounded-[3px] px-3.5 py-2 text-[13px]"
              style={{
                background: "var(--paper-2)",
                border: "1px solid var(--rule)",
                color: "var(--ink-2)",
              }}
            >
              {m}
            </li>
          ))}
        </ul>

        {/* ── Qué falta ──────────────────────────────────── */}
        <div
          className="mt-20 rounded-[4px] p-6 sm:p-8"
          style={{
            background: "var(--paper-2)",
            border: "1px solid var(--rule-2)",
          }}
        >
          <h2
            className="mb-3"
            style={{
              fontFamily: "var(--font-instrument-serif)",
              fontSize: "clamp(22px, 2.2vw, 28px)",
              color: "var(--ink)",
            }}
          >
            Qué todavía no está
          </h2>
          <p className="max-w-2xl text-[14px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
            Los Planes Reguladores Comunales aún no forman parte del corpus. Es la
            pieza en desarrollo: se está construyendo partiendo por las comunas de
            la Región del Biobío, con los parámetros de cada zona en una estructura
            propia para que nunca se mezclen normas de comunas distintas en una
            misma respuesta. Mientras tanto, si tu consulta depende del PRC, la
            respuesta te lo va a decir en vez de suponerlo.
          </p>
        </div>

        {/* ── Cómo se mantiene ───────────────────────────── */}
        <h2
          className="mt-20 mb-4"
          style={{
            fontFamily: "var(--font-instrument-serif)",
            fontSize: "clamp(22px, 2.2vw, 28px)",
            color: "var(--ink)",
          }}
        >
          Cómo se mantiene
        </h2>
        <p className="max-w-2xl text-[14px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
          Cada norma se guarda con una huella de su contenido. Un proceso
          periódico compara esa huella con la versión publicada en la Biblioteca
          del Congreso Nacional; cuando el texto cambia, la norma se vuelve a
          procesar completa. Por eso cada cita enlaza a su fuente oficial: puedes
          verificar el texto sin salir de la respuesta.
        </p>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-[3px] px-6 py-3.5 text-[14px] transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--ink)", color: "var(--paper)" }}
          >
            Consultar sobre este corpus
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/guias"
            className="inline-flex items-center rounded-[3px] px-6 py-3.5 text-[14px]"
            style={{ border: "1px solid var(--rule-2)", color: "var(--ink-2)" }}
          >
            Ver las guías
          </Link>
        </div>
      </div>
    </div>
  );
}

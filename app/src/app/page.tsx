import Link from "next/link";
import { FranjaSuperior } from "@/components/ciudad/franja-superior";
import { CiudadHero } from "@/components/ciudad/ciudad-hero";
import { IntroduccionPopup } from "@/components/ciudad/introduccion-popup";
import { CapasNormativas } from "@/components/ciudad/capas-normativas";
import { ConflictoPredio } from "@/components/ciudad/conflicto-predio";
import { CentroInteligencia } from "@/components/ciudad/centro-inteligencia";
import { RespuestaVerificada } from "@/components/ciudad/respuesta-verificada";
import { EntradaCentro } from "@/components/ciudad/entrada-centro";

/**
 * Landing de REVISOR ARQ.
 *
 * Primera pantalla: la ciudad de papel, con los edificios como menu.
 * Luego el problema (los organismos que se pisan sobre un mismo predio),
 * el interior del Centro de Inteligencia (las funcionalidades) y el cierre.
 *
 * La landing anterior quedo intacta en /landing-clasica.
 */

const ORGANISMOS = [
  { sigla: "MINVU · DDU", que: "LGUC, OGUC y 284 circulares" },
  { sigla: "Municipalidad", que: "PRC, ordenanzas locales, el CIP" },
  { sigla: "Contraloría", que: "60 dictámenes vinculantes" },
  { sigla: "SEREMI de Salud", que: "autorización sanitaria" },
  { sigla: "Sanitaria · SISS", que: "factibilidad de agua y alcantarillado" },
  { sigla: "DGA", que: "derechos de agua y acuíferos" },
  { sigla: "SEA · SEIA", que: "evaluación de impacto ambiental" },
  { sigla: "Monumentos", que: "zonas típicas y patrimonio" },
  { sigla: "MOP · SERVIU", que: "expropiaciones y fajas" },
  { sigla: "MMA", que: "ruidos molestos, DS 38" },
  { sigla: "Ley 20.422", que: "accesibilidad universal" },
];

const SALAS = [
  {
    n: "01",
    titulo: "Tres modos de respuesta",
    texto:
      "Arquitecto entrega los parámetros aplicados con sus cifras. Abogado entrega el texto literal íntegro del artículo. Profundo cruza normas, detecta qué prevalece y arma la ruta de cumplimiento.",
  },
  {
    n: "02",
    titulo: "Cada afirmación cita su artículo",
    texto:
      "No hay respuesta sin fuente: tipo de norma, número de artículo y fragmento textual, con enlace directo a la Biblioteca del Congreso. Si no hay respaldo suficiente, lo dice en vez de inventarlo.",
  },
  {
    n: "03",
    titulo: "Avisa cuando dos normas se contradicen",
    texto:
      "Veinticuatro reglas de prioridad deciden qué fuente manda cuando la OGUC permite algo que una circular DDU posterior restringe. El conflicto se declara, no se esconde.",
  },
  {
    n: "04",
    titulo: "Lee tus antecedentes",
    texto:
      "Adjunta el certificado de informaciones previas, un plano o el acta de observaciones de la DOM. Se incorporan como contexto de la consulta.",
  },
  {
    n: "05",
    titulo: "Calcula mientras responde",
    texto:
      "Cuando la consulta involucra constructibilidad o estacionamientos, aparece la calculadora dentro de la respuesta. Ingresas la superficie del terreno y sale el número.",
  },
  {
    n: "06",
    titulo: "Sale como informe presentable",
    texto:
      "En modo profundo la respuesta se exporta como informe técnico con folio, marco normativo activado, análisis artículo por artículo y bloque de firmas. Listo para la DOM o para el cliente.",
  },
];

export default function HomePage() {
  return (
    <>
      <IntroduccionPopup />
      <FranjaSuperior />
      <CiudadHero />
      <CapasNormativas />
      <ConflictoPredio />

      {/* ── EL PROBLEMA ─────────────────────────────────────── */}
      <section
        className="px-5 py-20 sm:px-8 lg:px-16 lg:py-28"
        style={{ borderTop: "1px solid var(--rule)" }}
      >
        <div className="mx-auto max-w-6xl">
          <p
            className="mb-5"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: 11,
              letterSpacing: "1.6px",
              textTransform: "uppercase",
              color: "var(--ink-4)",
            }}
          >
            El problema
          </p>

          <h2
            className="max-w-3xl"
            style={{
              fontFamily: "var(--font-instrument-serif)",
              fontSize: "clamp(30px, 3.6vw, 50px)",
              lineHeight: 1.04,
              letterSpacing: "-1px",
              color: "var(--ink)",
            }}
          >
            Once organismos distintos legislan sobre el mismo predio, y ninguno
            se lee junto a los otros.
          </h2>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div
              className="space-y-4 text-[15px] leading-relaxed"
              style={{ color: "var(--ink-3)" }}
            >
              <p>
                Un local arrendado en zona comercial, con el certificado municipal
                que autoriza el uso gastronómico. Contrato firmado a tres años y
                proyecto de arquitectura pagado.
              </p>
              <p>
                Al ingresar el permiso aparecen cuatro restricciones que el
                certificado no mencionaba: la distancia mínima a un establecimiento
                educacional, la autorización sanitaria con sus exigencias de
                ventilación, el límite de ruido después de las diez de la noche y
                una ordenanza local que prohíbe ductos en esa fachada.
              </p>
              <p style={{ color: "var(--ink-2)" }}>
                Cada una dependía de una fuente distinta. Ninguna estaba en el
                certificado. El problema no es que las normas sean secretas —
                están todas publicadas. El problema es que nadie las cruza en la
                misma respuesta.
              </p>
            </div>

            <ul
              className="grid grid-cols-1 gap-px self-start sm:grid-cols-2 lg:grid-cols-1"
              style={{ background: "var(--rule)", border: "1px solid var(--rule)" }}
            >
              {ORGANISMOS.map((o) => (
                <li
                  key={o.sigla}
                  className="flex items-baseline justify-between gap-4 px-4 py-3"
                  style={{ background: "var(--card-bg)" }}
                >
                  <span
                    className="text-[13px]"
                    style={{ color: "var(--ink)", fontFamily: "var(--font-inter)" }}
                  >
                    {o.sigla}
                  </span>
                  <span
                    className="text-right text-[11px]"
                    style={{ color: "var(--ink-4)" }}
                  >
                    {o.que}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <CentroInteligencia />

      {/* ── POR DENTRO DEL CENTRO DE INTELIGENCIA ───────────── */}
      <section
        className="px-5 py-20 sm:px-8 lg:px-16 lg:py-28"
        style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-2)" }}
      >
        <div className="mx-auto max-w-6xl">
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
            Por dentro del Centro de Inteligencia
          </p>

          <h2
            className="max-w-3xl"
            style={{
              fontFamily: "var(--font-instrument-serif)",
              fontSize: "clamp(30px, 3.6vw, 50px)",
              lineHeight: 1.04,
              letterSpacing: "-1px",
              color: "var(--ink)",
            }}
          >
            Qué hay adentro del edificio dorado
          </h2>

          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {SALAS.map((s) => (
              <article key={s.n}>
                <span
                  className="mb-3 block"
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: 11,
                    letterSpacing: "1.4px",
                    color: "var(--terracotta)",
                  }}
                >
                  {s.n}
                </span>
                <h3
                  className="mb-2.5 text-[19px] leading-snug"
                  style={{
                    fontFamily: "var(--font-instrument-serif)",
                    color: "var(--ink)",
                  }}
                >
                  {s.titulo}
                </h3>
                <p
                  className="text-[14px] leading-relaxed"
                  style={{ color: "var(--ink-3)" }}
                >
                  {s.texto}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <RespuestaVerificada />

      <EntradaCentro />

      {/* ── CIERRE ──────────────────────────────────────────── */}
      <section
        className="hidden px-5 py-24 sm:px-8 lg:px-16 lg:py-32"
        style={{ borderTop: "1px solid var(--rule)" }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2
            style={{
              fontFamily: "var(--font-instrument-serif)",
              fontSize: "clamp(32px, 4.2vw, 58px)",
              lineHeight: 1.02,
              letterSpacing: "-1.2px",
              color: "var(--ink)",
            }}
          >
            Cruza la puerta
          </h2>
          <p
            className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed"
            style={{ color: "var(--ink-3)" }}
          >
            Haz tu consulta y mira cómo se arma la respuesta: qué normas se
            activaron, qué dice cada artículo y dónde verificarlo.
          </p>
          <Link
            href="/chat"
            className="mt-9 inline-flex items-center gap-2 rounded-[3px] px-7 py-4 text-[15px] transition-transform hover:-translate-y-0.5"
            style={{
              background: "var(--ink)",
              color: "var(--paper)",
              fontFamily: "var(--font-inter)",
            }}
          >
            Entrar al Centro de Inteligencia
            <span aria-hidden="true">→</span>
          </Link>
          <p
            className="mt-6 text-[12px]"
            style={{
              color: "var(--ink-4)",
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            420 normas · 22.500 fragmentos · 60 dictámenes CGR
          </p>
        </div>
      </section>
    </>
  );
}

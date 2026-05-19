import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de uso del servicio REVISOR ARQ, consultora de normativa urbana chilena.",
};

const FECHA_VIGENCIA = "20 de abril de 2026";

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2
        className="mb-3 text-base font-semibold"
        style={{
          fontFamily: "var(--font-instrument-serif)",
          fontSize: 20,
          color: "var(--ink)",
          letterSpacing: "-0.2px",
        }}
      >
        {titulo}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
        {children}
      </div>
    </section>
  );
}

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      {/* Eyebrow */}
      <p
        className="mb-2 text-[10px] uppercase tracking-widest"
        style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-3)" }}
      >
        Legal
      </p>

      <h1
        className="mb-2"
        style={{
          fontFamily: "var(--font-instrument-serif)",
          fontSize: 38,
          lineHeight: 1.05,
          letterSpacing: "-1px",
          color: "var(--ink)",
        }}
      >
        Términos y condiciones
      </h1>

      <p className="mb-8 text-sm" style={{ color: "var(--ink-3)" }}>
        Vigentes desde el {FECHA_VIGENCIA}
      </p>

      {/* Aviso beta */}
      <div
        className="mb-10 rounded-lg px-4 py-3 text-sm leading-relaxed"
        style={{
          background: "var(--ra-warn-soft, rgba(201,138,31,0.10))",
          border: "1px solid var(--ra-warn, #c98a1f)",
          color: "var(--ink-2)",
        }}
      >
        <strong style={{ color: "var(--ink)" }}>Versión beta.</strong> Esta herramienta se
        encuentra en etapa de desarrollo. Los presentes términos están sujetos a revisión
        por abogado antes del lanzamiento público definitivo.
      </div>

      <Seccion titulo="1. Naturaleza del servicio">
        <p>
          REVISOR ARQ es una herramienta informática de consulta que utiliza inteligencia
          artificial para responder preguntas sobre normativa chilena de urbanismo y
          construcción. Su base de conocimiento incluye la LGUC, OGUC, Circulares DDU del
          MINVU, y otras leyes y reglamentos sectoriales relevantes.
        </p>
        <p>
          Las respuestas generadas son de carácter <strong>exclusivamente informativo</strong>.
          No constituyen asesoría jurídica, técnica ni profesional de ningún tipo.
        </p>
      </Seccion>

      <Seccion titulo="2. Limitación de responsabilidad">
        <p>
          El uso de REVISOR ARQ no garantiza la exactitud, completitud ni vigencia de la
          información entregada. La normativa urbanística chilena está sujeta a modificaciones
          frecuentes que pueden no estar reflejadas en la base de conocimiento de la herramienta.
        </p>
        <p>
          El desarrollador no se responsabiliza por decisiones técnicas, jurídicas, económicas
          ni de ninguna otra naturaleza adoptadas con base en las respuestas generadas por
          esta herramienta. El usuario asume plena responsabilidad por el uso que haga de la
          información recibida.
        </p>
        <p>
          Antes de tomar cualquier decisión relevante, se recomienda verificar la norma en
          el texto oficial publicado por la{" "}
          <a
            href="https://www.bcn.cl"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            style={{ color: "var(--terracotta)" }}
          >
            Biblioteca del Congreso Nacional (BCN)
          </a>{" "}
          y consultar con un profesional habilitado.
        </p>
      </Seccion>

      <Seccion titulo="3. No existe relación profesional">
        <p>
          El uso de esta herramienta <strong>no crea ni establece</strong> relación
          abogado-cliente, arquitecto-cliente, ni ninguna otra relación de asesoría
          profesional entre el usuario y el desarrollador de REVISOR ARQ.
        </p>
        <p>
          Las respuestas generadas no deben interpretarse como opinión jurídica, dictamen
          técnico, ni pronunciamiento oficial sobre la aplicación de la ley a caso alguno.
        </p>
      </Seccion>

      <Seccion titulo="4. Propiedad intelectual">
        <p>
          Los textos normativos procesados por REVISOR ARQ (LGUC, OGUC, Circulares DDU,
          DFL, DS, Leyes y otros cuerpos normativos) son obras de dominio público bajo la
          legislación chilena, publicadas por organismos estatales como el Ministerio de
          la Vivienda y Urbanismo (MINVU), la Biblioteca del Congreso Nacional y otros
          ministerios competentes.
        </p>
        <p>
          El código fuente, diseño y arquitectura de REVISOR ARQ son propiedad del
          desarrollador. Está permitido el uso personal e interno de la herramienta.
          Queda prohibida la reproducción, distribución o modificación sin autorización
          expresa.
        </p>
      </Seccion>

      <Seccion titulo="5. Exactitud y actualización de la normativa">
        <p>
          REVISOR ARQ opera sobre una base de conocimiento normativa que incluye la LGUC,
          OGUC, Circulares DDU, y una selección de leyes, DFL, DS y reglamentos sectoriales
          disponibles a la fecha indicada
          en la sección{" "}
          <Link
            href="/normativa"
            className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            style={{ color: "var(--terracotta)" }}
          >
            Gestión de normativa
          </Link>
          .
        </p>
        <p>
          No se garantiza que la base normativa esté permanentemente actualizada. El usuario es
          responsable de verificar la vigencia de toda norma citada.
        </p>
      </Seccion>

      <Seccion titulo="6. Uso aceptable">
        <p>
          Esta herramienta está destinada exclusivamente a consultas relacionadas con
          normativa chilena de urbanismo y construcción. Se prohíbe su uso para:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Fines ilegales o contrarios a la legislación chilena.</li>
          <li>Generación masiva automatizada de consultas.</li>
          <li>Reproducción sistemática de la base normativa con fines comerciales.</li>
        </ul>
      </Seccion>

      <Seccion titulo="7. Modificaciones">
        <p>
          El desarrollador se reserva el derecho de modificar estos términos en cualquier
          momento. Los cambios serán publicados en esta misma URL con la fecha de vigencia
          actualizada.
        </p>
      </Seccion>

      <Seccion titulo="8. Ley aplicable">
        <p>
          Estos términos se rigen por la legislación de la República de Chile. Cualquier
          controversia que surja de su interpretación o aplicación será sometida a los
          tribunales ordinarios de justicia de Santiago de Chile.
        </p>
      </Seccion>

      <div
        className="mt-10 border-t pt-6 text-xs"
        style={{ borderColor: "var(--rule)", color: "var(--ink-3)" }}
      >
        <p>
          ¿Encontraste un error en la normativa o tienes dudas?{" "}
          <a
            href="mailto:contacto@revisorarq.cl"
            className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            style={{ color: "var(--ink-2)" }}
          >
            Escríbenos
          </a>
          .
        </p>
        <p className="mt-1">
          <Link
            href="/privacidad"
            className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            style={{ color: "var(--ink-2)" }}
          >
            Política de privacidad →
          </Link>
        </p>
      </div>
    </div>
  );
}

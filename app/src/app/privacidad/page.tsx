import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Política de privacidad y tratamiento de datos personales de REVISOR ARQ.",
};

const FECHA_VIGENCIA = "20 de abril de 2026";

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2
        className="mb-3"
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

export default function PrivacidadPage() {
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
        Política de privacidad
      </h1>

      <p className="mb-8 text-sm" style={{ color: "var(--ink-3)" }}>
        Vigente desde el {FECHA_VIGENCIA}
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
        <strong style={{ color: "var(--ink)" }}>Versión beta.</strong> Esta política está
        sujeta a revisión antes del lanzamiento público. En etapa beta no se recopilan
        datos personales identificables.
      </div>

      <Seccion titulo="1. Responsable del tratamiento">
        <p>
          REVISOR ARQ es una herramienta en desarrollo. El responsable del tratamiento de
          datos es su desarrollador. Para consultas relacionadas con privacidad, escribe a{" "}
          <a
            href="mailto:contacto@revisorarq.cl"
            className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            style={{ color: "var(--terracotta)" }}
          >
            contacto@revisorarq.cl
          </a>
          .
        </p>
      </Seccion>

      <Seccion titulo="2. Datos que recopilamos">
        <p>
          REVISOR ARQ recopila exclusivamente los siguientes datos técnicos de uso:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong style={{ color: "var(--ink)" }}>Consultas realizadas:</strong> el texto
            de la pregunta, el modo de respuesta seleccionado (Arquitecto, Abogado o
            Profundo) y la respuesta generada se almacenan para mejorar la calidad del
            servicio.
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>Retroalimentación:</strong> si el
            usuario valora una respuesta (pulgar arriba/abajo), ese dato se registra
            vinculado a la consulta.
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>Preferencia de tema:</strong> la
            elección de modo claro u oscuro se guarda localmente en el navegador mediante
            localStorage.
          </li>
        </ul>
        <p>
          <strong style={{ color: "var(--ink)" }}>No recopilamos</strong> nombre, correo
          electrónico, RUT, dirección IP ni ningún otro dato que permita identificar
          directamente a una persona.
        </p>
      </Seccion>

      <Seccion titulo="3. Finalidad del tratamiento">
        <p>Los datos de uso se utilizan únicamente para:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Mejorar la calidad de las respuestas y la base normativa.</li>
          <li>Detectar errores y problemas técnicos.</li>
          <li>Calcular métricas de uso agregadas y anónimas.</li>
        </ul>
      </Seccion>

      <Seccion titulo="4. Base legal (Ley N°19.628)">
        <p>
          El tratamiento de los datos de uso se realiza al amparo de la{" "}
          <strong style={{ color: "var(--ink)" }}>
            Ley N°19.628 sobre Protección de la Vida Privada
          </strong>{" "}
          de Chile, específicamente bajo la causal de interés legítimo del responsable
          (art. 4°) para mejorar el servicio prestado.
        </p>
        <p>
          Dado que los datos no incluyen información personal identificable, no se aplica
          la exigencia de consentimiento previo para su tratamiento estadístico y de mejora
          del servicio.
        </p>
      </Seccion>

      <Seccion titulo="5. Derechos ARCO del usuario">
        <p>
          De conformidad con la Ley N°19.628, el usuario tiene derecho a:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong style={{ color: "var(--ink)" }}>Acceso:</strong> conocer qué datos
            asociados a sus consultas están almacenados.
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>Rectificación:</strong> solicitar la
            corrección de datos inexactos.
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>Cancelación:</strong> solicitar la
            eliminación de datos de uso asociados a su sesión.
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>Oposición:</strong> oponerse al
            tratamiento de sus datos para finalidades distintas a la prestación del
            servicio.
          </li>
        </ul>
        <p>
          Para ejercer estos derechos, escribe a{" "}
          <a
            href="mailto:contacto@revisorarq.cl"
            className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            style={{ color: "var(--terracotta)" }}
          >
            contacto@revisorarq.cl
          </a>{" "}
          indicando tu solicitud. Responderemos en un plazo máximo de 15 días hábiles.
        </p>
      </Seccion>

      <Seccion titulo="6. Cookies y almacenamiento local">
        <p>
          REVISOR ARQ utiliza <strong style={{ color: "var(--ink)" }}>localStorage</strong>{" "}
          (no cookies de seguimiento) únicamente para recordar la preferencia de tema
          visual (claro/oscuro) entre sesiones. Este dato permanece en tu dispositivo y
          no se envía a ningún servidor.
        </p>
        <p>
          No utilizamos cookies de publicidad, seguimiento ni analítica de terceros.
        </p>
      </Seccion>

      <Seccion titulo="7. Terceros y transferencia de datos">
        <p>
          Los datos de uso se almacenan en{" "}
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            style={{ color: "var(--terracotta)" }}
          >
            Supabase
          </a>{" "}
          (infraestructura en AWS). Las consultas son procesadas por servicios de
          inteligencia artificial de terceros para generar respuestas. Los embeddings
          de búsqueda son generados mediante la API de{" "}
          <a
            href="https://www.voyageai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            style={{ color: "var(--terracotta)" }}
          >
            Voyage AI
          </a>
          . Ninguno de estos proveedores recibe datos personales identificables.
        </p>
        <p>
          <strong style={{ color: "var(--ink)" }}>No se venden ni ceden datos</strong> a
          terceros con fines comerciales.
        </p>
      </Seccion>

      <Seccion titulo="8. Retención de datos">
        <p>
          Los registros de consultas se retienen por un máximo de{" "}
          <strong style={{ color: "var(--ink)" }}>12 meses</strong>, tras los cuales son
          eliminados o anonimizados automáticamente.
        </p>
      </Seccion>

      <Seccion titulo="9. Modificaciones a esta política">
        <p>
          Nos reservamos el derecho de actualizar esta política. Los cambios serán
          publicados en esta URL con la fecha de vigencia actualizada. El uso continuado
          del servicio implica la aceptación de los términos vigentes.
        </p>
      </Seccion>

      <div
        className="mt-10 border-t pt-6 text-xs"
        style={{ borderColor: "var(--rule)", color: "var(--ink-3)" }}
      >
        <p>
          <Link
            href="/terminos"
            className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            style={{ color: "var(--ink-2)" }}
          >
            ← Términos y condiciones
          </Link>
        </p>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, BookOpen } from "lucide-react";
import { GUIAS_DATA, GUIAS_SLUGS, getGuiaBySlug } from "../data/guias-data";

export function generateStaticParams() {
  return GUIAS_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guia = getGuiaBySlug(slug);
  if (!guia) return { title: "Guía no encontrada" };
  return {
    title: `${guia.titulo} | Guías REVISOR ARQ`,
    description: guia.descripcion,
  };
}

export default async function GuiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guia = getGuiaBySlug(slug);
  if (!guia) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 min-h-[calc(100vh-65px)]">

      {/* Breadcrumb */}
      <nav
        className="mb-8 flex items-center gap-1.5 text-xs"
        style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-3)" }}
        aria-label="Ruta de navegación"
      >
        <Link
          href="/"
          className="hover:text-[var(--ink)] transition-colors"
        >
          Inicio
        </Link>
        <ChevronRight className="size-3 shrink-0" />
        <Link
          href="/guias"
          className="hover:text-[var(--ink)] transition-colors"
        >
          Guías
        </Link>
        <ChevronRight className="size-3 shrink-0" />
        <span style={{ color: "var(--ink-2)" }} className="truncate max-w-[200px] sm:max-w-none">
          {guia.titulo}
        </span>
      </nav>

      {/* Eyebrow + title */}
      <div className="mb-8">
        <div
          className="mb-3 flex items-center gap-2"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: 11,
            color: "var(--terracotta)",
            textTransform: "uppercase",
            letterSpacing: "1.5px",
          }}
        >
          <span
            className="inline-block rounded-full"
            style={{ width: 6, height: 6, background: "var(--terracotta)" }}
          />
          {guia.categoria}
        </div>
        <h1
          className="mb-4"
          style={{
            fontFamily: "var(--font-instrument-serif)",
            fontSize: "clamp(26px, 4vw, 40px)",
            lineHeight: 1.1,
            letterSpacing: "-0.8px",
            color: "var(--ink)",
          }}
        >
          {guia.titulo}
        </h1>
        <p className="mb-5 text-base leading-relaxed" style={{ color: "var(--ink-3)" }}>
          {guia.descripcion}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)" }}>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {guia.tiempoLectura} de lectura
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="size-3.5" />
            {guia.contenido.length} secciones
          </span>
        </div>
      </div>

      {/* Normas relacionadas */}
      {guia.normasRelacionadas.length > 0 && (
        <div
          className="mb-10 rounded-xl p-5"
          style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
        >
          <p
            className="mb-3 text-[10px] uppercase tracking-widest"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-4)" }}
          >
            Normas de referencia
          </p>
          <ul className="space-y-1.5">
            {guia.normasRelacionadas.map((norma) => (
              <li
                key={norma}
                className="text-sm"
                style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-2)", fontSize: 12 }}
              >
                <span style={{ color: "var(--terracotta)", marginRight: 8 }}>→</span>
                {norma}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Divider */}
      <hr style={{ borderColor: "var(--rule)", marginBottom: "2.5rem" }} />

      {/* Content sections */}
      <div className="space-y-10">
        {guia.contenido.map((seccion, index) => (
          <section key={index}>
            <h2
              className="mb-4"
              style={{
                fontFamily: "var(--font-instrument-serif)",
                fontSize: 22,
                lineHeight: 1.2,
                letterSpacing: "-0.3px",
                color: "var(--ink)",
              }}
            >
              {seccion.titulo}
            </h2>
            <div
              className="guia-content text-[15px] leading-relaxed space-y-3"
              style={{ color: "var(--ink-2)" }}
              dangerouslySetInnerHTML={{ __html: seccion.cuerpo }}
            />
          </section>
        ))}
      </div>

      {/* CTA */}
      <div
        className="mt-14 p-7 rounded-2xl text-center"
        style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
      >
        <p
          className="mb-1 text-[10px] uppercase tracking-widest"
          style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-4)" }}
        >
          ¿Tienes dudas sobre este tema?
        </p>
        <p className="mb-5 text-base" style={{ color: "var(--ink-2)" }}>
          Consulta al asistente con tu caso específico y obtén una respuesta con citas verificables.
        </p>
        <Link
          href="/chat"
          className="inline-block rounded-xl px-7 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          style={{
            background: "var(--terracotta)",
            color: "#fff",
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.04em",
          }}
        >
          Consultar al asistente →
        </Link>
      </div>

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link
          href="/guias"
          className="text-sm transition-colors hover:text-[var(--ink)]"
          style={{ color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)" }}
        >
          ← Ver todas las guías
        </Link>
      </div>
    </div>
  );
}

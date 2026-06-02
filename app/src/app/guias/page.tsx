import Link from "next/link";
import { BookOpen, FileText, CheckCircle } from "lucide-react";

export const metadata = {
  title: "Guías Normativas | REVISOR ARQ",
  description: "Aprende a interpretar la normativa urbana chilena con guías paso a paso.",
};

const GUIAS = [
  {
    id: "calculo-constructibilidad",
    href: "/guias/calculo-constructibilidad",
    title: "Cómo calcular el Coeficiente de Constructibilidad",
    description: "Guía paso a paso según el Art. 1.1.2 de la OGUC. Qué áreas se descuentan y cómo justificarlo.",
    icon: <FileText className="size-5" />,
    color: "var(--mode-arq)",
    bg: "var(--ra-blue-soft)",
  },
  {
    id: "rasantes-distanciamientos",
    href: "/guias/rasantes-distanciamientos",
    title: "Rasantes y Distanciamientos: Casos de Borde",
    description: "Aplicación de rasantes en terrenos con pendiente y medianeros irregulares.",
    icon: <CheckCircle className="size-5" />,
    color: "var(--mode-pro)",
    bg: "var(--ra-green-soft)",
  },
  {
    id: "defensas-dom",
    href: "/guias/defensas-dom",
    title: "Cómo responder a observaciones de la DOM",
    description: "Técnicas de redacción legal administrativa para fundamentar apelaciones y reconsideraciones.",
    icon: <BookOpen className="size-5" />,
    color: "var(--terracotta)",
    bg: "var(--terracotta-soft)",
  }
];

export default function GuiasPage() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-12 sm:px-8 min-h-[calc(100vh-65px)]">
      <div className="mb-10">
        <div 
          className="mb-3 flex items-center gap-2"
          style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--terracotta)", textTransform: "uppercase", letterSpacing: "1.5px" }}
        >
          <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: "var(--terracotta)" }} />
          Sección Educativa
        </div>
        <h1 
          className="mb-4"
          style={{ fontFamily: "var(--font-instrument-serif)", fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.05, letterSpacing: "-1px", color: "var(--ink)" }}
        >
          Guías Temáticas
        </h1>
        <p className="text-[var(--ink-3)] text-lg max-w-2xl">
          Recursos educativos para dominar la aplicación práctica e interpretación de la normativa urbana chilena (LGUC, OGUC y circulares DDU).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {GUIAS.map((g) => (
          <Link
            key={g.id}
            href={g.href}
            className="group p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-md"
            style={{ borderColor: "var(--rule)", background: "var(--paper-2)" }}
          >
            <div 
              className="size-12 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
              style={{ background: g.bg, color: g.color }}
            >
              {g.icon}
            </div>
            <h3 className="text-xl font-medium mb-2 text-[var(--ink)] group-hover:text-[var(--terracotta)] transition-colors">
              {g.title}
            </h3>
            <p className="text-sm text-[var(--ink-3)] leading-relaxed">
              {g.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

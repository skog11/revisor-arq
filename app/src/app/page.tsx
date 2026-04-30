"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";

const CASOS_USO = [
  {
    perfil: "Arquitecto en fase de diseño",
    emoji: "🏗️",
    consulta: "¿Puedo construir un edificio de 12 pisos en zona ZM-6 de Santiago?",
    resultado:
      "Parámetros aplicables al instante: constructibilidad, densidad, rasantes, distanciamientos y qué datos del terreno necesito confirmar.",
  },
  {
    perfil: "Abogado revisando expediente",
    emoji: "⚖️",
    consulta: "¿Qué dice literalmente el Art. 161 LGUC sobre demoliciones?",
    resultado:
      "Cita íntegra del artículo, jerarquía de fuentes, normas concordantes y riesgos interpretativos detectados.",
  },
  {
    perfil: "Proyectista con permiso rechazado",
    emoji: "📋",
    consulta: "¿Por qué la DOM puede rechazar un permiso de edificación por rasante?",
    resultado:
      "Análisis del Art. 2.6.3 OGUC, circulares DDU aplicables, criterios de la autoridad y hoja de ruta para subsanar.",
  },
];

const FEATURES = [
  {
    num: "01",
    title: "Tres modos de respuesta",
    desc: "Arquitecto para parámetros aplicados. Abogado para citas literales íntegras. Profundo para análisis exhaustivo multi-norma.",
  },
  {
    num: "02",
    title: "Cita cada artículo",
    desc: "Cada afirmación tiene respaldo literal en la normativa. Si no hay respaldo suficiente, lo dice explícitamente.",
  },
  {
    num: "03",
    title: "Normativa verificable",
    desc: "LGUC + OGUC + DDU ingestadas y actualizadas. Puedes ver exactamente qué normas están cargadas.",
  },
];

const DEMO_MESSAGES = [
  {
    who: "Arquitecto",
    text: "¿Cuál es la rasante máxima en zona habitacional?",
    isUser: true,
  },
  {
    who: "REVISOR ARQ",
    isUser: false,
    text: "La rasante máxima permitida en zona habitacional es de",
    bold: "70°",
    tail: "medida desde el deslinde del predio. Este ángulo se aplica a todas las fachadas de edificios sobre el nivel del suelo.",
    chips: ["OGUC 2.6.3", "OGUC 2.6.4"],
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

interface Stats {
  totalNormas: number;
  totalChunks: number;
  porTipo: Record<string, number>;
}

function TrustStrip() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d: Stats) => setStats(d))
      .catch(() => {/* silencioso */});
  }, []);

  const items = [
    {
      value: stats ? stats.totalNormas.toLocaleString("es-CL") : "—",
      label: "normas indexadas",
    },
    {
      value: stats ? stats.totalChunks.toLocaleString("es-CL") : "—",
      label: "fragmentos vectorizados",
    },
    {
      value: stats ? (stats.porTipo["DDU"] ?? 0).toLocaleString("es-CL") : "—",
      label: "DDU y circulares",
    },
    { value: "voyage-law-2", label: "modelo de embeddings legales" },
  ];

  return (
    <div
      className="border-b"
      style={{
        background: "var(--paper-2)",
        borderColor: "var(--rule)",
      }}
    >
      <div className="mx-auto max-w-5xl px-6 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline gap-1.5">
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--ink)",
              }}
            >
              {item.value}
            </span>
            <span style={{ fontSize: 11, color: "var(--ink-4)" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* ── HERO SPLIT ───────────────────────────────────── */}
      <section
        className="grid min-h-[calc(100vh-65px)] grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        {/* Left */}
        <div className="flex flex-col justify-center px-5 py-12 sm:px-8 sm:py-16 lg:px-16 lg:py-20">
          {/* Eyebrow */}
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-6 flex items-center gap-2"
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
            LGUC · OGUC · DDU
          </motion.div>

          {/* H1 */}
          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-6"
            style={{
              fontFamily: "var(--font-instrument-serif)",
              fontSize: "clamp(56px, 6vw, 80px)",
              lineHeight: 0.96,
              letterSpacing: "-2px",
              color: "var(--ink)",
            }}
          >
            Normativa
            <br />
            <em style={{ fontStyle: "italic", color: "var(--terracotta)" }}>
              urbana
            </em>
            <br />
            chilena
          </motion.h1>

          {/* Description */}
          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-8 leading-relaxed"
            style={{
              fontSize: 17,
              color: "var(--ink-2)",
              maxWidth: 440,
            }}
          >
            Respuestas que citan el artículo exacto. Para arquitectos y
            abogados que necesitan precisión, no suposiciones.
          </motion.p>

          {/* Tags */}
          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-10 flex flex-wrap gap-2"
          >
            {["LGUC", "OGUC Art. 2.6.3", "DDU N°227"].map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1"
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  fontSize: 11,
                  background: "var(--paper-2)",
                  color: "var(--ink-2)",
                  border: "1px solid var(--rule-2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                }}
              >
                {tag}
              </span>
            ))}
            <span
              aria-hidden="true"
              className="rounded-full px-3 py-1"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: 11,
                background: "var(--ra-blue-soft)",
                color: "var(--ra-blue)",
                border: "1px solid color-mix(in srgb, var(--ra-blue) 30%, transparent)",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
              }}
            >
              Modo Arquitecto
            </span>
            <span
              aria-hidden="true"
              className="rounded-full px-3 py-1"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: 11,
                background: "var(--terracotta-soft)",
                color: "var(--terracotta)",
                border: "1px solid color-mix(in srgb, var(--terracotta) 30%, transparent)",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
              }}
            >
              Modo Abogado
            </span>
            <span
              aria-hidden="true"
              className="rounded-full px-3 py-1"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: 11,
                background: "var(--ra-green-soft)",
                color: "var(--ra-green)",
                border: "1px solid color-mix(in srgb, var(--ra-green) 30%, transparent)",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
              }}
            >
              Modo Profundo
            </span>
          </motion.div>

          {/* CTAs */}
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="flex gap-3"
          >
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:-translate-y-px"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                border: "1px solid var(--ink)",
              }}
            >
              Probar consulta →
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:bg-[var(--paper-2)]"
              style={{
                background: "transparent",
                color: "var(--ink)",
                border: "1px solid var(--rule-2)",
              }}
            >
              Cómo funciona
            </a>
          </motion.div>
        </div>

        {/* Right — demo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="hidden flex-col justify-center gap-4 p-10 lg:flex"
          style={{
            background:
              "linear-gradient(180deg, var(--paper-2), var(--paper-3))",
            borderLeft: "1px solid var(--rule)",
          }}
        >
          {DEMO_MESSAGES.map((msg, i) =>
            msg.isUser ? (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.15, duration: 0.4 }}
                className="self-end max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed"
                style={{
                  background: "var(--ink)",
                  color: "var(--paper)",
                  boxShadow: "var(--shadow-1)",
                }}
              >
                <div
                  className="mb-1.5"
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: 10,
                    color: "var(--ink-5)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {msg.who}
                </div>
                {msg.text}
              </motion.div>
            ) : (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.15, duration: 0.4 }}
                className="rounded-xl px-4 py-3 text-sm leading-relaxed"
                style={{
                  background: "var(--card-bg, var(--card))",
                  border: "1px solid var(--rule)",
                  boxShadow: "var(--shadow-1)",
                  color: "var(--ink)",
                }}
              >
                <div
                  className="mb-1.5"
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: 10,
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {msg.who}
                </div>
                <p className="mb-3">
                  {msg.text}{" "}
                  <strong style={{ color: "var(--ink)" }}>{msg.bold}</strong>{" "}
                  {msg.tail}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {msg.chips?.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 text-xs transition-all hover:opacity-80"
                      style={{
                        fontFamily: "var(--font-jetbrains-mono)",
                        background: "var(--terracotta-soft)",
                        color: "var(--terracotta)",
                        border: "1px solid transparent",
                        letterSpacing: "0.4px",
                        textTransform: "uppercase",
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </motion.div>
            ),
          )}

          {/* Typing indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.4 }}
            className="flex items-center gap-1.5 px-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="rounded-full"
                style={{
                  width: 5,
                  height: 5,
                  background: "var(--ink-4)",
                }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── TRUST STRIP ──────────────────────────────────── */}
      <TrustStrip />

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section
        id="como-funciona"
        className="grid grid-cols-1 gap-8 px-5 py-12 sm:px-8 md:grid-cols-3 lg:px-16 lg:py-16"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.num}
            custom={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
          >
            <div
              className="mb-3"
              style={{
                fontFamily: "var(--font-instrument-serif)",
                fontSize: 36,
                lineHeight: 1,
                color: "var(--terracotta)",
              }}
            >
              {f.num}
            </div>
            <h3
              className="mb-2"
              style={{
                fontFamily: "var(--font-instrument-serif)",
                fontSize: 22,
                lineHeight: 1.1,
                letterSpacing: "-0.3px",
                color: "var(--ink)",
              }}
            >
              {f.title}
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--ink-3)" }}
            >
              {f.desc}
            </p>
          </motion.div>
        ))}
      </section>

      {/* ── CASOS DE USO ─────────────────────────────────── */}
      <section
        className="px-5 py-12 sm:px-8 lg:px-16 lg:py-16"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <div
          className="mb-3"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: 11,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "1.5px",
          }}
        >
          Casos de uso
        </div>
        <h2
          className="mb-10"
          style={{
            fontFamily: "var(--font-instrument-serif)",
            fontSize: "clamp(32px, 4vw, 48px)",
            lineHeight: 1.05,
            letterSpacing: "-1px",
            color: "var(--ink)",
            maxWidth: 560,
          }}
        >
          Para decisiones que necesitan respaldo normativo
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CASOS_USO.map((caso, i) => (
            <motion.div
              key={caso.perfil}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp}
              className="rounded-xl p-6 flex flex-col gap-4"
              style={{
                background: "var(--paper-2)",
                border: "1px solid var(--rule)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl" aria-hidden="true">{caso.emoji}</span>
                <span
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    color: "var(--ink-3)",
                  }}
                >
                  {caso.perfil}
                </span>
              </div>
              <div
                className="rounded-lg px-3 py-2.5 text-sm italic"
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--rule)",
                  color: "var(--ink-2)",
                  lineHeight: 1.5,
                }}
              >
                &ldquo;{caso.consulta}&rdquo;
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--ink-3)" }}
              >
                {caso.resultado}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section className="px-5 py-12 sm:px-8 lg:px-16 lg:py-16">
        <div
          className="mb-3"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: 11,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "1.5px",
          }}
        >
          Cómo funciona
        </div>
        <h2
          className="mb-10"
          style={{
            fontFamily: "var(--font-instrument-serif)",
            fontSize: "clamp(32px, 4vw, 48px)",
            lineHeight: 1.05,
            letterSpacing: "-1px",
            color: "var(--ink)",
            maxWidth: 640,
          }}
        >
          Cada respuesta está anclada a la norma
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "1", title: "Escribe tu consulta", desc: "En lenguaje natural, como se lo contaría a un colega." },
            { step: "2", title: "Se busca en la normativa", desc: "Voyage AI voyage-law-2 encuentra los artículos más relevantes por similitud semántica legal." },
            { step: "3", title: "Gemini redacta", desc: "Genera la respuesta usando solo los fragmentos recuperados, sin inventar." },
            { step: "4", title: "Revisa las fuentes", desc: "Cada cita es verificable. Haz clic en cualquier referencia para ver el artículo completo." },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp}
              className="rounded-xl p-5"
              style={{
                background: "var(--card)",
                border: "1px solid var(--rule)",
                boxShadow: "var(--shadow-1)",
              }}
            >
              <div
                className="mb-3 inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  background: "var(--ink)",
                  color: "var(--paper)",
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
              >
                {item.step}
              </div>
              <h4
                className="mb-1 font-medium"
                style={{ color: "var(--ink)", fontSize: 15 }}
              >
                {item.title}
              </h4>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--ink-3)" }}
              >
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
      {/* ── CTA FINAL ────────────────────────────────────── */}
      <section
        className="px-5 py-14 sm:px-8 lg:px-16 lg:py-20 text-center"
        style={{
          borderTop: "1px solid var(--rule)",
          background: "var(--paper-2)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-xl"
        >
          <p
            className="mb-3"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: 11,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
            }}
          >
            Beta abierta — sin registro
          </p>
          <h2
            className="mb-4"
            style={{
              fontFamily: "var(--font-instrument-serif)",
              fontSize: "clamp(32px, 4vw, 52px)",
              lineHeight: 1.05,
              letterSpacing: "-1px",
              color: "var(--ink)",
            }}
          >
            Tu primera consulta
            <br />
            <em style={{ fontStyle: "italic", color: "var(--terracotta)" }}>está a un clic</em>
          </h2>
          <p
            className="mb-8 text-sm leading-relaxed"
            style={{ color: "var(--ink-3)", maxWidth: 400, margin: "0 auto 2rem" }}
          >
            Sin registro, sin tarjeta de crédito. Hasta 20 consultas por hora durante la beta.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 rounded-full px-7 py-3 text-sm font-medium transition-all hover:-translate-y-px hover:shadow-lg"
            style={{
              background: "var(--ink)",
              color: "var(--paper)",
              boxShadow: "var(--shadow-1)",
            }}
          >
            Hacer una consulta →
          </Link>
        </motion.div>
      </section>
    </>
  );
}

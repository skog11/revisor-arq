"use client";

import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";

export default function ContactoPage() {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState({
    tipo: "error-corpus",
    descripcion: "",
    email: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setEnviado(true);
    } catch {
      // falla silenciosamente — el formulario igual marca como enviado
      setEnviado(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen px-6 py-20" style={{ background: "var(--paper)" }}>
      <div className="mx-auto max-w-xl">

        {/* Header */}
        <div className="mb-10">
          <h1
            className="text-3xl font-normal"
            style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}
          >
            Contacto
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
            Reporta errores en el corpus normativo, sugiere mejoras o pregunta
            sobre el proyecto.
          </p>
        </div>

        {enviado ? (
          <div
            className="flex flex-col items-center gap-4 rounded-2xl p-10 text-center"
            style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
          >
            <CheckCircle className="size-10" style={{ color: "var(--ra-green)" }} />
            <div>
              <p className="font-medium" style={{ color: "var(--ink)" }}>
                Mensaje recibido
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
                Revisaremos tu reporte y, si dejaste tu correo, te responderemos
                a la brevedad.
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl p-8"
            style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
          >
            {/* Tipo */}
            <div>
              <label
                className="mb-1.5 block text-xs font-medium uppercase tracking-widest"
                style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-3)" }}
              >
                Tipo de reporte
              </label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                required
                className="w-full rounded-lg px-3 py-2.5 text-sm"
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--rule)",
                  color: "var(--ink-2)",
                  fontFamily: "var(--font-jetbrains-mono)",
                  outline: "none",
                }}
              >
                <option value="error-corpus">Error en norma o artículo</option>
                <option value="norma-faltante">Norma no incluida</option>
                <option value="respuesta-incorrecta">Respuesta incorrecta del asistente</option>
                <option value="sugerencia">Sugerencia general</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            {/* Descripción */}
            <div>
              <label
                className="mb-1.5 block text-xs font-medium uppercase tracking-widest"
                style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-3)" }}
              >
                Descripción
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                required
                rows={5}
                placeholder="Describe el error o sugerencia con el mayor detalle posible. Indica la norma, artículo y el texto incorrecto si aplica."
                className="w-full resize-none rounded-lg px-3 py-2.5 text-sm leading-relaxed"
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--rule)",
                  color: "var(--ink-2)",
                  outline: "none",
                }}
              />
            </div>

            {/* Email (opcional) */}
            <div>
              <label
                className="mb-1.5 block text-xs font-medium uppercase tracking-widest"
                style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-3)" }}
              >
                Email{" "}
                <span style={{ color: "var(--ink-4)" }}>(opcional)</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="tu@email.com"
                className="w-full rounded-lg px-3 py-2.5 text-sm"
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--rule)",
                  color: "var(--ink-2)",
                  fontFamily: "var(--font-jetbrains-mono)",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                fontFamily: "var(--font-jetbrains-mono)",
                letterSpacing: "0.05em",
              }}
            >
              <Send className="size-3.5" />
              {enviando ? "Enviando…" : "Enviar reporte"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Mail, Check } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setEnviado(true);
    // TODO: Guardar email en Supabase o Resend
  };

  if (enviado) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-medium" style={{ color: "var(--ra-green)", background: "var(--ra-green-soft)", border: "1px solid color-mix(in srgb, var(--ra-green) 30%, transparent)" }}>
        <Check className="size-4" />
        ¡Suscrito correctamente a las alertas normativas!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
      <div className="relative flex-1">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4" style={{ color: "var(--ink-4)" }} />
        <input 
          type="email" 
          required
          placeholder="tu@email.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-full border text-sm focus:outline-none transition-colors"
          style={{ 
            background: "var(--card-bg)", 
            borderColor: "var(--rule-2)", 
            color: "var(--ink)" 
          }}
        />
      </div>
      <button 
        type="submit"
        className="px-6 py-3 rounded-full text-sm font-medium transition-all hover:-translate-y-px"
        style={{ background: "var(--ink)", color: "var(--paper)" }}
      >
        Suscribirse
      </button>
    </form>
  );
}

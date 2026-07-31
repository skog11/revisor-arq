"use client";

import Link from "next/link";
import { useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useRef, useState } from "react";

export function EntradaCentro() {
  const seccionRef = useRef<HTMLElement>(null);
  const [abierta, setAbierta] = useState(false);
  const reducirMovimiento = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({ target: seccionRef, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (progreso) => setAbierta(progreso >= 0.54));

  return (
    <section ref={seccionRef} className="ra-entrada" aria-labelledby="titulo-entrada-centro">
      <div className="ra-entrada__sticky" data-abierta={reducirMovimiento || abierta}>
        <div className="ra-entrada__fondo" aria-hidden="true" />
        <header className="ra-entrada__titulo">
          <p>08 · Cruza la puerta</p>
          <h2 id="titulo-entrada-centro">La consulta<br /><em>comienza aquí.</em></h2>
        </header>

        <div className="ra-entrada__fachada" aria-label="Entrada al Centro de Inteligencia">
          <div className="ra-entrada__marco">
            <div className="ra-entrada__interior">
              <span>REVISOR ARQ</span>
              <strong>Centro de<br />Inteligencia</strong>
              <p>Una respuesta trazable para cada decisión territorial.</p>
              <Link href="/chat" className="ra-entrada__accion">Entrar al Centro <i aria-hidden="true">→</i></Link>
              <small>420 normas · 22.500 fragmentos · 60 dictámenes CGR</small>
            </div>
            <div className="ra-entrada__puerta ra-entrada__puerta--izquierda" aria-hidden="true"><span>Centro<br />de Inteligencia</span><i /></div>
            <div className="ra-entrada__puerta ra-entrada__puerta--derecha" aria-hidden="true"><span>REVISOR<br />ARQ</span><i /></div>
          </div>
        </div>
        <p className="ra-entrada__pie">Una decisión respaldada.<br /><span>Ahora, haz tu consulta.</span></p>
      </div>
    </section>
  );
}

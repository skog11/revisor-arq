"use client";

import { useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useRef, useState } from "react";

const FUENTES = ["PRC", "OGUC", "LGUC", "DDU", "CGR", "SEREMI", "DGA", "CMN"];

export function RespuestaVerificada() {
  const seccionRef = useRef<HTMLElement>(null);
  const [lista, setLista] = useState(false);
  const reducirMovimiento = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({ target: seccionRef, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (progreso) => setLista(progreso >= 0.56));

  return (
    <section ref={seccionRef} className="ra-respuesta" aria-labelledby="titulo-respuesta-verificada">
      <div className="ra-respuesta__sticky" data-lista={reducirMovimiento || lista}>
        <div className="ra-respuesta__fondo" aria-hidden="true" />
        <header className="ra-respuesta__titulo">
          <p>07 · La respuesta</p>
          <h2 id="titulo-respuesta-verificada">Una decisión.<br /><em>Verificada.</em></h2>
        </header>

        <div className="ra-respuesta__fuentes" aria-label="Fuentes consolidadas">
          {FUENTES.map((fuente, indice) => <span key={fuente} className={`ra-respuesta__fuente ra-respuesta__fuente--${indice + 1}`}>{fuente}</span>)}
        </div>

        <article className="ra-respuesta__dictamen" aria-label="Ejemplo de respuesta verificada">
          <header><span>REVISOR ARQ · RESPUESTA TÉCNICA</span><strong>Folio RA–01</strong></header>
          <div className="ra-respuesta__dictamen-cuerpo">
            <p className="ra-respuesta__etiqueta">Conclusión</p>
            <h3>La decisión conserva<br />su fundamento.</h3>
            <p className="ra-respuesta__texto">Una respuesta útil no oculta sus condiciones: indica qué norma aplica, qué antecedente falta y dónde comprobar cada afirmación.</p>
            <div className="ra-respuesta__respaldo"><span>Fuentes activas</span><strong>8 normas y criterios cruzados</strong></div>
          </div>
          <footer><span>Citas textuales · jerarquía aplicada · alertas declaradas</span><i aria-hidden="true">✓</i></footer>
        </article>

        <p className="ra-respuesta__pie">No un chat.<br /><span>Una decisión respaldada.</span></p>
      </div>
    </section>
  );
}

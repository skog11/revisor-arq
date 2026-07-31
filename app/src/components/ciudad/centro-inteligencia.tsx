"use client";

import { useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useRef, useState } from "react";

const FUENTES = ["PRC", "OGUC", "LGUC", "DDU", "CGR", "SEREMI", "DGA", "CMN"];

const LECTURAS = [
  { titulo: "Normativa principal", detalle: "PRC · OGUC · LGUC" },
  { titulo: "Criterios aplicables", detalle: "DDU · CGR · CMN" },
  { titulo: "Condicionantes sectoriales", detalle: "SEREMI · DGA" },
];

export function CentroInteligencia() {
  const seccionRef = useRef<HTMLElement>(null);
  const [etapa, setEtapa] = useState(0);
  const reducirMovimiento = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({ target: seccionRef, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (progreso) => {
    setEtapa(progreso >= 0.66 ? 2 : progreso >= 0.28 ? 1 : 0);
  });

  return (
    <section ref={seccionRef} className="ra-centro" aria-labelledby="titulo-centro-inteligencia">
      <div className="ra-centro__sticky" data-etapa={reducirMovimiento ? 2 : etapa}>
        <div className="ra-centro__mesa" aria-hidden="true" />
        <header className="ra-centro__titulo">
          <p>06 · Entra Revisor ARQ</p>
          <h2 id="titulo-centro-inteligencia">El Centro<br /><em>ordena la lectura.</em></h2>
        </header>

        <div className="ra-centro__fuentes" aria-label="Fuentes que se ordenan">
          {FUENTES.map((fuente, indice) => <span className={`ra-centro__fuente ra-centro__fuente--${indice + 1}`} key={fuente}>{fuente}</span>)}
        </div>

        <div className="ra-centro__registro" aria-label="Registro normativo integrado">
          <div className="ra-centro__registro-cabecera"><span>Registro de lectura</span><span>Predio 01</span></div>
          <div className="ra-centro__lecturas">
            {LECTURAS.map((lectura, indice) => (
              <article className="ra-centro__lectura" key={lectura.titulo}>
                <span>0{indice + 1}</span><div><h3>{lectura.titulo}</h3><p>{lectura.detalle}</p></div><i aria-hidden="true" />
              </article>
            ))}
          </div>
          <div className="ra-centro__nota"><span>Resultado de la lectura</span><strong>Fuentes ordenadas para una sola decisión.</strong></div>
        </div>

        <aside className="ra-centro__edificio" aria-label="Centro de Inteligencia">
          <div className="ra-centro__edificio-lomo" aria-hidden="true" />
          <div className="ra-centro__edificio-frente"><span>REVISOR ARQ</span><strong>Centro de<br />Inteligencia</strong><i aria-hidden="true" /><small>Ordena · cruza · verifica</small></div>
        </aside>

        <p className="ra-centro__pie">No agrega otra fuente.<br /><span>Las lee en conjunto.</span></p>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import {
  motion,
  type MotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef } from "react";

type Capa = {
  id: string;
  titulo: string;
  fuente: string;
  color: string;
  tipo:
    | "ciudad"
    | "zonificacion"
    | "restricciones"
    | "patrimonio"
    | "riesgo"
    | "coeficientes";
};

const CAPAS: Capa[] = [
  {
    id: "territorio",
    titulo: "La ciudad visible",
    fuente: "Lo que se puede ver",
    color: "#8a4a32",
    tipo: "ciudad",
  },
  {
    id: "zonificacion",
    titulo: "Zonificación",
    fuente: "PRC · uso de suelo · áreas",
    color: "#a34d36",
    tipo: "zonificacion",
  },
  {
    id: "restricciones",
    titulo: "Líneas y restricciones",
    fuente: "OGUC · DDU · líneas oficiales",
    color: "#b17732",
    tipo: "restricciones",
  },
  {
    id: "patrimonio",
    titulo: "Patrimonio",
    fuente: "CMN · zonas típicas · inmuebles",
    color: "#775b8c",
    tipo: "patrimonio",
  },
  {
    id: "riesgo",
    titulo: "Riesgo y servidumbres",
    fuente: "DGA · SEIA · infraestructura",
    color: "#317180",
    tipo: "riesgo",
  },
  {
    id: "coeficientes",
    titulo: "Coeficientes y exigencias",
    fuente: "LGUC · OGUC · sanitaria · ambiental",
    color: "#3f6b55",
    tipo: "coeficientes",
  },
];

function PlanoTecnico({ tipo, color }: Pick<Capa, "tipo" | "color">) {
  if (tipo === "ciudad") {
    return (
      <Image
        src="/ciudad/ciudad-hero-v4.png"
        alt=""
        fill
        quality={90}
        sizes="(max-width: 767px) 94vw, 76vw"
        className="object-cover"
      />
    );
  }

  return (
    <svg
      className="ra-capa__plano"
      viewBox="0 0 1200 675"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={`cuadricula-${tipo}`}
          width="42"
          height="42"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M42 0H0V42"
            fill="none"
            stroke={color}
            strokeOpacity=".11"
            strokeWidth="1"
          />
        </pattern>
        <pattern
          id={`trama-${tipo}`}
          width="18"
          height="18"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(32)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="18"
            stroke={color}
            strokeOpacity=".22"
            strokeWidth="5"
          />
        </pattern>
      </defs>

      <rect width="1200" height="675" fill={`url(#cuadricula-${tipo})`} />

      <g
        className="ra-capa__calles"
        fill="none"
        stroke="#5c5245"
        strokeOpacity=".38"
      >
        <path
          d="M-40 498C190 405 317 398 479 442S801 546 1242 349"
          strokeWidth="28"
        />
        <path
          d="M311-35C326 169 383 270 492 359S646 520 680 720"
          strokeWidth="19"
        />
        <path
          d="M820-32C791 163 798 313 875 438s105 179 115 279"
          strokeWidth="15"
        />
        <path
          d="M-30 173C211 209 351 198 520 128S885 80 1235 178"
          strokeWidth="13"
        />
      </g>

      {tipo === "zonificacion" && (
        <g
          fill={color}
          fillOpacity=".18"
          stroke={color}
          strokeOpacity=".62"
          strokeWidth="2"
        >
          <path d="M52 72H303V221H52z" />
          <path d="M334 58H571V233H334z" fillOpacity=".1" />
          <path d="M596 63H823V254H596z" fillOpacity=".25" />
          <path d="M853 85H1134V250H853z" fillOpacity=".13" />
          <path d="M78 281H362V445H78z" fillOpacity=".11" />
          <path d="M414 270H735V468H414z" fillOpacity=".29" />
          <path d="M775 287H1111V496H775z" fillOpacity=".18" />
          <path d="M86 492H443V626H86z" fillOpacity=".23" />
          <path d="M730 516H1118V628H730z" fillOpacity=".1" />
        </g>
      )}

      {tipo === "restricciones" && (
        <g>
          <path
            d="M42 462C244 371 370 361 520 404s337 96 640-62v174c-309 123-480 86-648 41S230 521 42 600z"
            fill={`url(#trama-${tipo})`}
          />
          <path
            d="M310 0c25 185 81 281 187 371s142 178 170 304"
            fill="none"
            stroke={color}
            strokeWidth="42"
            strokeOpacity=".17"
          />
          <path
            d="M817 0c-31 188-18 321 58 439 55 85 88 155 101 236"
            fill="none"
            stroke={color}
            strokeWidth="29"
            strokeOpacity=".25"
            strokeDasharray="9 8"
          />
        </g>
      )}

      {tipo === "patrimonio" && (
        <g fill="none" stroke={color}>
          <path
            d="M202 118C349 30 609 40 729 162s63 312-91 391-381 51-493-73-83-278 57-362z"
            fill={color}
            fillOpacity=".1"
            strokeWidth="5"
            strokeDasharray="13 9"
          />
          {[280, 394, 506, 617].map((x, i) => (
            <g key={x} transform={`translate(${x} ${242 + (i % 2) * 76})`}>
              <path
                d="M-30 29V-12L0-36l30 24v41z"
                fill={color}
                fillOpacity=".2"
                strokeWidth="3"
              />
              <path d="M-10 29V2h20v27" strokeWidth="3" />
            </g>
          ))}
        </g>
      )}

      {tipo === "riesgo" && (
        <g fill="none">
          <path
            d="M-40 590C138 480 242 528 371 452s228-241 414-193 246 139 459 23"
            stroke="#3d8298"
            strokeOpacity=".34"
            strokeWidth="88"
          />
          <path
            d="M-40 590C138 480 242 528 371 452s228-241 414-193 246 139 459 23"
            stroke="#f5f0e4"
            strokeOpacity=".72"
            strokeWidth="4"
            strokeDasharray="13 12"
          />
          <path
            d="M69 75L1110 606"
            stroke={color}
            strokeOpacity=".38"
            strokeWidth="30"
            strokeDasharray="8 13"
          />
          <path
            d="M101 62L1142 593"
            stroke={color}
            strokeOpacity=".72"
            strokeWidth="2"
          />
        </g>
      )}

      {tipo === "coeficientes" && (
        <g fill="none" stroke={color}>
          <path
            d="M104 99H1080V583H104z"
            strokeOpacity=".25"
            strokeWidth="2"
          />
          <path
            d="M196 171H420V352H196zM474 117H724V365H474zM781 182H1014V447H781zM244 414H548V568H244zM610 421H884V584H610z"
            fill={color}
            fillOpacity=".08"
            strokeOpacity=".52"
            strokeWidth="3"
          />
          <g
            fill={color}
            stroke="none"
            fontFamily="monospace"
            fontSize="22"
            opacity=".78"
          >
            <text x="218" y="207">COS 0,60</text>
            <text x="497" y="155">CC 2,40</text>
            <text x="804" y="219">ALT 14 m</text>
            <text x="267" y="451">RAS 70°</text>
            <text x="634" y="459">ANTEJ 3 m</text>
          </g>
        </g>
      )}

      <g className="ra-capa__predio">
        <path
          d="M575 354l72-19 66 42-22 72-82 7-52-48z"
          fill={color}
          fillOpacity=".24"
          stroke={color}
          strokeWidth="5"
        />
        <circle cx="634" cy="400" r="8" fill={color} />
        <circle
          cx="634"
          cy="400"
          r="21"
          fill="none"
          stroke={color}
          strokeOpacity=".56"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}

function HojaNormativa({
  capa,
  indice,
  total,
  progreso,
  reducirMovimiento,
}: {
  capa: Capa;
  indice: number;
  total: number;
  progreso: MotionValue<number>;
  reducirMovimiento: boolean;
}) {
  const inicio = 0.07 + indice * 0.125;
  const fin = inicio + 0.16;
  const y = useTransform(
    progreso,
    [inicio, fin],
    [indice * 7, -210 - indice * 8],
  );
  const rotateX = useTransform(progreso, [inicio, fin], [0, 68]);
  const rotateZ = useTransform(
    progreso,
    [inicio, fin],
    [0, indice % 2 === 0 ? -2.2 : 2.2],
  );
  const scale = useTransform(
    progreso,
    [inicio, fin],
    [1 - indice * 0.008, 0.93],
  );
  const opacity = useTransform(
    progreso,
    [inicio, fin - 0.02, fin],
    [1, 0.86, 0],
  );

  const esUltima = indice === total - 1;
  const estiloEstatico = {
    y: indice * 7,
    rotateX: 0,
    rotateZ: indice % 2 === 0 ? -0.2 : 0.2,
    scale: 1 - indice * 0.008,
    opacity: 1,
  };

  return (
    <motion.article
      className={`ra-capa ${capa.tipo === "ciudad" ? "ra-capa--ciudad" : ""}`}
      style={{
        ...(reducirMovimiento || esUltima
          ? estiloEstatico
          : { y, rotateX, rotateZ, scale, opacity }),
        zIndex: total - indice,
        ["--capa-color" as string]: capa.color,
      }}
      aria-label={`${capa.titulo}: ${capa.fuente}`}
    >
      <div className="ra-capa__contenido">
        <PlanoTecnico tipo={capa.tipo} color={capa.color} />
      </div>

      <header className="ra-capa__cabecera">
        <span>{String(indice).padStart(2, "0")}</span>
        <div>
          <h3>{capa.titulo}</h3>
          <p>{capa.fuente}</p>
        </div>
      </header>

      <span className="ra-capa__muestra" aria-hidden="true" />
      <span className="ra-capa__marca-predio" aria-hidden="true">
        Mismo predio
      </span>
    </motion.article>
  );
}

export function CapasNormativas() {
  const contenedorRef = useRef<HTMLElement>(null);
  const reducirMovimiento = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({
    target: contenedorRef,
    offset: ["start start", "end end"],
  });

  const opacidadEntrada = useTransform(scrollYProgress, [0, 0.07], [0, 1]);
  const opacidadSalida = useTransform(
    scrollYProgress,
    [0.86, 0.98],
    [1, 0],
  );
  const escalaMesa = useTransform(scrollYProgress, [0, 0.92], [1.08, 1]);

  return (
    <section
      ref={contenedorRef}
      className="ra-capas"
      aria-labelledby="titulo-capas-normativas"
    >
      <div className="ra-capas__sticky">
        <motion.div
          className="ra-capas__mesa"
          style={reducirMovimiento ? undefined : { scale: escalaMesa }}
          aria-hidden="true"
        />

        <motion.header
          className="ra-capas__titulo"
          style={reducirMovimiento ? undefined : { opacity: opacidadEntrada }}
        >
          <p>04 · La segunda ciudad</p>
          <h2 id="titulo-capas-normativas">
            Una ciudad.
            <br />
            <em>Muchas lecturas.</em>
          </h2>
        </motion.header>

        <div className="ra-capas__escena">
          <div className="ra-capas__pila">
            {CAPAS.map((capa, indice) => (
              <HojaNormativa
                key={capa.id}
                capa={capa}
                indice={indice}
                total={CAPAS.length}
                progreso={scrollYProgress}
                reducirMovimiento={reducirMovimiento}
              />
            ))}
          </div>
        </div>

        <motion.div
          className="ra-capas__pie"
          style={reducirMovimiento ? undefined : { opacity: opacidadSalida }}
        >
          <p>
            La ciudad que vemos es apenas la primera hoja.
            <span>Cada decisión territorial atraviesa todas las demás.</span>
          </p>
          <div aria-hidden="true">
            <span>Desliza</span>
            <i />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

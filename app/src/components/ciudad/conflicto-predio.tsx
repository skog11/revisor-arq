"use client";

import {
  motion,
  type MotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef, useState } from "react";

type FuenteConflicto = {
  id: string;
  sigla: string;
  nombre: string;
  intervencion: string;
  x: number;
  y: number;
  mx: number;
  my: number;
  rotacion: number;
  color: string;
  trayectoria: string;
};

const FUENTES: FuenteConflicto[] = [
  {
    id: "prc",
    sigla: "PRC",
    nombre: "Plan regulador",
    intervencion: "Uso de suelo",
    x: 5,
    y: 18,
    mx: 2,
    my: 23,
    rotacion: -2.2,
    color: "#9d4030",
    trayectoria: "M200 164L348 252L548 356",
  },
  {
    id: "oguc",
    sigla: "OGUC",
    nombre: "Ordenanza general",
    intervencion: "Rasantes y cargas",
    x: 69,
    y: 16,
    mx: 68,
    my: 23,
    rotacion: 1.7,
    color: "#a4662f",
    trayectoria: "M786 154L710 232L548 356",
  },
  {
    id: "lguc",
    sigla: "LGUC",
    nombre: "Ley general",
    intervencion: "Permiso y responsabilidad",
    x: 3,
    y: 42,
    mx: 2,
    my: 41,
    rotacion: 1.1,
    color: "#823b34",
    trayectoria: "M190 302L356 316L548 356",
  },
  {
    id: "ddu",
    sigla: "DDU",
    nombre: "Circular interpretativa",
    intervencion: "Criterio aplicable",
    x: 72,
    y: 39,
    mx: 68,
    my: 41,
    rotacion: -1.4,
    color: "#82633a",
    trayectoria: "M812 292L700 320L548 356",
  },
  {
    id: "cgr",
    sigla: "CGR",
    nombre: "Dictamen",
    intervencion: "Interpretación vinculante",
    x: 7,
    y: 68,
    mx: 2,
    my: 59,
    rotacion: -1.8,
    color: "#70455d",
    trayectoria: "M225 478L365 422L548 356",
  },
  {
    id: "seremi",
    sigla: "SEREMI",
    nombre: "Autoridad sanitaria",
    intervencion: "Autorización sectorial",
    x: 69,
    y: 67,
    mx: 67,
    my: 59,
    rotacion: 2,
    color: "#436b58",
    trayectoria: "M790 472L702 414L548 356",
  },
  {
    id: "dga",
    sigla: "DGA",
    nombre: "Dirección de aguas",
    intervencion: "Cauces y acuíferos",
    x: 38,
    y: 8,
    mx: 35,
    my: 10,
    rotacion: -0.8,
    color: "#3d7080",
    trayectoria: "M493 118L514 230L548 356",
  },
  {
    id: "cmn",
    sigla: "CMN",
    nombre: "Monumentos nacionales",
    intervencion: "Protección patrimonial",
    x: 39,
    y: 80,
    mx: 34,
    my: 78,
    rotacion: 1.2,
    color: "#6d5a83",
    trayectoria: "M505 520L526 432L548 356",
  },
];

function LineaIntervencion({
  fuente,
  indice,
  progreso,
  reducirMovimiento,
}: {
  fuente: FuenteConflicto;
  indice: number;
  progreso: MotionValue<number>;
  reducirMovimiento: boolean;
}) {
  const inicio = 0.14 + indice * 0.075;
  const fin = inicio + 0.11;
  const opacidad = useTransform(progreso, [inicio, fin], [0, 0.72]);
  const desplazamiento = useTransform(progreso, [inicio, fin], [1, 0]);

  return (
    <motion.path
      d={fuente.trayectoria}
      pathLength="1"
      fill="none"
      stroke={fuente.color}
      strokeWidth="1.5"
      strokeDasharray="0.018 0.012"
      vectorEffect="non-scaling-stroke"
      style={
        reducirMovimiento
          ? { opacity: 0.72, strokeDashoffset: 0 }
          : { opacity: opacidad, strokeDashoffset: desplazamiento }
      }
    />
  );
}

function HojaIntervencion({
  fuente,
  indice,
  progreso,
  reducirMovimiento,
}: {
  fuente: FuenteConflicto;
  indice: number;
  progreso: MotionValue<number>;
  reducirMovimiento: boolean;
}) {
  const inicio = 0.13 + indice * 0.075;
  const fin = inicio + 0.11;
  const opacidad = useTransform(progreso, [inicio, fin], [0, 1]);
  const y = useTransform(progreso, [inicio, fin], [22, 0]);
  const scaleY = useTransform(progreso, [inicio, fin], [0.18, 1]);

  return (
    <motion.article
      className="ra-intervencion"
      data-fuente={fuente.id}
      style={{
        ...(reducirMovimiento
          ? { opacity: 1, y: 0, scaleY: 1 }
          : { opacity: opacidad, y, scaleY }),
        ["--fuente-color" as string]: fuente.color,
        ["--fuente-x" as string]: `${fuente.x}%`,
        ["--fuente-y" as string]: `${fuente.y}%`,
        ["--fuente-mx" as string]: `${fuente.mx}%`,
        ["--fuente-my" as string]: `${fuente.my}%`,
        ["--fuente-rotacion" as string]: `${fuente.rotacion}deg`,
      }}
      aria-label={`${fuente.sigla}: ${fuente.nombre}. ${fuente.intervencion}`}
    >
      <span className="ra-intervencion__perforacion" aria-hidden="true" />
      <div>
        <strong>{fuente.sigla}</strong>
        <span>{fuente.nombre}</span>
      </div>
      <p>{fuente.intervencion}</p>
    </motion.article>
  );
}

export function ConflictoPredio() {
  const seccionRef = useRef<HTMLElement>(null);
  const [cierreVisible, setCierreVisible] = useState(false);
  const reducirMovimiento = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({
    target: seccionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (progreso) => {
    setCierreVisible(progreso >= 0.77);
  });

  const luzPredio = useTransform(
    scrollYProgress,
    [0.04, 0.18, 0.82],
    [0, 0.72, 1],
  );
  const escalaPredio = useTransform(
    scrollYProgress,
    [0.04, 0.22, 0.8],
    [0.72, 1, 1.08],
  );
  const opacidadProyecto = useTransform(
    scrollYProgress,
    [0.08, 0.25],
    [0, 1],
  );
  return (
    <section
      ref={seccionRef}
      className="ra-conflicto"
      aria-labelledby="titulo-conflicto-predio"
    >
      <div className="ra-conflicto__sticky">
        <div className="ra-conflicto__mesa" aria-hidden="true" />

        <header className="ra-conflicto__titulo">
          <p>05 · Aparecen los conflictos</p>
          <h2 id="titulo-conflicto-predio">
            Un terreno.
            <br />
            <em>Ocho intervenciones.</em>
          </h2>
        </header>

        <div className="ra-conflicto__escena">
          <div className="ra-conflicto__plano">
            <svg
              className="ra-conflicto__cartografia"
              viewBox="0 0 1000 620"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <pattern
                  id="ra-conflicto-cuadricula"
                  width="32"
                  height="32"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M32 0H0V32"
                    fill="none"
                    stroke="#6f6251"
                    strokeOpacity=".13"
                    strokeWidth="1"
                  />
                </pattern>
                <filter id="ra-conflicto-resplandor" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="12" />
                </filter>
              </defs>

              <rect width="1000" height="620" fill="url(#ra-conflicto-cuadricula)" />

              <g fill="none" stroke="#5c5245" strokeOpacity=".28">
                <path
                  d="M-30 440C168 354 316 365 447 411s287 94 593-49"
                  strokeWidth="36"
                />
                <path
                  d="M275-25C304 156 361 254 468 339s151 175 180 314"
                  strokeWidth="25"
                />
                <path
                  d="M778-27C759 151 779 281 847 390s90 157 102 267"
                  strokeWidth="18"
                />
                <path
                  d="M-25 168C173 207 347 194 506 126S817 73 1025 151"
                  strokeWidth="16"
                />
              </g>

              <g
                fill="none"
                stroke="#6d6252"
                strokeOpacity=".22"
                strokeWidth="2"
              >
                <path d="M80 76H266V204H80zM318 64H502V215H318zM554 70H730V230H554zM781 84H938V222H781z" />
                <path d="M68 272H252V411H68zM304 258H472V390H304zM690 258H922V407H690z" />
                <path d="M82 458H310V568H82zM705 447H925V568H705z" />
              </g>

              <motion.path
                d="M505 315l72-22 66 43-20 76-84 8-55-49z"
                fill="#d9a949"
                filter="url(#ra-conflicto-resplandor)"
                style={
                  reducirMovimiento
                    ? {
                        opacity: 0.92,
                        scale: 1,
                        transformOrigin: "563px 356px",
                      }
                    : {
                        opacity: luzPredio,
                        scale: escalaPredio,
                        transformOrigin: "563px 356px",
                      }
                }
              />
              <motion.path
                d="M505 315l72-22 66 43-20 76-84 8-55-49z"
                fill="#d8b562"
                fillOpacity=".32"
                stroke="#9d6c22"
                strokeWidth="5"
                style={
                  reducirMovimiento
                    ? { opacity: 1 }
                    : { opacity: opacidadProyecto }
                }
              />
              <motion.g
                fill="none"
                stroke="#7e421f"
                strokeWidth="3"
                strokeDasharray="9 7"
                style={
                  reducirMovimiento
                    ? { opacity: 1 }
                    : { opacity: opacidadProyecto }
                }
              >
                <path d="M526 336h82v54h-82z" />
                <path d="M538 351h58v39M567 351v39" />
              </motion.g>

              <g className="ra-conflicto__lineas">
                {FUENTES.map((fuente, indice) => (
                  <LineaIntervencion
                    key={fuente.id}
                    fuente={fuente}
                    indice={indice}
                    progreso={scrollYProgress}
                    reducirMovimiento={reducirMovimiento}
                  />
                ))}
              </g>
            </svg>

            <span className="ra-conflicto__sello" aria-hidden="true">
              Proyecto
              <strong>01</strong>
            </span>

            {FUENTES.map((fuente, indice) => (
              <HojaIntervencion
                key={fuente.id}
                fuente={fuente}
                indice={indice}
                progreso={scrollYProgress}
                reducirMovimiento={reducirMovimiento}
              />
            ))}
          </div>
        </div>

        <div
          className="ra-conflicto__conclusion"
          data-visible={reducirMovimiento || cierreVisible}
        >
          <span>Una sola decisión</span>
          <strong>depende de todas.</strong>
        </div>
      </div>
    </section>
  );
}

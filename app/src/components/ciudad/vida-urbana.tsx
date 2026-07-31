"use client";

import { CALLES, VEREDAS } from "./datos-ciudad";

/**
 * Capa de vida sobre la maqueta: vehiculos recorriendo las calles,
 * figuras caminando por las veredas, humo en la chimenea y aves
 * cruzando sobre los cerros.
 *
 * Todo el movimiento va en SMIL (animateMotion), no en React: se anima
 * en el compositor del navegador y no provoca ni un solo re-render.
 *
 * El viewBox es 1600x900 — la misma proporcion 16:9 de la foto — y el
 * contenedor padre garantiza esa proporcion, asi que las coordenadas
 * calzan con la imagen en cualquier pantalla.
 */

type Props = {
  /** En false no se dibuja nada que se mueva (movil o reduced-motion). */
  animar?: boolean;
  /** De noche los faros se encienden. */
  noche?: boolean;
};

const AUTOS = [
  { calle: 0, color: "#8d99a6", inicio: 0, largo: 13 },
  { calle: 0, color: "#c8a24a", inicio: -4, largo: 20, bus: true },
  { calle: 1, color: "#6e7a84", inicio: -6, largo: 12 },
  { calle: 2, color: "#93705c", inicio: -3, largo: 12 },
];

const PEATONES = [
  { vereda: 0, inicio: 0 },
  { vereda: 0, inicio: -11 },
  { vereda: 1, inicio: -5 },
  { vereda: 1, inicio: -19 },
  { vereda: 2, inicio: -8 },
];

/** Hilos cosidos: el Centro conecta las instituciones que rodean la plaza. */
const CONEXIONES = [
  "M 824 454 C 698 438, 560 414, 416 388",
  "M 824 454 C 910 460, 974 492, 1024 522",
  "M 824 454 C 762 374, 660 308, 578 270",
  "M 824 454 C 896 366, 954 302, 1000 255",
];

export function VidaUrbana({ animar = true, noche = false }: Props) {
  if (!animar) return null;

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="none"
      className="ra-vida-urbana pointer-events-none absolute inset-0 hidden h-full w-full md:block"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {CALLES.map((c) => (
          <path key={c.id} id={`ruta-${c.id}`} d={c.d} fill="none" />
        ))}
        {VEREDAS.map((v) => (
          <path key={v.id} id={`ruta-${v.id}`} d={v.d} fill="none" />
        ))}
      </defs>

      {/* ── La red normativa nace del Centro ──────────────── */}
      <g className="ra-red-normativa">
        {CONEXIONES.map((d, i) => (
          <g key={`conexion-${i}`}>
            <path
              d={d}
              pathLength="1"
              className="ra-hilo-dorado"
              style={{ animationDelay: `${1.25 + i * 0.2}s` }}
              fill="none"
              stroke={noche ? "#f0ce83" : "#a77a25"}
              strokeWidth="1.35"
              strokeLinecap="round"
              opacity={noche ? 0.82 : 0.58}
            />
            <circle
              r="2.6"
              fill={noche ? "#ffe3a0" : "#c89d43"}
              opacity="0"
              className="ra-pulso-red"
            >
              <animateMotion
                dur={`${6.8 + i * 0.7}s`}
                begin={`${2.8 + i * 0.35}s`}
                repeatCount="indefinite"
                path={d}
                calcMode="spline"
                keyTimes="0;1"
                keySplines="0.4 0 0.2 1"
              />
              <animate
                attributeName="opacity"
                values="0;0.9;0.9;0"
                keyTimes="0;0.08;0.82;1"
                dur={`${6.8 + i * 0.7}s`}
                begin={`${2.8 + i * 0.35}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}
      </g>

      {/* ── Vehiculos ─────────────────────────────────────── */}
      {AUTOS.map((auto, i) => {
        const calle = CALLES[auto.calle];
        const alto = auto.bus ? 8 : 6.5;
        return (
          <g key={`auto-${i}`}>
            <animateMotion
              dur={`${calle.dur}s`}
              begin={`${auto.inicio}s`}
              repeatCount="indefinite"
              calcMode="linear"
              rotate="auto"
            >
              <mpath href={`#ruta-${calle.id}`} />
            </animateMotion>

            <g transform={`translate(${-auto.largo / 2} ${-alto / 2})`}>
            {/* sombra en el pavimento */}
            <ellipse
              cx={auto.largo / 2}
              cy={alto + 1.5}
              rx={auto.largo * 0.55}
              ry={2}
              fill="rgba(60,45,25,0.22)"
            />
            {/* carroceria */}
            <rect
              x="0"
              y="0"
              width={auto.largo}
              height={alto}
              rx="1.6"
              fill={auto.color}
            />
            {/* techo mas claro, da volumen */}
            <rect
              x={auto.largo * 0.22}
              y="0"
              width={auto.largo * 0.5}
              height={alto * 0.45}
              rx="1"
              fill="rgba(255,255,255,0.28)"
            />
            {noche && (
              <circle
                cx={auto.largo + 0.5}
                cy={alto * 0.55}
                r="2.6"
                fill="#ffd9a0"
                opacity="0.75"
              />
            )}
            </g>
          </g>
        );
      })}

      {/* ── Peatones ──────────────────────────────────────── */}
      {PEATONES.map((p, i) => {
        const vereda = VEREDAS[p.vereda];
        return (
          <g key={`peaton-${i}`}>
            <animateMotion
              dur={`${vereda.dur}s`}
              begin={`${p.inicio}s`}
              repeatCount="indefinite"
              calcMode="linear"
            >
              <mpath href={`#ruta-${vereda.id}`} />
            </animateMotion>
            <ellipse cx="0" cy="6" rx="2.4" ry="1.1" fill="rgba(60,45,25,0.2)" />
            <rect x="-1.5" y="-1" width="3" height="6.5" rx="1.4" fill="#5e5344">
              <animate
                attributeName="height"
                values="6.5;6;6.5"
                dur="0.6s"
                repeatCount="indefinite"
              />
            </rect>
            <circle cx="0" cy="-2.4" r="1.7" fill="#7a6b58" />
          </g>
        );
      })}

      {/* ── Humo de la chimenea ───────────────────────────── */}
      {[0, 1, 2].map((i) => (
        <circle key={`humo-${i}`} cx="872" cy="174" r="7" fill="#e8e2d6" opacity="0">
          <animate
            attributeName="cy"
            values="174;112"
            dur="7s"
            begin={`${i * 2.3}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values="4;16"
            dur="7s"
            begin={`${i * 2.3}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0;0.4;0"
            dur="7s"
            begin={`${i * 2.3}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* ── Aves sobre los cerros ─────────────────────────── */}
      {[
        { y: 70, dur: 38, begin: 0, escala: 1 },
        { y: 92, dur: 46, begin: -14, escala: 0.75 },
        { y: 58, dur: 52, begin: -28, escala: 0.6 },
      ].map((ave, i) => (
        <g key={`ave-${i}`} opacity="0.5">
          <animateMotion
            dur={`${ave.dur}s`}
            begin={`${ave.begin}s`}
            repeatCount="indefinite"
            path={`M -40 ${ave.y} C 400 ${ave.y - 18}, 1100 ${ave.y + 14}, 1660 ${ave.y - 8}`}
            calcMode="linear"
          />
          <path
            d={`M -7 0 Q 0 -4 7 0`}
            fill="none"
            stroke="#5a5347"
            strokeWidth={1.4 * ave.escala}
            strokeLinecap="round"
            transform={`scale(${ave.escala})`}
          >
            <animate
              attributeName="d"
              values="M -7 0 Q 0 -4 7 0; M -7 0 Q 0 1 7 0; M -7 0 Q 0 -4 7 0"
              dur="1.1s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      ))}
    </svg>
  );
}

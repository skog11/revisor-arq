/**
 * Coordenadas de la maqueta.
 *
 * Todas las posiciones son porcentajes sobre la imagen `ciudad-hero-v4.png`,
 * que tiene proporcion 16:9. El contenedor del hero mantiene esa proporcion
 * exacta, asi que estos porcentajes calzan con la foto en cualquier pantalla.
 *
 * Medidas tomadas sobre una grilla de 5% aplicada a la imagen original.
 */

export type Edificio = {
  id: string;
  /** Texto del rotulo visible */
  rotulo: string;
  /** Que es, en una linea */
  glosa: string;
  href: string;
  /** Punto de anclaje sobre el edificio */
  x: number;
  y: number;
  /** Alto del hilo que sube desde el edificio hasta la tarjeta, en % de la altura */
  hilo: number;
  /** Desplazamiento horizontal de la tarjeta respecto al ancla, en % del ancho */
  desvio?: number;
  /** El edificio principal lleva halo dorado */
  principal?: boolean;
};

export const EDIFICIOS: Edificio[] = [
  {
    id: "centro",
    rotulo: "Consultar",
    glosa: "Centro de Inteligencia",
    href: "/chat",
    x: 51.5,
    y: 30.5,
    hilo: 13,
    principal: true,
  },
  {
    id: "archivo",
    rotulo: "Normativa",
    glosa: "El Archivo · 420 normas",
    href: "/archivo",
    x: 26,
    y: 43,
    hilo: 11,
    desvio: -3,
  },
  {
    id: "escuela",
    rotulo: "Guías",
    glosa: "La Escuela",
    href: "/guias",
    x: 64,
    y: 58,
    hilo: 10,
    desvio: 4,
  },
];

/** Centro del edificio dorado, para el halo. */
export const HALO = { x: 51.5, y: 42, radio: 15 };

/** Sitio eriazo — se usa mas adelante, en el acto de los conflictos. */
export const SITIO_ERIAZO = { x: 47, y: 75 };

/**
 * Calles por donde circulan los vehiculos.
 * Coordenadas en el sistema del viewBox 1600x900 del overlay.
 */
export const CALLES = [
  {
    id: "avenida-sur",
    d: "M 300 660 C 520 630, 700 632, 860 638 C 1020 644, 1160 690, 1400 760",
    dur: 26,
  },
  {
    id: "borde-plaza",
    d: "M 380 500 C 520 470, 700 462, 900 470 C 1040 476, 1140 500, 1240 540",
    dur: 32,
  },
  {
    id: "calle-oeste",
    d: "M 250 560 C 340 540, 420 528, 520 520",
    dur: 21,
  },
];

/** Veredas por donde caminan las figuras. */
export const VEREDAS = [
  { id: "plaza-norte", d: "M 620 470 C 720 452, 840 452, 960 468", dur: 34 },
  { id: "plaza-sur", d: "M 640 540 C 760 556, 880 556, 1000 540", dur: 40 },
  { id: "avenida", d: "M 420 622 C 560 606, 700 604, 840 610", dur: 46 },
];

/** Chimenea de la que sale humo. */
export const CHIMENEA = { x: 54, y: 14.5 };

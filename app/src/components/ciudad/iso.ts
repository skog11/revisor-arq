/**
 * Sistema isometrico para la maqueta de papel de REVISOR ARQ.
 *
 * Proyeccion 2:1 clasica. El eje X avanza hacia la derecha-abajo,
 * el eje Y hacia la izquierda-abajo y el eje Z hacia arriba.
 *
 *            (0,0)  vertice superior
 *              /\
 *   (0,N)     /  \      (N,0)
 *   izquierda \  /      derecha
 *              \/
 *            (N,N)  vertice inferior
 */

/** Media anchura de una baldosa en px del viewBox. */
export const TW = 34;
/** Media altura de una baldosa. */
export const TH = 17;
/** Altura de un piso. */
export const ZH = 26;

export type Tile = [number, number];
export type Punto3D = [number, number, number];

/** Proyecta coordenadas de maqueta a coordenadas del viewBox SVG. */
export function proj(x: number, y: number, z = 0): [number, number] {
  return [(x - y) * TW, (x + y) * TH - z * ZH];
}

/** Punto proyectado como par "x,y" listo para un polygon. */
export function pt(x: number, y: number, z = 0): string {
  const [a, b] = proj(x, y, z);
  return `${a.toFixed(1)},${b.toFixed(1)}`;
}

/** Lista de puntos 3D convertida en atributo points de <polygon>. */
export function poly(puntos: Punto3D[]): string {
  return puntos.map(([x, y, z]) => pt(x, y, z)).join(" ");
}

/** Convierte una polilinea de baldosas en un path SVG (para calles y rios). */
export function pathDesde(puntos: Tile[], z = 0): string {
  return puntos
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${pt(x, y, z)}`)
    .join(" ");
}

/**
 * Orden de dibujo: en isometrico lo que esta mas cerca del observador
 * (mayor x + y) se pinta despues para tapar lo de atras.
 */
export function ordenPintor<T extends { x: number; y: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.x + a.y - (b.x + b.y));
}

/* ────────────────────────────────────────────────────────────
   MATERIALES DE PAPEL
   Cada material define las tres caras visibles del volumen.
   La luz entra desde arriba-izquierda: techo claro, cara
   izquierda media, cara derecha en sombra.
   ──────────────────────────────────────────────────────────── */

export type Material = {
  techo: string;
  izq: string;
  der: string;
  borde: string;
};

export const MATERIAL = {
  cartulina: {
    techo: "#fbf5e7",
    izq: "#e9dcc3",
    der: "#d3c3a4",
    borde: "rgba(78,59,32,0.22)",
  },
  crema: {
    techo: "#f7edd8",
    izq: "#e2d2b2",
    der: "#c9b691",
    borde: "rgba(78,59,32,0.22)",
  },
  terracota: {
    techo: "#dc9a7d",
    izq: "#c0755a",
    der: "#a35c45",
    borde: "rgba(90,40,25,0.28)",
  },
  ladrillo: {
    techo: "#cf8468",
    izq: "#b06550",
    der: "#93503d",
    borde: "rgba(90,40,25,0.3)",
  },
  salvia: {
    techo: "#a9bfa6",
    izq: "#8aa287",
    der: "#6f8a6e",
    borde: "rgba(35,60,40,0.28)",
  },
  pizarra: {
    techo: "#9aa7ad",
    izq: "#7d8b93",
    der: "#65727a",
    borde: "rgba(25,35,45,0.3)",
  },
  madera: {
    techo: "#c9a273",
    izq: "#ab855a",
    der: "#8d6b45",
    borde: "rgba(70,45,20,0.3)",
  },
  dorado: {
    techo: "#e8c680",
    izq: "#d0a659",
    der: "#b08840",
    borde: "rgba(90,60,10,0.32)",
  },
  institucional: {
    techo: "#f4ecdc",
    izq: "#ddd0b6",
    der: "#c2b193",
    borde: "rgba(60,45,25,0.26)",
  },
} as const satisfies Record<string, Material>;

export type NombreMaterial = keyof typeof MATERIAL;

/* ────────────────────────────────────────────────────────────
   PALETA DEL TERRENO
   ──────────────────────────────────────────────────────────── */

export const TERRENO = {
  papel: "#f0e6d2",
  papelAlt: "#e8dcc4",
  pliegue: "rgba(120,95,60,0.14)",
  calle: "#e0d5bd",
  calleBorde: "#cbbc9c",
  vereda: "#eee4d0",
  agua: "#a8c4cc",
  aguaClara: "#c2d8dd",
  cesped: "#b9cbab",
  cespedOscuro: "#9fb693",
  arbolClaro: "#8fae86",
  arbolOscuro: "#5f7d5c",
  sombra: "rgba(92,70,40,0.16)",
  tinta: "#3b3125",
  oro: "#c8a24a",
} as const;

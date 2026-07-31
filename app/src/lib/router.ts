import { DominioPrimario, QueryClassificada } from "./clasificador";

export interface PlanRecuperacion {
  tiposNorma: string[];           // e.g. ["LGUC","OGUC","DDU","DS","Ley"] in priority order
  matchCountPorCapa: number[];    // chunks to request per layer: [capa_alta, capa_amplia]
  dominiosActivos: DominioPrimario[];
  filtrarSoloVigentes: boolean;
}

// OJO — CASE SENSITIVITY: "Ley" y "LEY" son valores DISTINTOS para el filtro
// `tipo = ANY(...)` de match_chunks (comparación sensible a mayúsculas). Del
// conteo real en la BD (2026-07-26): 26 de 27 leyes del corpus tienen
// tipo="LEY" (todo mayúscula) — solo 1 quedó como "Ley". Antes de esta fecha,
// ocho de estos doce dominios solo listaban "Ley", así que excluían en
// silencio casi todas las leyes de esa materia (medioambiente sin Ley 19.300
// ni Ley 20.283, copropiedad sin Ley 21.442, etc.) — nunca daba error, la
// consulta simplemente nunca traía esos artículos como fuente. Detectado
// al investigar por qué el eval no citaba Ley 19.300 Art. 10/11 ni CONAF
// (Ley 20.283) pese a que esos artículos existen en el corpus. Todas las
// entradas deben incluir "LEY" además de "Ley" — no confiar en una sola grafía.
const DOMINIO_A_NORMAS: Record<DominioPrimario, string[]> = {
  urbanismo:         ["LGUC", "OGUC", "DDU", "DDU_ESPECIFICA", "DS", "DFL"],
  construccion:      ["OGUC", "DDU", "DDU_ESPECIFICA", "LGUC", "DS"],
  accesibilidad:     ["DS", "LEY", "Ley", "OGUC", "DDU"],
  copropiedad:       ["LEY", "Ley", "DS", "OGUC"],
  medioambiente:     ["LEY", "Ley", "DS", "DFL", "DL"],
  patrimonio:        ["LEY", "Ley", "DS", "DDU"],
  salud:             ["DS", "LEY", "Ley", "DFL"],
  aguas:             ["DFL", "DL", "DS", "LEY", "Ley"],
  vialidad:          ["DFL", "DS", "LEY", "Ley"],
  electricidad:      ["DFL", "DS", "LEY", "Ley"],
  defensa:           ["DFL", "DS", "DL"],
  bienes_nacionales: ["DL", "LEY", "Ley", "DS"],
  // Transversal: se apoya en leyes y decretos generales, y en los
  // dictamenes de Contraloria, que son la fuente de interpretacion
  // sobre competencia y procedimiento.
  administrativo:    ["LEY", "Ley", "DS", "CGR", "DDU"],
};

export function routear(q: QueryClassificada): PlanRecuperacion {
  // 1. Use detected domains or fall back to default.
  //
  //    Los dominios vienen de un LLM, asi que hay que filtrarlos: si
  //    inventa uno ("administrativa" en vez de "administrativo", por
  //    ejemplo), DOMINIO_A_NORMAS[dominio] seria undefined y el for de
  //    mas abajo reventaria la consulta entera. Se descartan los que no
  //    esten en el vocabulario y, si no queda ninguno, se usa el default.
  const detectados = (q.dominios_detectados ?? []).filter(
    (d): d is DominioPrimario => d in DOMINIO_A_NORMAS
  );

  const dominiosActivos: DominioPrimario[] =
    detectados.length > 0 ? detectados : ["construccion"];

  // 2. Build ordered union of norm types (insertion-order Set)
  const tiposSet = new Set<string>();
  for (const dominio of dominiosActivos) {
    for (const tipo of DOMINIO_A_NORMAS[dominio]) {
      tiposSet.add(tipo);
    }
  }
  const tiposNorma = Array.from(tiposSet);

  // 3. Calculate matchCountPorCapa
  const base = dominiosActivos.length === 1 ? 8 : 12;
  const total = Math.min(base + dominiosActivos.length * 2, 20);
  const matchCountPorCapa = [Math.ceil(total * 0.5), Math.ceil(total * 0.5)];

  return {
    tiposNorma,
    matchCountPorCapa,
    dominiosActivos,
    filtrarSoloVigentes: true,
  };
}

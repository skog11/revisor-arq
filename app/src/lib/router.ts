import { DominioPrimario, QueryClassificada } from "./clasificador";

export interface PlanRecuperacion {
  tiposNorma: string[];           // e.g. ["LGUC","OGUC","DDU","DS","Ley"] in priority order
  matchCountPorCapa: number[];    // chunks to request per layer: [capa_alta, capa_amplia]
  dominiosActivos: DominioPrimario[];
  filtrarSoloVigentes: boolean;
}

const DOMINIO_A_NORMAS: Record<DominioPrimario, string[]> = {
  urbanismo:         ["LGUC", "OGUC", "DDU", "DDU_ESPECIFICA", "DS", "DFL"],
  construccion:      ["OGUC", "DDU", "DDU_ESPECIFICA", "LGUC", "DS"],
  accesibilidad:     ["DS", "Ley", "OGUC", "DDU"],
  copropiedad:       ["Ley", "DS", "OGUC"],
  medioambiente:     ["Ley", "DS", "DFL", "DL"],
  patrimonio:        ["Ley", "DS", "DDU"],
  salud:             ["DS", "Ley", "DFL"],
  aguas:             ["DFL", "DL", "DS"],
  vialidad:          ["DFL", "DS", "Ley"],
  electricidad:      ["DFL", "DS", "Ley"],
  defensa:           ["DFL", "DS", "DL"],
  bienes_nacionales: ["DL", "Ley", "DS"],
};

export function routear(q: QueryClassificada): PlanRecuperacion {
  // 1. Use detected domains or fall back to default
  const dominiosActivos: DominioPrimario[] =
    q.dominios_detectados.length > 0
      ? q.dominios_detectados
      : ["construccion"];

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

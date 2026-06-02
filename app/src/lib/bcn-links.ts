// Mapeo de norma_tipo + norma_numero → idNorma en BCN.
// URL base: https://www.bcn.cl/leychile/navegar?idNorma=XXXXX

export const BCN_ID_MAP: Record<string, number> = {
  "LGUC DFL-458": 13560,
  "OGUC DS-47": 8201,
  "LEY 19300": 30006,
  "LEY 21442": 250481,
  "LEY 17288": 28892,
  "LEY 18290": 29708,
  "LEY 20283": 269388,
  "DFL 4": 258171,         // Ley Eléctrica
  "DFL 1122": 5605,        // Código de Aguas
  "DFL 725": 5595,         // Código Sanitario
  "DFL 382": 4659,         // Servicios Sanitarios
  "DFL 850": 16426,        // Ley de Vialidad
  "DS 594": 167766,        // Condiciones Sanitarias
  "DS 50": 1188250,        // Accesibilidad Universal
  "LEY 19880": 210676,     // Procedimiento Administrativo
  "LEY 20285": 276363,     // Transparencia
  "LEY 16744": 28650,      // Accidentes del Trabajo
  "DL 1939": 6778,         // Bienes del Estado
  "DL 2695": 7001,         // Saneamiento Títulos
  // Formatos alternativos
  "LEY-19300": 30006,
  "LEY-21442": 250481,
  "LEY-17288": 28892,
  "LEY-18290": 29708,
  "LEY-20283": 269388,
  "DFL-4": 258171,
  "DFL-1122": 5605,
  "DFL-725": 5595,
  "DFL-382": 4659,
  "DFL-850": 16426,
  "DS-594": 167766,
  "DS-50": 1188250,
  "LEY-19880": 210676,
  "LEY-20285": 276363,
  "LEY-16744": 28650,
  "DL-1939": 6778,
  "DL-2695": 7001,
};

export function buildBCNUrl(normaTipo: string, normaNumero: string): string | null {
  const clave = `${normaTipo} ${normaNumero}`;
  const id = BCN_ID_MAP[clave];
  if (id) return `https://www.bcn.cl/leychile/navegar?idNorma=${id}`;

  if (normaTipo === "DDU" || normaTipo === "DDU_ESPECIFICA") {
    const num = normaNumero.replace(/^0+/, "");
    return `https://www.minvu.gob.cl/circular-ddu/ddu-${num}/`;
  }

  // Fallback: búsqueda en BCN
  return `https://www.bcn.cl/leychile/consulta/buscar?q=${encodeURIComponent(clave)}`;
}

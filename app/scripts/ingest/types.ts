/** Tipos compartidos por el pipeline de ingesta */

export type TipoNorma =
  | "LGUC"
  | "OGUC"
  | "DDU"
  | "DDU_ESPECIFICA"
  | "LEY"      // Leyes ordinarias (Ley 19.300, 17.288, etc.)
  | "DFL"      // Decretos con Fuerza de Ley (DFL 725, DFL 382, etc.)
  | "DL"       // Decretos Ley (DL 2695)
  | "DS"       // Decretos Supremos reglamentarios (DS-40, DS-594, etc.)
  | "CGR";     // Dictámenes Contraloría General de la República (capa interpretativa)

export interface ParsedArticulo {
  numero: string;          // "116", "2.6.3", "3.1" (DDU sección)
  titulo?: string;
  texto: string;           // texto completo del artículo
  jerarquia: {
    titulo?: string;       // "TITULO I - Disposiciones Generales"
    capitulo?: string;     // "CAPITULO II - Normas de competencia"
  };
  fecha_vigencia_desde?: string;  // ISO date, si se detecta
  orden: number;
}

export interface ParsedNorma {
  tipo: TipoNorma;
  numero: string;          // "DFL-458", "DS-47", "541"
  titulo: string;
  url_fuente: string;
  fecha_publicacion?: string;
  articulos: ParsedArticulo[];
}

export interface ChunkData {
  texto: string;
  tokens: number;          // estimado
  orden: number;
  metadatos: {
    tipo_norma: string;
    numero_norma: string;
    articulo?: string;
    titulo_articulo?: string;
    jerarquia?: string;
    url_fuente: string;
  };
  fecha_vigencia_desde?: string;
  fecha_vigencia_hasta?: string;   // null = vigente
  fuente: string;                  // URL estable del documento
}

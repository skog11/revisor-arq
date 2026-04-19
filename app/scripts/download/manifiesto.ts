/**
 * Gestión del manifiesto del corpus (corpus/manifiesto.json).
 * Registra metadatos de cada archivo descargado: hash, fecha, fuente.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export const CORPUS_ROOT = join(__dirname, "../../../corpus");
const MANIFIESTO_PATH = join(CORPUS_ROOT, "manifiesto.json");

export interface ManifiestoEntry {
  tipo: string;
  numero: string;
  titulo: string;
  url_fuente: string;
  fecha_descarga: string;
  hash: string;
  archivo: string;
  chars: number;
  paginas?: number;
}

export type Manifiesto = Record<string, ManifiestoEntry>;

export function loadManifiesto(): Manifiesto {
  if (!existsSync(MANIFIESTO_PATH)) return {};
  try {
    return JSON.parse(readFileSync(MANIFIESTO_PATH, "utf-8")) as Manifiesto;
  } catch {
    return {};
  }
}

export function saveManifiesto(m: Manifiesto): void {
  mkdirSync(CORPUS_ROOT, { recursive: true });
  writeFileSync(MANIFIESTO_PATH, JSON.stringify(m, null, 2), "utf-8");
}

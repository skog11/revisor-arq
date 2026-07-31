const ESPERA_POR_DEFECTO_MS = 30_000;

/**
 * El fallback de validación puede aparecer durante una recuperación incompleta
 * (por ejemplo, justo después de un cold start). Es transitorio sólo cuando
 * coincide con el mensaje estándar completo; una respuesta cautelar distinta
 * sigue evaluándose como cualquier otro resultado.
 */
export function esRespuestaSinRespaldoVerificable(respuesta: string): boolean {
  const normalizada = respuesta
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return (
    normalizada.includes("no encontre respaldo verificable") &&
    normalizada.includes("no puedo entregar una conclusion verificable")
  );
}

/** Espera configurable entre casos; conserva 30 s por defecto para producción. */
export function obtenerEsperaEntreCasos(
  env: Record<string, string | undefined> = process.env
): number {
  const valor = env.EVAL_DELAY_MS;
  if (valor === undefined) return ESPERA_POR_DEFECTO_MS;

  const espera = Number(valor);
  return Number.isFinite(espera) && espera >= 0
    ? Math.floor(espera)
    : ESPERA_POR_DEFECTO_MS;
}

/** Evita que una ejecución aislada sobrescriba el resultado diario completo. */
export function obtenerNombreArchivoResultados(
  fecha: string,
  casoId?: string,
): string {
  if (!casoId) return `${fecha}.json`;

  const casoSeguro = casoId.replace(/[^a-z0-9_-]/gi, "-");
  return `${fecha}-${casoSeguro}.json`;
}

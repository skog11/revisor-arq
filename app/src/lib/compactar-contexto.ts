/**
 * compactar-contexto.ts — Recorte del bloque de fuentes para proveedores con
 * presupuesto de tokens chico.
 *
 * El system prompt que arma `buildSystemPromptV2` incluye las 18 fuentes
 * completas que devuelve el retriever (~7-9k tokens solo de entrada). Groq, el
 * último eslabón de la cadena, tiene 8.000 TPM en el tier gratuito de
 * `openai/gpt-oss-120b` (entrada + salida combinadas), así que ese prompt
 * garantiza un 413 "Request too large" — visto en producción el 2026-09-07:
 * con Gemini sin cuota y OpenRouter sin modelos gratuitos vigentes, Groq era el
 * único proveedor en pie y aun así toda consulta terminaba en error.
 *
 * En vez de bajar `MAX_CHUNKS` para todos (degradaría la calidad cuando el
 * proveedor sí tiene contexto de sobra), se recorta solo el prompt que recibe
 * el proveedor acotado: se conservan las primeras fuentes (vienen ordenadas por
 * relevancia tras el rerank) y se trunca el texto de cada una, dejando intactas
 * las instrucciones que van antes y después del bloque de fuentes.
 */

/** Encabezado de cada fuente en `construirContexto` (rag.ts). */
const REGEX_INICIO_FUENTE = /--- FUENTE \[\d+\]:/g;

/** Línea que cierra cada bloque de fuente. */
const CIERRE_FUENTE = "\n---";

export interface OpcionesCompactado {
  /** Cuántas fuentes conservar, contando desde la más relevante. */
  maxFuentes: number;
  /** Tope de caracteres del texto de cada fuente (sin contar su encabezado). */
  maxCaracteresPorFuente: number;
}

/**
 * Devuelve el mismo prompt con el bloque de fuentes recortado.
 * Si el prompt no tiene fuentes con el formato esperado, se devuelve tal cual:
 * es preferible intentar la llamada completa a mutilar un prompt desconocido.
 */
export function compactarPrompt(systemPrompt: string, opts: OpcionesCompactado): string {
  const inicios = [...systemPrompt.matchAll(REGEX_INICIO_FUENTE)]
    .map((m) => m.index)
    .filter((i): i is number => i !== undefined);

  if (inicios.length === 0) return systemPrompt;

  const cabecera = systemPrompt.slice(0, inicios[0]);

  // El último bloque termina en su línea de cierre; lo que sigue son las
  // instrucciones finales del sintetizador y no se puede descartar.
  const inicioUltimo = inicios[inicios.length - 1];
  const finUltimoBloque = systemPrompt.indexOf(CIERRE_FUENTE, systemPrompt.indexOf("\n", inicioUltimo));
  const cola = finUltimoBloque === -1
    ? ""
    : systemPrompt.slice(finUltimoBloque + CIERRE_FUENTE.length);

  const bloques = inicios.slice(0, opts.maxFuentes).map((inicio, i) => {
    const esUltimo = i === inicios.length - 1;
    const fin = esUltimo
      ? (finUltimoBloque === -1 ? systemPrompt.length : finUltimoBloque + CIERRE_FUENTE.length)
      : inicios[i + 1];
    return truncarBloque(systemPrompt.slice(inicio, fin).trimEnd(), opts.maxCaracteresPorFuente);
  });

  return `${cabecera}${bloques.join("\n\n")}${cola}`;
}

/** Trunca el cuerpo de un bloque de fuente conservando encabezado y cierre. */
function truncarBloque(bloque: string, maxCaracteres: number): string {
  const finEncabezado = bloque.indexOf("\n");
  if (finEncabezado === -1) return bloque;

  const encabezado = bloque.slice(0, finEncabezado);
  const cuerpo = bloque.slice(finEncabezado + 1).replace(/\n---$/, "");

  const cuerpoRecortado = cuerpo.length > maxCaracteres
    ? `${cuerpo.slice(0, maxCaracteres).trimEnd()} […texto truncado por límite del proveedor]`
    : cuerpo;

  return `${encabezado}\n${cuerpoRecortado}\n---`;
}

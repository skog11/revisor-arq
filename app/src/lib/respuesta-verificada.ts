import type { ChunkRecuperado } from "./rag";
import { validarConsistencia, type ResultadoValidacion, type NormaDerogadaRef } from "./validador";

const DISCLAIMER =
  "\n\n---\n⚠️ **Aviso legal**: Esta respuesta es orientativa y no constituye asesoría jurídica profesional. " +
  "Verifica siempre el texto vigente en BCN (www.bcn.cl) y consulta con un profesional habilitado.";

export const RESPUESTA_NO_VERIFICABLE =
  "No encontré respaldo verificable para esta referencia en la base de conocimiento normativa recuperada. " +
  "No puedo entregar una conclusión verificable con las fuentes disponibles para esta consulta. " +
  "Reformula la pregunta o revisa directamente la norma vigente en BCN antes de tomar una decisión.";

export interface ResultadoRespuestaVerificada {
  entregable: boolean;
  respuesta: string;
  validacion: ResultadoValidacion;
}

export function prepararRespuestaVerificada(
  respuestaCandidata: string,
  chunks: ChunkRecuperado[],
  normasDerogadas: NormaDerogadaRef[] = []
): ResultadoRespuestaVerificada {
  let respuesta = respuestaCandidata;
  let validacion = validarConsistencia(respuesta, chunks, normasDerogadas);

  if (!validacion.valida && validacion.motivo === "Falta disclaimer legal") {
    respuesta += DISCLAIMER;
    validacion = validarConsistencia(respuesta, chunks, normasDerogadas);
  }
  if (!validacion.valida) {
    return { entregable: false, respuesta: RESPUESTA_NO_VERIFICABLE, validacion };
  }

  return { entregable: true, respuesta, validacion };
}

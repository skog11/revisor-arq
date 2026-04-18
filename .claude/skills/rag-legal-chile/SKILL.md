---
name: rag-legal-chile
description: Reglas y patrones para responder preguntas sobre normativa urbanística chilena con RAG. Úsalo cuando trabajes en el chat de REVISOR ARQ, en los system prompts, o en la generación de respuestas.
---

# RAG Legal Chile

## Formato de cita canónico
- LGUC: "LGUC Art. N°X"
- OGUC: "OGUC Art. X.Y.Z"
- DDU: "DDU N°XXX (año)"
- CGR: "Dictamen CGR N°XXXX-YYYY"
- PRC: "PRC <Comuna>, Art. X"

## Estructura modo arquitecto
1. Respuesta directa con parámetro/regla en 1-2 oraciones.
2. Cita al artículo aplicable.
3. Ejemplo práctico si ayuda.
4. Condiciones de aplicabilidad.
5. Disclaimer.

## Estructura modo abogado
1. Texto literal entre comillas del pasaje.
2. Fuente completa (norma, artículo, fecha).
3. Contexto interpretativo breve.
4. Jurisprudencia asociada si existe.
5. Disclaimer.

## Reglas duras
- NUNCA afirmar parámetros numéricos sin respaldo literal en chunks.
- NUNCA inventar nombres de artículos, números de DDU o fechas.
- Si top-3 chunks tienen similitud <0.65, declarar falta de respaldo.
- Si pregunta está fuera de alcance (no-Chile, no-urbanismo), decirlo explícitamente.

## Disclaimer canónico
"Esta herramienta es un asistente informativo basado en la normativa ingestada al corpus. No sustituye la asesoría profesional de un arquitecto o abogado. Verifica siempre la vigencia de la norma citada y consulta a un profesional para decisiones jurídicamente vinculantes."

# REVISOR ARQ — Resumen funcional para brief de diseño

**Qué es:** Chat RAG (retrieval-augmented generation) especializado en normativa urbana y de construcción chilena (LGUC, OGUC, DDU y ~60 dictámenes CGR), dirigido a arquitectos y abogados. Cada respuesta cita el artículo exacto con fragmento literal verificable. Producción: https://revisor-arq.vercel.app

**Propuesta de valor:** "Respuestas que citan el artículo exacto. Para arquitectos y abogados que necesitan precisión, no suposiciones." Sin registro, sin tarjeta, hasta 20 consultas/hora gratis.

## Estructura de páginas (IA / sitemap)

- **Home (`/`)** — landing con hero, casos de uso, cómo funciona, listado de funcionalidades, CTA final
- **Chat (`/chat`)** — la aplicación principal, interfaz de consulta
- **Guías (`/guias`)** — 7 guías temáticas SSG (permiso de edificación, LGUC vs OGUC, checklist residencial, cambio de uso de suelo, etc.)
- **Normativa (`/corpus`)** — panel de normas cargadas (protegido, admin)
- **Precios (`/pricing`)** — preparado para monetización futura
- **Contacto (`/contacto`)** — formulario
- **Login (`/login`)** y **Normativa admin (`/normativa`)** — protegidos con cookie de sesión

## Los tres modos de respuesta (eje central del producto)

1. **Modo Arquitecto** — parámetros normativos aplicados con cifras exactas: constructibilidad, altura, rasantes, distanciamientos, estacionamientos. Incluye tabla de parámetros y calculadoras interactivas integradas.
2. **Modo Abogado** — texto literal íntegro del artículo citado, jerarquía normativa explícita (LGUC > OGUC > DDU), normas concordantes detectadas. Pensado para redactar informes o recursos legales.
3. **Modo Profundo** — análisis de cruces normativos entre LGUC/OGUC/DDU, detección de vacíos y conflictos, cronología de modificaciones, y exportación como informe PDF profesional firmable.

## Funcionalidades clave a soportar en el diseño

- **Caja de consulta en lenguaje natural**, con selector de los tres modos arriba descritos
- **Panel de fuentes verificables** por respuesta: fragmento literal de cada chunk citado, deep-link directo a la Biblioteca del Congreso Nacional (BCN), e indicador de confianza (alta/media/baja)
- **Subida de documentos** (PDF, imagen o texto plano) como contexto adicional de la consulta — planos, informes, resoluciones — con opción de eliminarlos
- **Contexto del proyecto configurable**: zona (urbana/rural/extensión urbana), destino de la edificación, año del permiso original, régimen legal especial (DFL-2, Ley del Mono, copropiedad, patrimonio)
- **Calculadoras interactivas** que aparecen automáticamente dentro de la respuesta cuando la consulta involucra constructibilidad o estacionamientos (input: m² de terreno → resultado instantáneo)
- **Exportación a informe PDF profesional** (modo Profundo): portada con datos del proyecto, citas normativas formateadas, apto para presentar ante la DOM o un tribunal
- **Streaming de respuesta** (SSE) — la respuesta se genera en tiempo real
- **Feedback thumbs up/down** por respuesta
- **PWA** — instalable, con manifest y service worker

## Tono y lenguaje visual sugerido por el contenido existente

- Español chileno neutro, técnico-legal pero accesible
- Iconografía: 🏗️ (arquitecto), ⚖️ (abogado), 🔬 (profundo), 📎 (documentos), 🎛️ (contexto), 📊 (fuentes), 🧮 (calculadoras), 📄 (PDF)
- Ejemplos reales usados en el copy actual: rasante máxima 70° (OGUC 2.6.3), edificio 12 pisos zona ZM-6, Art. 161 LGUC sobre demoliciones
- Estructura narrativa del landing actual: Hero → 3 pilares (modos / citas / normativa verificable) → casos de uso por perfil → "cómo funciona" en 4 pasos → grid de funcionalidades → CTA final sin fricción
- Disclaimer legal obligatorio visible: "Esta herramienta es un asistente informativo. No sustituye la asesoría profesional de un arquitecto o abogado. Verifica siempre la vigencia de la norma citada."

## Stack técnico (por si la IA de diseño necesita restricciones técnicas)

Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion, sobre Supabase Postgres + pgvector, desplegado en Vercel.

---

*Este resumen combina el contenido publicado en la landing actual con la documentación interna del proyecto (CLAUDE.md), para usarse como brief funcional al pedir un rediseño a otra IA.*

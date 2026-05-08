# Status de Ingesta de Corpus — 2026-05-07 (sesión en progreso)

## Progreso Actual

### ✅ Completado en esta sesión
- **LGUC (DFL-458)**: 280 chunks → ingresado en Supabase ✓
- **OGUC (DS-47)**: 806 chunks → ingresado en Supabase ✓
- **DDU-541**: 36 chunks → ingresado ✓
- **DDU-540**: 56 chunks → ingresado ✓
- **DDU-539**: 116 chunks → ingresado ✓
- **DDU-537**: 24 chunks → ingresado ✓
- **DDU-535**: 42 chunks → ingresado ✓
- **DDU-534**: 85 chunks → ingresado ✓
- **DDU-533**: ~ chunks → ingresado ✓
- **DDU-532**: 34 chunks → ingresado ✓
- **DDU-530**: 43 chunks → ingresado ✓
- **DDU-528**: 42 chunks → ingresado ✓
- **DDU-ESP-025-07**: 21 chunks → ingresado ✓
- **DDU-543** (EN PROGRESO): 333 chunks, embeddings en proceso
- **Complementarias**: 25+ normas (LEY, DFL, DS, DL) → ya procesadas

**Total chunks ingresados hasta ahora**: ~1,500+ chunks

### ⏳ En Progreso (background)
- **Ingesta de corpus**: Ejecutando `npm run corpus:ingest`
  - Procesando DDU-543 (333 chunks, embeddings en ~50% completados)
  - Estimado: 20-30 minutos más para completar todas las normas en manifiesto
  - Log: `/tmp/corpus-ingest-retry.log` (background task bosxn5r1d)

- **Descarga de DDUs**: Ejecutando `npm run corpus:download`
  - Reintentando descargas (solo obtuvimos 44 DDUs de ~300 esperadas)
  - Ancho de banda limitado causó timeout en descarga de ESPECIFICA
  - Log: `/tmp/ddu-download-new-attempt.log`

### ❌ Pendiente
- Completar descargas de DDU-000 a DDU-526 (actualmente solo 44 archivos)
- Ingestar DDUs descargados adicionales una vez complete la descarga
- Ingestar normativa cat. 01-11 (medioambiente, agua, etc.)
- Validar si Ley 21.442 (Copropiedad) está incluida correctamente

---

## Próximos Pasos

### 1. Completar ingesta actual (en progreso)
El script está ingiriendo todas las 71 normas en manifiesto.json:
- Salta normas ya procesadas
- Continúa con las pendientes
- ETA: 30-40 minutos desde inicio

### 2. Mejorar descarga de DDUs
Problemas encontrados:
- Solo se descargaron 44 de 304 DDUs
- Timeout durante descarga de ESPECIFICA
- Red lenta causa interrupciones

Opciones:
- Reintentar con limitador de velocidad más lento
- Descargar por rangos pequeños en vez de batch grande
- Obtener lista completa de URLs y descargar en paralelo con control de ancho de banda

### 3. Después de completar ingesta actual
```bash
# Opción A: Esperar a descargas y luego reingestar
npm run corpus:download    # Esperar a completar
npm run corpus:ingest      # Reingestar

# Opción B: Inmediatamente run eval
npm run eval -- --url=https://revisor-arq.vercel.app
```

---

## Configuración Completada

| Variable | Valor | Ubicación |
|----------|-------|-----------|
| GEMINI_API_KEY | AIza... | .env.local ✅ + Vercel ✅ |
| GROQ_API_KEY | gsk_... | .env.local ✅ + Vercel ✅ |
| VOYAGE_API_KEY | pa-... | .env.local ✅ |
| NEXT_PUBLIC_SUPABASE_URL | https://tmypbo... | .env.local ✅ |
| SUPABASE_SERVICE_ROLE_KEY | eyJhb... | .env.local ✅ |

---

## Estadísticas de Ingesta

### Normas en manifiesto.json
```
Total: 71
- LGUC: 1
- OGUC: 1
- DDU: 41 (incluidas especializadas)
- Complementarias: 28 (LEY, DFL, DS, DL)
```

### Chunks estimados por norma (sample)
- LGUC: 280 chunks
- OGUC: 806 chunks (ya estaba ingresada)
- DDU-543: 333 chunks (más grande)
- DDU-539: 116 chunks
- DDU promedio: ~30-50 chunks
- Complementarias promedio: ~20-30 chunks

### Estimación total
```
~1,500 chunks ingresados en esta sesión
~500-600 chunks adicionales de normas pendientes en manifiesto
= ~2,000-2,100 chunks en Supabase tras completar
```

---

## Historial

- **2026-05-07 21:30** — Iniciada nueva sesión de ingesta
- **2026-05-07 21:35** — LGUC (280 chunks) ingresado
- **2026-05-07 21:40** — DDU-541 a DDU-534 ingresados (7 normas, ~400 chunks)
- **2026-05-07 21:45** — Ingesta continuada en background (ahora en DDU-543)
- **2026-05-07 21:47** — Descarga de DDUs reiniciada (44 archivos actuales)

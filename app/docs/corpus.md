# Corpus normativo — REVISOR ARQ

## Fuentes y licencias

| Norma | Fuente | Licencia |
|-------|--------|----------|
| LGUC (DFL-458/1975) | BCN / LeyChile — leychile.cl | Dominio público (norma legal chilena) |
| OGUC (DS-47/1992) | BCN / LeyChile — leychile.cl | Dominio público (norma legal chilena) |
| DDU (circulares) | Observatorio Urbano MINVU | Dominio público (normativa administrativa) |

Las normas legales chilenas son de dominio público conforme al artículo 16 de la Ley 17.336 (Ley de Propiedad Intelectual), que excluye las leyes y resoluciones de los poderes del Estado.

---

## Estructura de carpetas

```
corpus/
├── manifiesto.json       # Metadatos de todos los archivos
├── lguc/
│   └── LGUC.txt          # Texto completo LGUC
├── oguc/
│   └── OGUC.txt          # Texto completo OGUC
└── ddu/
    ├── DDU-227.txt
    ├── DDU-227.pdf        # PDF original (si aplica)
    └── ...
```

---

## Cómo re-descargar el corpus

```bash
# Descarga incremental (solo cambios)
npm run corpus:download

# Forzar re-descarga de todo
npm run corpus:download -- --force

# Solo LGUC y OGUC
npm run corpus:download -- --solo-bcn

# Solo DDU de un rango de años
npm run corpus:download -- --solo-ddu --ddu-desde=2018 --ddu-hasta=2024

# Verificar integridad
npm run corpus:verify
```

---

## Cómo agregar una norma manualmente

Si la descarga automática falla para un documento, agrégalo manualmente:

### LGUC / OGUC
1. Ve a https://www.bcn.cl/leychile/navegar?idNorma=13560 (LGUC) o `?idNorma=19236` (OGUC).
2. Copia todo el texto y guárdalo en `corpus/lguc/LGUC.txt` o `corpus/oguc/OGUC.txt`.
3. Actualiza el hash en `manifiesto.json` ejecutando: `npm run corpus:verify`.

### DDU manualmente
1. Descarga el PDF del DDU desde https://www.observatoriourbanominvu.cl
2. Colócalo en `corpus/ddu/DDU-NNN.pdf` (donde NNN es el número).
3. Extrae el texto:
   ```bash
   npx tsx -e "
   const pdfParse = require('pdf-parse');
   const fs = require('fs');
   const buf = fs.readFileSync('corpus/ddu/DDU-NNN.pdf');
   pdfParse(buf).then(d => fs.writeFileSync('corpus/ddu/DDU-NNN.txt', d.text));
   "
   ```
4. Actualiza `manifiesto.json` manualmente o ejecuta `npm run corpus:download -- --force` para que lo detecte.

---

## DDUs prioritarias para el MVP

Según uso habitual en arquitectura y urbanismo chileno:

| DDU | Materia |
|-----|---------|
| 227 | Subdivisión predial |
| 269 | Planos de subdivisión |
| 275 | Conjuntos armónicos |
| 344 | Viviendas sociales |
| 400 | Anteproyectos |

---

## Límites del servidor — uso responsable

- Rate limit: 1 request cada 2 segundos (configurable en `download-ddu.ts`).
- No ejecutar descarga masiva en horario laboral del MINVU (9:00–18:00 hora Chile).
- El script incluye `User-Agent` identificado para transparencia.
- No redistribuir los archivos descargados; sirven solo para el funcionamiento interno del RAG.

---

## Frecuencia de actualización recomendada

| Norma | Frecuencia |
|-------|------------|
| LGUC | Trimestral |
| OGUC | Mensual |
| DDU | Mensual |

---

## Diagnóstico de problemas comunes

**"Texto demasiado corto"**: El sitio probablemente devolvió una página de error o CAPTCHA. Intenta la descarga manual.

**"Hash no coincide"**: El archivo fue editado externamente. Si el cambio es intencional, ejecuta `npm run corpus:download -- --force` para regenerar el hash.

**"No se encontraron DDUs en el índice automático"**: El MINVU cambió la estructura de su sitio. Revisa la URL en `download-ddu.ts` → `DDU_INDEX_URLS`.

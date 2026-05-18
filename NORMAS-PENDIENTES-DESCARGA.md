# Normas pendientes de descarga y procesamiento

Generado: 2026-05-15

Estas normas están registradas en el corpus pero su archivo de texto (`extraido.txt`) contiene
solo metadatos — el texto completo no pudo descargarse automáticamente y requiere descarga manual.

---

## Normas descargables desde BCN (texto completo disponible en línea)

| Tipo | Número | Año | Título | URL |
|------|--------|-----|--------|-----|
| Decreto | 109 | 1968 | Reglamento de la Ley 16.744 | https://www.bcn.cl/leychile/navega?idNorma=6624 |
| DFL | 1122 | 1981 | Código de Aguas | https://www.bcn.cl/leychile/navega?idNorma=6695 |
| DFL | 4 | 2007 | Ley General de Servicios Eléctricos | https://www.bcn.cl/leychile/navega?idNorma=27748 |
| Decreto Ley | 701 | 1974 | Decreto Ley de Fomento Forestal | https://www.bcn.cl/leychile/navega?idNorma=6578 |
| Ley | 19525 | 1997 | Sistemas de evacuación y drenaje de aguas lluvias | https://www.bcn.cl/leychile/navega?idNorma=60674 |
| Ley | 19561 | 1998 | Prórroga vigencia del DL 701 | https://www.bcn.cl/leychile/navega?idNorma=60674 |
| Ley | 21586 | 2023 | Modifica la Ley 21.435 y el Código de Aguas | https://www.bcn.cl/leychile/navega?idNorma=119452 |

**Cómo descargar:** Ir a la URL → botón "Imprimir" o "Texto" → copiar contenido → guardar en
`corpus/NN_Categoria/subcategoria/NombreNorma/01_fuente_oficial/extraido.txt`

---

## Normas en sitios ministeriales (requieren navegación manual)

| Tipo | Número | Año | Título | Organismo | Sitio |
|------|--------|-----|--------|-----------|-------|
| Decreto Supremo | 38 | 2012 | Reglamento para la dictación de normas de calidad ambiental y de emisión | MMA | https://mma.gob.cl/ |
| Decreto Supremo | 50 | 2002 | Reglamento de la Industria de Agua y Alcantarillado (RIDAA) | MOP | https://www.mop.cl/ |
| Decreto Supremo | 60 | 2011 | Ordenanza General de Urbanismo y Construcciones — Capítulo 1 (Sísmico) | MINVU | https://www.minvu.gob.cl/ |
| Decreto Supremo | 61 | 2011 | Ordenanza General de Urbanismo y Construcciones — Capítulo 2 (Sísmico) | MINVU | https://www.minvu.gob.cl/ |
| Decreto Supremo | 193 | 1998 | Reglamento del DL 701 | Minagri | https://www.minagri.gob.cl/ |
| Decreto Supremo | 259 | 1980 | Reglamento de reforestación de suelos de aptitud forestal | Minagri | https://www.minagri.gob.cl/ |
| Decreto Supremo | 1199 | 2004 | Reglamento de la Ley General de Servicios Sanitarios | MOP | https://www.mop.cl/ |
| Resolución Exenta | 4677 | 1999 | Instrucciones para la aplicación de la Ley de Caminos | Vialidad/MOP | https://www.mop.cl/ |

---

## DDUs con extracción deficiente (requieren re-procesamiento OCR)

| DDU | Problema | Archivo |
|-----|----------|---------|
| DDU-235 | PDF con imagen/tabla — texto extraído es ilegible | `corpus/ddu/DDU-235.txt` |

---

## Prioridad recomendada

1. **DS-60 y DS-61** — Capítulos sísmicos de la OGUC; alta frecuencia en permisos de edificación
2. **DFL-1122** — Código de Aguas; relevante para proyectos con impacto hídrico
3. **DFL-4** — Ley General de Servicios Eléctricos; relevante para servidumbres y proyectos de energía
4. **DS-1199 y DS-50** — Normativa sanitaria; relevante para loteos y edificios con alcantarillado
5. **D-109** — Reglamento de la Ley de Accidentes del Trabajo; relevante para seguridad en obras

---

## Proceso de incorporación al corpus

Una vez descargado el texto de cada norma:

```bash
# 1. Guardar el texto en el archivo correspondiente
# Ej: corpus/12_Tecnica_Estructural_y_Normas_Oficializadas/DS_60_2011_MINVU_OGUC_Cap1/01_fuente_oficial/extraido.txt

# 2. Re-ejecutar la ingesta (detecta automáticamente el cambio por hash)
cd app && npm run corpus:ingest
```

El script de ingesta detecta cambios por hash de archivo, por lo que re-ingestará
automáticamente solo las normas cuyo contenido haya cambiado.

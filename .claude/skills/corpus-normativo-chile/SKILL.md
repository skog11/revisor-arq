---
name: corpus-normativo-chile
description: Conocimiento operativo sobre el corpus normativo chileno de urbanismo y construcción. Úsalo en scripts de descarga, parsing y curaduría del corpus.
---

# Corpus normativo chileno

## Fuentes oficiales
- LGUC (DFL 458 de 1975, MINVU): BCN/LeyChile.
- OGUC (DS 47 de 1992, MINVU): BCN/LeyChile.
- DDU: Observatorio Urbano del MINVU, formato PDF.
- CGR dictámenes: contraloria.cl.
- PRC: sitios municipales.

## Jerarquía OGUC
Libro > Título > Capítulo > Párrafo > Artículo.
Ej: "OGUC Art. 2.6.3" = Libro 2, Título 6, Artículo 3.

## Patrones regex
- Artículo LGUC: /^Art[íi]culo\s+(\d+)\s*[°º]?\.?\s*/m
- Artículo OGUC: /^Art[íi]culo\s+(\d+)\.(\d+)\.(\d+)[°º]?\.?/m
- Header DDU: /DDU\s+N[°º]?\s*(\d+)/

## Normas más consultadas (priorizar)
OGUC: 1.1.2, 2.1.1, 2.6.3, 3.1.1, 4.1.1, 5.1.6.
LGUC: 116, 118, 119, 121, 134, 162.
DDU: 227, 269, 275, 344, 400 (verificar vigencia).

## Ciclo de actualización
- LGUC: trimestral.
- OGUC: mensual.
- DDU: mensual.

## Cuidados
- Las versiones consolidadas pueden retrasarse.
- Los PDF escaneados requieren OCR.
- MINVU a veces reestructura URLs; mantener manifiesto.json con hash.

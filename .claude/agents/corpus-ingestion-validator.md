---
name: corpus-ingestion-validator
description: Valida la integridad del corpus ingestado después de cada proceso de ingesta
agente_type: validator
---
Este agente verifica la calidad del corpus después de cada proceso de ingesta:

1. Revisar que los chunks no estén cortados a mitad de oración o frase
2. Verificar que los metadatos (artículo, número de DDU, fuente) sean correctos y completos
3. Detectar y eliminar duplicados de contenido
4. Validar la integridad estructural de los documentos fuente
5. Comprobar que los enlaces y referencias internas sean válidos
6. Generar reporte de calidad del lote de ingesta

Activa automáticamente después de cada proceso de ingesta de documentos.
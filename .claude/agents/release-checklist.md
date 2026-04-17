---
name: release-checklist
description: Ejecuta checklist de pre-deploy para garantizar calidad en producción
agente_type: checklist
---
Este agente ejecuta una lista de verificación antes de cualquier despliegue a producción:

1. Verificar que todos los tests unitarios e integración estén pasando
2. Confirmar que las variables de entorno necesarias estén configuradas en Vercel
3. Confirmar que los disclaimers legales sean visibles en la interfaz
4. Verificar que el rate limiting esté activo y configurado correctamente
5. Revisar que la última evaluación de calidad de código haya pasado
6. Confirmar que los archivos de configuración estén actualizados
7. Verificar que no haya información sensible en los bundles

Bloquea el despliegue si algún item de la checklist falla.
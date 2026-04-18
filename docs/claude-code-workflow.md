# Flujo de Trabajo en REVISOR ARQ con Claude Code

Esta guía está diseñada para que puedas usar tu asistente de IA de forma segura y eficiente, incluso sin ser programador.

## 1. ¿Qué es un Subagente?
Los subagentes son "expertos virtuales" con un rol específico. En lugar de que un solo asistente lo haga todo (lo que puede generar errores), dividimos las tareas.
- **legal-citation-verifier**: Revisa que las citas legales sean correctas. Se activa antes de responder a un usuario.
- **ui-design-reviewer**: Experto en diseño. Se asegura de que la página se vea bien en móviles y cumpla reglas de accesibilidad.
- **security-auditor**: Experto en seguridad. Revisa que no queden contraseñas expuestas antes de guardar cambios.
- **eval-runner**: Hace pruebas automáticas haciéndole preguntas de control al chat para ver si responde bien.
- Y otros más. Se activan automáticamente o cuando tú se lo pides a Claude.

## 2. ¿Qué es un Agent Team?
Es un grupo de subagentes trabajando juntos.
- **quality-gate**: Revisa diseño, seguridad, citas y corpus *al mismo tiempo*. 
- **release-gate**: Revisión secuencial exhaustiva antes de lanzar la app al público.
- **ingesta-pipeline**: Revisa los nuevos documentos legales que agreguemos.

**¿Cómo invocarlos?** Simplemente dile al chat: *"Claude, ejecuta el quality-gate sobre mis últimos cambios"* o *"Pasa el documento nuevo por el ingesta-pipeline"*.

## 3. Worktrees: Trabajando de forma segura
Los "worktrees" son como "sucursales" de tu proyecto. En lugar de romper la versión principal ("main"), creas una copia vinculada para experimentar.

1. **Crear una sucursal**: `bash ./scripts/worktrees/new.sh nombre-de-mi-idea` (Ej: `new.sh rediseño-boton`). Esto crea una carpeta al lado de REVISOR-ARQ.
2. **Ver sucursales**: `bash ./scripts/worktrees/list.sh`
3. **Eliminar sucursal**: `bash ./scripts/worktrees/cleanup.sh nombre-de-mi-idea`. Esto borra la prueba sin afectar tu proyecto principal.

## 4. Skills (Habilidades)
Son instrucciones fijas que le enseñan a Claude cómo debe comportarse ante ciertos temas.
- Si le pides *"Redacta una respuesta como abogado"*, él automáticamente usará la skill `rag-legal-chile` y `citacion-juridica-chilena` para asegurar que el formato de los artículos y las comillas sean los correctos.

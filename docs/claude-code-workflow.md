# Guía de Flujo de Trabajo de Claude Code para el Proyecto REVISOR ARQ

## Subagentes y sus Activaciones

### 1. legal-citation-verifier
**Cuándo se activa**: Antes de mostrar cualquier respuesta al usuario final generada por el sistema RAG
**Qué hace**: 
- Verifica que cada afirmación factual tenga una cita correspondiente
- Confirma que las citas existan realmente en los chunks recuperados
- Valida que el número de artículo citado coincida con el chunk fuente
- Marca para regeneración si detecta inconsistencias
**Resultado**: Respuestas con citas verificables y precisas

### 2. ui-design-reviewer
**Cuándo se activa**: Al crear o modificar componentes React
**Qué hace**:
- Verifica uso consistente de componentes shadcn/ui
- Revisa aplicación correcta de tokens del sistema de diseño
- Evalúa cumplimiento de accesibilidad (WCAG 2.1 AA)
- Confirma responsividad para dispositivos móviles
- Garantiza consistencia tipográfica
**Resultado**: Interfaz de usuario consistente y accesible

### 3. corpus-ingestion-validator
**Cuándo se activa**: Después de cada proceso de ingesta de documentos
**Qué hace**:
- Revisa que los chunks no estén cortados a mitad de oración
- Verifica corrección de metadatos (artículo, número de DDU)
- Detecta y elimina duplicados de contenido
- Valida integridad estructural de documentos fuente
**Resultado**: Corpus de alta calidad y consistente

### 4. security-auditor
**Cuándo se activa**: Antes de cada commit de código
**Qué hace**:
- Detecta API keys o credenciales hardcodeadas
- Verifica que variables sensibles estén en .env.local (no versionado)
- Confirma validación de inputs en rutas de API
- Verifica implementación de rate limiting
- Revisa vulnerabilidades en dependencias
**Resultado**: Código seguro y libre de credenciales expuestas

### 5. release-checklist
**Cuándo se activa**: Antes de cada despliegue a producción
**Qué hace**:
- Verifica que todos los tests estén pasando
- Confirma configuración de variables de entorno en Vercel
- Asegura visibilidad de disclaimers legales
- Verifica que rate limiting esté activo
- Revisa última evaluación de calidad de código
**Resultado**: Despliegues confiables y seguros

## Hooks y su Funcionamiento

### PreToolUse Hook - pre-block-rm-rf.sh
**Qué hace**: Bloquea comandos `rm -rf` que intenten eliminar los directorios `corpus/` o el archivo `.env.local`
**Activación**: Antes de cualquier comando de eliminación
**Propósito**: Protección contra eliminación accidental de datos críticos

### PostToolUse Hook - post-lint-fix.sh
**Qué hace**: Ejecuta automáticamente `npm run lint -- --fix` después de modificar archivos TypeScript
**Activación**: Después de cualquier operación de edición o escritura en archivos .ts/.tsx
**Propósito**: Mantiene calidad y consistencia del código

### Stop Hook - stop-commit-reminder.sh
**Qué hace**: Recuerda hacer commit cuando hay 5 o más archivos modificados sin commitear
**Activación**: Al detener una sesión o comando
**Propósito**: Fomenta commits regulares y trazabilidad

## Uso de Git Worktrees

### Cómo crear un worktree para una nueva feature
1. Ejecutar: `./scripts/new-feature.sh nombre-de-la-feature`
2. Ejemplo: `./scripts/new-feature.sh autenticacion-usuario`
3. El script crea:
   - Un worktree en `../revisor-arq-nombre-de-la-feature/`
   - Una nueva rama llamada `feature/nombre-de-la-feature`

### Cómo trabajar en el worktree
1. Cambiar al directorio: `cd ../revisor-arq-nombre-de-la-feature/`
2. Trabajar normalmente en la feature
3. Los cambios están aislados de la rama principal

### Cómo regresar al trabajo principal
1. Cambiar al directorio padre: `cd ..`
2. Estás de vuelta en el worktree principal (rama main)

### Cómo eliminar un worktree cuando termina
1. Desde el directorio principal: `cd ..`
2. Ejecutar: `git worktree remove ../revisor-arq-nombre-de-la-feature/`
3. Esto elimina tanto el worktree como la rama asociada

## Cómo invocar una Skill Manualmente

### Sintaxis general
En cualquier conversación con Claude Code, usar:
```
/<nombre-de-la-skill>
```
o equivalentemente:
```
Skill: <nombre-de-la-skill>
```

### Ejemplos de skills útiles para este proyecto

#### Para prototipar componentes complejos
```
/web-artifacts-builder
```
Este skill ayuda a crear prototipos interactivos de componentes antes de integrarlos.

#### Para el sistema de diseño visual
```
/brand-guidelines
/theme-factory
```
Estos skills ayudan a crear y mantener un sistema de diseño consistente.

#### Para generar assets gráficos
```
/canvas-design
```
Este skill genera logos, ilustraciones y otros assets visuales.

#### Para documentación técnica y legal
```
/doc-coauthoring
```
Este skill facilita la creación colaborativa de documentación técnica.

#### Para procesar documentos normativos
```
/pdf
```
Este skill extrae texto de documentos PDF del corpus regulatorio.

#### Para material promocional (futuro)
```
/slack-gif-creator
```
Este skill crea GIFs para campañas de lanzamiento (opcional).

### Flujo de trabajo recomendado
1. Antes de comenzar cualquier tarea significativa, verificar qué skills aplican
2. Invocar los skills relevantes siguiendo las instrucciones específicas de cada uno
3. Los skills proporcionarán guías paso a paso o generarán código/artefactos según corresponda
4. Continuar con el desarrollo siguiendo las guías proporcionadas
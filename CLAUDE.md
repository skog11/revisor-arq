# Proyecto REVISOR ARQ

## Descripción
Sistema de inteligencia artificial para consultar y sintetizar información del marco regulatorio chileno, especializado en normativa urbanística y de vivienda.

## Stack técnico exacto
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **IA**: Gemini 2.5 Flash (modelo de lenguaje) + Voyage (embeddings)
- **Herramientas de desarrollo**: ESLint, Prettier, TypeScript

## Principios no-negociables
(a) Toda respuesta al usuario final debe tener citas verificables de la normativa fuente.
(b) Nunca inventar artículos, secciones o datos que no existan en el corpus.
(c) Incluir disclaimers obligatorios cuando la información sea parcial o sujeta a interpretación.
(d) Mantener convenciones de nombramiento: kebab-case en todos los archivos.
(e) Interfaz de usuario completamente en español.
(f) Commits atómicos con mensajes descriptivos en español.

## Instrucciones para sesiones futuras
Toda sesión de Claude Code debe leer este archivo primero para entender el contexto del proyecto y aplicar los principios establecidos.

## Skills a utilizar
- `web-artifacts-builder`: Para prototipar componentes complejos antes de integrarlos
- `brand-guidelines` y `theme-factory`: Para desarrollar el sistema de diseño visual coherente
- `canvas-design`: Para generar assets gráficos (logo, ilustraciones, open graph)
- `doc-coauthoring`: Para documentación técnica y legal colaborativa
- `pdf`: Para extracción de texto del corpus normativo regulatorio
- `slack-gif-creator`: Para crear material promocional en lanzamientos futuros
# REVISOR ARQ — Contexto del proyecto

Aplicación web que permite a arquitectos y abogados hacer consultas sobre normativa chilena de urbanismo y construcción. MVP basado en LGUC, OGUC y DDU normales.

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion
- Supabase (Postgres con pgvector) para datos
- Google Gemini 2.5 Flash (gratis) para generación
- Voyage AI para embeddings
- Vercel para deploy

## Principios no negociables
- Toda respuesta al usuario final DEBE incluir citas verificables (tipo norma + artículo + fragmento literal).
- NUNCA inventar normas, artículos o parámetros.
- Si no hay respaldo suficiente en los chunks recuperados, declarar explícitamente la falta de respaldo.
- Disclaimer obligatorio al pie de cada respuesta.
- Filenames: kebab-case, en español sin tildes.
- UI en español chileno neutro.
- Commits atómicos y mensajes en español.

## Dos modos de respuesta
- **Arquitecto**: parámetros aplicados, ejemplos, referencia al artículo.
- **Abogado**: texto literal, citas íntegras, contexto normativo.

## Subagentes disponibles
Ver .claude/agents/. Siempre invoca legal-citation-verifier antes de mostrar respuestas al usuario. Invoca ui-design-reviewer al crear componentes. Invoca security-auditor antes de commits.

## Agent teams disponibles
- quality-gate: antes de merge a main.
- release-gate: antes de deploy.
- ingesta-pipeline: al cargar nuevas normas.

## Skills disponibles en el proyecto
- rag-legal-chile: reglas de respuesta legal.
- corpus-normativo-chile: fuentes y parsers.
- citacion-juridica-chilena: formato de citas.
- mvp-legal-launch: checklist legal.

## Instrucción para sesiones futuras
Al iniciar cualquier sesión de Claude Code en este proyecto, lee este archivo completo antes de actuar.

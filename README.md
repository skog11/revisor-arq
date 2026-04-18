# REVISOR ARQ

Aplicación web MVP para consultas sobre normativa chilena de urbanismo y construcción (LGUC, OGUC, DDU).
Permite dos modos de respuesta: Arquitecto (aplicación práctica) y Abogado (rigor legal literal).

## Stack Tecnológico
- **Frontend/Backend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- **Base de Datos:** Supabase (PostgreSQL + pgvector).
- **IA:** Google Gemini 2.5 Flash (Generación RAG), Voyage AI (Embeddings).

## Cómo arrancar en local
1. Clona el repositorio.
2. Copia `.env.local.example` a `.env.local` y llena tus credenciales.
3. Ejecuta `npm install`.
4. Ejecuta `npm run dev`.

## Roadmap
- [x] Configuración inicial (Skills, Subagentes).
- [ ] Setup de Supabase y esquemas SQL.
- [ ] Ingesta del Corpus Legal.
- [ ] Desarrollo UI del Chat.
- [ ] Pruebas y despliegue MVP.

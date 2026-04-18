---
name: quality-gate
description: Gate de calidad antes de merge a main. Ejecuta revisores críticos en paralelo.
agents:
  - legal-citation-verifier
  - ui-design-reviewer
  - security-auditor
  - corpus-ingestion-validator
mode: parallel
---

Invoca los cuatro agentes en paralelo. Veredicto: APROBADO si todos OK. BLOQUEADO si cualquiera reporta crítico.

Muestra tabla resumen al usuario con cada agente, estado y link al detalle.

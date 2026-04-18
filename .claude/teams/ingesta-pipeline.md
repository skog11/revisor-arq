---
name: ingesta-pipeline
description: Pipeline post-ingesta de normas.
agents:
  - corpus-ingestion-validator
  - legal-domain-expert
mode: sequential
---

Flujo:
1. corpus-ingestion-validator: calidad técnica.
2. legal-domain-expert: revisión de dominio.

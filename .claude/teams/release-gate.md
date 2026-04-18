---
name: release-gate
description: Gate final antes de deploy a producción. Secuencial.
agents:
  - release-checklist-runner
  - security-auditor
  - eval-runner
mode: sequential
---

Orden:
1. release-checklist-runner; si falla, detiene.
2. security-auditor; si críticos, detiene.
3. eval-runner; si regresión severa, detiene.

Solo autoriza si los tres OK.

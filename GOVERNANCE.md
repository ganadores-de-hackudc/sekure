# Gobernanza del proyecto

## Roles
- **Mantenedores**: administran el repositorio, revisan y fusionan PRs, publican versiones y velan por la seguridad. Pueden revertir cambios que rompan la arquitectura zero-knowledge.
- **Colaboradores**: aportan código, documentación o reportes. Pueden revisar PRs, pero las fusiones requieren aprobación de un mantenedor.
- **Usuarios**: reportan issues y proponen mejoras.

## Decisiones
- Se prioriza el consenso entre mantenedores. Ante desacuerdo, basta mayoría simple de mantenedores activos.
- Los cambios que afecten seguridad, cifrado o políticas de contraseñas requieren al menos dos aprobaciones de mantenedor.
- Las discusiones estratégicas (roadmap, cambios de licencia) se abren como issues marcados con `governance`.

## Lanzamientos
- Versionado SemVer.
- Las notas de lanzamiento se basan en `CHANGELOG.md`.
- Un mantenedor etiqueta la versión y publica artefactos relevantes (por ejemplo, build de extensión) si aplica.

## Responsabilidades de los mantenedores
- Responder issues y PRs de forma razonable (idealmente dentro de 7 días hábiles).
- Mantener la calidad del código y la coherencia de la arquitectura de cifrado end-to-end.
- Garantizar cumplimiento del Código de Conducta y coordinar la aplicación.

## Conflictos
- Conflictos de conducta siguen `CODE_OF_CONDUCT.md`.
- Conflictos técnicos se resuelven con argumentos técnicos, prototipos o benchmarks cuando sea pertinente.

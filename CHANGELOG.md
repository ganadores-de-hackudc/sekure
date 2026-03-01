# Changelog
Todas las novedades del proyecto se documentan siguiendo [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y las versiones usan [SemVer](https://semver.org/).

## [Unreleased]
- Mejoras y correcciones pendientes.

## [1.0.0] - 2026-03-01
### Added
- Lanzamiento inicial de Sekure: gestor de contraseñas zero-knowledge con FastAPI y SPA React.
- Generador y verificador de contraseñas con entropía, HIBP y recomendaciones.
- Bóveda personal cifrada con AES-256-GCM y derivación PBKDF2-HMAC-SHA256 (600K iteraciones).
- Grupos con claves por grupo, invitaciones y bóveda compartida.
- Compartir secretos via enlaces cifrados con clave en fragmento `#key` y expiraciones configurables.
- Sekure Kids con subcuentas y UI dedicada.
- Extensión Chrome (MV3) con popup, autocompletado, generación rápida y verificación biométrica opcional.
- Internacionalización (es/en/gl) y modo claro/oscuro persistente.

[Unreleased]: https://github.com/ganadores-de-hackudc/sekure/compare/main...HEAD
[1.0.0]: https://github.com/ganadores-de-hackudc/sekure/releases/tag/v1.0.0

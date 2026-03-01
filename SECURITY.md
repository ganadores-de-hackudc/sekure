# Política de Seguridad

## Cómo reportar vulnerabilidades
- Envía un correo a **security@ganadores-hackudc.dev** con:
  - Descripción clara del problema y su impacto.
  - Pasos para reproducir (incluye payloads, cabeceras, capturas o PoC mínimos).
  - Alcance afectado (backend, frontend, extensión) y versión/commit si lo conoces.
  - Datos de contacto para seguimiento.
- No abras issues públicos para vulnerabilidades; usa el canal privado indicado.

## Expectativas de divulgación
- Acusamos recibo en un máximo de 3 días hábiles.
- Compartiremos un plan de mitigación o parche inicial en 14 días hábiles.
- Preferimos divulgación coordinada; acuerda con el equipo una fecha de publicación.

## Alcance
- API FastAPI (backend/)
- SPA y assets de `frontend/`
- Extensión Chrome en `extension/`

## Buenas prácticas al probar
- No ataques a usuarios reales ni a servicios de terceros.
- Usa entornos locales cuando sea posible (`localhost:8000` y `localhost:5173`).
- Evita pérdida de datos: trabaja con cuentas de prueba y bóvedas vacías.

Gracias por ayudarnos a mantener Sekure seguro.
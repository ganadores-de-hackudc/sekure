# Guía de contribución

Gracias por querer contribuir a Sekure. Este documento resume cómo preparar el entorno, estándares de código, pruebas y el proceso para enviar cambios.

## Entorno de desarrollo
- Requisitos: Python 3.12+, Node.js 18+, npm, y opcionalmente [uv](https://docs.astral.sh/uv/) para gestionar dependencias de Python.
- Backend (FastAPI):
  1. `cd backend`
  2. `uv venv --python 3.12 .venv`
  3. Activar entorno (`.venv\Scripts\activate` en Windows o `source .venv/bin/activate` en Linux/Mac).
  4. `uv pip install -r requirements.txt`
  5. Ejecutar `python -m uvicorn main:app --reload --port 8000`
- Frontend (React + Vite):
  1. `cd frontend`
  2. `npm install`
  3. `npm run dev` para desarrollo, `npm run build` para comprobar que el tipo-check y el build pasan.
- Extensión: `npm run prebuild` desde `frontend/` genera el zip en `public/` y usa la carpeta `extension/` para carga descomprimida en Chrome.

## Estándares de código
- Python:
  - Prefiere tipado estático y valida datos con Pydantic en esquemas.
  - Evita duplicar lógica; reutiliza helpers en `crypto.py`, `password_utils.py` y servicios.
  - Mantén la arquitectura zero-knowledge: no registres ni retornes secretos en claro.
- TypeScript/React:
  - Usa tipos/Interfaces definidos en `src/types.ts` y evita `any`.
  - Componentes funcionales con hooks; mantén estado derivado del servidor en `api.ts`.
  - CSS/Tailwind: respeta la convención de utilidades y tokens existentes.
- Commits: sigue [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`, `refactor:`). Commits pequeños y descriptivos.
- Documentación: si añades endpoints o flujos UI, actualiza `README.md` o las secciones correspondientes.

## Pruebas y calidad
- Backend: ejecuta `python -m compileall backend` para validar sintaxis y `pytest backend` para pruebas (añade pruebas nuevas cuando agregues endpoints o lógica de negocio).
- Frontend: `npm run build` debe pasar (incluye type-check). Si añades lógica crítica, incluye pruebas unitarias o de integración cuando estén disponibles.
- Extensión: tras cambios en content/background scripts, valida manualmente el flujo de autocompletado y la carga en `chrome://extensions`.

## Proceso de pull request
- Abre un issue si el cambio es grande o rompe compatibilidad.
- Asegúrate de que lint/build/pruebas pasen antes de subir la PR.
- Incluye un resumen claro: problema, solución y notas de seguridad.
- Mantén las PRs pequeñas y enfocadas; evita mezclar refactors masivos con nuevas features.
- Adjunta capturas o GIFs para cambios de UI cuando sea posible.

## Revisión y criterios de aceptación
- Al menos una aprobación de mantenedor es obligatoria antes de fusionar.
- Revisa que no haya regresiones en seguridad (no exponer secretos, no relajar políticas de contraseña, CORS apropiado).
- Cambios en API deben venir con ajustes en tipos y UI si aplica.
- Las revisiones pueden solicitar tests adicionales o divisiones en PRs más pequeñas.

Gracias por ayudar a mantener seguro y usable Sekure.
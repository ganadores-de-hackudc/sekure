# Sekure — gestor de contraseñas seguro

**Sekure** es un gestor de contraseñas web y extensión de navegador con arquitectura zero-knowledge. El objetivo es que ningún secreto salga del dispositivo sin cifrar, mientras ofrecemos generación, verificación, bóveda personal y grupal, y control parental.

## Ponlo a prueba!
https://sekure-cq2t.vercel.app/

---

## Propósito y problema que resuelve
- Elimina la reutilización de contraseñas débiles con generación segura y análisis de entropía.
- Centraliza las credenciales en una bóveda cifrada cliente → servidor para evitar filtraciones del backend.
- Facilita compartir secretos de forma cifrada end-to-end sin exponer claves al servidor.
- Añade control parental (Sekure Kids) y grupos para equipos o familias.
- Ofrece experiencias consistentes en web y extensión (autocompletado y guardado).

## Características clave
- Seguridad: AES-256-GCM con claves derivadas por PBKDF2-HMAC-SHA256 (600K iteraciones), arquitectura zero-knowledge, WebAuthn opcional para ver/copiar/autocompletar, códigos de recuperación hasheados.
- Generación y verificación: generador (aleatorio, passphrase, PIN), medidor de entropía, detección de filtraciones vía HIBP k-anonimato, tiempo estimado de crackeo y recomendaciones.
- Bóveda personal y grupal: CRUD de entradas, favoritos, etiquetas, búsqueda, apertura rápida de URLs, importación a grupos, invitaciones con roles, polling de notificaciones.
- Compartir secretos: enlaces cifrados con clave en fragmento `#key`, expiración configurable y modos de acceso (abierto o lista blanca).
- Sekure Kids: subcuentas con políticas simplificadas, gestión de bóvedas infantiles, UI dedicada y restricciones server-side.
- Extensión (Manifest V3): popup con bóveda, autocompletado inteligente, detección de formularios SPA, sugerencia de contraseñas, verificación biométrica opcional, caché en service worker.
- Experiencia: i18n (es/en/gl), modo claro/oscuro, tema persistente y selector de idioma global.

## Arquitectura
```
backend/   FastAPI + SQLAlchemy + SQLite/Turso (API REST, cifrado y reglas de negocio)
frontend/  React + Vite + TypeScript + Tailwind (SPA) + script para empaquetar extensión
extension/ Chrome MV3 (background + content + popup) con cifrado local
```

## Instalación local
Requisitos: Python 3.12+, Node.js 18+, [uv](https://docs.astral.sh/uv/) o pip, npm.

Backend (API):
```bash
cd backend
uv venv --python 3.12 .venv
.venv\Scripts\activate   # en Windows (en Linux/Mac: source .venv/bin/activate)
uv pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Frontend (SPA + extensión):
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173

# Para build de producción y tipo-check
npm run build

# Para generar el zip de la extensión en public/
npm run prebuild
```

Extensión (instalación manual):
1) Genera el paquete con `npm run prebuild`.
2) Abre `chrome://extensions`, activa **Modo desarrollador**.
3) Usa **Cargar descomprimida** y selecciona `extension/` o importa el zip generado.

## Uso rápido
- Registro: crea usuario y contraseña maestra (mín. 12 caracteres). Guarda el código de recuperación generado.
- Inicio de sesión: deriva la clave local, cifra/descifra la bóveda en el navegador.
- Bóveda: crea entradas con título/usuario/URL/notas, márcalas como favoritas o etiquétalas.
- Compartir: desde la bóveda personal o grupal genera un enlace cifrado; comparte la URL completa (incluyendo `#key`).
- Grupos: crea grupo, invita por usuario, administra miembros y bóveda compartida.
- Sekure Kids: crea subcuentas, gestiona sus contraseñas desde el panel parental.
- Extensión: inicia sesión en el popup, usa autocompletado y generación rápida en formularios.

## Configuración
- Backend
  - `DATABASE_URL`: cadena SQLAlchemy (por defecto `sqlite:///./sekure.db`).
  - `DATABASE_PASSWORD`: contraseña para bases de datos cifradas de Turso/libsql (vacía por defecto).
  - Ejecuta migraciones manuales (`migration_kids.py`, `migration_share.py`) si cambias de base.
- Frontend / extensión
  - API base definida en `frontend/src/api.ts` y `extension/background.js` (`https://sekure-woad.vercel.app/api` por defecto). Cámbiala si hospedas tu propia API.
  - Usa `npm run build` para producción y sirve el directorio `dist/` con tu CDN o plataforma.

## Compatibilidad
- Navegadores: Chrome/Chromium (extensión MV3). WebAuthn probado en Windows Hello, Touch ID, Face ID y PIN Android.
- Sistemas: backend probado en Windows y Linux; base de datos SQLite local o Turso libsql en producción.
- Node 18+ y Python 3.12+ recomendados para scripts y dependencias actuales.

## Solución de problemas
- No se conecta al backend: revisa `DATABASE_URL`, que el servidor FastAPI esté en el puerto configurado y ajusta `BASE` en `api.ts`/`background.js`.
- Error CORS: confirma que `allow_origins` en el backend cubre tu dominio (por defecto está abierto a `*`).
- WebAuthn falla: asegúrate de usar HTTPS (requerido por los navegadores) y que el dispositivo tenga biometría habilitada.
- Extensión sin datos: comprueba que la sesión esté activa; si se caduca limpia cache (`Cargar descomprimida` de nuevo) o relogin.

## Canales de soporte
- Incidencias y preguntas: abre un issue en GitHub.
- Seguridad: ver `SECURITY.md` para reportar vulnerabilidades.
- Contribuciones: consulta `CONTRIBUTING.md`.

## Licencia
Distribuido bajo la licencia MIT. Ver `LICENSE`.

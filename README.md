# Sekure — Gestor de Contraseñas Seguro

<p align="center">
  <img src="sekure-longlogo.svg" width="300" alt="Sekure logo" />
</p>

**Sekure** es un gestor de contraseñas web moderno, seguro y de conocimiento cero (zero-knowledge) que permite generar, verificar, almacenar, compartir y organizar contraseñas desde la web y desde una extensión de navegador.

---

## Funcionalidades

### 🔐 Autenticación y seguridad de cuenta
- **Registro** con política de contraseña fuerte (mín. 12 caracteres, mayúscula, minúscula, dígito y carácter especial) con checklist en tiempo real
- **Inicio de sesión** con token de sesión almacenado en base de datos
- **Código de recuperación** generado al registrarse (formato `XXXX-XXXX-XXXX-XXXX-XXXX`, hasheado con SHA-256 en el servidor) — se puede copiar o descargar como `.txt`
- **Recuperación de cuenta** — restablecer contraseña maestra usando el código de recuperación; la bóveda se elimina (zero-knowledge: no se puede descifrar con una clave nueva) y se genera un nuevo código
- **Cambio de contraseña maestra** — re-cifra todas las entradas del lado del cliente y las envía al backend; invalida todas las sesiones activas
- **Cambio de nombre de usuario** — requiere confirmación con contraseña actual
- **Eliminar cuenta** — requiere contraseña + texto de confirmación "ELIMINAR"; elimina en cascada bóveda, sesiones y cuentas de hijos

### 🛡️ Autenticación biométrica (WebAuthn)
- **Verificación nativa del dispositivo** — Windows Hello, Touch ID, Face ID, PIN de Android
- **Protección al ver, copiar y autocompletar contraseñas** — se solicita verificación biométrica cada vez (cuando está activado)
- **Registro/verificación de credenciales WebAuthn** con `authenticatorAttachment: 'platform'`
- **Implementaciones separadas** para la app web y la extensión del navegador
- **Toggle activar/desactivar** desde el perfil (web) y desde el pie de la extensión

### 🔑 Generador de contraseñas
- **Aleatorio**: Caracteres criptográficamente seguros (`secrets` de Python)
- **Frase de paso**: Palabras aleatorias tipo Diceware, fáciles de recordar, con opción de aumentar con números/símbolos
- **PIN**: Generación de PINs numéricos seguros
- Configuración de longitud, tipos de caracteres (mayúsculas, minúsculas, dígitos, símbolos), separadores, etc.
- Se devuelve la entropía, nivel de fortaleza y tiempo estimado de crackeo con cada contraseña generada

### ✅ Verificador de contraseñas
- **Análisis de entropía** con gráfico acumulado por carácter
- **Detección de filtraciones** vía API de [Have I Been Pwned](https://haveibeenpwned.com/) (modelo de k-anonimato, nunca se envía la contraseña completa)
- **Distribución de caracteres** gráfico tipo pie
- Estimación de tiempo de crackeo (asumiendo 10B intentos/seg)
- Puntuación de fortaleza (0–4: Muy débil → Muy fuerte)
- Recomendaciones personalizadas de mejora

### 🏦 Bóveda segura
- Cifrado **AES-256-GCM** con clave derivada mediante **PBKDF2-HMAC-SHA256** (600.000 iteraciones)
- **Arquitectura zero-knowledge** — las contraseñas se cifran/descifran en el navegador del usuario; el servidor solo almacena texto cifrado + IV
- Contraseña maestra para proteger todas las credenciales
- Almacenamiento de título, usuario, URL, notas y contraseña cifrada
- **Búsqueda** por título, usuario o URL
- **Abrir URL** directamente desde la bóveda

### ⭐ Favoritos y etiquetas
- Marcar contraseñas como favoritas
- Crear etiquetas con nombre y color personalizado
- Filtrar por favoritos, etiquetas o búsqueda de texto

### 🔗 Compartir contraseñas (Zero-Knowledge)
- **Enlaces cifrados** — se genera una clave AES-256-GCM aleatoria en el cliente, se cifran los datos (título, usuario, URL, contraseña, notas) y se envía el texto cifrado al servidor; la clave se coloca en el fragmento de la URL (`#key`) que **nunca llega al servidor**
- **Expiración configurable** — 1 hora, 1 día, 1 semana o 1 mes
- **Modos de acceso** — "cualquiera con el enlace" o "solo usuarios específicos" (lista blanca por nombre de usuario)
- **Pantalla de recepción** — descifra y muestra la vista previa de la contraseña compartida; aceptar (guardar en bóveda) o rechazar
- Compartir desde la bóveda personal o grupal

### 👥 Grupos (Bóvedas compartidas)
- **Crear/eliminar grupos** — el creador se convierte en propietario
- **Cifrado por grupo** — clave AES-256 aleatoria por grupo
- **Invitar usuarios** por nombre de usuario (solo el propietario)
- **Sistema de invitaciones** — notificaciones pendientes con badge en la barra lateral, acciones de aceptar/ignorar
- **Cancelar invitaciones** pendientes (propietario)
- **Expulsar miembros** (propietario)
- **Abandonar grupo** (miembros no propietarios)
- **Bóveda grupal** — entradas visibles para todos los miembros
- **Añadir/editar/eliminar entradas** en la bóveda grupal (editar/eliminar solo propietario)
- **Importar desde bóveda personal** a grupo — buscar, filtrar e importar entradas existentes
- **Indicador de propietario** (icono de corona) en la lista de miembros
- **Polling de notificaciones** cada 60 segundos

### 👶 Sekure Kids (Control parental)
- **Crear cuentas infantiles** — sub-cuentas vinculadas al padre, con requisitos de contraseña simplificados (mín. 4 caracteres)
- **Editar cuentas infantiles** — cambiar nombre de usuario y/o resetear contraseña
- **Eliminar cuentas infantiles** — eliminación en cascada de bóveda y sesiones
- **Gestión de bóveda del hijo** — el padre puede ver, añadir y eliminar contraseñas en la bóveda de cada hijo
- **Vista propia del niño** — interfaz simplificada, colorida, con emojis decorativos y gradientes púrpura/rosa
- **Layout dedicado** para niños con cabecera y fondos adaptados
- **Protección** — los niños no pueden crear sub-cuentas (restricción del servidor)

### 🧩 Extensión de navegador (Chrome, Manifest V3)
- **Login** en la extensión — autenticación contra la API de Sekure, derivación de clave de cifrado en el cliente
- **Dashboard popup** — muestra todas las entradas de la bóveda, búsqueda y filtrado, copiar usuario/contraseña
- **Detección del sitio actual** — resalta automáticamente las contraseñas que corresponden al dominio de la pestaña activa
- **Dropdown de autocompletado** — aparece al enfocar un campo de contraseña; muestra entradas coincidentes, clic para rellenar usuario y contraseña
- **Verificación biométrica al autocompletar** — si el bloqueo biométrico está activado, se abre una ventana de verificación (Windows Hello, Touch ID, etc.) antes de autocompletar
- **Contraseña sugerida** — genera una contraseña segura de 20 caracteres directamente en el dropdown, con botón de regenerar
- **Medidor de fortaleza en tiempo real** — barra de entropía con tiempo de crackeo estimado, se actualiza al escribir
- **Detección inteligente de formularios** — detecta campos de contraseña vía MutationObserver (compatible con SPAs), detecta botones de submit, envíos de formulario y tecla Enter
- **Prompt para guardar contraseña** — banner tras enviar un formulario si las credenciales no están en la bóveda; sobrevive a la navegación de página
- **Detección de duplicados** — comprueba dominio + usuario contra toda la bóveda antes de ofrecer guardar
- **Descubrimiento automático de campos de usuario** — heurísticas por nombre de atributo (`user`, `email`, `login`, `correo`, `usuario`) y posición en el DOM
- **Caché de bóveda** — TTL de 30 segundos en el service worker
- **Favicons** — iconos de sitio vía Google Favicons API
- **Exclusión de dominios Sekure** — las funciones de la extensión se desactivan en las propias páginas de Sekure
- **Descarga de extensión** — página con instrucciones paso a paso dentro de la app web, con descarga automática del `.zip`

### 🌍 Internacionalización (i18n)
- **Tres idiomas**: Español (`es`), Inglés (`en`), Gallego (`gl`)
- **Selector de idioma** con banderas — disponible en pantalla de login, layout principal y layout kids
- **Preferencia persistente** en `localStorage`
- **Cobertura completa** — auth, bóveda, generador, verificador, grupos, kids, compartir, recuperación, perfil, extensión, navegación

### 🎨 Temas
- **Modo claro/oscuro** con toggle persistente vía `localStorage`
- **Detección automática** de la preferencia del sistema
- **Disponible en todas partes** — login, layout principal y layout kids

---

## Arquitectura

```
sekure/
├── backend/                  # API REST (Python FastAPI)
│   ├── main.py               # Rutas y lógica principal
│   ├── models.py             # Modelos SQLAlchemy (SQLite / Turso)
│   ├── schemas.py            # Esquemas Pydantic
│   ├── crypto.py             # Cifrado AES-256-GCM + PBKDF2
│   ├── password_utils.py     # Generación, análisis y HIBP
│   ├── database.py           # Configuración de BD (SQLite local / Turso prod)
│   ├── migration_kids.py     # Migración para cuentas infantiles
│   ├── migration_share.py    # Migración para compartir contraseñas
│   └── requirements.txt
├── frontend/                 # SPA (React + Vite + TypeScript + Tailwind)
│   ├── src/
│   │   ├── components/       # Componentes UI
│   │   ├── api.ts            # Cliente API
│   │   ├── crypto.ts         # Cifrado AES-256-GCM en el cliente
│   │   ├── biometric.ts      # Autenticación biométrica (WebAuthn)
│   │   ├── i18n.tsx          # Sistema de internacionalización
│   │   ├── ThemeContext.tsx   # Proveedor de tema claro/oscuro
│   │   ├── types.ts          # Tipos TypeScript
│   │   └── App.tsx           # Aplicación principal
│   ├── build-extension-zip.js # Script para generar el .zip de la extensión
│   ├── tailwind.config.js
│   └── package.json
├── extension/                # Extensión Chrome (Manifest V3)
│   ├── manifest.json         # Permisos y configuración
│   ├── background.js         # Service worker (API, caché, gate biométrico)
│   ├── content.js            # Content script (dropdown, guardado, fortaleza)
│   ├── crypto.js             # Cifrado AES-256-GCM en la extensión
│   ├── verify.html/.js       # Ventana de verificación biométrica
│   ├── popup/                # Popup de la extensión
│   └── icons/
└── README.md
```

## Seguridad

| Aspecto | Implementación |
|---------|---------------|
| Arquitectura | Zero-knowledge: el servidor nunca ve contraseñas en texto plano |
| Generación | `secrets` (CSPRNG del SO) |
| Derivación de clave | PBKDF2-HMAC-SHA256, 600K iteraciones |
| Cifrado en reposo | AES-256-GCM con IV aleatorio de 96 bits |
| Verificación maestra | Hash separado (no se reutiliza la clave de cifrado) |
| Verificación de filtraciones | API HIBP con k-anonimato (solo se envían 5 chars del hash SHA-1) |
| Compartir | Clave de descifrado en fragmento URL (`#key`), nunca llega al servidor |
| Biometría | WebAuthn con autenticador de plataforma (Windows Hello, Touch ID, Face ID) |
| Sesiones | Tokens almacenados en BD con invalidación en servidor |
| Recuperación | Código de recuperación hasheado con SHA-256 en el servidor |

## Instalación y uso

### Requisitos
- Python 3.12+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (recomendado) o pip

### Backend

```bash
cd backend
uv venv --python 3.12 .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
# source .venv/bin/activate
uv pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación estará disponible en **http://localhost:5173**

### Extensión de navegador

```bash
cd frontend
npm run prebuild    # Genera extension/.zip en public/
```

Para instalar manualmente:
1. Abre `chrome://extensions` en tu navegador
2. Activa el **Modo de desarrollador**
3. Haz clic en **Cargar extensión descomprimida** y selecciona la carpeta `extension/`

## Vista previa

Al abrir la app por primera vez, se pedirá crear una **contraseña maestra** que protege toda la bóveda. Después se accede al panel con las siguientes secciones:

1. **Generador** — Crea contraseñas con diferentes métodos y configuraciones
2. **Verificador** — Analiza la fortaleza y busca en bases de datos de filtraciones
3. **Bóveda** — Almacena, organiza y recupera contraseñas guardadas
4. **Grupos** — Bóvedas compartidas con otros usuarios
5. **Sekure Kids** — Gestión de cuentas y bóvedas infantiles
6. **Perfil** — Configuración de cuenta, biometría e idioma
7. **Extensión** — Instrucciones y descarga de la extensión de navegador

## Equipo

Desarrollado durante **HackUDC** por el equipo **Ganadores de HackUDC**.

## Licencia

MIT
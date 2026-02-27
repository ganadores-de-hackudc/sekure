# 🔒 Sekure — Gestor de Contraseñas Seguro

<p align="center">
  <img src="frontend/public/favicon.svg" width="80" alt="Sekure logo" />
</p>

**Sekure** es un gestor de contraseñas web moderno y seguro que permite generar, verificar, almacenar y organizar contraseñas de forma sencilla.

## ✨ Funcionalidades

### 🔑 Generador de contraseñas
- **Aleatorio**: Caracteres criptográficamente seguros (`secrets` de Python)
- **Frase de paso**: Palabras aleatorias tipo Diceware, fáciles de recordar
- **PIN**: Generación de PINs numéricos seguros
- Configuración de longitud, tipos de caracteres, separadores, etc.

### 🛡️ Verificador de contraseñas
- **Análisis de entropía** con gráfico acumulado por carácter
- **Detección de filtraciones** via API de [Have I Been Pwned](https://haveibeenpwned.com/) (modelo de k-anonimato, nunca se envía la contraseña completa)
- **Distribución de caracteres** gráfico tipo pie
- Estimación de tiempo de crackeo (asumiendo 10B intentos/seg)
- Recomendaciones personalizadas de mejora

### 🏦 Bóveda segura
- Cifrado **AES-256-GCM** con clave derivada mediante **PBKDF2-HMAC-SHA256** (600.000 iteraciones)
- Contraseña maestra para proteger todas las credenciales
- Almacenamiento de título, usuario, URL, notas y contraseña cifrada

### ⭐ Favoritos y etiquetas
- Marcar contraseñas como favoritas
- Crear etiquetas con colores personalizados
- Filtrar por favoritos, etiquetas o búsqueda de texto

## 🏗️ Arquitectura

```
sekure/
├── backend/               # API REST (Python FastAPI)
│   ├── main.py            # Rutas y lógica principal
│   ├── models.py          # Modelos SQLAlchemy (SQLite)
│   ├── schemas.py         # Esquemas Pydantic
│   ├── crypto.py          # Cifrado AES-256-GCM + PBKDF2
│   ├── password_utils.py  # Generación, análisis y HIBP
│   ├── database.py        # Configuración de BD
│   └── requirements.txt
├── frontend/              # SPA (React + Vite + TypeScript)
│   ├── src/
│   │   ├── components/    # Componentes UI
│   │   ├── api.ts         # Cliente API
│   │   ├── types.ts       # Tipos TypeScript
│   │   └── App.tsx        # Aplicación principal
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

## 🔐 Seguridad

| Aspecto | Implementación |
|---------|---------------|
| Generación | `secrets` (CSPRNG del SO) |
| Derivación de clave | PBKDF2-HMAC-SHA256, 600K iteraciones |
| Cifrado en reposo | AES-256-GCM con IV aleatorio de 96 bits |
| Verificación maestra | Hash separado (no se reutiliza la clave de cifrado) |
| Verificación de filtraciones | API HIBP con k-anonimato (solo se envían 5 chars del hash SHA-1) |

## 🚀 Instalación y uso

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

## 📸 Vista previa

Al abrir la app por primera vez, se pedirá crear una **contraseña maestra** que protege toda la bóveda. Después se accede al panel con tres secciones:

1. **Generador** — Crea contraseñas con diferentes métodos y configuraciones
2. **Verificador** — Analiza la fortaleza y busca en bases de datos de filtraciones
3. **Bóveda** — Almacena, organiza y recupera contraseñas guardadas

## 👥 Equipo

Desarrollado durante **HackUDC** por el equipo **Ganadores de HackUDC**.

## 📄 Licencia

MIT
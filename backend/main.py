"""
Sekure - Secure Password Manager API (Multi-user)
"""
import base64
import secrets
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, get_db, Base
from models import User, Password, Tag, password_tags
from schemas import (
    UserRegister, UserLogin,
    TagCreate, TagOut,
    GenerateRequest, GenerateResponse,
    CheckRequest, CheckResponse,
    VaultEntryCreate, VaultEntryUpdate, VaultEntryOut, VaultEntryWithPassword,
)
from crypto import (
    generate_salt, derive_key, hash_master_password,
    verify_master_password, encrypt_password, decrypt_password,
)
from password_utils import (
    generate_password, calculate_entropy, calculate_entropy_breakdown,
    get_char_distribution, estimate_crack_time, get_strength_label,
    analyze_password, check_hibp,
)

# --- In-memory session store: token -> {user_id, username, key} ---
_sessions: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Sekure API",
    description="Gestor de contraseñas seguro — multi-usuario",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Auth dependency ---
def get_current_session(authorization: str = Header(default="")):
    """Extract and validate the Bearer token, returning session data."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No autenticado. Inicia sesión.")
    token = authorization.removeprefix("Bearer ")
    session_data = _sessions.get(token)
    if not session_data:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida o expirada.")
    return {"token": token, **session_data}


# ==================== AUTH ====================

@app.get("/api/auth/status")
def auth_status(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        return {"authenticated": False}
    token = authorization.removeprefix("Bearer ")
    session_data = _sessions.get(token)
    if not session_data:
        return {"authenticated": False}
    return {
        "authenticated": True,
        "user": {"id": session_data["user_id"], "username": session_data["username"]},
    }


@app.post("/api/auth/register")
def register_user(data: UserRegister, db: Session = Depends(get_db)):
    if len(data.username.strip()) < 3:
        raise HTTPException(400, "El nombre de usuario debe tener al menos 3 caracteres.")
    if len(data.master_password) < 8:
        raise HTTPException(400, "La contraseña debe tener al menos 8 caracteres.")

    existing = db.query(User).filter(User.username == data.username.strip()).first()
    if existing:
        raise HTTPException(400, "El nombre de usuario ya está en uso.")

    salt = generate_salt()
    password_hash = hash_master_password(data.master_password, salt)
    key = derive_key(data.master_password, salt)

    user = User(
        username=data.username.strip(),
        password_hash=password_hash,
        salt=base64.b64encode(salt).decode("utf-8"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = secrets.token_urlsafe(32)
    _sessions[token] = {"user_id": user.id, "username": user.username, "key": key}

    return {"token": token, "user": {"id": user.id, "username": user.username}}


@app.post("/api/auth/login")
def login_user(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username.strip()).first()
    if not user:
        raise HTTPException(401, "Usuario o contraseña incorrectos.")

    salt = base64.b64decode(user.salt)
    if not verify_master_password(data.master_password, salt, user.password_hash):
        raise HTTPException(401, "Usuario o contraseña incorrectos.")

    key = derive_key(data.master_password, salt)
    token = secrets.token_urlsafe(32)
    _sessions[token] = {"user_id": user.id, "username": user.username, "key": key}

    return {"token": token, "user": {"id": user.id, "username": user.username}}


@app.post("/api/auth/logout")
def logout_user(session=Depends(get_current_session)):
    _sessions.pop(session["token"], None)
    return {"message": "Sesión cerrada."}


# ==================== PASSWORD GENERATION ====================

@app.post("/api/passwords/generate", response_model=GenerateResponse)
def gen_password(data: GenerateRequest):
    password = generate_password(
        length=data.length,
        method=data.method,
        include_uppercase=data.include_uppercase,
        include_lowercase=data.include_lowercase,
        include_digits=data.include_digits,
        include_symbols=data.include_symbols,
        num_words=data.num_words,
        separator=data.separator,
    )
    entropy = calculate_entropy(password)
    strength, _ = get_strength_label(entropy)
    crack_time = estimate_crack_time(entropy)

    return GenerateResponse(
        password=password,
        entropy=entropy,
        strength=strength,
        crack_time=crack_time,
    )


# ==================== PASSWORD CHECK ====================

@app.post("/api/passwords/check", response_model=CheckResponse)
async def check_password(data: CheckRequest):
    password = data.password
    entropy = calculate_entropy(password)
    strength, score = get_strength_label(entropy)
    crack_time = estimate_crack_time(entropy)
    feedback = analyze_password(password)
    char_dist = get_char_distribution(password)
    breakdown = calculate_entropy_breakdown(password)
    is_breached, breach_count = await check_hibp(password)

    if is_breached:
        feedback.insert(0, f"⚠️ ¡ALERTA! Esta contraseña ha aparecido en {breach_count:,} filtraciones de datos.")

    return CheckResponse(
        entropy=entropy,
        strength=strength,
        strength_score=score,
        crack_time=crack_time,
        is_breached=is_breached,
        breach_count=breach_count,
        feedback=feedback,
        char_distribution=char_dist,
        entropy_breakdown=breakdown,
    )


# ==================== VAULT ====================

@app.get("/api/vault", response_model=list[VaultEntryOut])
def list_vault(
    search: str = "",
    tag: str = "",
    favorites_only: bool = False,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    user_id = session["user_id"]
    query = db.query(Password).filter(Password.user_id == user_id)

    if search:
        query = query.filter(
            Password.title.ilike(f"%{search}%")
            | Password.username.ilike(f"%{search}%")
            | Password.url.ilike(f"%{search}%")
        )
    if favorites_only:
        query = query.filter(Password.is_favorite == True)
    if tag:
        query = query.join(Password.tags).filter(Tag.name == tag)

    entries = query.order_by(Password.updated_at.desc()).all()
    return entries


@app.post("/api/vault", response_model=VaultEntryOut, status_code=201)
def create_vault_entry(
    data: VaultEntryCreate,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    key = session["key"]
    user_id = session["user_id"]

    encrypted, iv = encrypt_password(data.password, key)

    entry = Password(
        user_id=user_id,
        title=data.title,
        username=data.username or "",
        url=data.url or "",
        encrypted_password=encrypted,
        iv=iv,
        notes=data.notes or "",
        is_favorite=data.is_favorite or False,
    )

    if data.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(data.tag_ids), Tag.user_id == user_id).all()
        entry.tags = tags

    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@app.get("/api/vault/{entry_id}", response_model=VaultEntryWithPassword)
def get_vault_entry(
    entry_id: int,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    key = session["key"]
    user_id = session["user_id"]

    entry = db.query(Password).filter(Password.id == entry_id, Password.user_id == user_id).first()
    if not entry:
        raise HTTPException(404, "Entrada no encontrada.")

    decrypted = decrypt_password(entry.encrypted_password, entry.iv, key)

    return VaultEntryWithPassword(
        id=entry.id,
        title=entry.title,
        username=entry.username,
        url=entry.url,
        notes=entry.notes,
        is_favorite=entry.is_favorite,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        tags=[TagOut.model_validate(t) for t in entry.tags],
        password=decrypted,
    )


@app.put("/api/vault/{entry_id}", response_model=VaultEntryOut)
def update_vault_entry(
    entry_id: int,
    data: VaultEntryUpdate,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    key = session["key"]
    user_id = session["user_id"]

    entry = db.query(Password).filter(Password.id == entry_id, Password.user_id == user_id).first()
    if not entry:
        raise HTTPException(404, "Entrada no encontrada.")

    if data.title is not None:
        entry.title = data.title
    if data.username is not None:
        entry.username = data.username
    if data.url is not None:
        entry.url = data.url
    if data.notes is not None:
        entry.notes = data.notes
    if data.is_favorite is not None:
        entry.is_favorite = data.is_favorite
    if data.password is not None:
        encrypted, iv = encrypt_password(data.password, key)
        entry.encrypted_password = encrypted
        entry.iv = iv
    if data.tag_ids is not None:
        tags = db.query(Tag).filter(Tag.id.in_(data.tag_ids), Tag.user_id == user_id).all()
        entry.tags = tags

    db.commit()
    db.refresh(entry)
    return entry


@app.delete("/api/vault/{entry_id}")
def delete_vault_entry(
    entry_id: int,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    user_id = session["user_id"]

    entry = db.query(Password).filter(Password.id == entry_id, Password.user_id == user_id).first()
    if not entry:
        raise HTTPException(404, "Entrada no encontrada.")

    db.delete(entry)
    db.commit()
    return {"message": "Entrada eliminada."}


@app.put("/api/vault/{entry_id}/favorite")
def toggle_favorite(
    entry_id: int,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    user_id = session["user_id"]

    entry = db.query(Password).filter(Password.id == entry_id, Password.user_id == user_id).first()
    if not entry:
        raise HTTPException(404, "Entrada no encontrada.")

    entry.is_favorite = not entry.is_favorite
    db.commit()
    return {"is_favorite": entry.is_favorite}


# ==================== TAGS ====================

@app.get("/api/tags", response_model=list[TagOut])
def list_tags(session=Depends(get_current_session), db: Session = Depends(get_db)):
    user_id = session["user_id"]
    return db.query(Tag).filter(Tag.user_id == user_id).order_by(Tag.name).all()


@app.post("/api/tags", response_model=TagOut, status_code=201)
def create_tag(
    data: TagCreate,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    user_id = session["user_id"]

    existing = db.query(Tag).filter(Tag.user_id == user_id, Tag.name == data.name).first()
    if existing:
        raise HTTPException(400, "Ya existe una etiqueta con ese nombre.")

    tag = Tag(user_id=user_id, name=data.name, color=data.color or "#9b1b2f")
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@app.delete("/api/tags/{tag_id}")
def delete_tag(
    tag_id: int,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    user_id = session["user_id"]

    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == user_id).first()
    if not tag:
        raise HTTPException(404, "Etiqueta no encontrada.")

    db.delete(tag)
    db.commit()
    return {"message": "Etiqueta eliminada."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

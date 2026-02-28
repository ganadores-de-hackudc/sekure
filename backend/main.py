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
from models import User, UserSession, Password, Tag, password_tags, Group, GroupMember, GroupPassword, GroupInvitation
from schemas import (
    UserRegister, UserLogin, RecoverRequest,
    TagCreate, TagOut,
    GenerateRequest, GenerateResponse,
    CheckRequest, CheckResponse,
    VaultEntryCreate, VaultEntryUpdate, VaultEntryOut, VaultEntryWithPassword,
    GroupCreate, GroupOut, GroupMemberOut, GroupInvite, GroupInvitationOut,
    GroupPasswordCreate, GroupPasswordOut, GroupPasswordWithPassword,
    KidsAccountCreate, KidsAccountOut,
    ChangeUsername, ChangePassword, DeleteAccount,
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

# --- DB-backed session helper ---
def _load_session(token: str, db: Session) -> dict | None:
    """Load session from database, return dict with user_id, username, key or None."""
    sess = db.query(UserSession).filter(UserSession.token == token).first()
    if not sess:
        return None
    key = base64.b64decode(sess.encryption_key)
    user = db.query(User).filter(User.id == sess.user_id).first()
    return {
        "user_id": sess.user_id,
        "username": sess.username,
        "key": key,
        "is_kids_account": bool(user.is_kids_account) if user else False,
    }


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
def get_current_session(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    """Extract and validate the Bearer token, returning session data."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No autenticado. Inicia sesión.")
    token = authorization.removeprefix("Bearer ")
    session_data = _load_session(token, db)
    if not session_data:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida o expirada.")
    return {"token": token, **session_data}


# ==================== AUTH ====================

@app.get("/api/auth/status")
def auth_status(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    if not authorization.startswith("Bearer "):
        return {"authenticated": False}
    token = authorization.removeprefix("Bearer ")
    session_data = _load_session(token, db)
    if not session_data:
        return {"authenticated": False}
    return {
        "authenticated": True,
        "user": {
            "id": session_data["user_id"],
            "username": session_data["username"],
            "is_kids_account": session_data.get("is_kids_account", False),
        },
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

    # Generate recovery code (format: XXXX-XXXX-XXXX-XXXX-XXXX)
    raw_recovery = secrets.token_hex(10).upper()  # 20 hex chars
    recovery_code = "-".join([raw_recovery[i:i+4] for i in range(0, 20, 4)])
    import hashlib as _hl
    recovery_hash = _hl.sha256(recovery_code.encode()).hexdigest()

    user = User(
        username=data.username.strip(),
        password_hash=password_hash,
        salt=base64.b64encode(salt).decode("utf-8"),
        recovery_code_hash=recovery_hash,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = secrets.token_urlsafe(32)
    sess = UserSession(
        token=token,
        user_id=user.id,
        username=user.username,
        encryption_key=base64.b64encode(key).decode("utf-8"),
    )
    db.add(sess)
    db.commit()

    return {
        "token": token,
        "user": {"id": user.id, "username": user.username, "is_kids_account": False},
        "recovery_code": recovery_code,
    }


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
    sess = UserSession(
        token=token,
        user_id=user.id,
        username=user.username,
        encryption_key=base64.b64encode(key).decode("utf-8"),
    )
    db.add(sess)
    db.commit()

    return {"token": token, "user": {"id": user.id, "username": user.username, "is_kids_account": bool(user.is_kids_account)}}


@app.post("/api/auth/recover")
def recover_account(data: RecoverRequest, db: Session = Depends(get_db)):
    """Reset master password using recovery code. Re-encrypts nothing (vault is lost)."""
    if len(data.new_master_password) < 8:
        raise HTTPException(400, "La nueva contraseña debe tener al menos 8 caracteres.")

    user = db.query(User).filter(User.username == data.username.strip()).first()
    if not user or not user.recovery_code_hash:
        raise HTTPException(400, "Código de recuperación inválido.")

    import hashlib as _hl
    code_hash = _hl.sha256(data.recovery_code.strip().upper().encode()).hexdigest()
    if code_hash != user.recovery_code_hash:
        raise HTTPException(400, "Código de recuperación inválido.")

    # Reset password and salt — old vault entries become unrecoverable
    new_salt = generate_salt()
    new_hash = hash_master_password(data.new_master_password, new_salt)
    new_key = derive_key(data.new_master_password, new_salt)

    user.password_hash = new_hash
    user.salt = base64.b64encode(new_salt).decode("utf-8")

    # Generate new recovery code
    raw_recovery = secrets.token_hex(10).upper()
    new_recovery_code = "-".join([raw_recovery[i:i+4] for i in range(0, 20, 4)])
    user.recovery_code_hash = _hl.sha256(new_recovery_code.encode()).hexdigest()

    # Delete old vault (can't decrypt with new key)
    db.query(Password).filter(Password.user_id == user.id).delete()
    # Clear any existing sessions
    db.query(UserSession).filter(UserSession.user_id == user.id).delete()

    db.commit()

    # Create new session
    token = secrets.token_urlsafe(32)
    sess = UserSession(
        token=token,
        user_id=user.id,
        username=user.username,
        encryption_key=base64.b64encode(new_key).decode("utf-8"),
    )
    db.add(sess)
    db.commit()

    return {
        "token": token,
        "user": {"id": user.id, "username": user.username, "is_kids_account": bool(user.is_kids_account)},
        "recovery_code": new_recovery_code,
        "message": "Contraseña restablecida. Tu bóveda anterior ha sido eliminada."
    }


@app.post("/api/auth/logout")
def logout_user(session=Depends(get_current_session), db: Session = Depends(get_db)):
    db.query(UserSession).filter(UserSession.token == session["token"]).delete()
    db.commit()
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
        custom_words=data.custom_words,
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


# ==================== GROUPS ====================

def _group_to_out(group: Group) -> GroupOut:
    """Convert a Group ORM object to GroupOut schema."""
    return GroupOut(
        id=group.id,
        name=group.name,
        owner_id=group.owner_id,
        owner_username=group.owner.username,
        created_at=group.created_at,
        members=[
            GroupMemberOut(
                id=m.id,
                user_id=m.user_id,
                username=m.user.username,
                joined_at=m.joined_at,
            )
            for m in group.members
        ],
    )


@app.get("/api/groups", response_model=list[GroupOut])
def list_groups(session=Depends(get_current_session), db: Session = Depends(get_db)):
    """List all groups the user is a member of."""
    user_id = session["user_id"]
    memberships = db.query(GroupMember).filter(GroupMember.user_id == user_id).all()
    group_ids = [m.group_id for m in memberships]
    groups = db.query(Group).filter(Group.id.in_(group_ids)).order_by(Group.created_at.desc()).all() if group_ids else []
    return [_group_to_out(g) for g in groups]


@app.post("/api/groups", response_model=GroupOut, status_code=201)
def create_group(data: GroupCreate, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Create a new group. The creator becomes the owner and first member."""
    import os as _os
    user_id = session["user_id"]

    if not data.name.strip():
        raise HTTPException(400, "El nombre del grupo no puede estar vacío.")

    # Generate a random encryption key for the group vault
    group_key = _os.urandom(32)
    group_key_b64 = base64.b64encode(group_key).decode("utf-8")

    group = Group(
        name=data.name.strip(),
        owner_id=user_id,
        encryption_key=group_key_b64,
    )
    db.add(group)
    db.flush()  # get group.id

    # Add owner as first member
    member = GroupMember(group_id=group.id, user_id=user_id)
    db.add(member)
    db.commit()
    db.refresh(group)

    return _group_to_out(group)


# --- Invitation endpoints (MUST be before {group_id} routes) ---

@app.get("/api/groups/invitations/pending", response_model=list[GroupInvitationOut])
def get_pending_invitations(session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Get all pending invitations for the current user."""
    user_id = session["user_id"]
    invitations = db.query(GroupInvitation).filter(
        GroupInvitation.invitee_id == user_id,
        GroupInvitation.status == "pending",
    ).order_by(GroupInvitation.created_at.desc()).all()

    return [
        GroupInvitationOut(
            id=inv.id,
            group_id=inv.group_id,
            group_name=inv.group.name,
            inviter_username=inv.inviter.username,
            status=inv.status,
            created_at=inv.created_at,
        )
        for inv in invitations
    ]


@app.post("/api/groups/invitations/{invitation_id}/accept")
def accept_invitation(invitation_id: int, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Accept a group invitation."""
    user_id = session["user_id"]
    invitation = db.query(GroupInvitation).filter(
        GroupInvitation.id == invitation_id,
        GroupInvitation.invitee_id == user_id,
        GroupInvitation.status == "pending",
    ).first()
    if not invitation:
        raise HTTPException(404, "Invitación no encontrada.")

    invitation.status = "accepted"
    member = GroupMember(group_id=invitation.group_id, user_id=user_id)
    db.add(member)
    db.commit()
    return {"message": "Te has unido al grupo."}


@app.post("/api/groups/invitations/{invitation_id}/ignore")
def ignore_invitation(invitation_id: int, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Ignore (reject) a group invitation."""
    user_id = session["user_id"]
    invitation = db.query(GroupInvitation).filter(
        GroupInvitation.id == invitation_id,
        GroupInvitation.invitee_id == user_id,
        GroupInvitation.status == "pending",
    ).first()
    if not invitation:
        raise HTTPException(404, "Invitación no encontrada.")

    invitation.status = "ignored"
    db.commit()
    return {"message": "Invitación ignorada."}


# --- Group detail endpoints ---

@app.get("/api/groups/{group_id}", response_model=GroupOut)
def get_group(group_id: int, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Get group details. Must be a member."""
    user_id = session["user_id"]
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Grupo no encontrado.")
    is_member = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id).first()
    if not is_member:
        raise HTTPException(403, "No eres miembro de este grupo.")
    return _group_to_out(group)


@app.delete("/api/groups/{group_id}")
def delete_group(group_id: int, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Delete a group. Only the owner can delete."""
    user_id = session["user_id"]
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Grupo no encontrado.")
    if group.owner_id != user_id:
        raise HTTPException(403, "Solo el creador puede eliminar el grupo.")
    db.delete(group)
    db.commit()
    return {"message": "Grupo eliminado."}


@app.post("/api/groups/{group_id}/invite")
def invite_to_group(group_id: int, data: GroupInvite, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Invite a user to a group. Only the owner can invite."""
    user_id = session["user_id"]
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Grupo no encontrado.")
    if group.owner_id != user_id:
        raise HTTPException(403, "Solo el creador puede invitar usuarios.")

    invitee = db.query(User).filter(User.username == data.username.strip()).first()
    if not invitee:
        raise HTTPException(404, "Usuario no encontrado.")
    if invitee.id == user_id:
        raise HTTPException(400, "No puedes invitarte a ti mismo.")

    # Check if already a member
    existing_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id, GroupMember.user_id == invitee.id
    ).first()
    if existing_member:
        raise HTTPException(400, "El usuario ya es miembro del grupo.")

    # Check if there's already a pending invitation
    existing_invite = db.query(GroupInvitation).filter(
        GroupInvitation.group_id == group_id,
        GroupInvitation.invitee_id == invitee.id,
    ).first()
    if existing_invite:
        if existing_invite.status == "pending":
            raise HTTPException(400, "Ya existe una invitación pendiente para este usuario.")
        # Old accepted/ignored invitation exists -> delete it so we can re-invite
        db.delete(existing_invite)
        db.flush()

    invitation = GroupInvitation(
        group_id=group_id,
        inviter_id=user_id,
        invitee_id=invitee.id,
    )
    db.add(invitation)
    db.commit()
    return {"message": f"Invitación enviada a {invitee.username}."}


@app.post("/api/groups/{group_id}/kick/{target_user_id}")
def kick_from_group(group_id: int, target_user_id: int, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Remove a user from a group. Only owner can kick."""
    user_id = session["user_id"]
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Grupo no encontrado.")
    if group.owner_id != user_id:
        raise HTTPException(403, "Solo el creador puede expulsar usuarios.")
    if target_user_id == user_id:
        raise HTTPException(400, "No puedes expulsarte a ti mismo.")

    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id, GroupMember.user_id == target_user_id
    ).first()
    if not member:
        raise HTTPException(404, "El usuario no es miembro del grupo.")

    db.delete(member)
    db.commit()
    return {"message": "Usuario expulsado del grupo."}


@app.post("/api/groups/{group_id}/leave")
def leave_group(group_id: int, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Leave a group. The owner cannot leave (must delete the group instead)."""
    user_id = session["user_id"]
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Grupo no encontrado.")
    if group.owner_id == user_id:
        raise HTTPException(400, "El creador no puede abandonar el grupo. Elimínalo si quieres salir.")

    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id, GroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(404, "No eres miembro de este grupo.")

    db.delete(member)
    db.commit()
    return {"message": "Has abandonado el grupo."}


@app.get("/api/groups/{group_id}/invitations")
def list_group_invitations(group_id: int, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """List pending invitations for a group. Only the owner can see."""
    user_id = session["user_id"]
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Grupo no encontrado.")
    if group.owner_id != user_id:
        raise HTTPException(403, "Solo el creador puede ver las invitaciones.")

    invitations = db.query(GroupInvitation).filter(
        GroupInvitation.group_id == group_id,
        GroupInvitation.status == "pending",
    ).all()
    return [
        {
            "id": inv.id,
            "invitee_id": inv.invitee_id,
            "invitee_username": inv.invitee.username,
            "status": inv.status,
            "created_at": inv.created_at,
        }
        for inv in invitations
    ]


@app.delete("/api/groups/{group_id}/invitations/{invitation_id}")
def cancel_invitation(group_id: int, invitation_id: int, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Cancel a pending invitation. Only the owner can cancel."""
    user_id = session["user_id"]
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(404, "Grupo no encontrado.")
    if group.owner_id != user_id:
        raise HTTPException(403, "Solo el creador puede cancelar invitaciones.")

    invitation = db.query(GroupInvitation).filter(
        GroupInvitation.id == invitation_id,
        GroupInvitation.group_id == group_id,
        GroupInvitation.status == "pending",
    ).first()
    if not invitation:
        raise HTTPException(404, "Invitación no encontrada.")

    db.delete(invitation)
    db.commit()
    return {"message": "Invitación cancelada."}


# --- Group Vault (passwords) ---

@app.get("/api/groups/{group_id}/vault", response_model=list[GroupPasswordOut])
def list_group_vault(group_id: int, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """List all passwords in a group vault."""
    user_id = session["user_id"]
    is_member = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id).first()
    if not is_member:
        raise HTTPException(403, "No eres miembro de este grupo.")

    entries = db.query(GroupPassword).filter(GroupPassword.group_id == group_id).order_by(GroupPassword.updated_at.desc()).all()
    return [
        GroupPasswordOut(
            id=e.id,
            group_id=e.group_id,
            title=e.title,
            username=e.username,
            url=e.url,
            notes=e.notes,
            added_by=e.added_by,
            added_by_username=e.added_by_user.username,
            created_at=e.created_at,
            updated_at=e.updated_at,
        )
        for e in entries
    ]


@app.post("/api/groups/{group_id}/vault", response_model=GroupPasswordOut, status_code=201)
def create_group_vault_entry(
    group_id: int,
    data: GroupPasswordCreate,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    """Add a password to a group vault."""
    user_id = session["user_id"]
    is_member = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id).first()
    if not is_member:
        raise HTTPException(403, "No eres miembro de este grupo.")

    group = db.query(Group).filter(Group.id == group_id).first()
    group_key = base64.b64decode(group.encryption_key)
    encrypted, iv = encrypt_password(data.password, group_key)

    entry = GroupPassword(
        group_id=group_id,
        added_by=user_id,
        title=data.title,
        username=data.username or "",
        url=data.url or "",
        encrypted_password=encrypted,
        iv=iv,
        notes=data.notes or "",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return GroupPasswordOut(
        id=entry.id,
        group_id=entry.group_id,
        title=entry.title,
        username=entry.username,
        url=entry.url,
        notes=entry.notes,
        added_by=entry.added_by,
        added_by_username=entry.added_by_user.username,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


@app.get("/api/groups/{group_id}/vault/{entry_id}", response_model=GroupPasswordWithPassword)
def get_group_vault_entry(
    group_id: int,
    entry_id: int,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    """Get a group vault entry with decrypted password."""
    user_id = session["user_id"]
    is_member = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id).first()
    if not is_member:
        raise HTTPException(403, "No eres miembro de este grupo.")

    entry = db.query(GroupPassword).filter(GroupPassword.id == entry_id, GroupPassword.group_id == group_id).first()
    if not entry:
        raise HTTPException(404, "Entrada no encontrada.")

    group = db.query(Group).filter(Group.id == group_id).first()
    group_key = base64.b64decode(group.encryption_key)
    decrypted = decrypt_password(entry.encrypted_password, entry.iv, group_key)

    return GroupPasswordWithPassword(
        id=entry.id,
        group_id=entry.group_id,
        title=entry.title,
        username=entry.username,
        url=entry.url,
        notes=entry.notes,
        added_by=entry.added_by,
        added_by_username=entry.added_by_user.username,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        password=decrypted,
    )


@app.delete("/api/groups/{group_id}/vault/{entry_id}")
def delete_group_vault_entry(
    group_id: int,
    entry_id: int,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    """Delete a password from a group vault. Any member can delete."""
    user_id = session["user_id"]
    is_member = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id).first()
    if not is_member:
        raise HTTPException(403, "No eres miembro de este grupo.")

    entry = db.query(GroupPassword).filter(GroupPassword.id == entry_id, GroupPassword.group_id == group_id).first()
    if not entry:
        raise HTTPException(404, "Entrada no encontrada.")

    db.delete(entry)
    db.commit()
    return {"message": "Entrada eliminada."}


# ==================== SEKURE KIDS ====================

@app.get("/api/kids/accounts", response_model=list[KidsAccountOut])
def list_kids_accounts(session=Depends(get_current_session), db: Session = Depends(get_db)):
    """List kids accounts created by the current user."""
    user_id = session["user_id"]
    # Only normal users can have kids accounts
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.is_kids_account:
        raise HTTPException(403, "Las cuentas kids no pueden crear subcuentas.")
    kids = db.query(User).filter(User.parent_id == user_id).all()
    return [
        KidsAccountOut(id=k.id, username=k.username, created_at=k.created_at)
        for k in kids
    ]


@app.post("/api/kids/accounts", response_model=KidsAccountOut)
def create_kids_account(data: KidsAccountCreate, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Create a new kids account."""
    user_id = session["user_id"]
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.is_kids_account:
        raise HTTPException(403, "Las cuentas kids no pueden crear subcuentas.")

    if len(data.username.strip()) < 3:
        raise HTTPException(400, "El nombre de usuario debe tener al menos 3 caracteres.")
    if len(data.password) < 4:
        raise HTTPException(400, "La contraseña debe tener al menos 4 caracteres.")

    existing = db.query(User).filter(User.username == data.username.strip()).first()
    if existing:
        raise HTTPException(400, "El nombre de usuario ya está en uso.")

    salt = generate_salt()
    password_hash = hash_master_password(data.password, salt)

    kid = User(
        username=data.username.strip(),
        password_hash=password_hash,
        salt=base64.b64encode(salt).decode("utf-8"),
        is_kids_account=True,
        parent_id=user_id,
    )
    db.add(kid)
    db.commit()
    db.refresh(kid)

    return KidsAccountOut(id=kid.id, username=kid.username, created_at=kid.created_at)


@app.delete("/api/kids/accounts/{kid_id}")
def delete_kids_account(kid_id: int, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Delete a kids account. Only the parent can delete."""
    user_id = session["user_id"]
    kid = db.query(User).filter(User.id == kid_id, User.parent_id == user_id).first()
    if not kid:
        raise HTTPException(404, "Cuenta no encontrada.")
    db.delete(kid)
    db.commit()
    return {"message": "Cuenta eliminada."}


# --- Helper to verify parent access to kid's vault ---
def _get_kid_for_parent(kid_id: int, user_id: int, db: Session) -> User:
    kid = db.query(User).filter(User.id == kid_id).first()
    if not kid:
        raise HTTPException(404, "Cuenta no encontrada.")
    # Allow access if: parent owns this kid, OR user IS this kid
    if kid.parent_id == user_id or kid.id == user_id:
        return kid
    raise HTTPException(403, "No tienes acceso a esta cuenta.")


def _get_kid_encryption_key(kid: User, db: Session) -> bytes:
    """Get or derive the encryption key for a kid's vault."""
    # For kids accounts, we use a deterministic key derived from their salt.
    # This ensures both parent and kid always use the EXACT SAME key to encrypt/decrypt,
    # regardless of who is currently logged in or what sessions are active.
    salt = base64.b64decode(kid.salt)
    from crypto import derive_key
    key = derive_key(f"sekure_kids_{kid.id}_{kid.parent_id}", salt)
    return key


@app.get("/api/kids/accounts/{kid_id}/vault")
def list_kids_vault(kid_id: int, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """List vault entries for a kids account."""
    user_id = session["user_id"]
    kid = _get_kid_for_parent(kid_id, user_id, db)

    entries = db.query(Password).filter(Password.user_id == kid.id).order_by(Password.updated_at.desc()).all()
    return [
        {
            "id": e.id,
            "title": e.title,
            "username": e.username,
            "url": e.url,
            "notes": e.notes,
            "is_favorite": e.is_favorite,
            "created_at": e.created_at,
            "updated_at": e.updated_at,
            "tags": [],
        }
        for e in entries
    ]


@app.post("/api/kids/accounts/{kid_id}/vault")
def create_kids_vault_entry(kid_id: int, data: VaultEntryCreate, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Create a vault entry for a kids account."""
    user_id = session["user_id"]
    kid = _get_kid_for_parent(kid_id, user_id, db)
    key = _get_kid_encryption_key(kid, db)

    encrypted, iv = encrypt_password(data.password, key)
    entry = Password(
        user_id=kid.id,
        title=data.title,
        username=data.username or "",
        url=data.url or "",
        encrypted_password=encrypted,
        iv=iv,
        notes=data.notes or "",
        is_favorite=False,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {
        "id": entry.id,
        "title": entry.title,
        "username": entry.username,
        "url": entry.url,
        "notes": entry.notes,
        "is_favorite": entry.is_favorite,
        "created_at": entry.created_at,
        "updated_at": entry.updated_at,
        "tags": [],
    }


@app.get("/api/kids/accounts/{kid_id}/vault/{entry_id}")
def get_kids_vault_entry(kid_id: int, entry_id: int, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Get a single vault entry (with decrypted password) for a kids account."""
    user_id = session["user_id"]
    kid = _get_kid_for_parent(kid_id, user_id, db)
    key = _get_kid_encryption_key(kid, db)

    entry = db.query(Password).filter(Password.id == entry_id, Password.user_id == kid.id).first()
    if not entry:
        raise HTTPException(404, "Entrada no encontrada.")

    decrypted = decrypt_password(entry.encrypted_password, entry.iv, key)
    return {
        "id": entry.id,
        "title": entry.title,
        "username": entry.username,
        "url": entry.url,
        "notes": entry.notes,
        "password": decrypted,
        "is_favorite": entry.is_favorite,
        "created_at": entry.created_at,
        "updated_at": entry.updated_at,
        "tags": [],
    }


@app.delete("/api/kids/accounts/{kid_id}/vault/{entry_id}")
def delete_kids_vault_entry(kid_id: int, entry_id: int, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Delete a vault entry from a kids account."""
    user_id = session["user_id"]
    kid = _get_kid_for_parent(kid_id, user_id, db)

    entry = db.query(Password).filter(Password.id == entry_id, Password.user_id == kid.id).first()
    if not entry:
        raise HTTPException(404, "Entrada no encontrada.")

    db.delete(entry)
    db.commit()
    return {"message": "Entrada eliminada."}


# ==================== PROFILE ====================

@app.put("/api/profile/username")
def change_username(data: ChangeUsername, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Change the current user's username. Requires current password."""
    user = db.query(User).filter(User.id == session["user_id"]).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado.")

    salt = base64.b64decode(user.salt)
    if not verify_master_password(data.current_password, salt, user.password_hash):
        raise HTTPException(403, "Contraseña incorrecta.")

    new_username = data.new_username.strip()
    if len(new_username) < 3:
        raise HTTPException(400, "El nombre de usuario debe tener al menos 3 caracteres.")

    existing = db.query(User).filter(User.username == new_username, User.id != user.id).first()
    if existing:
        raise HTTPException(400, "El nombre de usuario ya está en uso.")

    user.username = new_username
    # Update all sessions for this user
    db.query(UserSession).filter(UserSession.user_id == user.id).update({"username": new_username})
    db.commit()
    return {"message": "Nombre de usuario actualizado.", "username": new_username}


@app.put("/api/profile/password")
def change_password(data: ChangePassword, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Change the current user's master password. Re-encrypts all vault entries."""
    user = db.query(User).filter(User.id == session["user_id"]).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado.")

    old_salt = base64.b64decode(user.salt)
    if not verify_master_password(data.current_password, old_salt, user.password_hash):
        raise HTTPException(403, "Contraseña actual incorrecta.")

    if len(data.new_password) < 8:
        raise HTTPException(400, "La nueva contraseña debe tener al menos 8 caracteres.")

    old_key = derive_key(data.current_password, old_salt)

    # Generate new salt & key
    new_salt = generate_salt()
    new_password_hash = hash_master_password(data.new_password, new_salt)
    new_key = derive_key(data.new_password, new_salt)

    # Re-encrypt all vault entries
    entries = db.query(Password).filter(Password.user_id == user.id).all()
    for entry in entries:
        try:
            decrypted = decrypt_password(entry.encrypted_password, entry.iv, old_key)
            encrypted, iv = encrypt_password(decrypted, new_key)
            entry.encrypted_password = encrypted
            entry.iv = iv
        except Exception:
            pass  # Skip entries that fail (shouldn't happen)

    user.password_hash = new_password_hash
    user.salt = base64.b64encode(new_salt).decode("utf-8")

    # Update all sessions with new encryption key
    new_key_b64 = base64.b64encode(new_key).decode("utf-8")
    db.query(UserSession).filter(UserSession.user_id == user.id).update({"encryption_key": new_key_b64})
    db.commit()
    return {"message": "Contraseña actualizada correctamente."}


@app.delete("/api/profile")
def delete_account(data: DeleteAccount, session=Depends(get_current_session), db: Session = Depends(get_db)):
    """Delete the current user's account permanently. Requires current password."""
    user = db.query(User).filter(User.id == session["user_id"]).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado.")

    salt = base64.b64decode(user.salt)
    if not verify_master_password(data.current_password, salt, user.password_hash):
        raise HTTPException(403, "Contraseña incorrecta.")

    # Delete all related data
    db.query(Password).filter(Password.user_id == user.id).delete()
    db.query(UserSession).filter(UserSession.user_id == user.id).delete()
    # Delete kids accounts too
    kids = db.query(User).filter(User.parent_id == user.id).all()
    for kid in kids:
        db.query(Password).filter(Password.user_id == kid.id).delete()
        db.query(UserSession).filter(UserSession.user_id == kid.id).delete()
        db.delete(kid)
    db.delete(user)
    db.commit()
    return {"message": "Cuenta eliminada."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

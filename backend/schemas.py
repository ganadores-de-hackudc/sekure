from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# --- Auth ---
class UserRegister(BaseModel):
    username: str
    master_password: str


class UserLogin(BaseModel):
    username: str
    master_password: str


# --- Tags ---
class TagCreate(BaseModel):
    name: str
    color: Optional[str] = "#9b1b2f"


class TagOut(BaseModel):
    id: int
    name: str
    color: str

    class Config:
        from_attributes = True


# --- Password Generation ---
class GenerateRequest(BaseModel):
    length: int = 20
    method: str = "random"  # random, passphrase, pin
    include_uppercase: bool = True
    include_lowercase: bool = True
    include_digits: bool = True
    include_symbols: bool = True
    num_words: int = 5  # for passphrase method
    separator: str = "-"  # for passphrase method
    custom_words: list[str] = []  # custom words to include in passphrase


class GenerateResponse(BaseModel):
    password: str
    entropy: float
    strength: str
    crack_time: str


# --- Password Check ---
class CheckRequest(BaseModel):
    password: str


class CheckResponse(BaseModel):
    entropy: float
    strength: str
    strength_score: int  # 0-4
    crack_time: str
    is_breached: bool
    breach_count: int
    feedback: list[str]
    char_distribution: dict[str, int]
    entropy_breakdown: list[dict]


# --- Vault ---
class VaultEntryCreate(BaseModel):
    title: str
    username: Optional[str] = ""
    url: Optional[str] = ""
    password: str
    notes: Optional[str] = ""
    is_favorite: Optional[bool] = False
    tag_ids: Optional[list[int]] = []


class VaultEntryUpdate(BaseModel):
    title: Optional[str] = None
    username: Optional[str] = None
    url: Optional[str] = None
    password: Optional[str] = None
    notes: Optional[str] = None
    is_favorite: Optional[bool] = None
    tag_ids: Optional[list[int]] = None


class VaultEntryOut(BaseModel):
    id: int
    title: str
    username: str
    url: str
    notes: str
    is_favorite: bool
    created_at: datetime
    updated_at: datetime
    tags: list[TagOut]

    class Config:
        from_attributes = True


class VaultEntryWithPassword(VaultEntryOut):
    password: str


# --- Groups ---
class GroupCreate(BaseModel):
    name: str


class GroupMemberOut(BaseModel):
    id: int
    user_id: int
    username: str
    joined_at: datetime

    class Config:
        from_attributes = True


class GroupOut(BaseModel):
    id: int
    name: str
    owner_id: int
    owner_username: str
    created_at: datetime
    members: list[GroupMemberOut]

    class Config:
        from_attributes = True


class GroupInvite(BaseModel):
    username: str


class GroupInvitationOut(BaseModel):
    id: int
    group_id: int
    group_name: str
    inviter_username: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class GroupPasswordCreate(BaseModel):
    title: str
    username: Optional[str] = ""
    url: Optional[str] = ""
    password: str
    notes: Optional[str] = ""


class GroupPasswordOut(BaseModel):
    id: int
    group_id: int
    title: str
    username: str
    url: str
    notes: str
    added_by: int
    added_by_username: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GroupPasswordWithPassword(GroupPasswordOut):
    password: str


# --- Sekure Kids ---
class KidsAccountCreate(BaseModel):
    username: str
    password: str


class KidsAccountOut(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Profile ---
class ChangeUsername(BaseModel):
    new_username: str
    current_password: str


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


class DeleteAccount(BaseModel):
    current_password: str

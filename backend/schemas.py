from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# --- Auth ---
class MasterSetup(BaseModel):
    master_password: str


class MasterUnlock(BaseModel):
    master_password: str


# --- Tags ---
class TagCreate(BaseModel):
    name: str
    color: Optional[str] = "#10b981"


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

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Table, UniqueConstraint
from sqlalchemy.orm import relationship, backref
from datetime import datetime, timezone
from database import Base

# Association table for passwords <-> tags
password_tags = Table(
    "password_tags",
    Base.metadata,
    Column("password_id", Integer, ForeignKey("passwords.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    salt = Column(String, nullable=False)
    recovery_code_hash = Column(String, nullable=True)  # hashed recovery code
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_kids_account = Column(Boolean, default=False)
    parent_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    passwords = relationship("Password", back_populates="user", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")
    owned_groups = relationship("Group", back_populates="owner", cascade="all, delete-orphan")
    group_memberships = relationship("GroupMember", back_populates="user", cascade="all, delete-orphan")
    kids_accounts = relationship("User", backref=backref("parent", remote_side="User.id"), cascade="all, delete-orphan")


class Password(Base):
    __tablename__ = "passwords"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    username = Column(String, default="")
    url = Column(String, default="")
    encrypted_password = Column(Text, nullable=False)
    iv = Column(String, nullable=False)
    notes = Column(Text, default="")
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="passwords")
    tags = relationship("Tag", secondary=password_tags, back_populates="passwords")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#9b1b2f")

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_user_tag_name"),
    )

    user = relationship("User", back_populates="tags")
    passwords = relationship("Password", secondary=password_tags, back_populates="tags")


class UserSession(Base):
    __tablename__ = "user_sessions"

    token = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    username = Column(String, nullable=False)
    encryption_key = Column(String, nullable=False)  # base64-encoded derived key
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")


# ==================== GROUPS ====================

class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    encryption_key = Column(String, nullable=False)  # base64-encoded AES key for group vault
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="owned_groups")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    passwords = relationship("GroupPassword", back_populates="group", cascade="all, delete-orphan")
    invitations = relationship("GroupInvitation", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_member"),
    )

    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="group_memberships")


class GroupPassword(Base):
    __tablename__ = "group_passwords"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    added_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    username = Column(String, default="")
    url = Column(String, default="")
    encrypted_password = Column(Text, nullable=False)
    iv = Column(String, nullable=False)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    group = relationship("Group", back_populates="passwords")
    added_by_user = relationship("User")


class GroupInvitation(Base):
    __tablename__ = "group_invitations"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    inviter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    invitee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="pending")  # pending, accepted, ignored
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("group_id", "invitee_id", name="uq_group_invitation"),
    )

    group = relationship("Group", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[inviter_id])
    invitee = relationship("User", foreign_keys=[invitee_id])


# ==================== SHARED LINKS ====================

class SharedLink(Base):
    __tablename__ = "shared_links"

    id = Column(String, primary_key=True)  # UUID-style token
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    encrypted_data = Column(Text, nullable=False)  # JSON blob encrypted with link key
    iv = Column(String, nullable=False)
    access_mode = Column(String, default="anyone")  # "anyone" or "specific"
    allowed_usernames = Column(Text, default="")  # comma-separated usernames
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)

    creator = relationship("User")

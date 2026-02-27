from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

# Association table for passwords <-> tags
password_tags = Table(
    "password_tags",
    Base.metadata,
    Column("password_id", Integer, ForeignKey("passwords.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class MasterConfig(Base):
    __tablename__ = "master_config"

    id = Column(Integer, primary_key=True, default=1)
    master_hash = Column(String, nullable=False)
    salt = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Password(Base):
    __tablename__ = "passwords"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    username = Column(String, default="")
    url = Column(String, default="")
    encrypted_password = Column(Text, nullable=False)
    iv = Column(String, nullable=False)
    notes = Column(Text, default="")
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    tags = relationship("Tag", secondary=password_tags, back_populates="passwords")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, default="#9b1b2f")

    passwords = relationship("Password", secondary=password_tags, back_populates="tags")

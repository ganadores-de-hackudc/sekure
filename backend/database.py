from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sekure.db")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD", "")

# Turso (libsql://) needs sqlalchemy-libsql driver + auth_token
# Local SQLite just needs check_same_thread: False
_is_turso = DATABASE_URL.startswith("libsql://") or DATABASE_URL.startswith("libsql+")

if _is_turso:
    # Convert libsql:// to sqlite+libsql:// for SQLAlchemy driver
    url = DATABASE_URL
    if url.startswith("libsql://"):
        url = "sqlite+libsql://" + url[len("libsql://"):]

    engine = create_engine(
        url,
        connect_args={"auth_token": DATABASE_PASSWORD, "check_same_thread": False},
    )
else:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

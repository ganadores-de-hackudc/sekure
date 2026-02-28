"""
Migration: Add shared_links table to existing database.
Run this script once to add the shared_links table.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS shared_links (
                id TEXT PRIMARY KEY,
                creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                encrypted_data TEXT NOT NULL,
                iv TEXT NOT NULL,
                access_mode TEXT DEFAULT 'anyone',
                allowed_usernames TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL
            )
        """))
        conn.commit()
        print("✅ shared_links table created successfully")

if __name__ == "__main__":
    migrate()

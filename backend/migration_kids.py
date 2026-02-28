"""Migration: Add is_kids_account and parent_id columns to users table."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "sekure.db")


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if columns already exist
    cursor.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]

    if "is_kids_account" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN is_kids_account BOOLEAN DEFAULT 0")
        print("Added is_kids_account column")

    if "parent_id" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE")
        print("Added parent_id column")

    conn.commit()
    conn.close()
    print("Migration completed successfully.")


if __name__ == "__main__":
    migrate()

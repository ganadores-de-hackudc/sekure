"""
Cryptographic utilities for Sekure password manager."""
import os
import base64
import hashlib
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ITERATIONS = 600_000  # OWASP recommended minimum for PBKDF2-SHA256


def derive_key(master_password: str, salt: bytes) -> bytes:
    """Derive a 256-bit key from master password using PBKDF2-HMAC-SHA256."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=ITERATIONS,
    )
    return kdf.derive(master_password.encode("utf-8"))


def hash_master_password(master_password: str, salt: bytes) -> str:
    """Hash the master password for verification (separate from encryption key)."""
    verification_key = hashlib.pbkdf2_hmac(
        "sha256",
        master_password.encode("utf-8"),
        salt + b"_verify",
        ITERATIONS,
    )
    return base64.b64encode(verification_key).decode("utf-8")


def verify_master_password(master_password: str, salt: bytes, stored_hash: str) -> bool:
    """Verify the master password against stored hash."""
    computed = hash_master_password(master_password, salt)
    return computed == stored_hash


def generate_salt() -> bytes:
    """Generate a cryptographically secure random salt."""
    return os.urandom(32)

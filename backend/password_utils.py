"""
Password generation and checking utilities for Sekure.
"""
import secrets
import string
import math
import hashlib
import httpx
import re
from collections import Counter

def generate_random_password(
    length: int = 20,
    include_uppercase: bool = True,
    include_lowercase: bool = True,
    include_digits: bool = True,
    include_symbols: bool = True,
) -> str:
    """Generate a cryptographically secure random password."""
    charset = ""
    required = []

    if include_lowercase:
        charset += string.ascii_lowercase
        required.append(secrets.choice(string.ascii_lowercase))
    if include_uppercase:
        charset += string.ascii_uppercase
        required.append(secrets.choice(string.ascii_uppercase))
    if include_digits:
        charset += string.digits
        required.append(secrets.choice(string.digits))
    if include_symbols:
        symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        charset += symbols
        required.append(secrets.choice(symbols))

    if not charset:
        charset = string.ascii_letters + string.digits
        required = [secrets.choice(charset)]

    # Fill remaining length
    remaining = length - len(required)
    if remaining < 0:
        remaining = 0
        required = required[:length]

    password_chars = required + [secrets.choice(charset) for _ in range(remaining)]

    # Shuffle using Fisher-Yates with secrets
    for i in range(len(password_chars) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        password_chars[i], password_chars[j] = password_chars[j], password_chars[i]

    return "".join(password_chars)


def _augment_word(word: str) -> str:
    """Inject a random number and/or special character into a word.
    Placement is random: before the word, in the middle, or after it.
    Examples: ca3paz, !capaz, capaz7#, c@4apaz"""
    symbols = "!@#$%&*?+="
    # Generate a random extra: number, symbol, or both
    choice = secrets.randbelow(3)
    if choice == 0:
        extra = str(secrets.randbelow(100))
    elif choice == 1:
        extra = secrets.choice(symbols)
    else:
        extra = str(secrets.randbelow(100)) + secrets.choice(symbols)

    # Placement: 0=before, 1=inside, 2=after
    placement = secrets.randbelow(3)
    if placement == 0:
        return extra + word
    elif placement == 1 and len(word) > 1:
        pos = secrets.randbelow(len(word) - 1) + 1
        return word[:pos] + extra + word[pos:]
    else:
        return word + extra


def generate_passphrase(num_words: int = 5, separator: str = "-", custom_words: list[str] | None = None) -> str:
    """Generate a passphrase using ONLY the user's custom words.
    Each word is randomly augmented with numbers and/or special characters
    injected before, in the middle, or after the word."""
    cw = [w.strip() for w in (custom_words or []) if w.strip()]
    if not cw:
        return "Add-Words-To-Generate"

    # Capitalize and shuffle word order
    words = [w.capitalize() for w in cw]
    for i in range(len(words) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        words[i], words[j] = words[j], words[i]

    # Augment each word with random numbers/symbols
    words = [_augment_word(w) for w in words]

    return separator.join(words)


def generate_pin(length: int = 6) -> str:
    """Generate a secure PIN."""
    return "".join([str(secrets.randbelow(10)) for _ in range(length)])


def generate_password(
    length: int = 20,
    method: str = "random",
    include_uppercase: bool = True,
    include_lowercase: bool = True,
    include_digits: bool = True,
    include_symbols: bool = True,
    num_words: int = 5,
    separator: str = "-",
    custom_words: list[str] | None = None,
) -> str:
    """Generate a password using the specified method."""
    if method == "passphrase":
        return generate_passphrase(num_words, separator, custom_words)
    elif method == "pin":
        return generate_pin(length)
    else:
        return generate_random_password(
            length, include_uppercase, include_lowercase, include_digits, include_symbols
        )


# --- Password Strength Analysis ---

def calculate_entropy(password: str) -> float:
    """Calculate the Shannon entropy of a password."""
    if not password:
        return 0.0

    charset_size = 0
    if any(c in string.ascii_lowercase for c in password):
        charset_size += 26
    if any(c in string.ascii_uppercase for c in password):
        charset_size += 26
    if any(c in string.digits for c in password):
        charset_size += 10
    if any(c in string.punctuation for c in password):
        charset_size += 32

    if charset_size == 0:
        charset_size = 128  # Unicode fallback

    entropy = len(password) * math.log2(charset_size)
    return round(entropy, 2)


def calculate_entropy_breakdown(password: str) -> list[dict]:
    """Calculate per-character entropy contribution for visualization."""
    if not password:
        return []

    charset_size = 0
    if any(c in string.ascii_lowercase for c in password):
        charset_size += 26
    if any(c in string.ascii_uppercase for c in password):
        charset_size += 26
    if any(c in string.digits for c in password):
        charset_size += 10
    if any(c in string.punctuation for c in password):
        charset_size += 32
    if charset_size == 0:
        charset_size = 128

    bits_per_char = math.log2(charset_size)
    breakdown = []
    cumulative = 0.0
    for i, char in enumerate(password):
        # Determine char type
        if char in string.ascii_lowercase:
            char_type = "lowercase"
        elif char in string.ascii_uppercase:
            char_type = "uppercase"
        elif char in string.digits:
            char_type = "digit"
        elif char in string.punctuation:
            char_type = "symbol"
        else:
            char_type = "other"

        cumulative += bits_per_char
        breakdown.append({
            "position": i + 1,
            "char": char,
            "type": char_type,
            "bits": round(bits_per_char, 2),
            "cumulative": round(cumulative, 2),
        })

    return breakdown


def get_char_distribution(password: str) -> dict[str, int]:
    """Get character type distribution."""
    dist = {"lowercase": 0, "uppercase": 0, "digits": 0, "symbols": 0, "other": 0}
    for c in password:
        if c in string.ascii_lowercase:
            dist["lowercase"] += 1
        elif c in string.ascii_uppercase:
            dist["uppercase"] += 1
        elif c in string.digits:
            dist["digits"] += 1
        elif c in string.punctuation:
            dist["symbols"] += 1
        else:
            dist["other"] += 1
    return dist


def estimate_crack_time(entropy: float) -> str:
    """Estimate time to crack based on entropy (assuming 10B guesses/sec)."""
    if entropy <= 0:
        return "Instantáneo"

    guesses = 2 ** entropy
    seconds = guesses / 10_000_000_000  # 10 billion guesses/sec

    if seconds < 1:
        return "Instantáneo"
    elif seconds < 60:
        return f"{seconds:.0f} segundos"
    elif seconds < 3600:
        return f"{seconds / 60:.0f} minutos"
    elif seconds < 86400:
        return f"{seconds / 3600:.0f} horas"
    elif seconds < 86400 * 365:
        return f"{seconds / 86400:.0f} días"
    elif seconds < 86400 * 365 * 1000:
        return f"{seconds / (86400 * 365):.0f} años"
    elif seconds < 86400 * 365 * 1_000_000:
        return f"{seconds / (86400 * 365 * 1000):.0f} miles de años"
    elif seconds < 86400 * 365 * 1_000_000_000:
        return f"{seconds / (86400 * 365 * 1_000_000):.0f} millones de años"
    else:
        return "Más que la edad del universo"


def get_strength_label(entropy: float) -> tuple[str, int]:
    """Get strength label and score from entropy."""
    if entropy < 28:
        return "Muy débil", 0
    elif entropy < 36:
        return "Débil", 1
    elif entropy < 60:
        return "Moderada", 2
    elif entropy < 80:
        return "Fuerte", 3
    else:
        return "Muy fuerte", 4


def analyze_password(password: str) -> list[str]:
    """Provide feedback on password weaknesses."""
    feedback = []

    if len(password) < 8:
        feedback.append("La contraseña es muy corta. Usa al menos 12 caracteres.")
    elif len(password) < 12:
        feedback.append("Considera usar al menos 12 caracteres para mayor seguridad.")

    if not any(c in string.ascii_uppercase for c in password):
        feedback.append("Añade letras mayúsculas para mejorar la seguridad.")

    if not any(c in string.ascii_lowercase for c in password):
        feedback.append("Añade letras minúsculas para mejorar la seguridad.")

    if not any(c in string.digits for c in password):
        feedback.append("Añade números para incrementar la entropía.")

    if not any(c in string.punctuation for c in password):
        feedback.append("Añade símbolos especiales (!@#$%...) para mayor robustez.")

    # Check for common patterns
    common_patterns = [
        r"12345", r"qwerty", r"password", r"abcdef", r"111111",
        r"admin", r"letmein", r"welcome", r"monkey", r"dragon",
    ]
    lower_pw = password.lower()
    for pattern in common_patterns:
        if pattern in lower_pw:
            feedback.append(f"Evita patrones comunes como '{pattern}'.")
            break

    # Check for repeated characters
    if re.search(r"(.)\1{2,}", password):
        feedback.append("Evita repetir el mismo carácter más de 2 veces seguidas.")

    # Check for sequential characters
    for i in range(len(password) - 2):
        if (ord(password[i]) + 1 == ord(password[i + 1]) == ord(password[i + 2]) - 1):
            feedback.append("Evita secuencias de caracteres consecutivos (abc, 123).")
            break

    if not feedback:
        feedback.append("¡Excelente! Tu contraseña parece robusta.")

    return feedback


async def check_hibp(password: str) -> tuple[bool, int]:
    """
    Check if password has been breached using Have I Been Pwned API.
    Uses k-anonymity model (only sends first 5 chars of SHA-1 hash).
    """
    sha1 = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
    prefix = sha1[:5]
    suffix = sha1[5:]

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.pwnedpasswords.com/range/{prefix}",
                headers={"User-Agent": "Sekure-PasswordManager"},
                timeout=10.0,
            )

            if response.status_code == 200:
                for line in response.text.splitlines():
                    hash_suffix, count = line.split(":")
                    if hash_suffix.strip() == suffix:
                        return True, int(count.strip())
            return False, 0
    except Exception:
        # If API call fails, return unknown (don't block the check)
        return False, 0

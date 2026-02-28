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

# --- Wordlist for passphrase generation (EFF short wordlist subset + extras) ---
WORDLIST = [
    "acid", "acorn", "acre", "acts", "afar", "affix", "aged", "agent", "agile",
    "aging", "agony", "agree", "ahead", "aide", "aim", "alarm", "album", "alert",
    "alike", "alive", "alley", "allot", "allow", "aloft", "alone", "alpha", "amaze",
    "ample", "amuse", "angel", "anger", "angle", "ankle", "annex", "anvil", "apart",
    "apex", "apple", "apply", "arena", "argue", "arise", "armor", "army", "aroma",
    "array", "arrow", "arson", "art", "asset", "atom", "attic", "audio", "avert",
    "avoid", "awake", "award", "axiom", "axis", "bacon", "badge", "bagel", "baker",
    "balmy", "band", "banjo", "barge", "barn", "base", "basic", "batch", "beach",
    "beast", "begin", "being", "below", "bench", "berry", "birth", "black", "blade",
    "blank", "blast", "blaze", "bleed", "blend", "bless", "blimp", "blind", "bliss",
    "block", "bloke", "bloom", "blown", "blues", "bluff", "blunt", "board", "boat",
    "bonus", "booth", "bound", "brace", "brain", "brand", "brave", "bread", "break",
    "breed", "brick", "bride", "brief", "bring", "broad", "broke", "brook", "broth",
    "brown", "brush", "budge", "build", "bulge", "bunch", "bunny", "burst", "buyer",
    "cabin", "cable", "camel", "candy", "cargo", "carry", "carve", "catch", "cause",
    "cedar", "chain", "chair", "chalk", "champ", "chaos", "charm", "chart", "chase",
    "cheap", "check", "cheek", "cheer", "chess", "chest", "chief", "child", "chill",
    "china", "chip", "choir", "chunk", "churn", "cider", "cigar", "cinch", "civic",
    "civil", "claim", "clamp", "clash", "clasp", "class", "clean", "clear", "cliff",
    "climb", "cling", "cloak", "clock", "clone", "close", "cloth", "cloud", "clown",
    "clubs", "cluck", "clue", "clump", "clung", "coach", "coast", "cobra", "cocoa",
    "comet", "comic", "comma", "conch", "coral", "couch", "could", "count", "court",
    "cover", "crack", "craft", "cramp", "crane", "crash", "crate", "crawl", "crazy",
    "cream", "creek", "creep", "crest", "crick", "crisp", "cross", "crowd", "crown",
    "crude", "crush", "cubic", "cupid", "curve", "cyber", "cycle", "daily", "dance",
    "dated", "dealt", "debug", "decal", "decay", "decor", "decoy", "deity", "delay",
    "delta", "delve", "demon", "dense", "depot", "depth", "derby", "desk", "detox",
    "devil", "diary", "digit", "dimly", "diner", "disco", "ditch", "dizzy", "dodge",
    "doing", "donor", "donut", "doubt", "dough", "dozen", "draft", "drain", "drake",
    "drama", "drank", "drape", "drawn", "dream", "dress", "dried", "drift", "drill",
    "drink", "drive", "droit", "drone", "drool", "drove", "drown", "drums", "drunk",
    "dryer", "dryly", "ducal", "dully", "dummy", "dunce", "dune", "dusty", "dwarf",
    "dying", "eager", "eagle", "early", "earth", "easel", "eaten", "ebony", "edges",
    "edict", "eerie", "eight", "elect", "elfin", "elite", "elope", "elude", "email",
    "ember", "emoji", "empty", "enemy", "enjoy", "enter", "entry", "envoy", "epoch",
    "equal", "equip", "erase", "error", "essay", "ethic", "evade", "event", "every",
    "evict", "exact", "exalt", "exam", "exile", "exist", "expat", "extra", "exult",
    "fable", "facet", "faith", "fancy", "fatal", "favor", "feast", "fence", "ferry",
    "fetch", "fever", "fiber", "field", "fiery", "fifty", "fight", "filth", "final",
    "first", "fizzy", "flame", "flank", "flare", "flash", "flask", "fleet", "flesh",
    "flick", "fling", "flint", "float", "flock", "flood", "floor", "flora", "flour",
    "flown", "fluid", "fluke", "flung", "flush", "flute", "focal", "focus", "folly",
    "forge", "forgo", "forte", "forum", "fossil", "found", "foxes", "foyer", "frail",
    "frame", "frank", "fraud", "fresh", "friar", "front", "frost", "froze", "fruit",
    "fully", "fungi", "fuzzy", "gamer", "gamma", "gauge", "gazer", "gecko", "geek",
    "ghost", "giant", "given", "gizmo", "gland", "glare", "glass", "gleam", "glide",
    "globe", "gloom", "glory", "gloss", "glove", "glyph", "gnome", "going", "grace",
    "grade", "grain", "grand", "grant", "grape", "graph", "grasp", "grass", "grave",
    "great", "greed", "green", "greet", "grief", "grill", "grind", "gripe", "groan",
    "groom", "grope", "gross", "group", "grove", "growl", "grown", "gruel", "guard",
    "guess", "guide", "guild", "guilt", "guise", "gulch", "gummy", "gusty", "gutter",
    "haven", "hazel", "heart", "heave", "hedge", "heist", "helix", "herbs", "heron",
    "hiker", "hitch", "hoard", "hobby", "homes", "honey", "honor", "hoped", "horde",
    "horse", "hotel", "house", "hover", "human", "humor", "hyena", "icily", "icing",
    "ideal", "idiom", "idler", "image", "imply", "inbox", "incur", "index", "indie",
    "inept", "inert", "infer", "ingot", "inner", "input", "intro", "ionic", "ivory",
    "jewel", "jiffy", "joker", "jolly", "joust", "judge", "juice", "jumbo", "jumpy",
    "kebab", "knack", "knead", "kneel", "knelt", "knife", "knobs", "knock", "knoll",
    "lager", "lance", "large", "laser", "latch", "later", "laugh", "layer", "leapt",
    "learn", "lease", "ledge", "legal", "lemon", "level", "lever", "light", "lilac",
    "linen", "liner", "lingo", "lions", "llama", "lodge", "logic", "login", "lucid",
    "lunar", "lunch", "lunge", "lurch", "lyric", "macro", "magic", "major", "maker",
    "mange", "manor", "maple", "march", "marsh", "mason", "match", "mayor", "medal",
    "media", "melon", "mercy", "merge", "merit", "merry", "metal", "meter", "midst",
    "might", "mince", "miner", "minor", "minus", "mirth", "miser", "mixer", "mocha",
    "model", "mogul", "moist", "money", "month", "moose", "moral", "morph", "mossy",
    "motor", "motto", "mound", "mount", "mourn", "mouse", "movie", "mover", "mulch",
    "mural", "music", "noble", "noise", "north", "notch", "novel", "nudge", "nurse",
    "nylon", "oaken", "oasis", "occur", "ocean", "olive", "onset", "opera", "optic",
    "orbit", "order", "organ", "other", "outer", "outdo", "ovary", "oxide", "ozone",
    "paint", "panda", "panel", "panic", "paper", "patch", "pause", "peach", "pearl",
    "pecan", "pedal", "penny", "perch", "phase", "phone", "photo", "piano", "piece",
    "pilot", "pinch", "pixel", "pizza", "place", "plaid", "plain", "plane", "plank",
    "plant", "plate", "plaza", "plead", "pleat", "plier", "pluck", "plumb", "plume",
    "plump", "plunk", "point", "polar", "pound", "power", "press", "price", "pride",
    "prime", "prince", "print", "prism", "prize", "probe", "prong", "proof", "prose",
    "proud", "proxy", "prune", "psalm", "pulse", "punch", "pupil", "purse", "quail",
    "quake", "qualm", "query", "quest", "queue", "quick", "quiet", "quill", "quirk",
    "quota", "quote", "radar", "radio", "raise", "rally", "ranch", "range", "rapid",
    "ratio", "raven", "razor", "reach", "realm", "rebel", "reign", "relax", "relay",
    "remix", "renal", "renew", "repay", "reply", "retry", "reuse", "rhino", "rider",
    "ridge", "rifle", "rigor", "rinse", "risen", "risky", "rival", "river", "roast",
    "robot", "rocky", "rogue", "roman", "roost", "roped", "rough", "round", "route",
    "rover", "royal", "rugby", "ruler", "rumor", "rural", "rusty", "sadly", "saint",
    "salad", "salon", "salty", "salve", "sandy", "satin", "sauna", "scale", "scene",
    "scent", "scout", "scrap", "seize", "sense", "serve", "seven", "shade", "shake",
    "shale", "shame", "shape", "share", "shark", "sharp", "shave", "sheep", "sheer",
    "sheet", "shelf", "shell", "shift", "shine", "shirt", "shock", "shore", "short",
    "shout", "shove", "shown", "shrub", "siege", "sight", "sigma", "silky", "since",
    "sixth", "sixty", "sized", "skate", "slack", "slain", "slate", "sleek", "sleep",
    "slept", "slice", "slide", "slope", "sloth", "smart", "smell", "smile", "smith",
    "smoke", "snack", "snake", "snare", "sneak", "snore", "solar", "solve", "sonic",
    "south", "space", "spare", "spark", "spawn", "speak", "spear", "speed", "spell",
    "spend", "spice", "spied", "spine", "spoke", "spoon", "sport", "spray", "squad",
    "stack", "staff", "stage", "stain", "stair", "stake", "stale", "stalk", "stall",
    "stamp", "stand", "stank", "stare", "start", "stash", "state", "stave", "stays",
    "steam", "steel", "steep", "steer", "stern", "stick", "stiff", "still", "sting",
    "stink", "stock", "stoic", "stoke", "stole", "stomp", "stone", "stood", "stool",
    "store", "stork", "storm", "story", "stout", "stove", "straw", "stray", "strip",
    "stuck", "study", "stuff", "stump", "stung", "stunk", "style", "sugar", "suite",
    "sunny", "super", "surge", "swamp", "swarm", "swear", "sweat", "sweep", "sweet",
    "swept", "swift", "swine", "swing", "swirl", "swoop", "sword", "swore", "sworn",
    "syrup", "table", "tacit", "taint", "taken", "tally", "talon", "tango", "tangy",
    "taper", "tasty", "teach", "tempo", "tense", "tepid", "theme", "thick", "thing",
    "think", "thorn", "those", "three", "threw", "throw", "thump", "tiger", "tight",
    "timer", "timid", "tipsy", "titan", "title", "toast", "today", "token", "tonal",
    "torch", "total", "tough", "towel", "tower", "toxic", "trace", "track", "trade",
    "trail", "train", "trait", "tramp", "trash", "trawl", "treat", "trend", "trial",
    "tribe", "trick", "troop", "trout", "truck", "truly", "trump", "trunk", "trust",
    "truth", "tulip", "tumor", "tuner", "tunic", "turbo", "tutor", "tweed", "twice",
    "twist", "tying", "ultra", "uncle", "uncut", "under", "undid", "unfit", "unify",
    "union", "unite", "unity", "unlit", "until", "unwed", "unzip", "upper", "upset",
    "urban", "usage", "usher", "using", "usual", "utter", "valve", "vapor", "vault",
    "venus", "verge", "verse", "vigor", "vinyl", "viola", "viper", "viral", "virus",
    "visit", "visor", "vista", "vital", "vivid", "vocal", "vodka", "vogue", "voice",
    "voter", "vouch", "vowel", "wager", "wagon", "waist", "waltz", "watch", "water",
    "waver", "wheat", "wheel", "where", "which", "while", "whirl", "white", "whole",
    "whose", "width", "wield", "windy", "witch", "women", "world", "worry", "worst",
    "worth", "would", "wound", "wrath", "wrist", "write", "wrong", "wrote", "yacht",
    "yield", "young", "youth", "zebra", "zesty",
]


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


def generate_passphrase(num_words: int = 5, separator: str = "-", custom_words: list[str] | None = None) -> str:
    """Generate a passphrase using random words from the wordlist.
    If custom_words are provided, they are included and the remaining slots
    are filled with random words from the wordlist."""
    cw = [w.strip() for w in (custom_words or []) if w.strip()]
    # Number of random words to add (at least 1 random word always)
    random_count = max(1, num_words - len(cw))
    random_words = [secrets.choice(WORDLIST) for _ in range(random_count)]
    # Combine custom + random, then shuffle positions
    words = [w.capitalize() for w in cw] + [w.capitalize() for w in random_words]
    for i in range(len(words) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        words[i], words[j] = words[j], words[i]
    # Add a random number and symbol for extra entropy
    number = str(secrets.randbelow(100))
    symbol = secrets.choice("!@#$%&*")
    words.append(number + symbol)
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

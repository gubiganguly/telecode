import os
from pathlib import Path

from cryptography.fernet import Fernet

from .config import settings

_MASTER_KEY_PATH = settings.database_path.parent / ".master.key"


def _load_or_create_key() -> bytes:
    """Load the master encryption key from env or file, creating one if needed."""
    env_key = os.environ.get("CASPERBOT_ENCRYPTION_KEY")
    if env_key:
        return env_key.encode()

    if _MASTER_KEY_PATH.exists():
        return _MASTER_KEY_PATH.read_bytes().strip()

    key = Fernet.generate_key()
    _MASTER_KEY_PATH.parent.mkdir(parents=True, exist_ok=True)
    _MASTER_KEY_PATH.write_bytes(key)
    _MASTER_KEY_PATH.chmod(0o600)
    return key


_fernet = Fernet(_load_or_create_key())


def encrypt(plaintext: str) -> str:
    """Encrypt a plaintext string, returning a base64-encoded ciphertext."""
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt a base64-encoded ciphertext back to plaintext."""
    return _fernet.decrypt(ciphertext.encode()).decode()

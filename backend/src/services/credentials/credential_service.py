import uuid
from datetime import datetime, timezone

from ...core.database import db
from ...core.encryption import decrypt, encrypt
from ...core.exceptions import CredentialNotFoundError


def _mask_value(plaintext: str) -> str:
    """Return a masked version showing only the last 4 characters."""
    if len(plaintext) <= 4:
        return "*" * len(plaintext)
    return "*" * (len(plaintext) - 4) + plaintext[-4:]


class CredentialService:
    async def list_keys(self) -> tuple[list[dict], int]:
        async with db.conn.execute(
            "SELECT * FROM credentials ORDER BY created_at DESC"
        ) as cursor:
            rows = await cursor.fetchall()

        keys = []
        for row in rows:
            r = dict(row)
            decrypted = decrypt(r.pop("encrypted_value"))
            r["masked_value"] = _mask_value(decrypted)
            keys.append(r)

        return keys, len(keys)

    async def create_key(
        self,
        name: str,
        service: str,
        env_var: str,
        value: str,
    ) -> dict:
        key_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        encrypted = encrypt(value)

        await db.conn.execute(
            """INSERT INTO credentials (id, name, service, env_var, encrypted_value, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (key_id, name, service, env_var, encrypted, now, now),
        )
        await db.conn.commit()

        return {
            "id": key_id,
            "name": name,
            "service": service,
            "env_var": env_var,
            "masked_value": _mask_value(value),
            "created_at": now,
            "updated_at": now,
        }

    async def get_key(self, key_id: str) -> dict:
        async with db.conn.execute(
            "SELECT * FROM credentials WHERE id = ?", (key_id,)
        ) as cursor:
            row = await cursor.fetchone()
        if not row:
            raise CredentialNotFoundError(f"Credential not found: {key_id}")
        r = dict(row)
        decrypted = decrypt(r.pop("encrypted_value"))
        r["masked_value"] = _mask_value(decrypted)
        return r

    async def update_key(
        self,
        key_id: str,
        name: str | None = None,
        service: str | None = None,
        env_var: str | None = None,
        value: str | None = None,
    ) -> dict:
        updates: list[str] = []
        params: list[str] = []

        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if service is not None:
            updates.append("service = ?")
            params.append(service)
        if env_var is not None:
            updates.append("env_var = ?")
            params.append(env_var)
        if value is not None:
            updates.append("encrypted_value = ?")
            params.append(encrypt(value))

        if not updates:
            return await self.get_key(key_id)

        updates.append("updated_at = ?")
        params.append(datetime.now(timezone.utc).isoformat())
        params.append(key_id)

        result = await db.conn.execute(
            f"UPDATE credentials SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.conn.commit()

        if result.rowcount == 0:
            raise CredentialNotFoundError(f"Credential not found: {key_id}")

        return await self.get_key(key_id)

    async def delete_key(self, key_id: str) -> None:
        result = await db.conn.execute(
            "DELETE FROM credentials WHERE id = ?", (key_id,)
        )
        await db.conn.commit()
        if result.rowcount == 0:
            raise CredentialNotFoundError(f"Credential not found: {key_id}")

    async def get_decrypted_value(self, key_id: str) -> str:
        """Return the decrypted value for a single key."""
        async with db.conn.execute(
            "SELECT encrypted_value FROM credentials WHERE id = ?", (key_id,)
        ) as cursor:
            row = await cursor.fetchone()
        if not row:
            raise CredentialNotFoundError(f"Credential not found: {key_id}")
        return decrypt(row["encrypted_value"])

    async def get_decrypted_env_map(self) -> dict[str, str]:
        """Return {env_var: decrypted_value} for all stored credentials."""
        async with db.conn.execute(
            "SELECT env_var, encrypted_value FROM credentials"
        ) as cursor:
            rows = await cursor.fetchall()
        return {row["env_var"]: decrypt(row["encrypted_value"]) for row in rows}

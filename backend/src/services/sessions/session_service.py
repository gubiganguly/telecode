import uuid
from datetime import datetime, timezone

from ...core.database import db
from ...core.exceptions import SessionNotFoundError


class SessionService:
    async def list_sessions(
        self, project_id: str, offset: int = 0, limit: int = 50
    ) -> tuple[list[dict], int]:
        async with db.conn.execute(
            """SELECT * FROM sessions
               WHERE project_id = ? AND is_active = 1
               ORDER BY updated_at DESC
               LIMIT ? OFFSET ?""",
            (project_id, limit, offset),
        ) as cursor:
            rows = await cursor.fetchall()

        async with db.conn.execute(
            "SELECT COUNT(*) FROM sessions WHERE project_id = ? AND is_active = 1",
            (project_id,),
        ) as cursor:
            total = (await cursor.fetchone())[0]

        return [dict(r) for r in rows], total

    async def create_session(
        self,
        project_id: str,
        name: str = "New Chat",
        session_id: str | None = None,
    ) -> dict:
        sid = session_id or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        await db.conn.execute(
            """INSERT INTO sessions (id, project_id, name, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?)""",
            (sid, project_id, name, now, now),
        )
        await db.conn.commit()

        return {
            "id": sid,
            "project_id": project_id,
            "name": name,
            "created_at": now,
            "updated_at": now,
            "last_message": "",
            "message_count": 0,
            "is_active": True,
        }

    async def get_session(self, session_id: str) -> dict:
        async with db.conn.execute(
            "SELECT * FROM sessions WHERE id = ? AND is_active = 1",
            (session_id,),
        ) as cursor:
            row = await cursor.fetchone()
        if not row:
            raise SessionNotFoundError(f"Session not found: {session_id}")
        return dict(row)

    async def update_session(
        self, session_id: str, name: str | None = None
    ) -> dict:
        updates: list[str] = []
        params: list[str] = []
        if name is not None:
            updates.append("name = ?")
            params.append(name)

        if not updates:
            return await self.get_session(session_id)

        updates.append("updated_at = ?")
        params.append(datetime.now(timezone.utc).isoformat())
        params.append(session_id)

        await db.conn.execute(
            f"UPDATE sessions SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.conn.commit()
        return await self.get_session(session_id)

    async def delete_session(self, session_id: str) -> None:
        await db.conn.execute(
            "UPDATE sessions SET is_active = 0, updated_at = ? WHERE id = ?",
            (datetime.now(timezone.utc).isoformat(), session_id),
        )
        await db.conn.commit()

    async def update_after_message(
        self, session_id: str, last_message_preview: str
    ) -> None:
        await db.conn.execute(
            """UPDATE sessions
               SET last_message = ?,
                   message_count = message_count + 1,
                   updated_at = ?
               WHERE id = ?""",
            (
                last_message_preview,
                datetime.now(timezone.utc).isoformat(),
                session_id,
            ),
        )
        await db.conn.commit()

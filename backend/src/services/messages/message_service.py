import json
import uuid
from datetime import datetime, timezone

from ...core.database import db


class MessageService:
    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        thinking: str = "",
        tool_uses: list[dict] | None = None,
        usage: dict | None = None,
        cost_usd: float | None = None,
        message_id: str | None = None,
    ) -> dict:
        mid = message_id or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        await db.conn.execute(
            """INSERT INTO messages
               (id, session_id, role, content, thinking, tool_uses, usage, cost_usd, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                mid,
                session_id,
                role,
                content,
                thinking,
                json.dumps(tool_uses or []),
                json.dumps(usage) if usage else None,
                cost_usd,
                now,
            ),
        )
        await db.conn.commit()

        return {
            "id": mid,
            "session_id": session_id,
            "role": role,
            "content": content,
            "thinking": thinking,
            "tool_uses": tool_uses or [],
            "usage": usage,
            "cost_usd": cost_usd,
            "created_at": now,
        }

    async def list_messages(
        self, session_id: str, offset: int = 0, limit: int = 200
    ) -> tuple[list[dict], int]:
        async with db.conn.execute(
            """SELECT * FROM messages
               WHERE session_id = ?
               ORDER BY created_at ASC
               LIMIT ? OFFSET ?""",
            (session_id, limit, offset),
        ) as cursor:
            rows = await cursor.fetchall()

        async with db.conn.execute(
            "SELECT COUNT(*) FROM messages WHERE session_id = ?",
            (session_id,),
        ) as cursor:
            total = (await cursor.fetchone())[0]

        results = []
        for row in rows:
            r = dict(row)
            r["tool_uses"] = json.loads(r["tool_uses"]) if r["tool_uses"] else []
            r["usage"] = json.loads(r["usage"]) if r["usage"] else None
            results.append(r)

        return results, total

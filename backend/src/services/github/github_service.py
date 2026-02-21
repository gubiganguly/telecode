import uuid
from datetime import datetime, timezone
from urllib.parse import urlencode

import httpx

from ...core.config import settings
from ...core.database import db
from ...core.encryption import encrypt, decrypt
from ...core.exceptions import GitHubNotConnectedError, GitHubApiError

GITHUB_API_BASE = "https://api.github.com"
GITHUB_OAUTH_AUTHORIZE = "https://github.com/login/oauth/authorize"
GITHUB_OAUTH_TOKEN = "https://github.com/login/oauth/access_token"


class GitHubService:
    # --- OAuth ---

    def get_login_url(self) -> str:
        params = {
            "client_id": settings.github_client_id,
            "redirect_uri": settings.github_callback_url,
            "scope": "repo delete_repo",
        }
        return f"{GITHUB_OAUTH_AUTHORIZE}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GITHUB_OAUTH_TOKEN,
                json={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )
            if resp.status_code != 200:
                raise GitHubApiError("Failed to exchange OAuth code")

            data = resp.json()
            access_token = data.get("access_token")
            if not access_token:
                raise GitHubApiError(
                    data.get("error_description", "No access token returned")
                )
            scopes = data.get("scope", "")

            user_resp = await client.get(
                f"{GITHUB_API_BASE}/user",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if user_resp.status_code != 200:
                raise GitHubApiError("Failed to fetch GitHub user info")
            user = user_resp.json()

        account_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        encrypted_token = encrypt(access_token)

        # Single-user app — remove any existing account before inserting
        await db.conn.execute("DELETE FROM github_accounts")
        await db.conn.execute(
            """INSERT INTO github_accounts
               (id, github_username, github_user_id, avatar_url, encrypted_token, scopes, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                account_id,
                user["login"],
                user["id"],
                user.get("avatar_url", ""),
                encrypted_token,
                scopes,
                now,
                now,
            ),
        )
        await db.conn.commit()

        return {
            "id": account_id,
            "github_username": user["login"],
            "avatar_url": user.get("avatar_url", ""),
            "created_at": now,
        }

    # --- Account Status ---

    async def get_account(self) -> dict | None:
        async with db.conn.execute(
            "SELECT id, github_username, avatar_url, created_at FROM github_accounts LIMIT 1"
        ) as cursor:
            row = await cursor.fetchone()
        if not row:
            return None
        return dict(row)

    async def disconnect(self) -> None:
        await db.conn.execute("DELETE FROM github_accounts")
        await db.conn.commit()

    async def get_token(self) -> str:
        async with db.conn.execute(
            "SELECT encrypted_token FROM github_accounts LIMIT 1"
        ) as cursor:
            row = await cursor.fetchone()
        if not row:
            raise GitHubNotConnectedError("No GitHub account connected")
        return decrypt(row["encrypted_token"])

    # --- Repo Operations ---

    async def create_repo(
        self, name: str, description: str = "", private: bool = True
    ) -> dict:
        token = await self.get_token()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GITHUB_API_BASE}/user/repos",
                json={
                    "name": name,
                    "description": description,
                    "private": private,
                    "auto_init": False,
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                },
            )
        if resp.status_code == 422:
            raise GitHubApiError("Repository already exists or name is invalid")
        if resp.status_code not in (200, 201):
            raise GitHubApiError(f"Failed to create repository: {resp.text}")
        return resp.json()

    async def delete_repo(self, repo_url: str) -> None:
        """Delete a GitHub repository given its URL (e.g. https://github.com/owner/repo)."""
        token = await self.get_token()
        # Extract owner/repo from URL
        parts = repo_url.rstrip("/").split("/")
        if len(parts) < 2:
            raise GitHubApiError(f"Invalid repository URL: {repo_url}")
        owner, repo = parts[-2], parts[-1]

        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                },
            )
        if resp.status_code == 404:
            return  # Already gone, nothing to do
        if resp.status_code not in (204, 200):
            raise GitHubApiError(f"Failed to delete repository: {resp.text}")

    async def list_repos(
        self, per_page: int = 30, page: int = 1
    ) -> list[dict]:
        token = await self.get_token()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GITHUB_API_BASE}/user/repos",
                params={
                    "per_page": per_page,
                    "page": page,
                    "sort": "updated",
                    "affiliation": "owner",
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                },
            )
        if resp.status_code != 200:
            raise GitHubApiError("Failed to list repositories")
        return [
            {
                "full_name": r["full_name"],
                "html_url": r["html_url"],
                "private": r["private"],
                "description": r.get("description") or "",
            }
            for r in resp.json()
        ]

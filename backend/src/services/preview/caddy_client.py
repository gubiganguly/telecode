"""Client for Caddy's admin API to manage reverse-proxy routes dynamically."""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)


class CaddyClient:
    """Manages Caddy reverse-proxy config via the admin API (localhost:2019)."""

    def __init__(self, admin_url: str, listen_port: int, domain: str) -> None:
        self._admin_url = admin_url.rstrip("/")
        self._listen_port = listen_port
        self._domain = domain
        self._routes: dict[str, int] = {}  # slug → port

    async def add_route(self, slug: str, port: int) -> None:
        """Register a route: ``slug.domain`` → ``localhost:port``."""
        self._routes[slug] = port
        await self._push_config()
        logger.info("Caddy route added: %s.%s → localhost:%d", slug, self._domain, port)

    async def remove_route(self, slug: str) -> None:
        """Remove the route for *slug*."""
        if slug in self._routes:
            del self._routes[slug]
            await self._push_config()
            logger.info("Caddy route removed: %s.%s", slug, self._domain)

    async def is_healthy(self) -> bool:
        """Check if Caddy's admin API is reachable."""
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                resp = await client.get(f"{self._admin_url}/config/")
                return resp.status_code in (200, 404)  # 404 = no config yet, still alive
        except Exception:
            return False

    async def _push_config(self) -> None:
        """Build the full Caddy JSON config and POST /load."""
        config = self._build_config()
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{self._admin_url}/load",
                    json=config,
                    headers={"Content-Type": "application/json"},
                )
                resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error("Caddy config push failed (%s): %s", exc.response.status_code, exc.response.text)
            raise
        except httpx.ConnectError:
            logger.warning("Caddy not reachable at %s — route not applied", self._admin_url)
            raise

    def _build_config(self) -> dict:
        """Build the complete Caddy JSON configuration."""
        routes = []
        for slug, port in self._routes.items():
            routes.append({
                "match": [{"host": [f"{slug}.{self._domain}"]}],
                "handle": [
                    {
                        "handler": "reverse_proxy",
                        "upstreams": [{"dial": f"localhost:{port}"}],
                    }
                ],
            })

        if not routes:
            # Empty config — just keep Caddy running with no routes
            return {}

        return {
            "apps": {
                "http": {
                    "servers": {
                        "preview": {
                            "listen": [f":{self._listen_port}"],
                            "routes": routes,
                            "automatic_https": {
                                "disable": True,
                            },
                        }
                    }
                }
            }
        }

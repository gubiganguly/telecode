import ipaddress
import re
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException

from ...schemas.common import APIResponse
from ...schemas.mentions import UrlFetchRequest, UrlFetchResponse

router = APIRouter(prefix="/api/mentions", tags=["mentions"])

MAX_CONTENT_LENGTH = 50_000
FETCH_TIMEOUT = 10.0


def _is_private_ip(hostname: str) -> bool:
    """Reject requests to private/loopback IPs (SSRF prevention)."""
    try:
        addr = ipaddress.ip_address(hostname)
        return addr.is_private or addr.is_loopback or addr.is_reserved
    except ValueError:
        # Not a raw IP — check common private hostnames
        return hostname in ("localhost", "0.0.0.0")


def _extract_title(html: str) -> str:
    """Extract the <title> tag content from HTML."""
    match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else ""


def _html_to_text(html: str) -> str:
    """Strip HTML tags to get plain text."""
    # Remove script and style blocks
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html, flags=re.IGNORECASE | re.DOTALL)
    # Replace block tags with newlines
    text = re.sub(r"<(br|p|div|h[1-6]|li|tr)[^>]*>", "\n", text, flags=re.IGNORECASE)
    # Strip remaining tags
    text = re.sub(r"<[^>]+>", "", text)
    # Clean up whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


@router.post("/fetch-url", response_model=APIResponse[UrlFetchResponse])
async def fetch_url(body: UrlFetchRequest):
    # Validate URL format
    parsed = urlparse(body.url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Only http/https URLs are supported")

    hostname = parsed.hostname or ""
    if _is_private_ip(hostname):
        raise HTTPException(status_code=400, detail="Cannot fetch private/local URLs")

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=FETCH_TIMEOUT,
            max_redirects=5,
        ) as client:
            response = await client.get(body.url, headers={"User-Agent": "Telecode/1.0"})
            response.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="URL fetch timed out")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"URL returned status {e.response.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch URL: {e}")

    raw = response.text
    content_type = response.headers.get("content-type", "")

    if "html" in content_type:
        title = _extract_title(raw)
        content = _html_to_text(raw)
    else:
        title = parsed.path.split("/")[-1] or parsed.hostname or ""
        content = raw

    truncated = len(content) > MAX_CONTENT_LENGTH
    if truncated:
        content = content[:MAX_CONTENT_LENGTH]

    return APIResponse(
        data=UrlFetchResponse(
            url=body.url,
            content=content,
            title=title,
            truncated=truncated,
        )
    )

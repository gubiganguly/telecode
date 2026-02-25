import logging
import os

import anthropic

from ..credentials.credential_service import CredentialService

logger = logging.getLogger(__name__)

TITLE_PROMPT = (
    "Generate a concise 2-4 word title for a chat conversation that starts "
    "with the message below. Output ONLY the title — no quotes, no punctuation, "
    "no explanation.\n\nMessage: {message}"
)


async def generate_title(
    message: str,
    credential_service: CredentialService,
) -> str | None:
    """Generate a short chat title using Claude Haiku.

    Returns the generated title, or ``None`` if generation fails for any
    reason (missing API key, network error, etc.).
    """
    try:
        # Try DB-stored credential first, then fall back to environment variable
        env_map = await credential_service.get_decrypted_env_map()
        api_key = env_map.get("ANTHROPIC_API_KEY") or os.environ.get(
            "ANTHROPIC_API_KEY"
        )
        if not api_key:
            logger.debug("No ANTHROPIC_API_KEY found — skipping title generation")
            return None

        client = anthropic.AsyncAnthropic(api_key=api_key)
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=30,
            messages=[
                {
                    "role": "user",
                    "content": TITLE_PROMPT.format(message=message[:300]),
                }
            ],
        )

        title = response.content[0].text.strip().strip("\"'")
        if title and len(title) < 60:
            return title
    except Exception:
        logger.warning("Failed to generate chat title", exc_info=True)

    return None

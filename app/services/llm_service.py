"""LLM Service using Groq SDK for agricultural advisory.

Uses the Groq Python SDK directly for LLM-powered
agricultural assistance and prompt caching.
"""

import logging
import re
from dataclasses import dataclass
from typing import Dict, List, Optional

import groq

from app.config import AppConfig
from app.services.prompt_manager import PromptManager

logger = logging.getLogger(__name__)


def strip_markdown(text: str) -> str:
    """Remove markdown formatting from LLM output."""
    if not text:
        return text

    # Remove bold
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)

    # Remove italic
    text = re.sub(
        r"(?<!\*)(\*)(?!\*)(.+?)(?<!\*)(\*)(?!\*)",
        r"\2",
        text,
    )

    # Remove underscores
    text = re.sub(r"__(.+?)__", r"\1", text)
    text = re.sub(
        r"(?<!_)(_)(?!_)(.+?)(?<!_)(_)(?!_)",
        r"\2",
        text,
    )

    # Remove headers
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)

    # Remove inline backticks
    text = re.sub(r"`([^`\n]+)`", r"\1", text)

    # Remove code blocks
    text = re.sub(r"```[\s\S]*?```", "", text)

    return text.strip()


@dataclass
class LLMResult:
    """Response wrapper containing LLM response and usage metrics."""

    text: str
    prompt_tokens: int = 0
    cached_tokens: int = 0
    completion_tokens: int = 0

    @property
    def cache_hit_rate(self) -> float:
        """Return percentage of prompt tokens served from cache."""
        if self.prompt_tokens == 0:
            return 0.0

        return (self.cached_tokens / self.prompt_tokens) * 100


class LLMService:
    """Service for interacting with Groq LLMs."""

    def __init__(self) -> None:
        """Initialize the LLM service."""
        self.config = AppConfig
        self.prompt_manager = PromptManager()
        self._client = self._create_client()

        logger.info(
            "LLM Service initialized (model: %s)",
            self.config.LLM_MODEL,
        )

    def _create_client(self) -> Optional[groq.Groq]:
        """Create the Groq client."""
        api_key = self.config.GROQ_API_KEY

        if not api_key:
            logger.warning(
                "GROQ_API_KEY not set. LLM unavailable."
            )
            return None

        return groq.Groq(api_key=api_key)

    def generate(
        self,
        user_query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        session_id: Optional[str] = None,
    ) -> LLMResult:
        """Generate an agricultural advisory response."""

        if self._client is None:
            return LLMResult(
                text="LLM not configured. Set GROQ_API_KEY in .env."
            )

        try:
            messages = self.prompt_manager.build_messages(
                user_query=user_query,
                conversation_history=conversation_history,
            )

            logger.debug(
                "LLM call [session: %s], messages=%d",
                session_id,
                len(messages),
            )

            response = self._client.chat.completions.create(
                model=self.config.LLM_MODEL,
                messages=messages,
                temperature=self.config.LLM_TEMPERATURE,
                max_tokens=self.config.LLM_MAX_TOKENS,
            )

            usage = response.usage

            prompt_tokens = getattr(
                usage,
                "prompt_tokens",
                0,
            )

            cached_tokens = 0

            details = getattr(
                usage,
                "prompt_tokens_details",
                None,
            )

            if details and isinstance(details, dict):
                cached_tokens = details.get(
                    "cached_tokens",
                    0,
                )
            elif details:
                cached_tokens = getattr(
                    details,
                    "cached_tokens",
                    0,
                )

            completion_tokens = getattr(
                usage,
                "completion_tokens",
                0,
            )

            result = LLMResult(
                text=strip_markdown(
                    response.choices[0].message.content.strip()
                ),
                prompt_tokens=prompt_tokens,
                cached_tokens=cached_tokens,
                completion_tokens=completion_tokens,
            )

            logger.info(
                "LLM response [session: %s] — "
                "prompt: %d tokens, cached: %d (%.0f%% hit), "
                "completion: %d tokens",
                session_id,
                result.prompt_tokens,
                result.cached_tokens,
                result.cache_hit_rate,
                result.completion_tokens,
            )

            return result

        except Exception as exc:
            logger.error(
                "LLM generation failed [session: %s]: %s",
                session_id,
                exc,
            )

            return LLMResult(
                text=(
                    "I apologize, but I'm experiencing a "
                    "temporary issue. Please try again in a moment."
                )
            )

    @property
    def client(self):
        """Access the underlying Groq client."""
        return self._client

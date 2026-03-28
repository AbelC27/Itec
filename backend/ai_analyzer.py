import json
import logging
import os

from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

from schemas import (
    ALLOWED_MEM_LIMITS,
    MAX_NANO_CPUS,
    MIN_NANO_CPUS,
    SAFE_DEFAULT_MEM_LIMIT,
    SAFE_DEFAULT_NANO_CPUS,
    ResourceEstimate,
)

logger = logging.getLogger(__name__)

# Task 3.1: Configure AsyncOpenAI client for OpenRouter
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY", ""),
    timeout=2.5,
)

# Task 3.2: System prompt enforcing strict JSON-only output
SYSTEM_PROMPT = (
    "You are a code complexity analyzer. Analyze the given code's time and space complexity "
    "and estimate the Docker container resources needed to run it.\n\n"
    "Respond with ONLY a raw JSON object. No markdown, no explanation, no code fences.\n\n"
    "The JSON must contain exactly two fields:\n"
    '- "mem_limit": one of "128m", "256m", "512m", "1g"\n'
    '- "nano_cpus": an integer between 250000000 (0.25 CPU) and 2000000000 (2.0 CPU)\n\n'
    "Example response:\n"
    '{"mem_limit": "256m", "nano_cpus": 500000000}'
)


def _safe_defaults() -> ResourceEstimate:
    """Return the safe fallback resource estimate."""
    return ResourceEstimate(
        mem_limit=SAFE_DEFAULT_MEM_LIMIT,
        nano_cpus=SAFE_DEFAULT_NANO_CPUS,
    )


async def analyze(code: str) -> ResourceEstimate:
    """
    Send code to the LLM for resource estimation.

    Returns a validated ResourceEstimate on success, or safe defaults
    on any failure (timeout, network error, invalid JSON, out-of-range values).
    """
    # Task 3.3: Check API key before making the call
    if not os.environ.get("OPENROUTER_API_KEY"):
        logger.warning("OPENROUTER_API_KEY not set — using safe defaults")
        return _safe_defaults()

    # Task 3.5: Wrap entire LLM call + parsing in try/except
    try:
        response = await client.chat.completions.create(
            model="openai/gpt-4o",
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": code},
            ],
        )

        content = response.choices[0].message.content

        # Task 3.4: Parse and validate the JSON response
        data = json.loads(content)
        mem_limit = data["mem_limit"]
        nano_cpus = data["nano_cpus"]

        if mem_limit not in ALLOWED_MEM_LIMITS:
            logger.warning("LLM returned invalid mem_limit=%s — using safe defaults", mem_limit)
            return _safe_defaults()

        if not isinstance(nano_cpus, int) or not (MIN_NANO_CPUS <= nano_cpus <= MAX_NANO_CPUS):
            logger.warning("LLM returned invalid nano_cpus=%s — using safe defaults", nano_cpus)
            return _safe_defaults()

        return ResourceEstimate(mem_limit=mem_limit, nano_cpus=nano_cpus)

    except Exception as exc:
        logger.warning("AI analysis failed (%s) — using safe defaults", exc)
        return _safe_defaults()

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
    "and estimate the Docker container resources needed to run it.\n"
    "Also check for malicious intent: fork bombs, infinite loops, unauthorized file system access, "
    "network abuse, or any dangerous operations.\n\n"
    "Respond with ONLY a raw JSON object. No markdown, no explanation, no code fences.\n\n"
    "The JSON must contain exactly these fields:\n"
    '- "mem_limit": one of "128m", "256m", "512m", "1g"\n'
    '- "nano_cpus": an integer between 250000000 (0.25 CPU) and 2000000000 (2.0 CPU)\n'
    '- "is_malicious": boolean, true if the code has malicious intent\n'
    '- "security_reason": string, brief reason if malicious, empty string otherwise\n\n'
    "Example response:\n"
    '{"mem_limit": "256m", "nano_cpus": 500000000, "is_malicious": false, "security_reason": ""}'
)


def _safe_defaults() -> ResourceEstimate:
    """Return the safe fallback resource estimate."""
    return ResourceEstimate(
        mem_limit=SAFE_DEFAULT_MEM_LIMIT,
        nano_cpus=SAFE_DEFAULT_NANO_CPUS,
        is_malicious=False,
        security_reason="",
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
        is_malicious = bool(data.get("is_malicious", False))
        security_reason = str(data.get("security_reason", "")) if is_malicious else ""

        if mem_limit not in ALLOWED_MEM_LIMITS:
            logger.warning("LLM returned invalid mem_limit=%s — using safe defaults", mem_limit)
            return _safe_defaults()

        if not isinstance(nano_cpus, int) or not (MIN_NANO_CPUS <= nano_cpus <= MAX_NANO_CPUS):
            logger.warning("LLM returned invalid nano_cpus=%s — using safe defaults", nano_cpus)
            return _safe_defaults()

        return ResourceEstimate(
            mem_limit=mem_limit,
            nano_cpus=nano_cpus,
            is_malicious=is_malicious,
            security_reason=security_reason,
        )

    except Exception as exc:
        logger.warning("AI analysis failed (%s) — using safe defaults", exc)
        return _safe_defaults()

# System prompt for error explanation — uses {language} placeholder formatted at call time
ERROR_EXPLAIN_PROMPT = (
    "You are a concise coding assistant. The user ran {language} code that failed.\n"
    "Return ONLY a raw JSON object with exactly these fields:\n"
    '- "error_explanation": brief explanation in 2-3 sentences\n'
    '- "suggested_fix": corrected code snippet only (no markdown, no code fences)\n'
    '- "original_code": exact snippet from the input that should be replaced\n\n'
    "If you cannot confidently fix the issue, set suggested_fix and original_code to empty strings.\n"
    "No extra keys, no markdown, no additional text."
)


def _safe_error_fix(message: str) -> dict:
    return {
        "error_explanation": message,
        "suggested_fix": "",
        "original_code": "",
    }


async def explain_error(language: str, code: str, stderr: str) -> dict:
    """
    Ask the LLM to explain a code execution error and suggest a fix.

    Args:
        language: Programming language (e.g. "python", "javascript")
        code: The source code that was executed
        stderr: The stderr output from the failed execution

    Returns:
        A dict containing error_explanation, suggested_fix, and original_code,
        or safe fallback values on any failure. Never raises.
    """
    try:
        response = await client.chat.completions.create(
            model="openai/gpt-4o",
            temperature=0,
            messages=[
                {"role": "system", "content": ERROR_EXPLAIN_PROMPT.format(language=language)},
                {"role": "user", "content": f"Code:\n{code}\n\nError:\n{stderr}"},
            ],
        )
        content = response.choices[0].message.content or ""
        if not content.strip():
            return _safe_error_fix(
                "The AI returned an empty response. Please review the error output manually."
            )

        data = json.loads(content)
        if not isinstance(data, dict):
            return _safe_error_fix(
                "The AI returned an invalid response. Please review the error output manually."
            )

        error_explanation = str(data.get("error_explanation", "")).strip()
        suggested_fix = str(data.get("suggested_fix", ""))
        original_code = str(data.get("original_code", ""))

        if not error_explanation:
            error_explanation = (
                "Unable to analyze this error automatically. Please review the stderr output above."
            )

        return {
            "error_explanation": error_explanation,
            "suggested_fix": suggested_fix,
            "original_code": original_code,
        }
    except Exception as exc:
        logger.warning("AI error explanation failed (%s)", exc)
        return _safe_error_fix(
            "Unable to analyze this error automatically. Please review the stderr output above."
        )
        return "Unable to analyze this error automatically. Please review the stderr output above."


# System prompt for AI chat assistant
CHAT_SYSTEM_PROMPT = (
    "You are a helpful coding assistant embedded in a collaborative code editor called iTECify. "
    "The user may share code with you. Help them understand, debug, improve, or explain their code. "
    "Be concise and practical.\n\n"
    "IMPORTANT: When the user asks you to modify, fix, add to, or update their code, you MUST return "
    "the COMPLETE updated file inside a single code block. Do NOT return only the changed lines or a "
    "partial snippet — always include the full file so it can be applied directly. "
    "Add a brief explanation before the code block describing what you changed."
)


async def chat(message: str, code: str, history: list[dict] | None = None) -> str:
    """
    Send a chat message (with optional code context and conversation history) to the LLM.

    Returns the AI's reply as a string, or a fallback message on failure.
    """
    if not os.environ.get("OPENROUTER_API_KEY"):
        return "AI service is not configured. Please set the OPENROUTER_API_KEY."

    user_content = message
    if code and code.strip():
        user_content = f"{message}\n\nCurrent code:\n```\n{code}\n```"

    messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]

    # Include conversation history for multi-turn context
    if history:
        messages.extend(history)

    messages.append({"role": "user", "content": user_content})

    try:
        response = await client.chat.completions.create(
            model="openai/gpt-4o",
            temperature=0.7,
            messages=messages,
        )
        content = response.choices[0].message.content
        if content and content.strip():
            return content.strip()
        return "The AI returned an empty response. Please try again."
    except Exception as exc:
        logger.warning("AI chat failed (%s)", exc)
        return "Unable to process your request right now. Please try again later."

from dataclasses import dataclass
from typing import Any, Awaitable, Callable

SendCallback = Callable[[str, Any], Awaitable[None]]

LANGUAGE_IMAGES: dict[str, str] = {
    "python": "python:3.11-alpine",
    "javascript": "node:20-alpine",
}


@dataclass
class ExecuteResult:
    """Internal result object for logging/auditing purposes."""

    execution_time: float
    timed_out: bool
    exit_code: int

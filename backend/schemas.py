from dataclasses import dataclass
from typing import Any, Awaitable, Callable

SendCallback = Callable[[str, Any], Awaitable[None]]

LANGUAGE_IMAGES: dict[str, str] = {
    "python": "python:3.11-alpine",
    "javascript": "node:20-alpine",
}


ALLOWED_MEM_LIMITS: set[str] = {"128m", "256m", "512m", "1g"}
MIN_NANO_CPUS: int = 250_000_000
MAX_NANO_CPUS: int = 2_000_000_000
SAFE_DEFAULT_MEM_LIMIT: str = "256m"
SAFE_DEFAULT_NANO_CPUS: int = 500_000_000


@dataclass
class ResourceEstimate:
    """Holds AI-determined resource limits for a Docker container."""

    mem_limit: str
    nano_cpus: int


@dataclass
class ExecuteResult:
    """Internal result object for logging/auditing purposes."""

    execution_time: float
    timed_out: bool
    exit_code: int


@dataclass
class ExecutionRecord:
    """Represents a single execution history row for Supabase insertion."""

    document_id: str
    language: str
    code_snapshot: str
    mem_limit: str
    nano_cpus: int
    stdout: str
    stderr: str
    execution_time: float

from dataclasses import dataclass
from typing import Any, Awaitable, Callable, TypedDict

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
    """Holds AI-determined resource limits and security analysis for a Docker container."""

    mem_limit: str
    nano_cpus: int
    is_malicious: bool = False
    security_reason: str = ""


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

# --- Document Management (Phase 6) ---

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DocumentCreate(BaseModel):
    """Request body for creating a new document."""

    title: str
    language: str


class DocumentResponse(BaseModel):
    """Response model for a document."""

    id: UUID
    title: str
    language: str
    owner_id: UUID | None
    created_at: datetime
    updated_at: datetime


class DocumentSyncChange(BaseModel):
    """A text edit expressed as an offset/length replacement."""

    range_offset: int
    range_length: int
    text: str


class DocumentSyncPush(BaseModel):
    """Request body for pushing document content to cloud sync."""

    document_id: str
    content: str | None = None
    base_content: str | None = None
    changes: list[DocumentSyncChange] | None = None


class DocumentSyncPullResponse(BaseModel):
    """Response body for pulling document content."""

    document_id: str
    content: str


class BranchCreateRequest(BaseModel):
    """Request body for creating a new branch from a parent document."""

    parent_doc_id: str
    branch_name: str


# --- Autonomous Agent Swarm (LangGraph) ---


class TutorTriggerState(TypedDict):
    """Input state for the sentinel_tutor_node LangGraph node."""

    session_id: str
    code_snapshot: str
    stderr: str
    language: str


class TutorIntervention(BaseModel):
    """Payload produced by the Sentinel Tutor Agent and broadcast to the student."""

    session_id: str
    question: str
    root_cause_summary: str
    language: str
    created_at: datetime


class Swarm_State(TypedDict):
    """Shared state passed between all LangGraph nodes in the autonomous agent swarm.
    
    This TypedDict serves as the state schema for the LangGraph workflow that
    orchestrates Python_Developer, Security_Reviewer, Sandbox_Tester, and
    Spec_Enforcer nodes.
    """

    user_prompt: str
    generated_code: str
    security_status: str  # "approved" | "blocked" | ""
    test_results: str
    error_message: str
    retry_count: int  # Initializes to 0, max 3 retries
    spec_markdown: str  # Teacher's rubric markdown, default ""
    code_snapshot: str  # Code that passed sandbox execution, default ""
    spec_compliant: bool  # Result from spec enforcer, default True


# --- Spec-Driven Enforcement ---


class SpecUpsertRequest(BaseModel):
    """Request body for creating/updating a session spec."""

    spec_markdown: str


class SpecResponse(BaseModel):
    """Response model for a session spec."""

    session_id: str
    spec_markdown: str | None


class ComplianceNudge(BaseModel):
    """Payload produced by the Spec Enforcer Agent."""

    session_id: str
    compliant: bool
    message: str
    missed_requirements: list[str] = []
    created_at: datetime

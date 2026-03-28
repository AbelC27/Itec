from fastapi import APIRouter
from pydantic import BaseModel

from ai_analyzer import explain_error, chat, flag_repeated_execution_failures

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ErrorExplainRequest(BaseModel):
    language: str
    code: str
    stderr: str


class ErrorExplainResponse(BaseModel):
    error_explanation: str
    suggested_fix: str
    original_code: str


@router.post("/explain", response_model=ErrorExplainResponse)
async def explain_endpoint(body: ErrorExplainRequest) -> ErrorExplainResponse:
    result = await explain_error(body.language, body.code, body.stderr)
    return ErrorExplainResponse(**result)


class ChatHistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    code: str = ""
    history: list[ChatHistoryMessage] = []


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(body: ChatRequest) -> ChatResponse:
    history = [{"role": m.role, "content": m.content} for m in body.history]
    role = body.user_role if body.user_role in ("student", "teacher") else "student"
    reply = await chat(body.message, body.code, history, user_role=role)
    return ChatResponse(reply=reply)


class RepeatedFailureAlert(BaseModel):
    kind: str
    session_id: str
    consecutive_failures: int
    message: str


@router.get("/telemetry/execution-alerts", response_model=list[RepeatedFailureAlert])
async def execution_telemetry_alerts() -> list[RepeatedFailureAlert]:
    """Flag student session_ids with more than three consecutive failed runs."""
    raw = flag_repeated_execution_failures()
    return [RepeatedFailureAlert(**row) for row in raw]

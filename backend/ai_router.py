from fastapi import APIRouter
from pydantic import BaseModel

from ai_analyzer import explain_error, chat

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
    explanation = await explain_error(body.language, body.code, body.stderr)
    return ErrorExplainResponse(explanation=explanation)


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
    reply = await chat(body.message, body.code, history)
    return ChatResponse(reply=reply)

from fastapi import APIRouter
from pydantic import BaseModel

from ai_analyzer import explain_error

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ErrorExplainRequest(BaseModel):
    language: str
    code: str
    stderr: str


class ErrorExplainResponse(BaseModel):
    explanation: str


@router.post("/explain", response_model=ErrorExplainResponse)
async def explain_endpoint(body: ErrorExplainRequest) -> ErrorExplainResponse:
    explanation = await explain_error(body.language, body.code, body.stderr)
    return ErrorExplainResponse(explanation=explanation)

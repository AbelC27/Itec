from fastapi import APIRouter
from pydantic import BaseModel

from ai_analyzer import explain_error

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

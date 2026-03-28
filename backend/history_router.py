import logging

from fastapi import APIRouter, HTTPException

from db import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/documents/{document_id}/history")
async def get_execution_history(document_id: str) -> list[dict]:
    """Return all executions for a document, newest first."""
    try:
        client = get_supabase_client()
        response = (
            client.table("execution_history")
            .select("*")
            .eq("document_id", document_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as exc:
        logger.error("Failed to fetch execution history: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch execution history")

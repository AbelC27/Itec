import logging

from fastapi import APIRouter, HTTPException

from db import get_supabase_client
from telemetry import get_failure_streak, get_failure_threshold

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


@router.get("/api/telemetry/stuck-sessions")
async def get_stuck_sessions() -> list[dict]:
    """Return sessions whose failure streak meets or exceeds the threshold."""
    try:
        client = get_supabase_client()
        threshold = get_failure_threshold()

        # Get distinct session_ids that have recent failures
        response = (
            client.table("execution_history")
            .select("session_id")
            .eq("execution_status", "failed")
            .order("created_at", desc=True)
            .limit(500)
            .execute()
        )

        # Deduplicate session_ids
        seen: set[str] = set()
        unique_sessions: list[str] = []
        for row in response.data:
            sid = row["session_id"]
            if sid not in seen:
                seen.add(sid)
                unique_sessions.append(sid)

        results: list[dict] = []
        for sid in unique_sessions:
            streak = get_failure_streak(sid)
            if streak >= threshold:
                results.append({
                    "session_id": sid,
                    "failure_streak": streak,
                    "message": f"Student stuck: {streak} consecutive failures",
                })

        return results
    except Exception as exc:
        logger.error("Failed to fetch stuck sessions: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch stuck sessions")

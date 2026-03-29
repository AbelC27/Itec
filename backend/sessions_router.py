import logging

from fastapi import APIRouter, HTTPException

from db import get_supabase_client
from schemas import SpecUpsertRequest
from ws_router import manager

logger = logging.getLogger(__name__)

router = APIRouter()

# How many recent documents to show when no execute/swarm WebSocket is open.
# Teachers need rows to click even though collaboration runs on Yjs (port 4444), not this API.
RECENT_DOCUMENTS_LIMIT = 40


@router.get("/api/sessions/active")
async def list_active_sessions() -> list[dict]:
    """
    Live Telemetry: recent documents from Supabase, merged with execute/swarm WebSocket presence.

    - **Live** = at least one client connected to `/ws/execute/{id}` or `/ws/swarm/{id}` on this API.
    - **Offline** = document exists but no such WebSocket (normal when only Yjs or DB activity).

    `owner_id` is not used here; nullable owner does not affect this list.
    """
    active_ids = set(manager.active_connections.keys())
    client = get_supabase_client()

    try:
        doc_response = (
            client.table("documents")
            .select("id, title, language, updated_at")
            .order("updated_at", desc=True)
            .limit(RECENT_DOCUMENTS_LIMIT)
            .execute()
        )
        docs = doc_response.data or []
    except Exception as exc:
        logger.error("list_active_sessions: failed to list documents: %s", exc)
        docs = []

    out: list[dict] = []
    seen: set[str] = set()

    for row in docs:
        doc_id = row["id"]
        seen.add(doc_id)
        live = doc_id in active_ids
        members = manager.member_count(doc_id) if live else 0
        language = row.get("language") or "python"
        title = row.get("title") or f"Document {doc_id[:8]}"
        out.append(
            {
                "id": doc_id,
                "name": title,
                "description": f"{'Live ·' if live else 'Recent ·'} {language}",
                "stack": language,
                "status": "Live" if live else "Offline",
                "membersActive": members,
                "openFiles": 1,
                "participants": manager.get_participants(doc_id) if live else [],
            }
        )

    # WebSocket-only rooms not in the recent-documents slice (edge case)
    for doc_id in active_ids:
        if doc_id in seen:
            continue
        row = None
        try:
            one = (
                client.table("documents")
                .select("id, title, language")
                .eq("id", doc_id)
                .limit(1)
                .execute()
            )
            rows = one.data or []
            row = rows[0] if rows else None
        except Exception:
            pass

        members = manager.member_count(doc_id)
        title = row["title"] if row else f"Document {doc_id[:8]}"
        language = row["language"] if row else "python"
        out.append(
            {
                "id": doc_id,
                "name": title,
                "description": f"Live telemetry · {language}",
                "stack": language,
                "status": "Live",
                "membersActive": members,
                "openFiles": 1,
                "participants": manager.get_participants(doc_id),
            }
        )

    return out


# --- Spec Management ---


@router.put("/api/sessions/{session_id}/spec")
async def upsert_session_spec(session_id: str, body: SpecUpsertRequest) -> dict:
    """Create or update the assignment spec for a session."""
    client = get_supabase_client()
    # Verify session exists
    check = client.table("documents").select("id").eq("id", session_id).limit(1).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Session not found")

    value = body.spec_markdown if body.spec_markdown.strip() else None
    client.table("documents").update({"spec_markdown": value}).eq("id", session_id).execute()
    return {"status": "ok", "session_id": session_id}


@router.get("/api/sessions/{session_id}/spec")
async def get_session_spec(session_id: str) -> dict:
    """Return the current assignment spec for a session."""
    client = get_supabase_client()
    result = client.table("documents").select("id, spec_markdown").eq("id", session_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    row = result.data[0]
    return {"session_id": session_id, "spec_markdown": row.get("spec_markdown")}

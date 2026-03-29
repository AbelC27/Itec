import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chats", tags=["chats"])


class CreateSessionRequest(BaseModel):
    document_id: str
    title: str = "New Chat"
    user_id: str = ""


class SaveMessageRequest(BaseModel):
    role: str
    content: str


@router.get("/{document_id}/sessions")
async def list_sessions(document_id: str, user_id: str | None = None) -> list[dict]:
    """List chat sessions for a document, optionally filtered by user_id."""
    try:
        client = get_supabase_client()
        query = (
            client.table("ai_chat_sessions")
            .select("*")
            .eq("document_id", document_id)
        )
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.order("updated_at", desc=True).execute()
        return response.data
    except Exception as exc:
        logger.error("Failed to list chat sessions: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to list chat sessions")


@router.post("/{document_id}/sessions", status_code=201)
async def create_session(document_id: str, body: CreateSessionRequest) -> dict:
    """Create a new chat session for a document."""
    try:
        client = get_supabase_client()
        record: dict = {"document_id": document_id, "title": body.title}
        if body.user_id:
            record["user_id"] = body.user_id
        try:
            response = client.table("ai_chat_sessions").insert(record).execute()
        except Exception:
            # Fallback: user_id column might not exist yet
            record.pop("user_id", None)
            response = client.table("ai_chat_sessions").insert(record).execute()
        return response.data[0]
    except Exception as exc:
        logger.error("Failed to create chat session: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create chat session")


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str):
    """Delete a chat session and all its messages."""
    try:
        client = get_supabase_client()
        client.table("ai_chat_sessions").delete().eq("id", session_id).execute()
    except Exception as exc:
        logger.error("Failed to delete chat session: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to delete chat session")


@router.get("/sessions/{session_id}/messages")
async def list_messages(session_id: str) -> list[dict]:
    """List all messages in a chat session, oldest first."""
    try:
        client = get_supabase_client()
        response = (
            client.table("ai_chat_messages")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at", desc=False)
            .execute()
        )
        return response.data
    except Exception as exc:
        logger.error("Failed to list chat messages: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to list chat messages")


@router.post("/sessions/{session_id}/messages", status_code=201)
async def save_message(session_id: str, body: SaveMessageRequest) -> dict:
    """Save a message to a chat session."""
    try:
        client = get_supabase_client()
        response = (
            client.table("ai_chat_messages")
            .insert({
                "session_id": session_id,
                "role": body.role,
                "content": body.content,
            })
            .execute()
        )
        # Update session's updated_at timestamp
        client.table("ai_chat_sessions").update(
            {"updated_at": "now()"}
        ).eq("id", session_id).execute()
        return response.data[0]
    except Exception as exc:
        logger.error("Failed to save chat message: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to save chat message")


@router.patch("/sessions/{session_id}")
async def rename_session(session_id: str, body: CreateSessionRequest) -> dict:
    """Rename a chat session."""
    try:
        client = get_supabase_client()
        response = (
            client.table("ai_chat_sessions")
            .update({"title": body.title})
            .eq("id", session_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Session not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to rename chat session: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to rename chat session")

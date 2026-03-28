import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from db import get_supabase_client
from schemas import DocumentCreate

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/api/documents", status_code=201)
async def create_document(body: DocumentCreate) -> dict:
    """Create a new document workspace."""
    try:
        client = get_supabase_client()
        response = (
            client.table("documents")
            .insert({"title": body.title, "language": body.language})
            .execute()
        )
        return response.data[0]
    except Exception as exc:
        logger.error("Failed to create document: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create document")


@router.get("/api/documents")
async def list_documents() -> list[dict]:
    """List all documents, newest-updated first."""
    try:
        client = get_supabase_client()
        response = (
            client.table("documents")
            .select("*")
            .order("updated_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as exc:
        logger.error("Failed to list documents: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to list documents")


@router.get("/api/documents/{document_id}")
async def get_document(document_id: str) -> dict:
    """Get a single document by ID. 404 if not found."""
    try:
        client = get_supabase_client()
        response = (
            client.table("documents")
            .select("*")
            .eq("id", document_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Document not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to fetch document %s: %s", document_id, exc)
        raise HTTPException(status_code=500, detail="Failed to fetch document")


@router.delete("/api/documents/{document_id}", status_code=204)
async def delete_document(document_id: str) -> Response:
    """Delete a document. 404 if not found."""
    try:
        client = get_supabase_client()
        response = (
            client.table("documents")
            .delete()
            .eq("id", document_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Document not found")
        return Response(status_code=204)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to delete document %s: %s", document_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete document")

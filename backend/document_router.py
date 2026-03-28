import logging

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from db import get_supabase_client
from schemas import BranchCreateRequest, DocumentCreate, DocumentSyncPullResponse, DocumentSyncPush

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


@router.post("/api/docs/sync/push")
async def sync_push(body: DocumentSyncPush) -> dict:
    """Push document content to the cloud."""
    try:
        client = get_supabase_client()
        response = (
            client.table("documents")
            .update({"content": body.content})
            .eq("id", body.document_id)
            .execute()
        )

        if not response.data:
            exists = (
                client.table("documents")
                .select("id")
                .eq("id", body.document_id)
                .execute()
            )
            if not exists.data:
                raise HTTPException(status_code=404, detail="Document not found")

        return {"status": "ok", "document_id": body.document_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to push sync for document %s: %s", body.document_id, exc)
        raise HTTPException(status_code=500, detail="Failed to sync document")


@router.get("/api/docs/sync/pull", response_model=DocumentSyncPullResponse)
async def sync_pull(document_id: str = Query(..., alias="id")) -> DocumentSyncPullResponse:
    """Pull the latest document content from the cloud."""
    try:
        client = get_supabase_client()
        response = (
            client.table("documents")
            .select("id, content")
            .eq("id", document_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Document not found")
        record = response.data[0]
        return DocumentSyncPullResponse(
            document_id=record.get("id", document_id),
            content=record.get("content") or "",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to pull sync for document %s: %s", document_id, exc)
        raise HTTPException(status_code=500, detail="Failed to fetch document content")


@router.post("/api/docs/branch/create", status_code=201)
async def create_branch(body: BranchCreateRequest) -> dict:
    """Create a new branch by cloning an existing document."""
    try:
        client = get_supabase_client()
        parent = (
            client.table("documents")
            .select("*")
            .eq("id", body.parent_doc_id)
            .execute()
        )
        if not parent.data:
            raise HTTPException(status_code=404, detail="Parent document not found")

        parent_doc = parent.data[0]
        payload: dict[str, str | None] = {"title": body.branch_name}
        for key in ("language", "content", "owner_id", "project_id"):
            if key in parent_doc:
                payload[key] = parent_doc.get(key)

        response = client.table("documents").insert(payload).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create branch")

        return {"document_id": response.data[0]["id"]}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to create branch from %s: %s", body.parent_doc_id, exc)
        raise HTTPException(status_code=500, detail="Failed to create branch")


@router.delete("/api/docs/branch/delete", status_code=204)
async def delete_branch(document_id: str = Query(..., alias="document_id")) -> Response:
    """Delete a branch document by ID."""
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
        logger.error("Failed to delete branch %s: %s", document_id, exc)
        raise HTTPException(status_code=500, detail="Failed to delete branch")

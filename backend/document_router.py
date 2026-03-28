import logging

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from db import get_supabase_client
from schemas import (
    BranchCreateRequest,
    DocumentCreate,
    DocumentSyncChange,
    DocumentSyncPullResponse,
    DocumentSyncPush,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def apply_sync_changes(content: str, changes: list[DocumentSyncChange]) -> str:
    """Apply a batch of offset-based replacements to a document."""
    next_content = content

    for change in sorted(changes, key=lambda item: item.range_offset, reverse=True):
        start = change.range_offset
        end = start + change.range_length

        if start < 0 or change.range_length < 0 or end > len(next_content):
            raise HTTPException(status_code=400, detail="Invalid sync change range")

        next_content = f"{next_content[:start]}{change.text}{next_content[end:]}"

    return next_content


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
        document_response = (
            client.table("documents")
            .select("id, content")
            .eq("id", body.document_id)
            .execute()
        )
        if not document_response.data:
            raise HTTPException(status_code=404, detail="Document not found")

        current_record = document_response.data[0]
        current_content = current_record.get("content") or ""

        has_full_content = body.content is not None
        has_changes = bool(body.changes)
        if has_full_content and has_changes:
            raise HTTPException(
                status_code=400,
                detail="Sync push accepts either full content or editor changes, not both",
            )

        if not has_full_content and not has_changes:
            raise HTTPException(
                status_code=400,
                detail="Sync push requires either content or changes",
            )

        if has_changes:
            if body.base_content is None:
                raise HTTPException(
                    status_code=409,
                    detail="Pull the latest content before pushing editor changes",
                )

            if current_content != body.base_content:
                raise HTTPException(
                    status_code=409,
                    detail="Remote content changed. Pull latest content and retry",
                )

            next_content = apply_sync_changes(current_content, body.changes or [])
        else:
            if body.base_content is not None and current_content != body.base_content:
                raise HTTPException(
                    status_code=409,
                    detail="Remote content changed. Pull latest content and retry",
                )

            next_content = body.content or ""

        response = (
            client.table("documents")
            .update({"content": next_content})
            .eq("id", body.document_id)
            .execute()
        )

        if not response.data:
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

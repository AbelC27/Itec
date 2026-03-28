import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from db import get_supabase_client
from docker_manager import DockerIsolationManager

logger = logging.getLogger(__name__)

router = APIRouter()


async def save_execution(
    document_id: str,
    language: str,
    code: str,
    mem_limit: str,
    nano_cpus: int,
    stdout: str,
    stderr: str,
    execution_time: float,
) -> None:
    """Insert a row into execution_history. Logs errors, never raises."""
    try:
        client = get_supabase_client()
        record = {
            "document_id": document_id,
            "language": language,
            "code_snapshot": code,
            "mem_limit": mem_limit,
            "nano_cpus": nano_cpus,
            "stdout": stdout,
            "stderr": stderr,
            "execution_time": execution_time,
        }
        client.table("execution_history").insert(record).execute()
        logger.info("Saved execution history for document %s", document_id)
    except Exception as exc:
        logger.error("Failed to save execution history: %s", exc)


@router.websocket("/ws/execute")
async def execute_code_ws(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for streaming code execution.

    Protocol:
    1. Client connects
    2. Client sends JSON: {"language": "python", "code": "print('hi')", "document_id": "abc-123"}
    3. Server streams back messages (stdout, stderr, complete, error)
    4. Server closes connection after completion or error
    """
    await websocket.accept()
    try:
        raw = await websocket.receive_text()
        try:
            message = json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            await websocket.send_json({"type": "error", "data": "Invalid request"})
            return

        language = message.get("language", "")
        code = message.get("code", "")
        document_id = message.get("document_id", "")

        if not language or not code or len(code) > 50_000:
            await websocket.send_json({"type": "error", "data": "Invalid request"})
            return

        # Accumulating callback: buffers stdout/stderr while forwarding to client
        stdout_buf: list[str] = []
        stderr_buf: list[str] = []
        execution_metadata: dict = {}

        async def accumulating_send(msg_type: str, data) -> None:
            if msg_type == "stdout":
                stdout_buf.append(data)
            elif msg_type == "stderr":
                stderr_buf.append(data)
            elif msg_type == "complete":
                execution_metadata["execution_time"] = data.get("execution_time", 0.0)
            await websocket.send_json({"type": msg_type, "data": data})

        manager = DockerIsolationManager()
        estimate = await manager.execute_streaming(language, code, accumulating_send)

        # Fire-and-forget DB insert (only if document_id provided and execution completed)
        if document_id and estimate and "execution_time" in execution_metadata:
            asyncio.create_task(save_execution(
                document_id=document_id,
                language=language,
                code=code,
                mem_limit=estimate.mem_limit,
                nano_cpus=estimate.nano_cpus,
                stdout="".join(stdout_buf),
                stderr="".join(stderr_buf),
                execution_time=execution_metadata["execution_time"],
            ))

    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.send_json(
                {"type": "error", "data": "Internal server error"}
            )
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass

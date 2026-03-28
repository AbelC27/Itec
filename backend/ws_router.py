import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from docker_manager import DockerIsolationManager

router = APIRouter()


@router.websocket("/ws/execute")
async def execute_code_ws(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for streaming code execution.

    Protocol:
    1. Client connects
    2. Client sends JSON: {"language": "python", "code": "print('hi')"}
    3. Server streams back messages (stdout, stderr, complete, error)
    4. Server closes connection after completion or error
    """
    await websocket.accept()
    try:
        # Task 6.1: Read a single text message and validate
        raw = await websocket.receive_text()
        try:
            message = json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            await websocket.send_json({"type": "error", "data": "Invalid request"})
            return

        language = message.get("language", "")
        code = message.get("code", "")

        if not language or not code or len(code) > 50_000:
            await websocket.send_json({"type": "error", "data": "Invalid request"})
            return

        # Task 6.2: Wire send_chunk callback to DockerIsolationManager
        async def send_chunk(msg_type: str, data) -> None:
            await websocket.send_json({"type": msg_type, "data": data})

        manager = DockerIsolationManager()
        await manager.execute_streaming(language, code, send_chunk)

    # Task 6.3: Error handling
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

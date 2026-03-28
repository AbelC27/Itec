import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from db import get_supabase_client
from docker_manager import DockerIsolationManager
from schemas import Swarm_State
from swarm.graph import create_swarm_graph

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, document_id: str) -> None:
        await websocket.accept()
        if document_id not in self.active_connections:
            self.active_connections[document_id] = []
        self.active_connections[document_id].append(websocket)

    def disconnect(self, websocket: WebSocket, document_id: str) -> None:
        if document_id in self.active_connections:
            if websocket in self.active_connections[document_id]:
                self.active_connections[document_id].remove(websocket)
                if not self.active_connections[document_id]:
                    del self.active_connections[document_id]

    async def broadcast(self, message: dict, document_id: str) -> None:
        connections = self.active_connections.get(document_id, [])
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


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


@router.websocket("/ws/execute/{document_id}")
async def execute_code_ws(websocket: WebSocket, document_id: str) -> None:
    """
    WebSocket endpoint for streaming code execution with room-based broadcast.

    Protocol:
    1. Client connects to /ws/execute/{document_id} (document_id from URL path)
    2. Client sends JSON: {"language": "python", "code": "print('hi')"}
    3. Server broadcasts messages (stdout, stderr, complete, error) to all room members
    4. Connection is removed from room on disconnect or error
    """
    await manager.connect(websocket, document_id)
    try:
        raw = await websocket.receive_text()
        try:
            message = json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            await manager.broadcast({"type": "error", "data": "Invalid request"}, document_id)
            return

        language = message.get("language", "")
        code = message.get("code", "")

        if not language or not code or len(code) > 50_000:
            await manager.broadcast({"type": "error", "data": "Invalid request"}, document_id)
            return

        # Accumulating callback: buffers stdout/stderr while broadcasting to room
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
            await manager.broadcast({"type": msg_type, "data": data}, document_id)

        docker_mgr = DockerIsolationManager()

        # Easter egg check: broadcast celebratory message if trigger string is found
        if "iTEC 2026" in code:
            await manager.broadcast(
                {"type": "easter_egg", "data": "🎉 You found the iTEC 2026 secret! 🎉"},
                document_id,
            )

        estimate = await docker_mgr.execute_streaming(language, code, accumulating_send)

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
            await manager.broadcast(
                {"type": "error", "data": "Internal server error"},
                document_id,
            )
        except Exception:
            pass
    finally:
        manager.disconnect(websocket, document_id)


@router.websocket("/ws/swarm/{document_id}")
async def swarm_websocket(websocket: WebSocket, document_id: str) -> None:
    """
    WebSocket endpoint for streaming LangGraph execution updates.
    
    Protocol:
    1. Client connects to /ws/swarm/{document_id}
    2. Client sends JSON: {"user_prompt": "generate a fibonacci function"}
    3. Server broadcasts state_update messages for each node execution
    4. Server broadcasts complete message when workflow finishes
    5. Connection is removed from room on disconnect or error
    
    Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 10.3, 10.4
    """
    await manager.connect(websocket, document_id)
    
    try:
        # Receive initial message with user_prompt
        data = await websocket.receive_json()
        user_prompt = data.get("user_prompt", "")
        
        if not user_prompt:
            await manager.broadcast(
                {"type": "error", "message": "user_prompt is required"},
                document_id
            )
            return
        
        # Initialize Swarm_State with default values
        initial_state: Swarm_State = {
            "user_prompt": user_prompt,
            "generated_code": "",
            "security_status": "",
            "test_results": "",
            "error_message": "",
            "retry_count": 0
        }
        
        # Create compiled LangGraph workflow
        graph = create_swarm_graph()
        
        # Track the latest state as we stream updates
        final_state = initial_state
        
        # Stream execution updates using astream()
        async for event in graph.astream(initial_state):
            # event is a dict with node name as key and updated state as value
            node_name = list(event.keys())[0]
            updated_state = event[node_name]
            
            # Update our tracked final state
            final_state = updated_state
            
            # Broadcast state update to all clients in room
            await manager.broadcast(
                {
                    "type": "state_update",
                    "node": node_name,
                    "state": updated_state
                },
                document_id
            )
        
        # Send completion message when graph finishes
        await manager.broadcast(
            {"type": "complete", "final_state": final_state},
            document_id
        )
    
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("Swarm WebSocket error: %s", e)
        try:
            await manager.broadcast(
                {"type": "error", "message": str(e)},
                document_id
            )
        except Exception:
            pass
    finally:
        manager.disconnect(websocket, document_id)

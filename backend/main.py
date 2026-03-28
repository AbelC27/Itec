import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cleanup import ContainerCleanupService
from document_router import router as document_router
from history_router import router as history_router
from ai_router import router as ai_router
from chat_router import router as chat_router
from ws_router import router as ws_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    removed = await ContainerCleanupService().cleanup_orphans()
    logger.info("Startup cleanup removed %d orphaned container(s)", removed)
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/ws-test")
def ws_test():
    """Test endpoint to verify WebSocket configuration."""
    return {
        "status": "ok",
        "websocket_url": "ws://localhost:8000/ws/swarm/test-doc",
        "message": "WebSocket endpoint is available"
    }


app.include_router(ws_router)
app.include_router(history_router)
app.include_router(document_router)
app.include_router(ai_router)
app.include_router(chat_router)

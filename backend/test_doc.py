import asyncio
import websockets
import json

async def test():
    async with websockets.connect("ws://localhost:8000/ws/execute") as ws:
        await ws.send(json.dumps({
            "language": "python",
            "code": "print('Hello from history test!')",
            "document_id": "test-doc-001"
        }))
        async for msg in ws:
            data = json.loads(msg)
            print(f"[{data['type']}] {data['data']}")
            if data["type"] in ("complete", "error"):
                break

asyncio.run(test())

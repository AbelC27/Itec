import asyncio
import json
import websockets

WS_URL = "ws://localhost:8000/ws/execute/test-doc-123"

async def listener(name: str, ready: asyncio.Event):
    """Passive listener — just connects and prints everything it receives."""
    async with websockets.connect(WS_URL) as ws:
        print(f"[{name}] Connected to room")
        ready.set()
        try:
            async for msg in ws:
                data = json.loads(msg)
                print(f"[{name}] Received: {data['type']} → {data['data']}")
        except websockets.ConnectionClosed:
            print(f"[{name}] Disconnected")

async def executor():
    """Active user — connects, sends code, and prints the broadcast output."""
    async with websockets.connect(WS_URL) as ws:
        print("[Executor] Connected to room")
        # Send a code execution request
        await ws.send(json.dumps({
            "language": "python",
            "code": "import time\nfor i in range(3):\n    print(f'Line {i}')\n    time.sleep(0.5)"
        }))
        print("[Executor] Sent execution request")
        try:
            async for msg in ws:
                data = json.loads(msg)
                print(f"[Executor] Received: {data['type']} → {data['data']}")
                if data["type"] in ("complete", "error"):
                    break
        except websockets.ConnectionClosed:
            print("[Executor] Disconnected")

async def main():
    # Start two listeners first
    ready_a = asyncio.Event()
    ready_b = asyncio.Event()

    listener_a = asyncio.create_task(listener("Listener A", ready_a))
    listener_b = asyncio.create_task(listener("Listener B", ready_b))

    # Wait for both listeners to connect
    await ready_a.wait()
    await ready_b.wait()
    await asyncio.sleep(0.5)  # Small buffer for connection registration

    # Now the executor connects and runs code
    await executor()

    # Give listeners a moment to receive remaining messages
    await asyncio.sleep(1)
    listener_a.cancel()
    listener_b.cancel()

if __name__ == "__main__":
    asyncio.run(main())

"""Quick manual test for the ws/execute WebSocket endpoint."""

import asyncio
import json
import websockets


async def test(language: str, code: str, label: str = ""):
    if label:
        print(f"\n--- {label} ---")
    async with websockets.connect("ws://localhost:8000/ws/execute") as ws:
        await ws.send(json.dumps({"language": language, "code": code}))
        async for msg in ws:
            print(msg)


async def test_raw(raw: str, label: str = ""):
    """Send a raw string (for malformed JSON test)."""
    if label:
        print(f"\n--- {label} ---")
    async with websockets.connect("ws://localhost:8000/ws/execute") as ws:
        await ws.send(raw)
        async for msg in ws:
            print(msg)


async def main():
    # 1. Python hello world
    await test("python", "print('Hello from Docker!')", "Python stdout")

    # 2. JavaScript hello world
    await test("javascript", "console.log('Hello from Node!')", "JavaScript stdout")

    # 3. Runtime error (non-zero exit code)
    await test("python", "1/0", "Python runtime error")

    # 4. Unsupported language
    await test("rust", "fn main() {}", "Unsupported language")

    # 5. Empty language (invalid input)
    await test("", "print('hi')", "Empty language")

    # 6. Malformed JSON
    await test_raw("not json at all", "Malformed JSON")

    # 7. Timeout (infinite loop) — takes ~5 seconds
    print("\n--- Timeout (will take ~5s) ---")
    await test("python", "while True: pass", "")


if __name__ == "__main__":
    asyncio.run(main())

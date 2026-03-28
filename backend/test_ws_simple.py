"""Simple WebSocket client test to verify the endpoint works."""
import asyncio
import websockets
import json


async def test_websocket():
    uri = "ws://localhost:8000/ws/swarm/test-doc-123"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✓ Connected successfully!")
            
            # Send a test message
            message = {"user_prompt": "generate a hello world function"}
            print(f"Sending: {message}")
            await websocket.send(json.dumps(message))
            
            # Receive responses
            print("Waiting for responses...")
            async for message in websocket:
                data = json.loads(message)
                print(f"Received: {data['type']}")
                if data['type'] == 'state_update':
                    print(f"  Node: {data['node']}")
                    if 'generated_code' in data['state'] and data['state']['generated_code']:
                        print(f"  Code: {data['state']['generated_code'][:50]}...")
                elif data['type'] == 'complete':
                    print("✓ Workflow completed!")
                    break
                elif data['type'] == 'error':
                    print(f"✗ Error: {data['message']}")
                    break
                    
    except Exception as e:
        print(f"✗ Connection failed: {e}")


if __name__ == "__main__":
    asyncio.run(test_websocket())

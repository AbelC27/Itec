#!/usr/bin/env python3
"""
Simple WebSocket test script to verify the /ws/swarm endpoint is working.
Run this while the backend is running to test the connection.
"""

import asyncio
import json
import websockets

async def test_websocket():
    uri = "ws://localhost:8000/ws/swarm/test-doc"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected successfully!")
            
            # Send test message
            test_message = {"user_prompt": "test connection"}
            print(f"Sending: {test_message}")
            await websocket.send(json.dumps(test_message))
            
            # Wait for responses
            print("Waiting for responses...")
            async for message in websocket:
                data = json.loads(message)
                print(f"Received: {data.get('type', 'unknown')} - {data}")
                
                # Stop after receiving complete or error
                if data.get('type') in ['complete', 'error']:
                    break
                    
        print("✅ WebSocket test completed successfully!")
        
    except ConnectionRefusedError:
        print("❌ Connection refused. Is the backend running?")
        print("   Start it with: cd backend && uvicorn main:app --reload")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("WebSocket Connection Test")
    print("=" * 50)
    asyncio.run(test_websocket())

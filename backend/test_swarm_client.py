"""
Simple WebSocket client to test the autonomous agent swarm endpoint.

Usage:
    python test_swarm_client.py
"""

import asyncio
import json
import sys

try:
    import websockets
except ImportError:
    print("Error: websockets library not installed")
    print("Install it with: pip install websockets")
    sys.exit(1)


async def test_swarm(user_prompt: str, document_id: str = "test-doc-123"):
    """
    Connect to the swarm WebSocket endpoint and stream execution updates.
    
    Args:
        user_prompt: Natural language prompt for code generation
        document_id: Document ID for the WebSocket room
    """
    uri = f"ws://localhost:8000/ws/swarm/{document_id}"
    
    print(f"Connecting to {uri}...")
    print(f"Prompt: {user_prompt}\n")
    print("=" * 80)
    
    try:
        async with websockets.connect(uri) as websocket:
            # Send user prompt
            await websocket.send(json.dumps({"user_prompt": user_prompt}))
            print("✓ Sent prompt, waiting for responses...\n")
            
            # Receive and print all messages
            while True:
                try:
                    message = await websocket.recv()
                    data = json.loads(message)
                    
                    msg_type = data.get("type")
                    
                    if msg_type == "state_update":
                        node = data.get("node", "unknown")
                        state = data.get("state", {})
                        
                        print(f"📍 Node: {node}")
                        print(f"   Retry Count: {state.get('retry_count', 0)}")
                        
                        if state.get("generated_code"):
                            code = state["generated_code"]
                            preview = code[:200] + "..." if len(code) > 200 else code
                            print(f"   Generated Code:\n{preview}")
                        
                        if state.get("security_status"):
                            status = state["security_status"]
                            emoji = "✅" if status == "approved" else "🚫"
                            print(f"   Security Status: {emoji} {status}")
                        
                        if state.get("test_results"):
                            results = state["test_results"]
                            print(f"   Test Results:\n{results[:300]}...")
                        
                        if state.get("error_message"):
                            print(f"   ⚠️  Error: {state['error_message']}")
                        
                        print("-" * 80)
                    
                    elif msg_type == "complete":
                        print("\n🎉 Workflow completed successfully!")
                        final_state = data.get("final_state", {})
                        print(f"\nFinal State Summary:")
                        print(f"  - Retry Count: {final_state.get('retry_count', 0)}")
                        print(f"  - Security Status: {final_state.get('security_status', 'N/A')}")
                        
                        if "Exit code: 0" in final_state.get("test_results", ""):
                            print(f"  - Execution: ✅ Success")
                        else:
                            print(f"  - Execution: ❌ Failed")
                        
                        break
                    
                    elif msg_type == "error":
                        print(f"\n❌ Error: {data.get('message')}")
                        break
                    
                    else:
                        print(f"Unknown message type: {msg_type}")
                        print(json.dumps(data, indent=2))
                
                except websockets.exceptions.ConnectionClosed:
                    print("\n⚠️  Connection closed by server")
                    break
    
    except ConnectionRefusedError:
        print("\n❌ Connection refused. Is the FastAPI server running?")
        print("   Start it with: cd backend && uvicorn main:app --reload")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")


async def main():
    """Run test scenarios."""
    
    print("\n" + "=" * 80)
    print("AUTONOMOUS AGENT SWARM - TEST CLIENT")
    print("=" * 80 + "\n")
    
    # Test scenarios
    scenarios = [
        {
            "name": "Scenario 1: Simple Hello World",
            "prompt": "Write a Python function that prints 'Hello, World!'"
        },
        {
            "name": "Scenario 2: Fibonacci Function",
            "prompt": "Write a Python function to calculate the nth fibonacci number"
        },
        {
            "name": "Scenario 3: List Comprehension",
            "prompt": "Write Python code that creates a list of squares from 1 to 10"
        },
    ]
    
    # Let user choose or provide custom prompt
    print("Choose a test scenario:")
    for i, scenario in enumerate(scenarios, 1):
        print(f"  {i}. {scenario['name']}")
    print(f"  {len(scenarios) + 1}. Custom prompt")
    
    try:
        choice = input("\nEnter choice (1-4): ").strip()
        
        if choice.isdigit() and 1 <= int(choice) <= len(scenarios):
            scenario = scenarios[int(choice) - 1]
            print(f"\nRunning: {scenario['name']}")
            await test_swarm(scenario["prompt"])
        
        elif choice == str(len(scenarios) + 1):
            custom_prompt = input("Enter your prompt: ").strip()
            if custom_prompt:
                await test_swarm(custom_prompt)
            else:
                print("Empty prompt, exiting.")
        
        else:
            print("Invalid choice, using default scenario.")
            await test_swarm(scenarios[0]["prompt"])
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except EOFError:
        # No input available, use default
        print("No input available, using default scenario.")
        await test_swarm(scenarios[0]["prompt"])


if __name__ == "__main__":
    asyncio.run(main())

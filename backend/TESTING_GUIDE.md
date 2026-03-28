# Testing Guide: Autonomous Agent Swarm

This guide walks you through testing the LangGraph-based autonomous agent swarm system.

## Prerequisites

1. **Install dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Set environment variables**:
   Create a `.env` file in the `backend/` directory:
   ```bash
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

3. **Ensure Docker is running** (required for sandbox execution):
   ```bash
   docker --version
   ```

## Testing Methods

### Method 1: Unit Tests (Fastest)

Run the existing unit tests to verify basic functionality:

```bash
cd backend
pytest test_swarm_ws.py -v
```

This tests:
- WebSocket connection handling
- State initialization
- Error handling for missing user_prompt
- Graph execution mocking

### Method 2: Manual WebSocket Testing (Recommended)

#### Step 1: Start the FastAPI server

```bash
cd backend
uvicorn main:app --reload --port 8000
```

#### Step 2: Use a WebSocket client

**Option A: Python WebSocket Client**

Create a file `test_swarm_client.py`:

```python
import asyncio
import json
import websockets

async def test_swarm():
    uri = "ws://localhost:8000/ws/swarm/test-doc-123"
    
    async with websockets.connect(uri) as websocket:
        # Send user prompt
        await websocket.send(json.dumps({
            "user_prompt": "Write a Python function to calculate fibonacci numbers"
        }))
        
        print("Sent prompt, waiting for responses...\n")
        
        # Receive and print all messages
        try:
            while True:
                message = await websocket.recv()
                data = json.loads(message)
                
                print(f"Type: {data.get('type')}")
                
                if data.get('type') == 'state_update':
                    print(f"Node: {data.get('node')}")
                    print(f"State: {json.dumps(data.get('state'), indent=2)}")
                elif data.get('type') == 'complete':
                    print("Workflow completed!")
                    print(f"Final state: {json.dumps(data.get('final_state'), indent=2)}")
                    break
                elif data.get('type') == 'error':
                    print(f"Error: {data.get('message')}")
                    break
                
                print("-" * 80)
        except websockets.exceptions.ConnectionClosed:
            print("Connection closed")

if __name__ == "__main__":
    asyncio.run(test_swarm())
```

Run it:
```bash
python test_swarm_client.py
```

**Option B: Browser Console (Chrome/Firefox)**

Open browser console and run:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/swarm/test-doc-123');

ws.onopen = () => {
    console.log('Connected!');
    ws.send(JSON.stringify({
        user_prompt: 'Write a Python function to calculate fibonacci numbers'
    }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
    
    if (data.type === 'complete') {
        console.log('Workflow completed!');
        ws.close();
    }
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};
```

### Method 3: Integration Testing (Full End-to-End)

Test the complete workflow with real LLM and Docker execution:

```bash
cd backend
python -c "
import asyncio
from swarm.graph import create_swarm_graph
from schemas import Swarm_State

async def test_full_workflow():
    # Initialize state
    initial_state: Swarm_State = {
        'user_prompt': 'Write a Python function that prints hello world',
        'generated_code': '',
        'security_status': '',
        'test_results': '',
        'error_message': '',
        'retry_count': 0
    }
    
    # Create and execute graph
    graph = create_swarm_graph()
    
    print('Starting workflow...\n')
    
    async for event in graph.astream(initial_state):
        node_name = list(event.keys())[0]
        state = event[node_name]
        
        print(f'Node: {node_name}')
        print(f'Generated Code: {state.get(\"generated_code\", \"N/A\")[:100]}...')
        print(f'Security Status: {state.get(\"security_status\", \"N/A\")}')
        print(f'Retry Count: {state.get(\"retry_count\", 0)}')
        print('-' * 80)
    
    print('Workflow completed!')

asyncio.run(test_full_workflow())
"
```

## Expected Workflow

When testing, you should see this sequence:

1. **Python Developer Node**
   - Receives user prompt
   - Generates Python code using LLM
   - Returns `generated_code`

2. **Security Reviewer Node**
   - Analyzes generated code
   - Returns `security_status`: "approved" or "blocked"
   - If blocked, workflow terminates

3. **Sandbox Tester Node**
   - Executes code in Docker container
   - Returns `test_results` with stdout/stderr/exit_code
   - If exit_code != 0 and retry_count < 3: loops back to Python Developer
   - If exit_code == 0: workflow completes successfully

## Test Scenarios

### Scenario 1: Successful Generation and Execution

**Prompt**: "Write a Python function that prints 'Hello, World!'"

**Expected**:
- Python Developer generates code
- Security Reviewer approves
- Sandbox Tester executes successfully (exit_code: 0)
- Workflow completes

### Scenario 2: Security Block

**Prompt**: "Write Python code to delete all files in /etc"

**Expected**:
- Python Developer generates code
- Security Reviewer blocks (is_malicious: true)
- Workflow terminates without execution

### Scenario 3: Execution Failure with Retry

**Prompt**: "Write Python code that divides by zero"

**Expected**:
- Python Developer generates code
- Security Reviewer approves
- Sandbox Tester fails (exit_code: 1)
- Retry count increments
- Python Developer generates fixed code
- Process repeats (max 3 retries)

### Scenario 4: Max Retries Reached

**Prompt**: "Write Python code with a syntax error that can't be fixed"

**Expected**:
- Multiple retry attempts (up to 3)
- Workflow terminates after max retries

## Troubleshooting

### Issue: "OPENROUTER_API_KEY not found"

**Solution**: Set the environment variable:
```bash
export OPENROUTER_API_KEY=your_key_here
```

### Issue: "Docker connection failed"

**Solution**: Ensure Docker daemon is running:
```bash
docker ps
```

### Issue: "Module 'langgraph' not found"

**Solution**: Install dependencies:
```bash
pip install langgraph>=0.0.20
```

### Issue: WebSocket connection refused

**Solution**: Ensure FastAPI server is running:
```bash
uvicorn main:app --reload --port 8000
```

## Monitoring and Debugging

### Enable Debug Logging

Add to your test script:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Check Docker Container Logs

```bash
docker logs <container_id>
```

### Inspect State at Each Node

Modify the WebSocket client to print full state:

```python
if data.get('type') == 'state_update':
    import pprint
    pprint.pprint(data.get('state'))
```

## Next Steps

After successful testing:

1. **Frontend Integration**: Connect your Next.js frontend to `/ws/swarm/{document_id}`
2. **Error Handling**: Test edge cases (network failures, timeouts, etc.)
3. **Performance**: Monitor execution time and resource usage
4. **Production**: Add rate limiting, authentication, and monitoring

## Quick Test Commands

```bash
# Run unit tests
pytest backend/test_swarm_ws.py -v

# Start server
cd backend && uvicorn main:app --reload

# Test with curl (WebSocket upgrade)
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
  http://localhost:8000/ws/swarm/test-doc-123
```

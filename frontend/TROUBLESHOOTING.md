# AI Agent Swarm - Troubleshooting Guide

## WebSocket Connection Error

If you see `WebSocket error: {}` in the console, follow these steps:

### Step 1: Check Backend is Running

Open a terminal and run:
```bash
cd backend
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Step 2: Test Backend Health

Open your browser and go to:
```
http://localhost:8000/api/health
```

You should see:
```json
{"status": "ok"}
```

### Step 3: Check Environment Variables

Make sure `frontend/.env.local` has:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Step 4: Restart Frontend

After starting the backend, restart your frontend:
```bash
cd frontend
# Stop the dev server (Ctrl+C)
npm run dev
```

### Step 5: Check Browser Console

Open browser DevTools (F12) and look for:
```
Connecting to WebSocket: ws://localhost:8000/ws/swarm/demo-swarm-doc
WebSocket connected successfully
```

If you see connection errors, the backend isn't running or is on a different port.

---

## Common Issues

### Issue 1: "Failed to connect to backend"

**Cause**: Backend is not running

**Solution**: 
```bash
cd backend
uvicorn main:app --reload
```

### Issue 2: "Connection refused"

**Cause**: Wrong port or URL

**Solution**: Check that backend is running on port 8000:
```bash
# In backend terminal, you should see:
# Uvicorn running on http://127.0.0.1:8000
```

### Issue 3: "CORS error"

**Cause**: Frontend is running on a different port than expected

**Solution**: Make sure frontend is on `http://localhost:3000`. If using a different port, update `backend/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:YOUR_PORT"],
    ...
)
```

### Issue 4: "Module not found: langgraph"

**Cause**: Backend dependencies not installed

**Solution**:
```bash
cd backend
pip install -r requirements.txt
```

### Issue 5: WebSocket connects but no response

**Cause**: Backend error or missing API key

**Solution**: Check backend terminal for errors. You need `OPENROUTER_API_KEY` in `backend/.env`:
```bash
OPENROUTER_API_KEY=your_key_here
```

---

## Quick Diagnostic Checklist

Run through this checklist:

- [ ] Backend is running (`uvicorn main:app --reload`)
- [ ] Backend health check works (`http://localhost:8000/api/health`)
- [ ] Frontend `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`
- [ ] Frontend is running (`npm run dev`)
- [ ] Browser console shows "WebSocket connected successfully"
- [ ] Backend `.env` has `OPENROUTER_API_KEY`

---

## Testing the Connection

### Test 1: Manual WebSocket Test

Open browser console and run:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/swarm/test-doc');
ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.error('Error:', e);
ws.onmessage = (e) => console.log('Message:', e.data);

// After connection opens, send:
ws.send(JSON.stringify({ user_prompt: "test" }));
```

If this works, the backend is fine and the issue is in the React component.

### Test 2: Check Backend Logs

When you try to connect, check the backend terminal. You should see:
```
INFO:     ('127.0.0.1', XXXXX) - "WebSocket /ws/swarm/demo-swarm-doc" [accepted]
```

If you don't see this, the connection isn't reaching the backend.

---

## Still Having Issues?

1. **Check both terminals** (backend and frontend) for error messages
2. **Clear browser cache** and reload
3. **Try a different browser** to rule out browser-specific issues
4. **Check firewall** isn't blocking localhost connections
5. **Verify Python version** is 3.10+ (`python --version`)
6. **Verify Node version** is 18+ (`node --version`)

---

## Success Indicators

When everything is working, you should see:

**Backend Terminal:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     ('127.0.0.1', XXXXX) - "WebSocket /ws/swarm/demo-swarm-doc" [accepted]
```

**Browser Console:**
```
Connecting to WebSocket: ws://localhost:8000/ws/swarm/demo-swarm-doc
WebSocket connected successfully
Received message: state_update
```

**UI:**
- Connection indicator shows green dot
- AI Avatar shows "Ready"
- Prompt input is enabled

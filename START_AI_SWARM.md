# Quick Start Guide - AI Agent Swarm

## 🚀 How to Start Everything

### Step 1: Start Backend (Terminal 1)

```bash
cd backend
uvicorn main:app --reload
```

Wait until you see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### Step 2: Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Wait until you see:
```
  ▲ Next.js 16.2.1
  - Local:        http://localhost:3000
```

### Step 3: Open Browser

Go to: **http://localhost:3000/ai-swarm**

---

## ✅ What You Should See

1. **Green dot** = "Connected to swarm"
2. **AI Avatar** showing "Ready"
3. **Prompt input** enabled

If you see a **red dot** and error message, the backend isn't running. Go back to Step 1.

---

## 🧪 Test It

1. Type in the prompt box: `"Create a hello world function"`
2. Click **Generate** (or press Cmd+Enter)
3. Watch the AI Avatar change:
   - 🤖 Pulsing = Generating code
   - 🛡️ Spinning = Security review
   - 🧪 Spinning = Testing
   - ✅ Green = Complete!
4. See the code appear in a floating box
5. Click **Accept** or **Reject**

---

## ❌ Troubleshooting

### Problem: Red dot, "Disconnected from backend"

**Solution**: Backend isn't running. Open a new terminal:
```bash
cd backend
uvicorn main:app --reload
```

Then refresh the browser page.

### Problem: Backend starts but crashes

**Solution**: Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### Problem: "Module 'langgraph' not found"

**Solution**: 
```bash
cd backend
pip install langgraph openai
```

### Problem: WebSocket connects but nothing happens

**Solution**: Check you have `OPENROUTER_API_KEY` in `backend/.env`:
```bash
OPENROUTER_API_KEY=your_key_here
```

---

## 📖 More Help

- **Detailed troubleshooting**: See `frontend/TROUBLESHOOTING.md`
- **Integration guide**: See `frontend/INTEGRATION_GUIDE.md`
- **Component docs**: See `frontend/src/components/workspace/AI_SWARM_README.md`

---

## 🎯 Quick Commands Reference

| Action | Command |
|--------|---------|
| Start backend | `cd backend && uvicorn main:app --reload` |
| Start frontend | `cd frontend && npm run dev` |
| Test backend health | Open `http://localhost:8000/api/health` |
| Open AI Swarm | Open `http://localhost:3000/ai-swarm` |
| Stop servers | Press `Ctrl+C` in each terminal |

---

## ✨ Example Prompts to Try

- `"Create a function to calculate fibonacci numbers"`
- `"Write a function to reverse a string"`
- `"Create a function that checks if a number is prime"`
- `"Write a hello world function"`
- `"Create a function to sort a list of numbers"`

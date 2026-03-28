# AI Agent Swarm - Frontend Components

This directory contains the frontend UI components for the Autonomous Agent Swarm feature, which connects to a LangGraph-based backend that generates, reviews, and tests Python code.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js/React)                  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useSwarmWebSocket Hook                              │  │
│  │  - Manages WebSocket connection                      │  │
│  │  - Handles state updates from backend                │  │
│  │  - Exposes startSwarm() function                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         │                │                │                 │
│  ┌──────▼──────┐  ┌─────▼─────┐  ┌──────▼──────┐          │
│  │ AIAvatar    │  │ AIPrompt  │  │ FloatingAI  │          │
│  │ Indicator   │  │ Input     │  │ Block       │          │
│  └─────────────┘  └───────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ WebSocket
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                  Backend (FastAPI + LangGraph)               │
│  Python Developer → Security Reviewer → Sandbox Tester      │
└──────────────────────────────────────────────────────────────┘
```

## Components

### 1. Type Definitions (`src/types/swarm.ts`)

Defines TypeScript interfaces for the swarm state and WebSocket messages:

```typescript
interface SwarmState {
  user_prompt: string;
  generated_code: string;
  security_status: "approved" | "blocked" | "";
  test_results: string;
  error_message: string;
  retry_count: number;
}
```

### 2. WebSocket Hook (`src/hooks/useSwarmWebSocket.ts`)

Custom React hook that manages the WebSocket connection to the backend.

**Usage:**

```typescript
const { state, status, isConnected, startSwarm } = useSwarmWebSocket({
  documentId: "your-document-id",
  onComplete: (finalState) => {
    console.log("Swarm completed:", finalState);
  },
  onError: (error) => {
    console.error("Error:", error);
  },
});

// Start the swarm with a prompt
startSwarm("Create a function to calculate fibonacci numbers");
```

**Features:**
- Automatic connection management
- Real-time state updates
- Status tracking (idle, generating, reviewing, testing, complete, error)
- Cleanup on unmount

### 3. AI Avatar Indicator (`src/components/workspace/AIAvatarIndicator.tsx`)

Visual indicator showing the current status of the AI agent.

**Props:**
```typescript
interface AIAvatarIndicatorProps {
  status: SwarmStatus;
  retryCount?: number;
  hasError?: boolean;
}
```

**States:**
- **Idle**: Bot icon, muted color
- **Generating**: Bot icon, pulsing primary color
- **Reviewing**: Shield icon, spinning blue
- **Testing**: Flask icon, spinning purple
- **Complete**: Check icon, emerald green
- **Error/Retry**: Warning icon, destructive color

### 4. AI Prompt Input (`src/components/workspace/AIPromptInput.tsx`)

Clean textarea component for submitting prompts to the AI.

**Props:**
```typescript
interface AIPromptInputProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
  placeholder?: string;
}
```

**Features:**
- Keyboard shortcut (Cmd/Ctrl + Enter)
- Auto-clear on submit
- Disabled state during processing
- Semantic color scheme

### 5. Floating AI Block (`src/components/workspace/FloatingAIBlock.tsx`)

Main UI component that displays generated code with review controls.

**Props:**
```typescript
interface FloatingAIBlockProps {
  state: SwarmState;
  onAccept: () => void;
  onReject: () => void;
  isVisible: boolean;
}
```

**Features:**
- Syntax-highlighted code display
- Security status badge (Approved/Blocked)
- Collapsible test results
- Collapsible error messages
- Accept/Reject buttons for peer review
- Retry count indicator

## Integration Example

Here's how to integrate all components in a workspace page:

```typescript
"use client";

import { useState } from "react";
import { useSwarmWebSocket } from "@/hooks/useSwarmWebSocket";
import AIAvatarIndicator from "@/components/workspace/AIAvatarIndicator";
import AIPromptInput from "@/components/workspace/AIPromptInput";
import FloatingAIBlock from "@/components/workspace/FloatingAIBlock";

export default function WorkspacePage() {
  const [documentId] = useState("your-document-id");
  const [showFloatingBlock, setShowFloatingBlock] = useState(false);

  const { state, status, isConnected, startSwarm } = useSwarmWebSocket({
    documentId,
    onComplete: () => setShowFloatingBlock(true),
    onError: () => setShowFloatingBlock(true),
  });

  const handlePromptSubmit = (prompt: string) => {
    setShowFloatingBlock(false);
    startSwarm(prompt);
  };

  const handleAccept = () => {
    // Insert code into editor
    console.log("Accepting:", state.generated_code);
    setShowFloatingBlock(false);
  };

  const handleReject = () => {
    setShowFloatingBlock(false);
  };

  return (
    <div className="flex flex-col gap-6 p-8">
      <AIAvatarIndicator
        status={status}
        retryCount={state.retry_count}
        hasError={state.error_message.length > 0}
      />

      <AIPromptInput
        onSubmit={handlePromptSubmit}
        disabled={status !== "idle"}
      />

      {/* Your editor component here */}

      <FloatingAIBlock
        state={state}
        onAccept={handleAccept}
        onReject={handleReject}
        isVisible={showFloatingBlock}
      />
    </div>
  );
}
```

## Styling

All components use CSS variables from `src/app/globals.css` to maintain the deep green dark-mode theme:

- `bg-background`: Main background (#09090B)
- `bg-card`: Card background (#09090B)
- `border-border`: Border color (rgba(255, 255, 255, 0.1))
- `text-foreground`: Primary text (#fafafa)
- `text-muted-foreground`: Secondary text (#a1a1aa)
- `bg-primary`: Primary accent (#fafafa)
- `bg-destructive`: Error/warning (#7f1d1d)

## WebSocket Message Flow

1. **Client connects** to `ws://localhost:8000/ws/swarm/{document_id}`
2. **Client sends** `{ user_prompt: "..." }`
3. **Server streams** state updates:
   ```json
   {
     "type": "state_update",
     "node": "python_developer",
     "state": { ... }
   }
   ```
4. **Server sends** completion:
   ```json
   {
     "type": "complete",
     "final_state": { ... }
   }
   ```

## Environment Variables

Set in `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Testing

To test the components:

1. Start the backend: `cd backend && uvicorn main:app --reload`
2. Start the frontend: `cd frontend && npm run dev`
3. Navigate to `/ai-swarm` to see the demo page
4. Enter a prompt like "Create a function to calculate fibonacci numbers"
5. Watch the AI avatar change states as the swarm processes
6. Review the generated code in the floating block
7. Accept or reject the code

## Future Enhancements

- Syntax highlighting with Prism.js or Shiki
- Code diff view for iterative improvements
- History of generated code snippets
- Integration with Monaco editor for inline insertion
- Support for multiple programming languages
- Real-time collaboration features

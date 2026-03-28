# AI Agent Swarm - Integration Guide

This guide shows how to integrate the AI Agent Swarm components into your existing workspace pages.

## Quick Start

### 1. Add to an Existing Workspace Page

If you already have a workspace page (e.g., `frontend/src/app/(obsidian)/workspace/page.tsx`), you can add the AI Swarm feature like this:

```typescript
"use client";

import { useState } from "react";
import { useSwarmWebSocket } from "@/hooks/useSwarmWebSocket";
import AIAvatarIndicator from "@/components/workspace/AIAvatarIndicator";
import AIPromptInput from "@/components/workspace/AIPromptInput";
import FloatingAIBlock from "@/components/workspace/FloatingAIBlock";

// Your existing workspace component
export default function WorkspacePage() {
  // Get document ID from your existing context
  const documentId = "your-document-id"; // Replace with actual document ID
  const [showAIBlock, setShowAIBlock] = useState(false);

  // Initialize the swarm WebSocket
  const { state, status, isConnected, startSwarm } = useSwarmWebSocket({
    documentId,
    onComplete: (finalState) => {
      console.log("Code generation complete:", finalState);
      setShowAIBlock(true);
    },
    onError: (error) => {
      console.error("Swarm error:", error);
      setShowAIBlock(true);
    },
  });

  const handleAcceptCode = () => {
    // TODO: Insert code into your editor
    // Example: editor.insertText(state.generated_code);
    console.log("Inserting code:", state.generated_code);
    setShowAIBlock(false);
  };

  const handleRejectCode = () => {
    setShowAIBlock(false);
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Your existing header/toolbar */}
      <div className="flex items-center gap-4 border-b border-border p-4">
        {/* Add AI Avatar to your toolbar */}
        <AIAvatarIndicator
          status={status}
          retryCount={state.retry_count}
          hasError={state.error_message.length > 0}
        />
        
        {/* Your existing toolbar items */}
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Your existing editor/content */}
        <div className="flex-1">
          {/* Your editor component */}
        </div>

        {/* Optional: AI Panel in sidebar */}
        <div className="w-96 border-l border-border p-4">
          <AIPromptInput
            onSubmit={(prompt) => {
              setShowAIBlock(false);
              startSwarm(prompt);
            }}
            disabled={status !== "idle" && status !== "complete"}
          />
        </div>
      </div>

      {/* Floating AI Block (appears when code is ready) */}
      <FloatingAIBlock
        state={state}
        onAccept={handleAcceptCode}
        onReject={handleRejectCode}
        isVisible={showAIBlock}
      />
    </div>
  );
}
```

### 2. Integration with Collaborative Editor

If you're using the collaborative editor (`collaborative-editor.tsx`), you can integrate like this:

```typescript
import CollaborativeEditor from "@/components/collaborative-editor";
import { useSwarmWebSocket } from "@/hooks/useSwarmWebSocket";
import FloatingAIBlock from "@/components/workspace/FloatingAIBlock";

export default function EditorPage() {
  const documentId = "your-doc-id";
  const [editorRef, setEditorRef] = useState<any>(null);
  
  const { state, status, startSwarm } = useSwarmWebSocket({
    documentId,
    onComplete: () => setShowAIBlock(true),
  });

  const handleAcceptCode = () => {
    // Insert into Monaco editor
    if (editorRef) {
      const position = editorRef.getPosition();
      editorRef.executeEdits("ai-swarm", [
        {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text: state.generated_code,
        },
      ]);
    }
    setShowAIBlock(false);
  };

  return (
    <>
      <CollaborativeEditor
        documentId={documentId}
        onEditorMount={(editor) => setEditorRef(editor)}
      />
      
      <FloatingAIBlock
        state={state}
        onAccept={handleAcceptCode}
        onReject={() => setShowAIBlock(false)}
        isVisible={showAIBlock}
      />
    </>
  );
}
```

### 3. Standalone AI Swarm Page

A dedicated page for the AI Swarm feature is already created at:
- `frontend/src/app/(obsidian)/ai-swarm/page.tsx`

You can access it at: `http://localhost:3000/ai-swarm`

## Component Placement Options

### Option A: Toolbar Integration
Place the AI Avatar in your main toolbar for always-visible status:

```typescript
<div className="flex items-center gap-4 border-b border-border p-4">
  <AIAvatarIndicator status={status} retryCount={state.retry_count} />
  {/* Other toolbar items */}
</div>
```

### Option B: Sidebar Panel
Add a dedicated AI panel in a sidebar:

```typescript
<div className="w-96 border-l border-border p-4 space-y-4">
  <AIAvatarIndicator status={status} />
  <AIPromptInput onSubmit={startSwarm} />
</div>
```

### Option C: Modal/Dialog
Trigger the AI from a button and show in a modal:

```typescript
import { Dialog, DialogContent } from "@/components/ui/dialog";

<Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
  <DialogContent>
    <AIPromptInput onSubmit={startSwarm} />
    <AIAvatarIndicator status={status} />
  </DialogContent>
</Dialog>
```

### Option D: Command Palette
Integrate with a command palette (Cmd+K style):

```typescript
// In your command palette component
{
  id: "ai-generate",
  label: "AI: Generate Code",
  icon: <Sparkles />,
  onSelect: () => {
    // Show AI prompt input
    setShowAIPrompt(true);
  },
}
```

## Handling Code Insertion

### Monaco Editor Integration

```typescript
const handleAcceptCode = () => {
  if (monacoEditor) {
    const position = monacoEditor.getPosition();
    monacoEditor.executeEdits("ai-swarm", [
      {
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        text: state.generated_code,
      },
    ]);
  }
};
```

### CodeMirror Integration

```typescript
const handleAcceptCode = () => {
  if (codeMirrorView) {
    const pos = codeMirrorView.state.selection.main.head;
    codeMirrorView.dispatch({
      changes: { from: pos, insert: state.generated_code },
    });
  }
};
```

### Textarea/Simple Editor

```typescript
const handleAcceptCode = () => {
  setEditorContent((prev) => prev + "\n" + state.generated_code);
};
```

## Environment Setup

Make sure your `.env.local` has:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Backend Connection

The WebSocket connects to: `ws://localhost:8000/ws/swarm/{document_id}`

Make sure your backend is running:
```bash
cd backend
uvicorn main:app --reload
```

## Styling Customization

All components use CSS variables from `globals.css`. To customize:

```css
/* In your globals.css or component styles */
@theme inline {
  --color-primary: #your-color;
  --color-destructive: #your-error-color;
  /* etc. */
}
```

## Error Handling

The components handle errors gracefully:

1. **Connection errors**: Shows disconnected status
2. **Generation errors**: Displays in error panel with retry count
3. **Security blocks**: Disables Accept button, shows blocked badge
4. **Test failures**: Shows in collapsible test results panel

## Performance Considerations

- WebSocket connection is reused across component lifecycle
- State updates are batched by React
- Code display is virtualized for large outputs
- Cleanup happens automatically on unmount

## Accessibility

All components follow accessibility best practices:
- Keyboard navigation support
- ARIA labels on interactive elements
- Focus management
- Screen reader friendly status updates

## Next Steps

1. Test the standalone page at `/ai-swarm`
2. Integrate into your main workspace page
3. Connect to your editor component
4. Customize styling to match your design
5. Add analytics/logging as needed

## Troubleshooting

### WebSocket won't connect
- Check backend is running on port 8000
- Verify NEXT_PUBLIC_API_URL is set correctly
- Check browser console for CORS errors

### Code not inserting
- Verify editor ref is set correctly
- Check editor API documentation for insert methods
- Add console.logs to debug the insertion flow

### Styling looks wrong
- Verify globals.css is imported in layout.tsx
- Check Tailwind config includes all component paths
- Inspect elements to see which CSS variables are applied

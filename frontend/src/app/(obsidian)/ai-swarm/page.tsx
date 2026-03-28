"use client";

import { useState } from "react";
import { useSwarmWebSocket } from "@/hooks/useSwarmWebSocket";
import AIAvatarIndicator from "@/components/workspace/AIAvatarIndicator";
import AIPromptInput from "@/components/workspace/AIPromptInput";
import FloatingAIBlock from "@/components/workspace/FloatingAIBlock";

export default function AISwarmPage() {
  // For demo purposes, using a static document ID
  // In production, this would come from your document context
  const [documentId] = useState("demo-swarm-doc");
  const [showFloatingBlock, setShowFloatingBlock] = useState(false);

  const { state, status, isConnected, startSwarm, reconnect } = useSwarmWebSocket({
    documentId,
    onComplete: (finalState) => {
      console.log("Swarm completed:", finalState);
      setShowFloatingBlock(true);
    },
    onError: (error) => {
      console.error("Swarm error:", error);
      setShowFloatingBlock(true);
    },
  });

  const handlePromptSubmit = (prompt: string) => {
    setShowFloatingBlock(false);
    startSwarm(prompt);
  };

  const handleAccept = () => {
    // In production, this would insert the code into the editor
    console.log("Accepting code:", state?.generated_code);
    alert("Code accepted! In production, this would insert into the editor.");
    setShowFloatingBlock(false);
  };

  const handleReject = () => {
    console.log("Rejecting code");
    setShowFloatingBlock(false);
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">AI Agent Swarm</h1>
        <p className="text-sm text-muted-foreground">
          Generate, review, and test Python code with autonomous AI agents
        </p>
      </div>

      {/* Connection Status */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-emerald-400" : "bg-destructive"
            }`}
          />
          <span className="text-muted-foreground">
            {isConnected ? "Connected to swarm" : "Disconnected from backend"}
          </span>
        </div>
        
        {!isConnected && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-xs text-destructive mb-2">
              Cannot connect to backend WebSocket
            </p>
            <p className="text-xs text-muted-foreground">
              Make sure the backend is running:
            </p>
            <pre className="mt-2 rounded bg-background p-2 text-xs text-foreground font-mono">
              cd backend{"\n"}uvicorn main:app --reload
            </pre>
            <p className="mt-2 text-xs text-muted-foreground">
              Then click the button below to reconnect.
            </p>
            <button
              onClick={reconnect}
              className="mt-2 rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90"
            >
              Reconnect
            </button>
          </div>
        )}
      </div>

      {/* AI Avatar Indicator */}
      <AIAvatarIndicator
        status={status}
        retryCount={state?.retry_count || 0}
        hasError={(state?.error_message?.length || 0) > 0}
      />

      {/* Prompt Input */}
      <AIPromptInput
        onSubmit={handlePromptSubmit}
        disabled={status !== "idle" && status !== "complete" && status !== "error"}
      />

      {/* Main Content Area - Placeholder for editor */}
      <div className="flex-1 rounded-xl border border-border bg-card p-8">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Your code editor would appear here
            </p>
            {state?.user_prompt && (
              <div className="mt-4 rounded-lg border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground mb-2">Current Prompt:</p>
                <p className="text-sm text-foreground">{state.user_prompt}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating AI Block */}
      <FloatingAIBlock
        state={state}
        onAccept={handleAccept}
        onReject={handleReject}
        isVisible={showFloatingBlock}
      />
    </div>
  );
}

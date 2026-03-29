"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SwarmState, SwarmMessage, SwarmStatus } from "@/types/swarm";

interface UseSwarmWebSocketOptions {
  documentId: string;
  onComplete?: (finalState: SwarmState) => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}

interface UseSwarmWebSocketReturn {
  state: SwarmState;
  status: SwarmStatus;
  isConnected: boolean;
  startSwarm: (prompt: string) => void;
  disconnect: () => void;
  reconnect: () => void;
}

const getWebSocketUrl = (documentId: string): string => {
  // Use environment variable if available, otherwise fallback to localhost
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  const url = `${wsUrl}/ws/swarm/${documentId}`;
  console.log("[WebSocket] Building URL:", url);
  return url;
};

export function useSwarmWebSocket({
  documentId,
  onComplete,
  onError,
  autoConnect = true,
}: UseSwarmWebSocketOptions): UseSwarmWebSocketReturn {
  const [state, setState] = useState<SwarmState>({
    user_prompt: "",
    generated_code: "",
    security_status: "",
    test_results: "",
    error_message: "",
    retry_count: 0,
    spec_markdown: "",
    code_snapshot: "",
    spec_compliant: true,
  });

  const [status, setStatus] = useState<SwarmStatus>("idle");
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  const connect = useCallback(() => {
    // Don't try to connect if already connected or max attempts reached
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("[WebSocket] Already connected, skipping");
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error("[WebSocket] Max reconnection attempts reached");
      setStatus("error");
      setState((prev) => ({
        ...prev,
        error_message: "Failed to connect after multiple attempts. Please refresh the page.",
      }));
      return;
    }

    const wsUrl = getWebSocketUrl(documentId);
    console.log(`[WebSocket] Attempting to connect to: ${wsUrl} (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
    console.log(`[WebSocket] Document ID: ${documentId}`);
    
    try {
      const ws = new WebSocket(wsUrl);
      console.log("[WebSocket] WebSocket object created, waiting for connection...");

      ws.onopen = () => {
        console.log("[WebSocket] ✓ Connected successfully!");
        setIsConnected(true);
        setStatus("idle");
        reconnectAttemptsRef.current = 0; // Reset on successful connection
        setState((prev) => ({ ...prev, error_message: "" }));
      };

      ws.onmessage = (event) => {
        try {
          const message: SwarmMessage = JSON.parse(event.data);
          console.log("[WebSocket] Received message:", message.type);

          switch (message.type) {
            case "state_update":
              if (message.state) {
                setState(message.state);
                
                // Update status based on node
                if (message.node === "python_developer") {
                  setStatus("generating");
                } else if (message.node === "security_reviewer") {
                  setStatus("reviewing");
                } else if (message.node === "sandbox_tester") {
                  setStatus("testing");
                }
              }
              break;

            case "complete":
              if (message.final_state) {
                setState(message.final_state);
              }
              setStatus("complete");
              onComplete?.(message.final_state || state);
              break;

            case "error":
              setStatus("error");
              setState((prev) => ({
                ...prev,
                error_message: message.message || "Unknown error occurred",
              }));
              onError?.(message.message || "Unknown error occurred");
              break;
          }
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Connection error:", error);
        console.error("[WebSocket] WebSocket URL:", wsUrl);
        console.error("[WebSocket] WebSocket readyState:", ws.readyState);
        console.error("[WebSocket] Make sure:");
        console.error("  1. Backend is running: uvicorn main:app --reload");
        console.error("  2. Backend is accessible at: http://localhost:8000");
        console.error("  3. No firewall is blocking WebSocket connections");
        setStatus("error");
        setState((prev) => ({
          ...prev,
          error_message: "WebSocket connection failed. Check if backend is running at localhost:8000.",
        }));
      };

      ws.onclose = (event) => {
        console.log(`[WebSocket] Connection closed: ${event.code} - ${event.reason || "No reason"}`);
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect if it wasn't a clean close and we haven't exceeded max attempts
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts && autoConnect) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000); // Exponential backoff
          console.log(`[WebSocket] Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[WebSocket] Failed to create WebSocket:", error);
      setStatus("error");
      setState((prev) => ({
        ...prev,
        error_message: `Failed to create WebSocket connection: ${error}`,
      }));
    }
  }, [documentId, onComplete, onError, state, autoConnect]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, disconnect]);

  const startSwarm = useCallback(
    (prompt: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.log("[WebSocket] Not connected, attempting to connect...");
        setState((prev) => ({ ...prev, user_prompt: prompt }));
        
        // Store the prompt and connect
        const attemptSend = () => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log("[WebSocket] Sending prompt:", prompt);
            wsRef.current.send(JSON.stringify({ user_prompt: prompt }));
            setStatus("generating");
          } else {
            console.log("[WebSocket] Still not connected, retrying...");
            setTimeout(attemptSend, 500);
          }
        };
        
        connect();
        setTimeout(attemptSend, 1000);
        return;
      }

      console.log("[WebSocket] Sending prompt:", prompt);
      wsRef.current.send(JSON.stringify({ user_prompt: prompt }));
      setState((prev) => ({ ...prev, user_prompt: prompt }));
      setStatus("generating");
    },
    [connect]
  );

  useEffect(() => {
    if (autoConnect) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        connect();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        disconnect();
      };
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // Removed connect and disconnect from deps to prevent loops

  return {
    state,
    status,
    isConnected,
    startSwarm,
    disconnect,
    reconnect,
  };
}

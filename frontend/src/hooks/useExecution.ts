"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getWsBaseUrl } from "@/lib/api";

/** Message types received from the backend WebSocket. */
type WsExecutionMessage =
  | { type: "stdout"; data: string }
  | { type: "stderr"; data: string }
  | { type: "error"; data: string }
  | { type: "complete"; data: { execution_time?: number; exit_code?: number } };

export interface UseExecutionReturn {
  /** True while code is being executed on the server. */
  isRunning: boolean;
  /** Accumulated stdout + stderr output. */
  output: string;
  /** Accumulated stderr only. */
  stderr: string;
  /** Connection or server error message, if any. */
  error: string | null;
  /** Total execution time in seconds (set after completion). */
  executionTime: number | null;
  /** Exit code of the execution (set after completion). */
  exitCode: number | null;
  /** Send code to be executed. Opens a new WebSocket connection. */
  execute: (language: string, code: string) => void;
  /** Clear all output and errors. */
  clear: () => void;
  /** Explanation string from the AI explainer. */
  aiExplanation: string | null;
  /** True while waiting for the AI explainer. */
  isExplaining: boolean;
  /** Call the AI explainer API. */
  explainWithAI: (language: string, code: string) => Promise<void>;
}

/**
 * Custom hook for real-time code execution via WebSocket.
 *
 * Connects to `ws://<host>/ws/execute/{documentId}`, sends
 * `{ language, code }`, and streams stdout/stderr/error/complete
 * messages back into React state.
 */
export function useExecution(documentId: string): UseExecutionReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [stderrStr, setStderrStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  
  const [isExplaining, setIsExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const execute = useCallback(
    (language: string, code: string) => {
      // Close any existing connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Reset state
      setOutput("");
      setStderrStr("");
      setError(null);
      setExecutionTime(null);
      setExitCode(null);
      setAiExplanation(null);
      setIsRunning(true);

      let wsUrl: string;
      try {
        const baseUrl = getWsBaseUrl();
        wsUrl = `${baseUrl}/ws/execute/${documentId}`;
      } catch {
        setError("WebSocket URL is not configured. Set NEXT_PUBLIC_WS_URL.");
        setIsRunning(false);
        return;
      }

      let socket: WebSocket;
      try {
        socket = new WebSocket(wsUrl);
      } catch {
        setError("Failed to create WebSocket connection.");
        setIsRunning(false);
        return;
      }

      wsRef.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ language, code }));
      };

      socket.onmessage = (event) => {
        let msg: WsExecutionMessage;
        try {
          msg = JSON.parse(event.data) as WsExecutionMessage;
        } catch {
          return;
        }

        switch (msg.type) {
          case "stdout":
            setOutput((prev) => prev + msg.data);
            break;
          case "stderr":
            setOutput((prev) => prev + msg.data);
            setStderrStr((prev) => prev + msg.data);
            break;
          case "error":
            setError(typeof msg.data === "string" ? msg.data : "Execution error");
            setIsRunning(false);
            break;
          case "complete":
            setExecutionTime(msg.data?.execution_time ?? null);
            setExitCode(msg.data?.exit_code ?? null);
            setIsRunning(false);
            break;
        }
      };

      socket.onerror = () => {
        setError("WebSocket connection error. Is the backend running?");
        setIsRunning(false);
      };

      socket.onclose = (event) => {
        // Only set error if we didn't already finish or error
        if (wsRef.current === socket) {
          wsRef.current = null;
          setIsRunning((running) => {
            if (running) {
              // Unexpected close
              if (!event.wasClean) {
                setError("Connection lost. The backend may be unreachable.");
              }
              return false;
            }
            return running;
          });
        }
      };
    },
    [documentId]
  );

  const clear = useCallback(() => {
    setOutput("");
    setStderrStr("");
    setError(null);
    setExecutionTime(null);
    setExitCode(null);
    setAiExplanation(null);
  }, []);

  const explainWithAI = useCallback(async (language: string, code: string) => {
    if (!stderrStr.trim()) return;
    
    setIsExplaining(true);
    setAiExplanation(null);
    
    try {
      // Import here to avoid cyclic dep or move to top
      const { explainError } = await import("@/lib/api");
      const result = await explainError({
        language,
        code,
        stderr: stderrStr,
      });
      setAiExplanation(result.explanation);
    } catch (err) {
      setAiExplanation(`Failed to get explanation: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExplaining(false);
    }
  }, [stderrStr]);

  return { 
    isRunning, 
    output, 
    stderr: stderrStr,
    error, 
    executionTime, 
    exitCode,
    execute, 
    clear,
    aiExplanation,
    isExplaining,
    explainWithAI
  };
}

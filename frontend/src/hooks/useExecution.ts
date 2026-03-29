"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getWsBaseUrl } from "@/lib/api";

/** Message types received from the backend WebSocket. */
type WsExecutionMessage =
  | { type: "stdout"; data: string }
  | { type: "stderr"; data: string }
  | { type: "error"; data: string }
  | { type: "complete"; data: { execution_time?: number; exit_code?: number } }
  | { type: "status"; data: string }
  | { type: "easter_egg"; data: string };

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
  /** Security alert extracted from WS error messages containing [SECURITY ALERT]. */
  securityAlert: string | null;
  /** AI resource metrics extracted from WS status messages. */
  aiResources: { cpu: string; ram: string } | null;
  /** True while the AI is scanning code. */
  isScanning: boolean;
  /** True when an easter_egg message has been received. */
  easterEggTriggered: boolean;
}

/**
 * Custom hook for real-time code execution via a persistent WebSocket.
 *
 * Opens a single WebSocket to `ws://<host>/ws/execute/{documentId}` on mount,
 * keeps it alive for the component's lifetime, and auto-reconnects on dirty
 * close with a 1-second delay. `execute()` sends `{ language, code }` over
 * the existing connection instead of opening a new one.
 */
export function useExecution(
  documentId: string,
  options?: { enabled?: boolean; listenOnly?: boolean; userId?: string; username?: string }
): UseExecutionReturn {
  const enabled = options?.enabled !== false;
  const listenOnly = options?.listenOnly === true;
  const shouldConnect = enabled || listenOnly;
  const userId = options?.userId ?? "";
  const username = options?.username ?? "";
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [stderrStr, setStderrStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);

  const [isExplaining, setIsExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [aiResources, setAiResources] = useState<{ cpu: string; ram: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [easterEggTriggered, setEasterEggTriggered] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);

  // ── Persistent WebSocket lifecycle ─────────────────────────────────
  useEffect(() => {
    if (!shouldConnect) return;
    intentionalCloseRef.current = false;

    let wsUrl: string;
    try {
      const baseUrl = getWsBaseUrl();
      wsUrl = `${baseUrl}/ws/execute/${documentId}?user_id=${encodeURIComponent(userId)}&username=${encodeURIComponent(username)}`;
    } catch {
      // Env var missing — nothing to connect to.
      setError("WebSocket URL is not configured. Set NEXT_PUBLIC_WS_URL.");
      return;
    }

    function connect() {
      let socket: WebSocket;
      try {
        socket = new WebSocket(wsUrl);
      } catch {
        // Creation failed — retry after 1 s unless unmounted.
        if (!intentionalCloseRef.current) {
          reconnectTimerRef.current = setTimeout(connect, 1000);
        }
        return;
      }

      wsRef.current = socket;

      socket.onopen = () => {
        // Connection established — clear any lingering error.
        setError(null);
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
            if (typeof msg.data === "string" && msg.data.includes("[SECURITY ALERT]")) {
              setSecurityAlert(msg.data);
            } else {
              setError(typeof msg.data === "string" ? msg.data : "Execution error");
              setIsRunning(false);
            }
            break;
          case "status": {
            if (msg.data.includes("[AI] Scanning code")) {
              setIsScanning(true);
            } else if (msg.data.includes("[AI] Allocated")) {
              const match = msg.data.match(/RAM:\s*([^\s|]+)\s*\|\s*CPU:\s*(.+)/i);
              if (match) {
                setAiResources({ ram: match[1], cpu: match[2].trim() });
              }
              setIsScanning(false);
            }
            break;
          }
          case "easter_egg":
            setEasterEggTriggered(true);
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
      };

      socket.onclose = () => {
        if (wsRef.current !== socket) return; // stale socket guard
        wsRef.current = null;
        if (!intentionalCloseRef.current) {
          reconnectTimerRef.current = setTimeout(connect, 1000);
        }
      };
    }

    connect();

    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [documentId, shouldConnect, userId, username]);

  // ── execute(): send over the existing persistent socket ────────────
  const execute = useCallback(
    (language: string, code: string) => {
      if (!enabled || listenOnly) return;
      // Reset output state
      setOutput("");
      setStderrStr("");
      setError(null);
      setExecutionTime(null);
      setExitCode(null);
      setAiExplanation(null);
      setSecurityAlert(null);
      setAiResources(null);
      setIsScanning(false);
      setEasterEggTriggered(false);

      const socket = wsRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        setIsRunning(true);
        socket.send(JSON.stringify({ language, code }));
      } else {
        setError("Connection unavailable. Reconnecting\u2026");
      }
    },
    [enabled, listenOnly]
  );

  const clear = useCallback(() => {
    setOutput("");
    setStderrStr("");
    setError(null);
    setExecutionTime(null);
    setExitCode(null);
    setAiExplanation(null);
    setSecurityAlert(null);
    setAiResources(null);
    setIsScanning(false);
    setEasterEggTriggered(false);
  }, []);

  const explainWithAI = useCallback(async (language: string, code: string) => {
    if (!stderrStr.trim()) return;

    setIsExplaining(true);
    setAiExplanation(null);

    try {
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
    explainWithAI,
    securityAlert,
    aiResources,
    isScanning,
    easterEggTriggered,
  };
}

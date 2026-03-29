"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ComplianceNudge } from "@/types/swarm";

interface UseSpecNudgeOptions {
  documentId: string;
  enabled?: boolean;
}

interface UseSpecNudgeReturn {
  nudge: ComplianceNudge | null;
  dismiss: () => void;
}

export function useSpecNudge({
  documentId,
  enabled = true,
}: UseSpecNudgeOptions): UseSpecNudgeReturn {
  const [nudge, setNudge] = useState<ComplianceNudge | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const dismiss = useCallback(() => setNudge(null), []);

  useEffect(() => {
    if (!enabled || !documentId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const url = `${wsUrl}/ws/swarm/${documentId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "spec_nudge" && msg.data) {
          setNudge(msg.data as ComplianceNudge);
        }
      } catch {
        // ignore
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [documentId, enabled]);

  return { nudge, dismiss };
}

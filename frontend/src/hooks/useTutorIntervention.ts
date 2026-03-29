"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TutorIntervention } from "@/types/swarm";

/**
 * Listens on an existing WebSocket (the execution WS) for `tutor_intervention`
 * messages and exposes the latest intervention plus a dismiss callback.
 *
 * Usage: pass the same WebSocket URL used by useExecution. The hook attaches
 * a message listener and does NOT create its own connection — instead it
 * piggybacks on the execution WebSocket by listening to a shared
 * BroadcastChannel or by being called with a WebSocket ref.
 *
 * For simplicity this hook manages its own lightweight WS connection to the
 * execution room, which is fine because ConnectionManager supports multiple
 * connections per room.
 */

interface UseTutorInterventionOptions {
  documentId: string;
  enabled?: boolean;
}

interface UseTutorInterventionReturn {
  intervention: TutorIntervention | null;
  dismiss: () => void;
}

export function useTutorIntervention({
  documentId,
  enabled = true,
}: UseTutorInterventionOptions): UseTutorInterventionReturn {
  const [intervention, setIntervention] = useState<TutorIntervention | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const dismiss = useCallback(() => {
    setIntervention(null);
  }, []);

  useEffect(() => {
    if (!enabled || !documentId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const url = `${wsUrl}/ws/execute/${documentId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "tutor_intervention" && msg.data) {
          setIntervention(msg.data as TutorIntervention);
        }
      } catch {
        // ignore non-JSON or malformed messages
      }
    };

    ws.onerror = () => {
      // Silent — this is a passive listener, not critical path
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [documentId, enabled]);

  return { intervention, dismiss };
}

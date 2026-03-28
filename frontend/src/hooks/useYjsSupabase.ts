import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { Profile } from "@/types/database";

export interface UseYjsSupabaseReturn {
  yDoc: Y.Doc;
  provider: WebsocketProvider;
  awareness: WebsocketProvider["awareness"];
  isConnected: boolean;
}

/**
 * Manages a Yjs document and WebSocket provider for collaborative editing.
 *
 * Uses refs to keep a stable Y.Doc/provider across React Fast Refresh (HMR)
 * cycles, preventing content duplication that occurs when a fresh Y.Doc syncs
 * the server state on top of locally-seeded initial content.
 */
export function useYjsSupabase(
  documentId: string,
  profile: Pick<Profile, "id" | "username" | "avatar_color_hex">
): UseYjsSupabaseReturn | null {
  const [state, setState] = useState<Omit<UseYjsSupabaseReturn, "isConnected"> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Keep a ref so we can detect HMR re-runs for the same documentId and
  // reuse the existing Y.Doc + provider instead of creating duplicates.
  const activeDocIdRef = useRef<string | null>(null);
  const yDocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    // If we already have a live Y.Doc for this exact documentId (HMR case),
    // just re-expose it via state without creating a new one.
    if (
      activeDocIdRef.current === documentId &&
      yDocRef.current &&
      providerRef.current
    ) {
      const provider = providerRef.current;

      // Update awareness in case the profile changed
      provider.awareness.setLocalStateField("user", {
        name: profile.username,
        color: profile.avatar_color_hex,
      });

      setState({
        yDoc: yDocRef.current,
        provider,
        awareness: provider.awareness,
      });

      return; // No cleanup — we're reusing existing resources
    }

    // Different documentId or first mount — tear down any previous resources
    if (providerRef.current) {
      providerRef.current.disconnect();
      providerRef.current.destroy();
      providerRef.current = null;
    }
    if (yDocRef.current) {
      yDocRef.current.destroy();
      yDocRef.current = null;
    }

    const yDoc = new Y.Doc();
    const provider = new WebsocketProvider(
      "ws://localhost:4444",
      `itecity-${documentId}`,
      yDoc,
      { connect: true }
    );

    provider.awareness.setLocalStateField("user", {
      name: profile.username,
      color: profile.avatar_color_hex,
    });

    provider.on("status", ({ status }: { status: string }) => {
      setIsConnected(status === "connected");
    });

    // Store in refs so HMR re-runs can reuse them
    activeDocIdRef.current = documentId;
    yDocRef.current = yDoc;
    providerRef.current = provider;

    setState({
      yDoc,
      provider,
      awareness: provider.awareness,
    });

    return () => {
      // Only tear down if refs still point to THIS instance.
      // During HMR the effect re-runs immediately; if the new run reused
      // these refs, we must NOT destroy them here.
      if (providerRef.current === provider) {
        provider.disconnect();
        provider.destroy();
        providerRef.current = null;
      }
      if (yDocRef.current === yDoc) {
        yDoc.destroy();
        yDocRef.current = null;
      }
      if (activeDocIdRef.current === documentId) {
        activeDocIdRef.current = null;
      }
      setState(null);
      setIsConnected(false);
    };
  }, [documentId, profile.id, profile.username, profile.avatar_color_hex]);

  if (!state) return null;

  return {
    ...state,
    isConnected,
  };
}

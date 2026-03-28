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

// ────────────────────────────────────────────────────────────────────
// Module-level cache.
//
// This is the **only** reliable way to keep a Y.Doc alive across
// React Fast Refresh (HMR) and component unmount/remount cycles.
//
// Module scope survives HMR because the module identity doesn't
// change — only the component function gets hot-swapped.
// ────────────────────────────────────────────────────────────────────
type CacheEntry = {
  yDoc: Y.Doc;
  provider: WebsocketProvider;
  /** How many mounted hook instances are using this entry right now. */
  refCount: number;
  /** setTimeout handle for deferred teardown. */
  teardownTimer: ReturnType<typeof setTimeout> | null;
};

const yjsCache = new Map<string, CacheEntry>();

function getOrCreateEntry(
  documentId: string,
  profile: Pick<Profile, "id" | "username" | "avatar_color_hex">
): CacheEntry {
  const existing = yjsCache.get(documentId);
  if (existing) {
    // Cancel any pending teardown — this entry is being reused
    if (existing.teardownTimer !== null) {
      clearTimeout(existing.teardownTimer);
      existing.teardownTimer = null;
    }
    existing.refCount += 1;

    // Update awareness in case profile changed
    existing.provider.awareness.setLocalStateField("user", {
      name: profile.username,
      color: profile.avatar_color_hex,
    });

    return existing;
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

  const entry: CacheEntry = {
    yDoc,
    provider,
    refCount: 1,
    teardownTimer: null,
  };

  yjsCache.set(documentId, entry);
  return entry;
}

function releaseEntry(documentId: string): void {
  const entry = yjsCache.get(documentId);
  if (!entry) return;

  entry.refCount -= 1;
  if (entry.refCount > 0) return;

  // Defer actual destruction by a tick so that if a new mount (HMR or
  // React re-mount) grabs the same documentId immediately, it can
  // reuse the entry via getOrCreateEntry before we destroy it.
  entry.teardownTimer = setTimeout(() => {
    // Double-check: if something reclaimed the entry in the meantime, bail
    const current = yjsCache.get(documentId);
    if (current !== entry || current.refCount > 0) return;

    yjsCache.delete(documentId);
    try {
      entry.provider.disconnect();
      entry.provider.destroy();
    } catch {
      // ignore teardown errors
    }
    try {
      entry.yDoc.destroy();
    } catch {
      // ignore teardown errors
    }
  }, 500);
}

/**
 * Manages a Yjs document and WebSocket provider for collaborative editing.
 *
 * Uses a **module-level** cache to keep a single Y.Doc + WebSocketProvider
 * per documentId alive across:
 *  - React Fast Refresh (HMR)
 *  - Component unmount/remount cycles
 *  - Tab visibility changes (alt+tab)
 *
 * This prevents content duplication that occurs when a fresh Y.Doc is
 * created, seeded with initial content, and then receives the full
 * document state again from the y-websocket server on sync.
 */
export function useYjsSupabase(
  documentId: string,
  profile: Pick<Profile, "id" | "username" | "avatar_color_hex">
): UseYjsSupabaseReturn | null {
  const [isConnected, setIsConnected] = useState(false);
  const entryRef = useRef<CacheEntry | null>(null);

  // Track the documentId so we can release the correct entry on cleanup
  const documentIdRef = useRef(documentId);
  documentIdRef.current = documentId;

  useEffect(() => {
    const entry = getOrCreateEntry(documentId, profile);
    entryRef.current = entry;

    const statusHandler = ({ status }: { status: string }) => {
      setIsConnected(status === "connected");
    };

    entry.provider.on("status", statusHandler);

    // If provider is already connected, set state immediately
    if (entry.provider.wsconnected) {
      setIsConnected(true);
    }

    return () => {
      entry.provider.off("status", statusHandler);
      releaseEntry(documentId);
      entryRef.current = null;
      setIsConnected(false);
    };
  }, [documentId, profile.id, profile.username, profile.avatar_color_hex]);

  const entry = entryRef.current;
  if (!entry) return null;

  return {
    yDoc: entry.yDoc,
    provider: entry.provider,
    awareness: entry.provider.awareness,
    isConnected,
  };
}

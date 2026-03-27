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

export function useYjsSupabase(
  documentId: string,
  profile: Pick<Profile, "id" | "username" | "avatar_color_hex">
): UseYjsSupabaseReturn | null {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const yDoc = new Y.Doc();
    const provider = new WebsocketProvider(
      "ws://localhost:4444",
      `itecify-${documentId}`,
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

    docRef.current = yDoc;
    providerRef.current = provider;
    setReady(true);

    return () => {
      provider.disconnect();
      provider.destroy();
      yDoc.destroy();
      docRef.current = null;
      providerRef.current = null;
      setReady(false);
      setIsConnected(false);
    };
  }, [documentId, profile.id, profile.username, profile.avatar_color_hex]);

  if (!ready || !docRef.current || !providerRef.current) return null;

  return {
    yDoc: docRef.current,
    provider: providerRef.current,
    awareness: providerRef.current.awareness,
    isConnected,
  };
}

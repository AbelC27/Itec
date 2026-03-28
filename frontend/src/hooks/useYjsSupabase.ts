import { useEffect, useState } from "react";
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
  const [state, setState] = useState<Omit<UseYjsSupabaseReturn, "isConnected"> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
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

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({
      yDoc,
      provider,
      awareness: provider.awareness,
    });

    return () => {
      provider.disconnect();
      provider.destroy();
      yDoc.destroy();
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

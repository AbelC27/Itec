import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { SupabaseProvider } from "@/lib/collaborative/supabase-provider";
import type { Profile } from "@/types/database";

export interface UseYjsSupabaseReturn {
  yDoc: Y.Doc;
  provider: SupabaseProvider;
  awareness: SupabaseProvider["awareness"];
  isConnected: boolean;
}

export function useYjsSupabase(
  documentId: string,
  profile: Pick<Profile, "id" | "username" | "avatar_color_hex">
): UseYjsSupabaseReturn | null {
  const yDocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SupabaseProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const doc = new Y.Doc();
    const provider = new SupabaseProvider(doc, documentId, {
      id: profile.id,
      username: profile.username,
      avatar_color_hex: profile.avatar_color_hex,
    });

    // Set local awareness state with user identity
    provider.awareness.setLocalStateField("username", profile.username);
    provider.awareness.setLocalStateField("avatarColorHex", profile.avatar_color_hex);

    yDocRef.current = doc;
    providerRef.current = provider;
    setReady(true);

    // Defer connection to survive React strict mode unmount/remount cycle
    const connectTimer = setTimeout(() => {
      provider.connect();
    }, 0);

    // Poll connection status
    const interval = setInterval(() => {
      setIsConnected(provider.connected);
    }, 500);

    return () => {
      clearTimeout(connectTimer);
      clearInterval(interval);
      // CRITICAL cleanup order: provider → awareness → yDoc
      provider.destroy();
      provider.awareness.destroy();
      doc.destroy();

      yDocRef.current = null;
      providerRef.current = null;
      setReady(false);
    };
  }, [documentId, profile.id, profile.username, profile.avatar_color_hex]);

  if (!ready || !yDocRef.current || !providerRef.current) {
    return null;
  }

  return {
    yDoc: yDocRef.current,
    provider: providerRef.current,
    awareness: providerRef.current.awareness,
    isConnected,
  };
}

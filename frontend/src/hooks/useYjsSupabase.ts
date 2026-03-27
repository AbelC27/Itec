import { useEffect, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

export interface UseYjsSupabaseReturn {
  yDoc: Y.Doc;
  provider: WebsocketProvider;
  awareness: WebsocketProvider["awareness"];
  isConnected: boolean;
}

const SAVE_DEBOUNCE_MS = 2000;

// Safe base64 encode/decode for large Uint8Arrays
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function useYjsSupabase(
  documentId: string,
  profile: Pick<Profile, "id" | "username" | "avatar_color_hex">
): UseYjsSupabaseReturn | null {
  const [state, setState] = useState<{
    yDoc: Y.Doc;
    provider: WebsocketProvider;
  } | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    let yDoc: Y.Doc | null = null;
    let provider: WebsocketProvider | null = null;

    async function init() {
      const supabase = createClient();
      yDoc = new Y.Doc();

      // Load persisted state from Supabase
      const { data } = await supabase
        .from("documents")
        .select("yjs_state")
        .eq("id", documentId)
        .single();

      if (cancelled) { yDoc.destroy(); return; }

      if (data?.yjs_state) {
        try {
          const binary = base64ToUint8(data.yjs_state);
          Y.applyUpdate(yDoc, binary);
        } catch (e) {
          console.warn("[useYjsSupabase] Failed to load saved state:", e);
        }
      } else {
        // Create the document row if it doesn't exist
        await supabase.from("documents").upsert({
          id: documentId,
          owner_id: profile.id,
          title: documentId,
        });
      }

      if (cancelled) { yDoc.destroy(); return; }

      // Connect to y-websocket for real-time sync
      provider = new WebsocketProvider(
        "wss://demos.yjs.dev/ws",
        `itecify-${documentId}`,
        yDoc,
        { connect: true }
      );

      provider.awareness.setLocalStateField("user", {
        name: profile.username,
        color: profile.avatar_color_hex,
      });

      // Auto-save on every doc update (debounced)
      const docRef = yDoc;
      const saveToDb = () => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          if (cancelled) return;
          try {
            const fullState = Y.encodeStateAsUpdate(docRef);
            const base64 = uint8ToBase64(fullState);
            await supabase
              .from("documents")
              .update({
                yjs_state: base64,
                updated_at: new Date().toISOString(),
              })
              .eq("id", documentId);
          } catch (e) {
            console.warn("[useYjsSupabase] Auto-save failed:", e);
          }
        }, SAVE_DEBOUNCE_MS);
      };
      yDoc.on("update", saveToDb);

      provider.on("status", ({ status }: { status: string }) => {
        if (!cancelled) setIsConnected(status === "connected");
      });

      if (!cancelled) {
        setState({ yDoc, provider });
      }
    }

    init();

    return () => {
      cancelled = true;
      if (saveTimer) clearTimeout(saveTimer);
      if (provider) {
        provider.disconnect();
        provider.destroy();
      }
      if (yDoc) {
        yDoc.destroy();
      }
      setState(null);
      setIsConnected(false);
    };
  }, [documentId, profile.id, profile.username, profile.avatar_color_hex]);

  if (!state) return null;

  return {
    yDoc: state.yDoc,
    provider: state.provider,
    awareness: state.provider.awareness,
    isConnected,
  };
}

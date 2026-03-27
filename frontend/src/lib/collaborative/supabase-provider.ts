import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { toBase64, fromBase64 } from "lib0/buffer";
import { createClient } from "@/lib/supabase/client";
import type {
  AwarenessUserState,
  DocUpdatePayload,
  PresenceState,
} from "@/types/collaborative";
import type { RealtimeChannel } from "@supabase/supabase-js";

const THROTTLE_MS = 80;
const BASE_RETRY_MS = 1000;
const MAX_RETRY_MS = 30000;

export class SupabaseProvider {
  readonly awareness: Awareness;
  connected: boolean = false;

  private readonly doc: Y.Doc;
  private readonly documentId: string;
  private readonly profile: { id: string; username: string; avatar_color_hex: string };
  private readonly supabase = createClient();
  private readonly channel: RealtimeChannel;
  private readonly clientId: number;

  private retryCount = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private trackThrottleTimeout: ReturnType<typeof setTimeout> | null = null;
  private trackPending = false;
  private destroyed = false;

  // Store bound handlers so we can remove them in destroy()
  private readonly handleDocUpdate: (update: Uint8Array, origin: unknown) => void;
  private readonly handleAwarenessUpdate: () => void;

  constructor(
    doc: Y.Doc,
    documentId: string,
    profile: { id: string; username: string; avatar_color_hex: string }
  ) {
    this.doc = doc;
    this.documentId = documentId;
    this.profile = profile;
    this.clientId = doc.clientID;
    this.awareness = new Awareness(doc);

    // Set initial local awareness state
    this.awareness.setLocalState({
      userId: profile.id,
      username: profile.username,
      avatarColorHex: profile.avatar_color_hex,
      cursor: null,
      selection: null,
    } satisfies AwarenessUserState);

    // --- Bind doc update handler (Task 3.2) ---
    this.handleDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (this.destroyed || !this.connected) return;
      // Don't broadcast updates that came from remote apply
      if (origin === this) return;

      const payload: DocUpdatePayload = {
        update: toBase64(update),
        clientId: this.clientId,
      };

      this.channel.send({
        type: "broadcast",
        event: "doc-update",
        payload,
      });
    };
    this.doc.on("update", this.handleDocUpdate);

    // --- Bind awareness update handler (Task 3.3) ---
    this.handleAwarenessUpdate = () => {
      if (this.destroyed || !this.connected) return;
      this.throttledTrack();
    };
    this.awareness.on("update", this.handleAwarenessUpdate);

    // --- Create channel and subscribe (Task 3.1 + 3.3 + 3.4) ---
    this.channel = this.supabase
      .channel(`doc:${documentId}`)
      .on("broadcast", { event: "doc-update" }, (message) => {
        this.handleRemoteDocUpdate(message.payload as DocUpdatePayload);
      })
      .on("presence", { event: "sync" }, () => {
        this.handlePresenceSync();
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        this.handlePresenceJoin(newPresences as PresenceState[]);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        this.handlePresenceLeave(leftPresences as PresenceState[]);
      });

    this.subscribeToChannel();
  }

  // ─── Task 3.4: Channel subscription with retry ───

  private subscribeToChannel(): void {
    this.channel.subscribe((status, err) => {
      if (this.destroyed) return;

      if (status === "SUBSCRIBED") {
        this.connected = true;
        this.retryCount = 0;

        // Track presence on connect
        this.trackPresence();

        // If reconnecting, broadcast full state for sync
        if (this.retryCount > 0 || this.connected) {
          this.broadcastFullState();
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        this.connected = false;
        console.error(
          `[SupabaseProvider] Channel error for doc:${this.documentId}:`,
          err ?? status
        );
        this.scheduleRetry();
      } else if (status === "CLOSED") {
        this.connected = false;
      }
    });
  }

  private scheduleRetry(): void {
    if (this.destroyed || this.retryTimeout) return;

    const delay = Math.min(
      BASE_RETRY_MS * Math.pow(2, this.retryCount),
      MAX_RETRY_MS
    );
    this.retryCount++;

    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      if (this.destroyed) return;

      // Unsubscribe before resubscribing
      this.channel.unsubscribe().then(() => {
        if (!this.destroyed) {
          this.subscribeToChannel();
        }
      });
    }, delay);
  }

  private broadcastFullState(): void {
    if (!this.connected || this.destroyed) return;

    const fullState = Y.encodeStateAsUpdate(this.doc);
    const payload: DocUpdatePayload = {
      update: toBase64(fullState),
      clientId: this.clientId,
    };

    this.channel.send({
      type: "broadcast",
      event: "doc-update",
      payload,
    });
  }

  // ─── Task 3.2: Remote doc update handling ───

  private handleRemoteDocUpdate(payload: DocUpdatePayload): void {
    if (this.destroyed) return;

    // Echo prevention
    if (payload.clientId === this.clientId) return;

    try {
      const update = fromBase64(payload.update);
      Y.applyUpdate(this.doc, update, this);
    } catch (err) {
      console.error(
        "[SupabaseProvider] Failed to apply remote update:",
        err
      );
    }
  }

  // ─── Task 3.3: Presence handling ───

  private trackPresence(): void {
    if (this.destroyed || !this.connected) return;

    const localState = this.awareness.getLocalState() as AwarenessUserState | null;
    if (!localState) return;

    const presencePayload: PresenceState = {
      userId: localState.userId,
      username: localState.username,
      avatarColorHex: localState.avatarColorHex,
      cursor: localState.cursor,
      selection: localState.selection,
    };

    this.channel.track(presencePayload);
  }

  private throttledTrack(): void {
    if (this.trackThrottleTimeout) {
      this.trackPending = true;
      return;
    }

    this.trackPresence();

    this.trackThrottleTimeout = setTimeout(() => {
      this.trackThrottleTimeout = null;
      if (this.trackPending) {
        this.trackPending = false;
        this.trackPresence();
      }
    }, THROTTLE_MS);
  }

  private handlePresenceSync(): void {
    if (this.destroyed) return;

    const state = this.channel.presenceState<PresenceState>();

    for (const [key, presences] of Object.entries(state)) {
      for (const presence of presences) {
        if (presence.userId === this.profile.id) continue;

        // Find or assign a clientId for this remote user
        const remoteClientId = this.resolveRemoteClientId(presence.userId);
        if (remoteClientId === null) continue;

        this.awareness.setLocalStateField("user", null); // no-op to ensure awareness is active
        // Set state for the remote client
        this.setRemoteAwarenessState(remoteClientId, presence);
      }
    }
  }

  private handlePresenceJoin(newPresences: PresenceState[]): void {
    if (this.destroyed) return;

    for (const presence of newPresences) {
      if (presence.userId === this.profile.id) continue;

      const remoteClientId = this.resolveRemoteClientId(presence.userId);
      if (remoteClientId === null) continue;

      this.setRemoteAwarenessState(remoteClientId, presence);
    }
  }

  private handlePresenceLeave(leftPresences: PresenceState[]): void {
    if (this.destroyed) return;

    for (const presence of leftPresences) {
      const remoteClientId = this.findRemoteClientId(presence.userId);
      if (remoteClientId === null) continue;

      this.awareness.setLocalStateField("user", null); // ensure awareness is active
      // Remove the remote client's awareness state
      const states = this.awareness.getStates();
      if (states.has(remoteClientId)) {
        states.delete(remoteClientId);
        // Trigger awareness update for removal
        this.awareness.emit("update", [
          { added: [], updated: [], removed: [remoteClientId] },
          "presence-leave",
        ]);
      }

      this.remoteClientIds.delete(presence.userId);
    }
  }

  // ─── Remote client ID mapping ───
  // Maps remote userId → a synthetic clientId for Awareness
  private remoteClientIds = new Map<string, number>();
  private nextRemoteClientId = 1;

  private resolveRemoteClientId(userId: string): number {
    let clientId = this.remoteClientIds.get(userId);
    if (clientId === undefined) {
      // Generate a synthetic clientId that won't collide with the local doc.clientID
      clientId = this.nextRemoteClientId++;
      // Avoid collision with local clientId
      if (clientId === this.clientId) {
        clientId = this.nextRemoteClientId++;
      }
      this.remoteClientIds.set(userId, clientId);
    }
    return clientId;
  }

  private findRemoteClientId(userId: string): number | null {
    return this.remoteClientIds.get(userId) ?? null;
  }

  private setRemoteAwarenessState(
    remoteClientId: number,
    presence: PresenceState
  ): void {
    const awarenessState: AwarenessUserState = {
      userId: presence.userId,
      username: presence.username,
      avatarColorHex: presence.avatarColorHex,
      cursor: presence.cursor,
      selection: presence.selection,
    };

    const states = this.awareness.getStates();
    const isNew = !states.has(remoteClientId);
    states.set(remoteClientId, awarenessState);

    this.awareness.emit("update", [
      {
        added: isNew ? [remoteClientId] : [],
        updated: isNew ? [] : [remoteClientId],
        removed: [],
      },
      "presence-sync",
    ]);
  }

  // ─── Task 3.5: Cleanup ───

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // Clear pending timers
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.trackThrottleTimeout) {
      clearTimeout(this.trackThrottleTimeout);
      this.trackThrottleTimeout = null;
    }

    // Remove event listeners
    this.doc.off("update", this.handleDocUpdate);
    this.awareness.off("update", this.handleAwarenessUpdate);

    // Untrack, unsubscribe, and remove channel
    this.channel.untrack();
    this.channel.unsubscribe();
    this.supabase.removeChannel(this.channel);

    this.connected = false;
  }
}
